"use client";

import { ArrowLeft, Check, Link2, Lock, LockOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { linkDomain } from "@/lib/mock-extras";
import { getCurrentUser, useStore, type ProfilePatch } from "@/lib/store";
import type { Currency, NewStayInput, PrivateContacts, Stay, User, Vibe } from "@/lib/types";
import { CURRENCIES, SIMPULO_FEE_RATE, VIBES, cn, currencyForCountry, findUrls, languageCode, nightsBetween, simpuloFee, splitList } from "@/lib/utils";

const DRAFT_KEY = "draftHouse";
const HOST_NOTE_MAX = 60;
const BIO_MAX = 160;
const MAX_IDEAS = 3;

/** Labels: `create.socials.<key>`, placeholders: `create.socialPlaceholders.<placeholder>`. */
const SOCIAL_FIELDS = [
  { key: "instagram", placeholder: "handle" },
  { key: "tiktok", placeholder: "handle" },
  { key: "youtube", placeholder: "handle" },
  { key: "twitch", placeholder: "username" },
  { key: "kick", placeholder: "username" },
  { key: "linkedin", placeholder: "profileName" },
  { key: "x", placeholder: "handle" },
  { key: "website", placeholder: "url" },
] as const;
type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"];

/** Crew-only channels – labels `common.ui.crewContacts.channel.<key>`, placeholders `create.contactPlaceholders.<key>`. */
const CONTACT_FIELDS = ["whatsapp", "telegram", "signal", "discord", "phone", "facetime"] as const satisfies ReadonlyArray<keyof PrivateContacts>;

/** Labels: `create.steps.<key>`. */
const STEPS = ["house", "pitch", "about", "publish"] as const;
const PUBLISH_STEP = STEPS.length - 1;

interface FormState {
  // 1 · The House
  title: string;
  city: string;
  region: string;
  /** "City still open – we'll decide together": publishes without a city */
  cityOpen: boolean;
  startDate: string;
  endDate: string;
  spotsTotal: number;
  vibe: Vibe;
  /** ISO 639-1; "" = the host's first language (see languageOf) */
  language: string;
  /** "" = default from the host's country */
  currency: Currency | "";
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
  /** Up to 3 links; posted into the crew chat on publish (create only) */
  accommodationIdeas: string[];
  // 3 · About you – undefined = untouched, shown pre-filled from the logged-in user
  aboutPhotos?: string[];
  aboutName?: string;
  aboutAge?: string;
  aboutCountry?: string;
  aboutLanguages?: string[];
  aboutBio?: string;
  aboutSocials?: Partial<Record<SocialKey, string>>;
  aboutContacts?: PrivateContacts;
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
  contacts: PrivateContacts;
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
    contacts: { ...me?.privateContacts, ...form.aboutContacts },
  };
}

/** The House language options: the host's own languages as ISO codes (unknown names dropped), plus the current pick. */
function languageOptions(form: FormState, me?: User): string[] {
  const codes = aboutOf(form, me).languages.map(languageCode).filter((code): code is string => code !== undefined);
  const options = Array.from(new Set([...codes, ...(form.language ? [form.language] : [])]));
  return options.length > 0 ? options : ["en"];
}

/** The picked language, else the host's first one, else English. */
function languageOf(form: FormState, me?: User): string {
  return form.language || languageOptions(form, me)[0];
}

/** The House currency as it will be saved: the host's pick, else the currency of their country. */
function currencyOf(form: FormState, me?: User): Currency {
  return form.currency || currencyForCountry(form.aboutCountry ?? me?.country ?? "");
}

interface Draft {
  form: FormState;
  step: number;
}

const initialForm: FormState = {
  title: "",
  city: "",
  region: "",
  cityOpen: false,
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  vibe: "remote-work",
  language: "",
  currency: "",
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
  accommodationIdeas: ["", "", ""],
};

