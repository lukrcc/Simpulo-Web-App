"use client";

import { ArrowLeft, Check, Lock, LockOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore, type ProfilePatch } from "@/lib/store";
import type { NewStayInput, Stay, User, Vibe } from "@/lib/types";
import { VIBES, cn, formatPrice, nightsBetween, simpuloFee, splitList } from "@/lib/utils";

const DRAFT_KEY = "draftHouse";
const HOST_NOTE_MAX = 60;
const BIO_MAX = 160;

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "handle" },
  { key: "tiktok", label: "TikTok", placeholder: "handle" },
  { key: "youtube", label: "YouTube", placeholder: "handle" },
  { key: "twitch", label: "Twitch", placeholder: "username" },
  { key: "kick", label: "Kick", placeholder: "username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "profile name" },
  { key: "x", label: "X", placeholder: "handle" },
  { key: "website", label: "Website", placeholder: "https://…" },
] as const;
type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"];

const STEPS = ["The House", "Your pitch", "About you", "Publish"] as const;
const PUBLISH_STEP = STEPS.length - 1;

interface FormState {
  // 1 · The House
  title: string;
  city: string;
  region: string;
  startDate: string;
  endDate: string;
  spotsTotal: number;
  vibe: Vibe;
  locked: boolean;
  accommodationLink: string;
  pricePerPerson: string;
  budgetMin: string;
  budgetMax: string;
  // 2 · Your pitch
  description: string;
  whyText: string;
  dayText: string;
  lookingForText: string;
  hostNote: string;
  interests: string;
  houseRules: string;
  // 3 · About you – undefined = untouched, shown pre-filled from the logged-in user
  aboutPhotos?: string[];
  aboutName?: string;
  aboutAge?: string;
  aboutCountry?: string;
  aboutLanguages?: string[];
  aboutBio?: string;
  aboutSocials?: Partial<Record<SocialKey, string>>;
}

/** "About you" as it currently reads: what the host typed, else their profile, else empty. */
interface About {
  photos: string[];
  name: string;
  age: string;
  country: string;
  languages: string[];
  bio: string;
  socials: Partial<Record<SocialKey, string>>;
}

function aboutOf(form: FormState, me?: User): About {
  return {
    photos: form.aboutPhotos ?? me?.photos ?? [],
    name: form.aboutName ?? me?.name ?? "",
    age: form.aboutAge ?? (me ? String(me.age) : ""),
    country: form.aboutCountry ?? me?.country ?? "",
    languages: form.aboutLanguages ?? me?.languages ?? [],
    bio: form.aboutBio ?? me?.bio ?? "",
    socials: { ...(me && Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, me[key] ?? ""]))), ...form.aboutSocials },
  };
}

interface Draft {
  form: FormState;
  step: number;
}

const initialForm: FormState = {
  title: "",
  city: "",
  region: "",
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  vibe: "remote-work",
  locked: false,
  accommodationLink: "",
  pricePerPerson: "",
  budgetMin: "",
  budgetMax: "",
  description: "",
  whyText: "",
  dayText: "",
  lookingForText: "",
  hostNote: "",
  interests: "",
  houseRules: "",
};

const PITCH_FIELDS: ReadonlyArray<{ key: "whyText" | "dayText" | "lookingForText"; label: string; placeholder: string }> = [
  { key: "whyText", label: "Why I'm hosting this", placeholder: "What made you want to open this House?" },
  { key: "dayText", label: "A typical day", placeholder: "Morning, afternoon, evening – what does it look like?" },
  { key: "lookingForText", label: "Who I'm looking for", placeholder: "Who would be a great fit for the crew?" },
];

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<Draft>;
    return { form: { ...initialForm, ...draft.form }, step: Math.min(Math.max(draft.step ?? 0, 0), PUBLISH_STEP) };
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // nothing to clear
  }
}