/** The edit page starts from the House as it is. */
function formFromStay(stay: Stay): FormState {
  const locked = stay.accommodationStatus === "locked";
  return {
    ...initialForm,
    title: stay.title,
    city: stay.city,
    region: stay.region,
    cityOpen: !stay.city.trim(),
    startDate: stay.startDate,
    endDate: stay.endDate,
    spotsTotal: stay.spotsTotal,
    vibe: stay.vibe,
    language: stay.language,
    currency: stay.currency,
    locked,
    accommodationLink: stay.accommodationLink ?? "",
    pricePerPerson: stay.pricePerPerson ? String(stay.pricePerPerson) : "",
    budgetMin: stay.budgetPerPerson ? String(stay.budgetPerPerson.min) : "",
    budgetMax: stay.budgetPerPerson ? String(stay.budgetPerPerson.max) : "",
    description: stay.description,
    whyText: stay.whyText,
    dayText: stay.dayText,
    lookingForText: stay.lookingForText,
    hostNote: stay.hostNote ?? "",
    interests: stay.interests.join(", "),
    houseRules: stay.houseRules.join("\n"),
  };
}

/** The idea links as they'll be posted: trimmed, non-empty, only while the place is still open. */
function ideasOf(form: FormState): string[] {
  // Anything that isn't a link is dropped rather than blocking the publish.
  return isLocked(form) ? [] : form.accommodationIdeas.map((l) => l.trim()).filter(isLink);
}

/** A single http(s) link and nothing else. */
const isLink = (value: string) => findUrls(value)[0] === value;

/** "Locked" only counts with both a link and a price – otherwise the House goes out with the place still open. */
function isLocked(form: FormState): boolean {
  return form.locked && form.accommodationLink.trim() !== "" && Number(form.pricePerPerson) > 0;
}