function validateStep(step: number, form: FormState, me?: User): string | null {
  if (step === 0) {
    if (!form.title.trim()) return "Give your House a title.";
    if (!form.city.trim() || !form.region.trim()) return "Add a city and region.";
    if (!form.startDate || !form.endDate) return "Pick start and end dates.";
    if (nightsBetween(form.startDate, form.endDate) < 1) return "End date must be after the start date.";
    if (form.locked) {
      if (!form.accommodationLink.trim()) return "Add the accommodation link to lock it.";
      if (!(Number(form.pricePerPerson) > 0)) return "A locked place needs a final price per person.";
    } else if (form.budgetMin || form.budgetMax) {
      const min = Number(form.budgetMin);
      const max = Number(form.budgetMax);
      if (!(min > 0) || !(max > 0)) return "Enter both ends of the budget – or leave it empty.";
      if (min > max) return "The budget minimum can't be above the maximum.";
    }
  }
  if (step === 1 && form.description.trim().length < 20) return "Describe your House in at least 20 characters.";
  if (step === 2) {
    const about = aboutOf(form, me);
    if (!about.photos[0]) return "Add a face photo – Houses without one don't get requests.";
    if (!about.name.trim()) return "Add your first name.";
    if (!(Number(about.age) >= 18 && Number(about.age) <= 99)) return "Add your age (18+).";
    if (!about.country.trim()) return "Add your country.";
  }
  return null;
}

function toInput(form: FormState): NewStayInput {
  return {
    title: form.title.trim(),
    city: form.city.trim(),
    region: form.region.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    spotsTotal: form.spotsTotal,
    vibe: form.vibe,
    // A fixed price only exists for a locked place; otherwise there's at most a rough budget.
    pricePerPerson: form.locked ? Math.round(Number(form.pricePerPerson)) || undefined : undefined,
    budgetPerPerson:
      !form.locked && Number(form.budgetMin) > 0 && Number(form.budgetMax) > 0
        ? { min: Math.round(Number(form.budgetMin)), max: Math.round(Number(form.budgetMax)) }
        : undefined,
    accommodationLink: form.accommodationLink.trim() || undefined,
    accommodationStatus: form.locked ? "locked" : "open",
    description: form.description.trim(),
    whyText: form.whyText.trim(),
    dayText: form.dayText.trim(),
    lookingForText: form.lookingForText.trim(),
    hostNote: form.hostNote.trim() || undefined,
    interests: splitList(form.interests, /,/),
    houseRules: splitList(form.houseRules, /\n/),
  };
}

/** What "About you" writes to the profile on publish. */
function toProfilePatch(form: FormState, me?: User): ProfilePatch {
  const about = aboutOf(form, me);
  const patch: ProfilePatch = {
    photos: about.photos,
    name: about.name.trim(),
    age: Number(about.age),
    country: about.country.trim(),
    languages: about.languages,
    bio: about.bio.trim().slice(0, BIO_MAX),
  };
  for (const { key } of SOCIAL_FIELDS) {
    const value = about.socials[key]?.trim();
    if (value) patch[key] = value;
  }
  return patch;
}

const noSubscribe = () => () => {};

export function CreateStayForm() {
  // The page is prerendered with an empty form. After hydration the wizard remounts once and restores the
  // saved draft – restoring during hydration itself would mismatch the server HTML.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return <CreateWizard key={hydrated ? "restored" : "initial"} restore={hydrated} />;
}

function CreateWizard({ restore }: { restore: boolean }) {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const showToast = useToast();
  const [initialDraft] = useState(() => (restore ? readDraft() : null));
  const [form, setForm] = useState<FormState>(initialDraft?.form ?? initialForm);
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [error, setError] = useState<string | null>(null);
  const me = getCurrentUser(store);

  // Keep the draft so a refresh doesn't lose it (only once restored, so the empty first render can't overwrite it).
  useEffect(() => {
    if (!restore) return;
    try {
      // Photos are left out (undefined is dropped by JSON): their blob: URLs stop working after a reload.
      const persisted: FormState = { ...form, aboutPhotos: undefined };
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: persisted, step } satisfies Draft));
    } catch {
      // storage full or blocked – the draft just won't survive a refresh
    }
  }, [form, step, restore]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function goTo(target: number) {
    // Forward only through valid steps; backwards always.
    for (let i = step; i < target; i++) {
      const problem = validateStep(i, form, me);
      if (problem) {
        setStep(i);
        return setError(problem);
      }
    }
    setError(null);
    setStep(target);
  }

  function publish() {
    for (let i = 0; i < PUBLISH_STEP; i++) {
      const problem = validateStep(i, form, me);
      if (problem) {
        setStep(i);
        return setError(problem);
      }
    }
    // Logged out: log in first, then publish – the draft is still in state, nothing is lost.
    requireAuth(() => {
      const slug = store.createStay(toInput(form));
      store.updateCurrentUser(toProfilePatch(form, me));
      clearDraft();
      showToast("Your House is open 🎉");
      router.push(`/stays/${slug}`);
    });
  }

  const about = aboutOf(form, me);
  const previewHost = previewHostOf(about, me);
  // Step 3 can't be left without a face photo.
  const blocked = step === 2 && !about.photos[0];
  const previewStay: Stay = {
    ...toInput(form),
    id: "preview",
    slug: "preview",
    hostId: me?.id ?? "preview",
    lat: 0,
    lng: 0,
    mapPreviewUrl: "",
    spotsFilled: 1,
    currency: "EUR",
    status: "draft",
    acceptingRequests: true,
    featured: false,
    createdAt: "",
  };
  const preview = <StayCard stay={previewStay} host={previewHost} crew={previewHost ? [previewHost] : []} preview />;

  return (
    <Container page>
      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            aria-label="Previous step"
            className="-ml-2 rounded-full p-2 hover:bg-black/5"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Open a House</h1>
      </div>

      <StepDots current={step} onSelect={goTo} />

      <div className={cn("mt-8", step < PUBLISH_STEP && "md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-12")}>
        <div className="max-w-2xl space-y-5">
          {step === 0 && <HouseStep form={form} update={update} />}
          {step === 1 && <PitchStep form={form} update={update} />}
          {step === 2 && <AboutStep about={about} update={update} />}
          {step === PUBLISH_STEP && (
            <div className="space-y-5">
              <p className="text-neutral-600">This is how your House shows up in the feed.</p>
              <div className="max-w-sm">{preview}</div>
              {!me && <p className="text-sm text-zinc-500">You&apos;ll log in before it goes live – your draft stays.</p>}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="pt-2">
            {step < PUBLISH_STEP ? (
              <button
                type="button"
                disabled={blocked}
                onClick={() => goTo(step + 1)}
                className={buttonClass("dark", "lg", "w-full sm:w-auto")}
              >
                Continue
              </button>
            ) : (
              <button type="button" onClick={publish} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
                Publish
              </button>
            )}
          </div>
        </div>

        {/* Desktop live preview while editing */}
        {step < PUBLISH_STEP && (
          <aside className="hidden md:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Live preview</p>
              {preview}
            </div>
          </aside>
        )}
      </div>
    </Container>
  );
}

/** The host as the preview card should show them – also before login, once there's a face photo. */
function previewHostOf(about: About, me?: User): User | undefined {
  if (!me && !about.photos[0]) return undefined;
  const base: User = me ?? { id: "preview", name: "", age: 0, country: "", city: "", languages: [], bio: "", photos: [], verified: false };
  return {
    ...base,
    name: about.name.trim() || base.name || "You",
    photos: about.photos.length > 0 ? about.photos : base.photos,
    languages: about.languages,
    bio: about.bio,
  };
}

/** Numbered dots with labels; completed steps are clickable to jump back. */
function StepDots({ current, onSelect }: { current: number; onSelect: (step: number) => void }) {
  return (
    <ol className="mt-5 flex gap-2 md:gap-6">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="min-w-0 flex-1 md:flex-none">
            <button
              type="button"
              disabled={i > current}
              onClick={() => onSelect(i)}
              aria-current={active ? "step" : undefined}
              className="flex w-full flex-col items-start gap-1.5 text-left disabled:cursor-default md:flex-row md:items-center md:gap-2"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-ink text-white",
                  done && "bg-accent text-white",
                  !active && !done && "bg-black/5 text-zinc-500",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("truncate text-xs md:text-sm", active ? "font-semibold text-ink" : "text-zinc-500")}>
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

function HouseStep({ form, update }: { form: FormState; update: Update }) {
  const price = Number(form.pricePerPerson) || 0;
  return (
    <>
      <Field label="Title">
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Remote Work Base by the Beach"
          maxLength={80}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <input className={inputClass} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Canggu" />
        </Field>
        <Field label="Region">
          <input className={inputClass} value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Bali, Indonesia" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" className={inputClass} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
        </Field>
        <Field label="End date">
          <input
            type="date"
            className={inputClass}
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => update("endDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Crew size (incl. you)" group>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={form.spotsTotal === n}
              onClick={() => update("spotsTotal", n)}
              className={cn(chipClass, form.spotsTotal === n ? chipActiveClass : chipInactiveClass, "flex-1")}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Vibe" group>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={form.vibe === v.key}
              onClick={() => update("vibe", v.key)}
              className={cn(chipClass, form.vibe === v.key ? chipActiveClass : chipInactiveClass)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </Field>

      <button
        type="button"
        role="switch"
        aria-checked={form.locked}
        onClick={() => update("locked", !form.locked)}
        className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left"
      >
        {form.locked ? <Lock className="size-5 text-accent" /> : <LockOpen className="size-5 text-neutral-400" />}
        <span className="flex-1">
          <span className="block text-sm font-medium">Accommodation is locked</span>
          <span className="block text-xs text-neutral-500">
            {form.locked ? "Guests see the booked place." : "Crew decides on the place together."}
          </span>
        </span>
        <span className={cn("relative h-6 w-11 rounded-full transition-colors", form.locked ? "bg-accent" : "bg-neutral-200")}>
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
              form.locked ? "translate-x-5.5" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
      <Field label={form.locked ? "Accommodation link" : "Accommodation link (optional)"} hint="Airbnb, Booking.com or any listing URL.">
        <input
          type="url"
          className={inputClass}
          value={form.accommodationLink}
          onChange={(e) => update("accommodationLink", e.target.value)}
          placeholder="https://www.airbnb.com/rooms/…"
        />
      </Field>
      {form.locked ? (
        <Field
          label="Final price per person (whole House)"
          hint={
            price > 0
              ? `Includes a ${formatPrice(simpuloFee(price))} Simpulo fee (10%).`
              : "Simpulo adds a 10% fee, included in this price."
          }
        >
          <EuroInput value={form.pricePerPerson} onChange={(v) => update("pricePerPerson", v)} placeholder="1200" />
        </Field>
      ) : (
        <Field
          label="Rough budget per person (optional)"
          hint="Your best guess for the whole House. The final price comes once the place is locked."
          group
        >
          <div className="grid grid-cols-2 gap-3">
            <EuroInput label="Budget from" value={form.budgetMin} onChange={(v) => update("budgetMin", v)} placeholder="400" />
            <EuroInput label="Budget to" value={form.budgetMax} onChange={(v) => update("budgetMax", v)} placeholder="600" />
          </div>
        </Field>
      )}
    </>
  );
}

function PitchStep({ form, update }: { form: FormState; update: Update }) {
  return (
    <>
      <Field label="Description">
        <textarea
          rows={5}
          className={textareaClass}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="The place, the area and the plan in a few sentences."
        />
      </Field>
      {PITCH_FIELDS.map(({ key, label, placeholder }) => (
        <Field key={key} label={`${label} (optional)`}>
          <textarea rows={3} className={textareaClass} value={form[key]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} />
        </Field>
      ))}
      <Field label="Note on your card (optional)" hint={`${form.hostNote.length}/${HOST_NOTE_MAX} – a short personal line, e.g. “First-timers very welcome”.`}>
        <input
          className={inputClass}
          value={form.hostNote}
          maxLength={HOST_NOTE_MAX}
          onChange={(e) => update("hostNote", e.target.value)}
          placeholder="Two spots left, flying in Feb 10 – who's in?"
        />
      </Field>
      <Field label="Interests" hint="Comma-separated, e.g. Surfing, Yoga, Startups">
        <input className={inputClass} value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder="Surfing, Yoga, Coffee" />
      </Field>
      <Field label="House rules" hint="One rule per line">
        <textarea
          rows={3}
          className={textareaClass}
          value={form.houseRules}
          onChange={(e) => update("houseRules", e.target.value)}
          placeholder={"Quiet hours after 11 pm\nShared groceries split weekly"}
        />
      </Field>
    </>
  );
}

function AboutStep({ about, update }: { about: About; update: Update }) {
  return (
    <>
      <Field label="Photos" group>
        <PhotoUploader photos={about.photos} onChange={(photos) => update("aboutPhotos", photos)} />
        <span className="mt-2 block text-xs text-neutral-500">Houses without a face photo don&apos;t get requests.</span>
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <Field label="First name">
          <input className={inputClass} value={about.name} onChange={(e) => update("aboutName", e.target.value)} placeholder="Mara" />
        </Field>
        <Field label="Age">
          <input
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            className={inputClass}
            value={about.age}
            onChange={(e) => update("aboutAge", e.target.value)}
            placeholder="27"
          />
        </Field>
      </div>
      <Field label="Country">
        <input className={inputClass} value={about.country} onChange={(e) => update("aboutCountry", e.target.value)} placeholder="Netherlands" />
      </Field>
      <Field label="Languages" group>
        <LanguageInput languages={about.languages} onChange={(languages) => update("aboutLanguages", languages)} />
      </Field>
      <Field label="Bio" hint={`${about.bio.length}/${BIO_MAX}`}>
        <textarea
          rows={3}
          maxLength={BIO_MAX}
          className={textareaClass}
          value={about.bio}
          onChange={(e) => update("aboutBio", e.target.value)}
          placeholder="Travel creator, 18k on TikTok. Filming a Bali series this winter."
        />
      </Field>
      <Field label="Social links (optional)" group>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="flex items-center rounded-xl border border-neutral-200 bg-white pl-4 focus-within:border-ink">
              <span className="w-20 shrink-0 text-xs font-medium text-zinc-500">{label}</span>
              <input
                className="h-11 min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-neutral-400"
                value={about.socials[key] ?? ""}
                onChange={(e) => update("aboutSocials", { ...about.socials, [key]: e.target.value })}
                placeholder={placeholder}
              />
            </label>
          ))}
        </div>
      </Field>
    </>
  );
}

/** Language chips; type one and press Enter or comma to add. */
function LanguageInput({ languages, onChange }: { languages: string[]; onChange: (languages: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add() {
    const next = splitList(draft, /,/).filter((l) => !languages.some((x) => x.toLowerCase() === l.toLowerCase()));
    if (next.length > 0) onChange([...languages, ...next]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && languages.length > 0) {
      onChange(languages.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-2 focus-within:border-ink">
      {languages.map((language) => (
        <span key={language} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-sm">
          {language}
          <button
            type="button"
            onClick={() => onChange(languages.filter((l) => l !== language))}
            aria-label={`Remove ${language}`}
            className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={languages.length === 0 ? "English, Spanish…" : "Add another"}
        aria-label="Add a language"
        className="h-8 min-w-28 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}

function EuroInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">€</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        aria-label={label}
        className={cn(inputClass, "pl-8")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-ink";
const textareaClass = cn(inputClass, "h-auto resize-none py-3");
// No class merging here, so active and inactive each set their own background (a shared bg-white would win).
const chipClass = "rounded-full border px-4 py-2 text-sm transition-colors";
const chipInactiveClass = "border-neutral-200 bg-white hover:border-neutral-400";
const chipActiveClass = "border-ink bg-ink text-white";

interface FieldProps {
  label: string;
  hint?: string;
  /** Renders a div instead of a <label> for groups of buttons */
  group?: boolean;
  children: ReactNode;
}

function Field({ label, hint, group = false, children }: FieldProps) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper className="block" {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-neutral-500">{hint}</span>}
    </Wrapper>
  );
}