/** Optional budget: either end alone counts for both, a reversed range is turned around. */
function budgetOf(form: FormState): { min: number; max: number } | undefined {
  const values = [Number(form.budgetMin), Number(form.budgetMax)].filter((n) => n > 0).map(Math.round);
  if (values.length === 0) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Label `create.pitch.<message>`, placeholder `create.pitch.<message>Placeholder`. */
const PITCH_FIELDS: ReadonlyArray<{ key: "whyText" | "dayText" | "lookingForText"; message: "why" | "day" | "lookingFor" }> = [
  { key: "whyText", message: "why" },
  { key: "dayText", message: "day" },
  { key: "lookingForText", message: "lookingFor" },
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

/** A blocking problem: the key of its `create.errors` message. */
type StepError = { key: "title" | "region" | "dates" | "dateOrder" | "photo" } | { key: "minSpots"; count: number };

/**
 * What blocks publishing – and nothing else: title, dates, crew size, region, one face photo.
 * Everything optional is cleaned up in toInput instead (empty budget → "Budget TBD", city open, …).
 */
function validateStep(step: number, form: FormState, me?: User, minSpots = 1): StepError | null {
  if (step === 0) {
    if (!form.title.trim()) return { key: "title" };
    if (!form.region.trim()) return { key: "region" };
    if (!form.startDate || !form.endDate) return { key: "dates" };
    if (nightsBetween(form.startDate, form.endDate) < 1) return { key: "dateOrder" };
    if (form.spotsTotal < minSpots) return { key: "minSpots", count: minSpots };
  }
  if (step === 2 && !aboutOf(form, me).photos[0]) return { key: "photo" };
  return null;
}

function toInput(form: FormState, me?: User): NewStayInput {
  return {
    title: form.title.trim(),
    city: form.cityOpen ? "" : form.city.trim(),
    region: form.region.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    spotsTotal: form.spotsTotal,
    vibe: form.vibe,
    language: languageOf(form, me),
    currency: currencyOf(form, me),
    // A fixed price only exists for a locked place; otherwise there's at most a rough budget.
    pricePerPerson: isLocked(form) ? Math.round(Number(form.pricePerPerson)) : undefined,
    budgetPerPerson: isLocked(form) ? undefined : budgetOf(form),
    accommodationLink: form.accommodationLink.trim() || undefined,
    accommodationStatus: isLocked(form) ? "locked" : "open",
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
    // Only the photo is required – keep what the profile has when a field is left empty.
    ...(about.name.trim() && { name: about.name.trim() }),
    ...(Number(about.age) >= 18 && { age: Number(about.age) }),
    ...(about.country.trim() && { country: about.country.trim() }),
    languages: about.languages,
    bio: about.bio.trim().slice(0, BIO_MAX),
  };
  for (const { key } of SOCIAL_FIELDS) {
    const value = about.socials[key]?.trim();
    if (value) patch[key] = value;
  }
  // Crew-only channels: what's filled in replaces the stored set (an emptied field removes that channel).
  const contacts: PrivateContacts = {};
  for (const key of CONTACT_FIELDS) {
    const value = about.contacts[key]?.trim();
    if (value) contacts[key] = value;
  }
  patch.privateContacts = contacts;
  return patch;
}

const noSubscribe = () => () => {};

export function CreateStayForm() {
  // The page is prerendered with an empty form. After hydration the wizard remounts once and restores the
  // saved draft – restoring during hydration itself would mismatch the server HTML.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return <CreateWizard key={hydrated ? "restored" : "initial"} restore={hydrated} />;
}

/** The same stepper, filled with an existing House; "Save" updates it. Host only – the page gates that. */
export function EditStayForm({ stay }: { stay: Stay }) {
  return <CreateWizard restore={false} editing={stay} />;
}

function CreateWizard({ restore, editing }: { restore: boolean; editing?: Stay }) {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const showToast = useToast();
  const t = useTranslations("create");
  const [initialDraft] = useState(() => (restore ? readDraft() : null));
  const [form, setForm] = useState<FormState>(() => (editing ? formFromStay(editing) : (initialDraft?.form ?? initialForm)));
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [error, setError] = useState<StepError | null>(null);
  const me = getCurrentUser(store);
  const minSpots = editing ? Math.max(2, editing.spotsFilled) : 2;
  const check = (i: number) => validateStep(i, form, me, minSpots);

  // Keep the draft so a refresh doesn't lose it (only once restored, so the empty first render can't overwrite it).
  useEffect(() => {
    // Edits are never drafted: the House itself is the saved state.
    if (!restore || editing) return;
    try {
      // Photos are left out (undefined is dropped by JSON): their blob: URLs stop working after a reload.
      const persisted: FormState = { ...form, aboutPhotos: undefined };
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: persisted, step } satisfies Draft));
    } catch {
      // storage full or blocked – the draft just won't survive a refresh
    }
  }, [form, step, restore, editing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function goTo(target: number) {
    // Forward only through valid steps; backwards always.
    for (let i = step; i < target; i++) {
      const problem = check(i);
      if (problem) {
        setStep(i);
        return setError(problem);
      }
    }
    setError(null);
    setStep(target);
  }

  /** First invalid step jumps into view with its message; true when everything is valid. */
  function validateAll(): boolean {
    for (let i = 0; i < PUBLISH_STEP; i++) {
      const problem = check(i);
      if (problem) {
        setStep(i);
        setError(problem);
        return false;
      }
    }
    return true;
  }

  function save() {
    if (!editing || !validateAll()) return;
    store.updateStay(editing.id, toInput(form, me));
    store.updateCurrentUser(toProfilePatch(form, me));
    showToast(t("saved"));
    router.push(`/my-stays/${editing.id}`);
  }

  function publish() {
    if (!validateAll()) return;
    // Logged out: log in first, then publish – the draft is still in state, nothing is lost.
    requireAuth(() => {
      const slug = store.createStay(toInput(form, me), ideasOf(form));
      store.updateCurrentUser(toProfilePatch(form, me));
      clearDraft();
      showToast(t("published"));
      router.push(`/stays/${slug}`);
    }, t("loginToPublish"));
  }

  const about = aboutOf(form, me);
  const previewHost = previewHostOf(about, me, t("previewName"));
  // Step 3 can't be left without a face photo.
  const blocked = step === 2 && !about.photos[0];
  const previewStay: Stay = {
    ...toInput(form, me),
    id: "preview",
    slug: "preview",
    hostId: me?.id ?? "preview",
    lat: 0,
    lng: 0,
    mapPreviewUrl: "",
    spotsFilled: editing?.spotsFilled ?? 1,
    currency: currencyOf(form, me),
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
            aria-label={t("previousStep")}
            className="-ml-2 rounded-full p-2 hover:bg-black/5"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{editing ? t("title.edit") : t("title.create")}</h1>
      </div>

      {/* Editing: every step is reachable – the House is complete already. */}
      <StepDots current={step} reachable={editing ? PUBLISH_STEP : step} onSelect={goTo} />

      <div className={cn("mt-8", step < PUBLISH_STEP && "md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-12")}>
        <div className="max-w-2xl space-y-5">
          {step === 0 && (
            <HouseStep form={form} update={update} minSpots={minSpots} language={languageOf(form, me)} languages={languageOptions(form, me)} currency={currencyOf(form, me)} />
          )}
          {step === 1 && <PitchStep form={form} update={update} showIdeas={!editing} />}
          {step === 2 && <AboutStep about={about} update={update} />}
          {step === PUBLISH_STEP && (
            <div className="space-y-5">
              <p className="text-neutral-600">{t("publishIntro")}</p>
              <div className="max-w-sm">{preview}</div>
              {!me && <p className="text-sm text-zinc-500">{t("loginBeforeLive")}</p>}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error.key === "minSpots" ? t("errors.minSpots", { count: error.count }) : t(`errors.${error.key}`)}
            </p>
          )}

          <div className="pt-2">
            {editing ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={blocked} onClick={save} className={buttonClass("dark", "lg", "w-full sm:w-auto")}>
                  {t("save")}
                </button>
                {step < PUBLISH_STEP && (
                  <button type="button" disabled={blocked} onClick={() => goTo(step + 1)} className={buttonClass("ghost", "lg", "w-full sm:w-auto")}>
                    {t("nextStep")}
                  </button>
                )}
              </div>
            ) : step < PUBLISH_STEP ? (
              <button
                type="button"
                disabled={blocked}
                onClick={() => goTo(step + 1)}
                className={buttonClass("dark", "lg", "w-full sm:w-auto")}
              >
                {t("continue")}
              </button>
            ) : (
              <button type="button" onClick={publish} className={buttonClass("dark", "lg", "w-full sm:w-auto")}>
                {t("publish")}
              </button>
            )}
          </div>
        </div>

        {/* Desktop live preview while editing */}
        {step < PUBLISH_STEP && (
          <aside className="hidden md:block">
            <div className="sticky top-[calc(var(--header-h)+24px)]">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">{t("livePreview")}</p>
              {preview}
            </div>
          </aside>
        )}
      </div>
    </Container>
  );
}

/** The host as the preview card should show them – also before login, once there's a face photo. */
function previewHostOf(about: About, me: User | undefined, fallbackName: string): User | undefined {
  if (!me && !about.photos[0]) return undefined;
  const base: User = me ?? { id: "preview", name: "", age: 0, country: "", city: "", languages: [], bio: "", photos: [], verified: false };
  return {
    ...base,
    name: about.name.trim() || base.name || fallbackName,
    photos: about.photos.length > 0 ? about.photos : base.photos,
    languages: about.languages,
    bio: about.bio,
  };
}

/** Numbered dots with labels; completed steps are clickable to jump back. */
function StepDots({ current, reachable, onSelect }: { current: number; reachable: number; onSelect: (step: number) => void }) {
  const t = useTranslations("create.steps");
  return (
    <ol className="mt-5 flex gap-2 md:gap-6">
      {STEPS.map((key, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={key} className="min-w-0 flex-1 md:flex-none">
            <button
              type="button"
              disabled={i > reachable}
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
                {t(key)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

interface HouseStepProps {
  form: FormState;
  update: Update;
  minSpots: number;
  /** The House language as it will be saved */
  language: string;
  /** Codes to pick from */
  languages: string[];
  /** The House currency as it will be saved */
  currency: Currency;
}

function HouseStep({ form, update, minSpots, language, languages, currency }: HouseStepProps) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const price = Number(form.pricePerPerson) || 0;
  return (
    <>
      <Field label={t("title")}>
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={80}
        />
      </Field>
      <Field label={t("region")} hint={t("regionHint")}>
        <input className={inputClass} value={form.region} onChange={(e) => update("region", e.target.value)} placeholder={t("regionPlaceholder")} />
      </Field>
      <div>
        <Field label={t("city")}>
          <input
            className={cn(inputClass, "disabled:bg-zinc-50 disabled:text-zinc-400")}
            value={form.cityOpen ? "" : form.city}
            disabled={form.cityOpen}
            onChange={(e) => update("city", e.target.value)}
            placeholder={form.cityOpen ? t("cityOpenPlaceholder") : t("cityPlaceholder")}
          />
        </Field>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.cityOpen}
            onChange={(e) => update("cityOpen", e.target.checked)}
            className="size-4 accent-[var(--color-ink)]"
          />
          {t("cityOpen")}
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("startDate")}>
          <input type="date" className={inputClass} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
        </Field>
        <Field label={t("endDate")}>
          <input
            type="date"
            className={inputClass}
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => update("endDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("crewSize")} group>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={form.spotsTotal === n}
              disabled={n < minSpots}
              onClick={() => update("spotsTotal", n)}
              className={cn(chipClass, form.spotsTotal === n ? chipActiveClass : chipInactiveClass, "flex-1 disabled:cursor-not-allowed disabled:opacity-40")}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("vibe")} group>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={form.vibe === v.key}
              onClick={() => update("vibe", v.key)}
              className={cn(chipClass, form.vibe === v.key ? chipActiveClass : chipInactiveClass)}
            >
              {format.vibe(v.key)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("language")} hint={t("languageHint")} group>
        <div className="flex flex-wrap gap-2">
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={language === code}
              onClick={() => update("language", code)}
              className={cn(chipClass, language === code ? chipActiveClass : chipInactiveClass)}
            >
              {format.language(code)}
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
          <span className="block text-sm font-medium">{t("locked")}</span>
          <span className="block text-xs text-neutral-500">
            {form.locked ? t("lockedOn") : t("lockedOff")}
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
      <Field
        label={t("link")}
        hint={form.locked && !isLocked(form) ? t("linkHintIncomplete") : t("linkHint")}
      >
        <input
          type="url"
          className={inputClass}
          value={form.accommodationLink}
          onChange={(e) => update("accommodationLink", e.target.value)}
          placeholder={t("linkPlaceholder")}
        />
      </Field>
      {form.locked ? (
        <Field
          label={t("price")}
          hint={
            price > 0
              ? t("priceHintFee", { fee: format.price(simpuloFee(price), currency), rate: SIMPULO_FEE_RATE })
              : t("priceHint", { rate: SIMPULO_FEE_RATE })
          }
        >
          <MoneyInput symbol={format.currencySymbol(currency)} value={form.pricePerPerson} onChange={(v) => update("pricePerPerson", v)} placeholder={t("pricePlaceholder")} />
        </Field>
      ) : (
        <Field
          label={t("budget")}
          hint={t("budgetHint")}
          group
        >
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput symbol={format.currencySymbol(currency)} label={t("budgetFrom")} value={form.budgetMin} onChange={(v) => update("budgetMin", v)} placeholder={t("budgetFromPlaceholder")} />
            <MoneyInput symbol={format.currencySymbol(currency)} label={t("budgetTo")} value={form.budgetMax} onChange={(v) => update("budgetMax", v)} placeholder={t("budgetToPlaceholder")} />
          </div>
        </Field>
      )}
      <Field label={t("currency")} hint={t("currencyHint")} group>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={currency === code}
              onClick={() => update("currency", code)}
              className={cn(chipClass, currency === code ? chipActiveClass : chipInactiveClass)}
            >
              {code}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function PitchStep({ form, update, showIdeas }: { form: FormState; update: Update; showIdeas: boolean }) {
  const t = useTranslations("create.pitch");
  return (
    <>
      <Field label={t("description")}>
        <textarea
          rows={5}
          className={textareaClass}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
      </Field>
      {PITCH_FIELDS.map(({ key, message }) => (
        <Field key={key} label={t("optional", { label: t(message) })}>
          <textarea
            rows={3}
            className={textareaClass}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
            placeholder={t(`${message}Placeholder`)}
          />
        </Field>
      ))}
      <Field label={t("hostNote")} hint={t("hostNoteHint", { count: form.hostNote.length, max: HOST_NOTE_MAX })}>
        <input
          className={inputClass}
          value={form.hostNote}
          maxLength={HOST_NOTE_MAX}
          onChange={(e) => update("hostNote", e.target.value)}
          placeholder={t("hostNotePlaceholder")}
        />
      </Field>
      <Field label={t("interests")} hint={t("interestsHint")}>
        <input className={inputClass} value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder={t("interestsPlaceholder")} />
      </Field>
      <Field label={t("houseRules")} hint={t("houseRulesHint")}>
        <textarea
          rows={3}
          className={textareaClass}
          value={form.houseRules}
          onChange={(e) => update("houseRules", e.target.value)}
          placeholder={t("houseRulesPlaceholder")}
        />
      </Field>
      {/* Only while the crew still picks the place – after publishing, ideas go straight into the chat. */}
      {showIdeas && !form.locked && (
        <IdeasField ideas={form.accommodationIdeas} onChange={(ideas) => update("accommodationIdeas", ideas)} />
      )}
    </>
  );
}

/** Up to 3 links, each with a placeholder preview row once it's a valid link. */
function IdeasField({ ideas, onChange }: { ideas: string[]; onChange: (ideas: string[]) => void }) {
  const t = useTranslations("create.pitch");
  const slots = Array.from({ length: MAX_IDEAS }, (_, i) => ideas[i] ?? "");
  return (
    <Field label={t("ideas")} hint={t("ideasHint")} group>
      <div className="space-y-2">
        {slots.map((value, i) => {
          const link = value.trim();
          return (
            <div key={i} className="space-y-2">
              <input
                type="url"
                inputMode="url"
                aria-label={t("ideaLabel", { number: i + 1 })}
                className={inputClass}
                value={value}
                onChange={(e) => onChange(slots.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={i === 0 ? t("ideaPlaceholder") : t("ideaPlaceholderMore")}
              />
              {link && isLink(link) && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white p-2">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                    <Link2 className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{linkDomain(link)}</span>
                    <span className="block text-xs text-zinc-500">{t("ideaPreview")}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Field>
  );
}

function AboutStep({ about, update }: { about: About; update: Update }) {
  const t = useTranslations("create");
  const tContacts = useTranslations("common.ui.crewContacts");
  return (
    <>
      <Field label={t("about.photos")} group>
        <PhotoUploader photos={about.photos} onChange={(photos) => update("aboutPhotos", photos)} />
        <span className="mt-2 block text-xs text-neutral-500">{t("about.photosHint")}</span>
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <Field label={t("about.name")}>
          <input className={inputClass} value={about.name} onChange={(e) => update("aboutName", e.target.value)} placeholder={t("about.namePlaceholder")} />
        </Field>
        <Field label={t("about.age")}>
          <input
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            className={inputClass}
            value={about.age}
            onChange={(e) => update("aboutAge", e.target.value)}
            placeholder={t("about.agePlaceholder")}
          />
        </Field>
      </div>
      <Field label={t("about.country")}>
        <input className={inputClass} value={about.country} onChange={(e) => update("aboutCountry", e.target.value)} placeholder={t("about.countryPlaceholder")} />
      </Field>
      <Field label={t("about.languages")} group>
        <LanguageInput languages={about.languages} onChange={(languages) => update("aboutLanguages", languages)} />
      </Field>
      <Field label={t("about.bio")} hint={t("about.bioHint", { count: about.bio.length, max: BIO_MAX })}>
        <textarea
          rows={3}
          maxLength={BIO_MAX}
          className={textareaClass}
          value={about.bio}
          onChange={(e) => update("aboutBio", e.target.value)}
          placeholder={t("about.bioPlaceholder")}
        />
      </Field>
      <Field label={t("about.publicLinks")} hint={t("about.publicLinksHint")} group>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(({ key, placeholder }) => (
            <label key={key} className="flex items-center rounded-xl border border-neutral-200 bg-white pl-4 focus-within:border-ink">
              <span className="w-20 shrink-0 text-xs font-medium text-zinc-500">{t(`socials.${key}`)}</span>
              <input
                className="h-11 min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-neutral-400"
                value={about.socials[key] ?? ""}
                onChange={(e) => update("aboutSocials", { ...about.socials, [key]: e.target.value })}
                placeholder={t(`socialPlaceholders.${placeholder}`)}
              />
            </label>
          ))}
        </div>
      </Field>
      <Field label={t("about.crewOnly")} hint={t("about.crewOnlyHint")} group>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTACT_FIELDS.map((key) => (
            <label key={key} className="flex items-center rounded-xl border border-dashed border-neutral-300 bg-white pl-4 focus-within:border-ink">
              <span className="w-20 shrink-0 text-xs font-medium text-zinc-500">{tContacts(`channel.${key}`)}</span>
              <input
                className="h-11 min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-neutral-400"
                value={about.contacts[key] ?? ""}
                onChange={(e) => update("aboutContacts", { ...about.contacts, [key]: e.target.value })}
                placeholder={t(`contactPlaceholders.${key}`)}
                inputMode={key === "telegram" || key === "discord" || key === "facetime" ? "text" : "tel"}
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
  const t = useTranslations("create.about");
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
            aria-label={t("removeLanguage", { language })}
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
        placeholder={languages.length === 0 ? t("languagesPlaceholder") : t("languagesPlaceholderMore")}
        aria-label={t("addLanguage")}
        className="h-8 min-w-28 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Currency symbol shown inside the field ("€", "A$") */
  symbol: string;
  label?: string;
}

function MoneyInput({ value, onChange, placeholder, symbol, label }: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">{symbol}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        aria-label={label}
        className={cn(inputClass, "pl-11")}
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
