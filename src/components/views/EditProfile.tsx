"use client";

import { BackLink } from "@/components/ui/BackButton";
import { ArrowUpRight, Check, ChevronDown, ChevronLeft, Eye, Plus, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { VerifyIdSheet } from "@/components/account/VerifyIdSheet";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { FormField } from "@/components/form/FormLayout";
import { Container } from "@/components/layout/Container";
import { RequestRow } from "@/components/stay/HouseDetail";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Combobox, type ComboOption } from "@/components/ui/Combobox";
import { Input, Textarea, inputStyles } from "@/components/ui/Input";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { listItemStyles } from "@/components/ui/listSelection";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Sheet } from "@/components/ui/Sheet";
import { SOCIAL_ICONS } from "@/components/ui/socialIcons";
import { ProfilePreviewBody } from "@/components/views/ProfileView";
import { InForEditor, useInForLine } from "@/components/InFor";
import { activeInForOf } from "@/lib/inFor";
import { HOUSE_VIBE_SCALES, HOUSE_VIBE_STEPS } from "@/config/houseVibe";
import { PROFILE_SECTIONS, sectionStatus, type ProfileSectionKey, type ProfileSectionStatus } from "@/config/profile-sections";
import { MIN_AGE, ageOn, isoOf, partsOf, useTodayIso, type DateParts } from "@/lib/birthDate";
import { useIdentity } from "@/lib/payments/hooks";
import { COUNTRIES, PLACES } from "@/lib/places";
import { HANDLE_PREFIX, MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS, isValidHandle, isValidWebsite, normalizeSocialValue, socialHandle } from "@/lib/socialLinks";
import { getCurrentUser, useStore, type ProfilePatch } from "@/lib/store";
import type { HouseVibe, JoinRequest, SocialLink, SocialPlatform, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;
const BIO_MAX = 600;
/** The preview renders the real profile at this width, then scales it to its column. */
const PREVIEW_DESIGN_W = 1100;

/** "Based in" suggestions – a mock list now, Google Places later; anything else typed is kept. */
const CITY_OPTIONS: ComboOption[] = PLACES.map((p) => ({ value: p.name, label: p.name, hint: p.country }));

export function EditProfile() {
  const t = useTranslations("profile.edit");
  return (
    <RequireLogin title={t("loginTitle")}>
      <EditProfileGate />
    </RequireLogin>
  );
}

function EditProfileGate() {
  const me = getCurrentUser(useStore());
  // Keyed by user: switching the dev user starts a fresh form.
  return me ? <EditProfileForm key={me.id} me={me} /> : null;
}

interface FormState {
  photos: string[];
  name: string;
  birth: DateParts;
  country: string;
  city: string;
  languages: string[];
  bio: string;
  /** Public links as typed, in the order they were added (at most MAX_SOCIAL_LINKS) */
  socials: SocialLink[];
  /** How they live in a House (config/houseVibe.ts); unset until chosen */
  houseVibe?: HouseVibe;
}

function formOf(me: User): FormState {
  return {
    photos: me.photos,
    name: me.name,
    birth: partsOf(me.birthDate),
    country: me.country,
    city: me.city,
    languages: me.languages,
    bio: me.bio,
    socials: me.socials ?? [],
    houseVibe: me.houseVibe,
  };
}

/** The profile as it would look after saving – drives the live preview, the sections' status and the saved patch. */
function draftOf(me: User, form: FormState, today: string | null): User {
  const birthDate = isoOf(form.birth);
  return {
    ...me,
    photos: form.photos,
    name: form.name.trim() || me.name,
    // Only a date that's fully set counts – none, and there's no age (the preview leaves it out).
    birthDate: birthDate ?? undefined,
    age: birthDate && today ? ageOn(birthDate, today) : me.age,
    country: form.country.trim(),
    city: form.city.trim(),
    houseVibe: form.houseVibe,
    languages: form.languages,
    bio: form.bio.trim().slice(0, BIO_MAX),
    // Empty rows are dropped; a handle is stored bare, a website as its full URL.
    socials: form.socials
      .map((link) => ({ platform: link.platform, value: normalizeSocialValue(link.platform, link.value) }))
      .filter((link) => link.value !== "")
      .slice(0, MAX_SOCIAL_LINKS),
  };
}

/** A link's problem, if any: a website must be a full, valid address; a handle only the characters handles use. */
function linkError(link: SocialLink): "website" | "handle" | null {
  const value = normalizeSocialValue(link.platform, link.value);
  if (!value) return null;
  if (link.platform === "website") return isValidWebsite(value) ? null : "website";
  return isValidHandle(value) ? null : "handle";
}

/** Picking the first scale: the others start in the middle. */
const DEFAULT_HOUSE_VIBE: HouseVibe = { rhythm: 2, social: 2, energy: 2, tidy: 2 };

type FormError = "photo" | "name" | "birthDate" | "underAge" | "country" | "links";

/** Required: a photo, first name, date of birth (18+), country. Links are optional – but the ones given must be valid. */
function validate(form: FormState, today: string | null): FormError | null {
  if (form.photos.length === 0) return "photo";
  if (!form.name.trim()) return "name";
  const birthDate = isoOf(form.birth);
  if (!birthDate) return "birthDate";
  if (today && ageOn(birthDate, today) < MIN_AGE) return "underAge";
  if (!form.country.trim()) return "country";
  if (form.socials.some((link) => linkError(link))) return "links";
  return null;
}

/** How long after the last change the profile is saved (autosave, like Settings). */
const AUTOSAVE_MS = 600;

/** The part of the profile this page edits – what's compared to tell "saved" from "saving". */
const patchOf = (user: User): ProfilePatch => ({
  photos: user.photos,
  name: user.name,
  age: user.age,
  birthDate: user.birthDate,
  country: user.country,
  city: user.city,
  languages: user.languages,
  bio: user.bio,
  socials: user.socials ?? [],
  houseVibe: user.houseVibe,
});

/** ?setup=1 – the onboarding: read in the browser only (no Suspense boundary needed). */
const noSubscribe = () => () => {};
function useSetupParam(): boolean {
  return useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get("setup") === "1", () => false);
}

/**
 * /settings/profile – Edit profile: the sections as one list on the left (an accordion, one open at a time), the live preview on the right.
 * Like Settings: no Save button, every valid change is saved by itself ("Saved ✓"). From 1024px one block centred, at most 1200px: the list
 * 440px, 48px, the preview (sticky 96px from the top). Onboarding (?setup=1, or an account still missing what's required) is the same page:
 * it starts at the first section to do, "Next" instead of "Done", at the end "See your profile". Phones: the list alone, "Preview" at the
 * bottom opens the preview in a sheet.
 */
function EditProfileForm({ me }: { me: User }) {
  const t = useTranslations("profile.edit");
  const tVibe = useTranslations("profile.vibe");
  const tSettings = useTranslations("settings.ui");
  const store = useStore();
  const [form, setForm] = useState<FormState>(() => formOf(me));
  const [previewOpen, setPreviewOpen] = useState(false);
  const today = useTodayIso();
  const setupParam = useSetupParam();

  const draft = draftOf(me, form, today);
  const problem = validate(form, today);
  // Changed at all (the form against the saved profile) – and changed in what gets saved (the cleaned-up draft against the profile).
  const touched = JSON.stringify(form) !== JSON.stringify(formOf(me));
  const dirty = JSON.stringify(patchOf(draft)) !== JSON.stringify(patchOf(me));
  const status: "saved" | "saving" | "invalid" = touched && problem ? "invalid" : dirty ? "saving" : "saved";

  // Autosave: a moment after the last valid change, the draft goes to the profile. Nothing is set here – "saved" follows from the store.
  const pending = status === "saving" ? JSON.stringify(patchOf(draft)) : null;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => store.updateCurrentUser(JSON.parse(pending) as ProfilePatch), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [pending, store]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // "I'm in for" lives in the store (lib/inFor.ts): done while one is running; not part of the progress.
  const myInFor = today ? activeInForOf(store.inFor, me.id, today) : [];
  const inForLine = useInForLine();
  const statuses = Object.fromEntries(
    PROFILE_SECTIONS.map(({ key }) => [key, key === "inFor" ? (myInFor.length > 0 ? "complete" : "optional") : sectionStatus(key, draft, today)]),
  ) as Record<ProfileSectionKey, ProfileSectionStatus>;
  const counted = PROFILE_SECTIONS.filter((s) => s.progress !== false);
  const doneCount = counted.filter(({ key }) => statuses[key] === "complete").length;
  // Onboarding: asked for (?setup=1), or a new account (no photo yet).
  const [setup] = useState(() => setupParam || me.photos.length === 0);
  const firstOpen = PROFILE_SECTIONS.find(({ key }) => statuses[key] !== "complete")?.key ?? null;
  const [open, setOpen] = useState<ProfileSectionKey | null>(() => (setup ? firstOpen : null));
  const order = PROFILE_SECTIONS.map((s) => s.key);
  /** "Done": closes this one and opens the next section still to do (after it, then from the top); none left: all closed. */
  const done = (key: ProfileSectionKey) => {
    const i = order.indexOf(key);
    const next = [...order.slice(i + 1), ...order.slice(0, i)].find((k) => statuses[k] !== "complete") ?? null;
    setOpen(next);
  };
  /** Onboarding's "Next": simply the next section in order. */
  const next = (key: ProfileSectionKey) => setOpen(order[order.indexOf(key) + 1] ?? null);

  // A problem shows at its field once something has changed (a fresh page shows none).
  const errorText = (key: FormError) => (touched && problem === key ? t(`errors.${key}`) : null);

  const statusLine = (
    <span aria-live="polite" className={cn("inline-flex items-center gap-1 text-small", status === "invalid" ? "text-danger" : "text-muted")}>
      {status === "saved" && (
        <>
          {t("statusSaved")}
          <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
        </>
      )}
      {status === "saving" && t("statusSaving")}
      {status === "invalid" && t("statusInvalid")}
    </span>
  );

  const bodyOf = (key: ProfileSectionKey): ReactNode => {
    switch (key) {
      case "photos":
        return (
          <>
            <PhotoUploader photos={form.photos} onChange={(photos) => update("photos", photos)} slots={MAX_PHOTOS} labels="profile" />
            <p className={cn("text-small", errorText("photo") ? "text-danger" : "text-muted")}>{errorText("photo") ?? t("photosHint", { max: MAX_PHOTOS })}</p>
          </>
        );
      case "basics":
        return <BasicsSection form={form} update={update} today={today} errorText={errorText} />;
      case "vibe":
        return <VibeSection value={form.houseVibe} onChange={(houseVibe) => update("houseVibe", houseVibe)} />;
      case "about":
        return (
          <>
            <BioField value={form.bio} onChange={(bio) => update("bio", bio)} />
            <FormField label={t("languages")} optional group>
              <LanguageInput languages={form.languages} onChange={(languages) => update("languages", languages)} />
            </FormField>
          </>
        );
      case "links":
        return <SocialLinksEditor links={form.socials} onChange={(socials) => update("socials", socials)} showErrors={Boolean(errorText("links"))} />;
      case "verify":
        return <VerifySection me={me} />;
      case "inFor":
        return <InForEditor />;
    }
  };

  const list = (
    <div className="flex flex-col gap-4">
      <Progress done={doneCount} total={counted.length} />
      <ul className="overflow-hidden rounded-[20px] bg-(--surface)">
        {PROFILE_SECTIONS.map(({ key, icon: Icon }, i) => {
          const isOpen = open === key;
          const isLast = i === PROFILE_SECTIONS.length - 1;
          return (
            <li key={key} className={cn(i > 0 && "border-t border-ink/6")}>
              <button
                type="button"
                id={`section-${key}`}
                aria-expanded={isOpen}
                aria-controls={`section-${key}-body`}
                onClick={() => setOpen(isOpen ? null : key)}
                className="flex min-h-16 w-full items-center gap-3 px-5 text-left transition-colors duration-150 hover:bg-ink/3"
              >
                <Icon aria-hidden className="size-5 shrink-0 text-ink/70" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 py-2.5">
                  <span className="block text-body font-semibold text-ink">{t(`sections.${key}.title`)}</span>
                  {!isOpen && (
                    <span className="block truncate text-small text-muted">
                      {key === "vibe" && draft.houseVibe
                        ? HOUSE_VIBE_SCALES.map(({ key: k }) => tVibe(`${k}.${draft.houseVibe![k]}`)).join(" · ")
                        : key === "inFor"
                          ? myInFor.length > 0
                            ? myInFor.map(inForLine).join(", ")
                            : t("sections.inFor.empty")
                          : summaryOf(key, draft, t, Boolean(isoOf(form.birth)))}
                    </span>
                  )}
                </span>
                <StatusMark status={statuses[key]} />
                <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-ink/40 transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div id={`section-${key}-body`} role="region" aria-labelledby={`section-${key}`} className="flex flex-col gap-5 px-5 pb-5">
                  {bodyOf(key)}
                  <div className="flex justify-end">
                    {setup && isLast ? (
                      <Button href="/profile" size="md">
                        {t("seeProfile")}
                      </Button>
                    ) : (
                      <Button size="md" onClick={() => (setup ? next(key) : done(key))}>
                        {setup ? t("next") : t("done")}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <Container className="pb-28 pt-6 md:pt-8 lg:pb-(--space-section)">
      <div className="lg:mx-auto lg:max-w-[1200px]">
        {/* The head over both columns: the way back, the title; right the save state and "View profile ↗". */}
        <BackLink href="/settings" className="-ml-1 inline-flex items-center gap-0.5 text-small text-muted transition-colors hover:text-ink">
          <ChevronLeft aria-hidden className="size-4" />
          {tSettings("back")}
        </BackLink>
        <div className="mb-8 mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h1 className="text-h1 text-ink">{t("title")}</h1>
          <div className="flex items-center gap-5">
            {statusLine}
            <Link href="/profile" className="inline-flex items-center gap-1 text-body font-semibold text-ink underline-offset-4 hover:underline">
              {t("viewProfile")}
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
        <div className="lg:grid lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="min-w-0">{list}</div>
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <ProfilePreview user={draft} ageKnown={Boolean(isoOf(form.birth))} focus={open} />
          </aside>
        </div>
      </div>
      {/* Phones: the list alone; the preview behind a fixed button at the bottom. */}
      <div className="fixed inset-x-4 bottom-4 z-30 flex justify-center lg:hidden">
        <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <Eye />
          {t("previewButton")}
        </Button>
      </div>
      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={t("howOthersSeeYou")}>
        <ProfilePreview user={draft} ageKnown={Boolean(isoOf(form.birth))} focus={open} />
      </Sheet>
    </Container>
  );
}

/** "4 of 6 · Hosts see this first" with an orange ring (40px); all done: "Profile complete" with a check, no ring. */
function Progress({ done, total }: { done: number; total: number }) {
  const t = useTranslations("profile.edit");
  if (done === total) {
    return (
      <p className="flex items-center gap-2 text-body font-semibold text-ink">
        <span className="flex size-10 items-center justify-center rounded-full bg-ink/6">
          <Check aria-hidden className="size-5" strokeWidth={2.5} />
        </span>
        {t("progressComplete")}
      </p>
    );
  }
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <p className="flex items-center gap-3 text-body text-ink">
      <svg aria-hidden viewBox="0 0 40 40" className="size-10 shrink-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" className="stroke-ink/10" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} className="stroke-accent transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none" />
      </svg>
      <span>
        <span className="font-semibold">{t("progressOf", { done, total })}</span>
        <span className="text-muted"> · {t("progressHint")}</span>
      </span>
    </p>
  );
}

/** A row's status on its right: a check (ink 40 %), an orange dot (required and missing), or "Optional". */
function StatusMark({ status }: { status: ProfileSectionStatus }) {
  const t = useTranslations("profile.edit");
  if (status === "complete") return <Check aria-label={t("statusComplete")} className="size-4 shrink-0 text-ink/40" strokeWidth={2.5} />;
  if (status === "missing") return <span role="img" aria-label={t("statusMissing")} className="size-2 shrink-0 rounded-full bg-accent" />;
  return <span className="shrink-0 text-small text-muted">{t("statusOptional")}</span>;
}

/** A section's one line when closed – from the data: "3 photos", "Aisha · 29 · Ireland", "Early bird · Social", … */
function summaryOf(key: ProfileSectionKey, user: User, t: ReturnType<typeof useTranslations<"profile.edit">>, ageKnown: boolean): string {
  switch (key) {
    case "photos":
      return user.photos.length > 0 ? t("sections.photos.summary", { count: user.photos.length }) : t("sections.photos.empty");
    case "basics":
      return [user.name.split(" ")[0], ageKnown ? String(user.age) : null, user.country || null].filter(Boolean).join(" · ") || t("sections.basics.empty");
    case "vibe":
      return user.houseVibe ? t("sections.vibe.summary") : t("sections.vibe.empty");
    case "about":
      return user.bio.trim() || (user.languages.length > 0 ? user.languages.join(", ") : t("sections.about.empty"));
    case "links":
      return (user.socials?.length ?? 0) > 0 ? (user.socials ?? []).map(socialHandle).join(", ") : t("sections.links.empty");
    case "verify":
      return user.verified ? t("sections.verify.done") : t("sections.verify.empty");
    case "inFor":
      return t("sections.inFor.empty");
  }
}

/** Basics: first name; the date of birth as ONE field (DD / MM / YYYY) with "Shown as 29"; country and "based in" side by side. */
function BasicsSection({ form, update, today, errorText }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void; today: string | null; errorText: (key: FormError) => string | null }) {
  const t = useTranslations("profile.edit");
  const countryOptions: ComboOption[] = (COUNTRIES.includes(form.country) || !form.country ? COUNTRIES : [form.country, ...COUNTRIES]).map((c) => ({ value: c, label: c }));
  const birth = isoOf(form.birth);
  const age = birth && today ? ageOn(birth, today) : null;
  return (
    <>
      <FormField id="edit-name" label={t("name")} error={errorText("name")}>
        <Input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="given-name" aria-invalid={Boolean(errorText("name")) || undefined} />
      </FormField>
      <FormField id="edit-birth-date" label={t("birthDate")} error={errorText("birthDate") ?? errorText("underAge")} helper={age !== null && age >= MIN_AGE ? t("shownAsAge", { age }) : undefined}>
        <BirthField value={form.birth} onChange={(birthParts) => update("birth", birthParts)} invalid={Boolean(errorText("birthDate") ?? errorText("underAge"))} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="edit-country" label={t("country")} error={errorText("country")} group>
          <Combobox
            value={form.country}
            options={countryOptions}
            onPick={(option) => update("country", option.value)}
            isSelected={(option) => option.value === form.country}
            placeholder={t("countryPlaceholder")}
            empty={t("noCountry")}
            invalid={Boolean(errorText("country"))}
            aria-label={t("country")}
          />
        </FormField>
        <FormField label={t("basedIn")} optional group>
          <Combobox
            value={form.city}
            options={CITY_OPTIONS}
            onPick={(option) => update("city", option.value)}
            onFreeText={(text) => update("city", text)}
            isSelected={(option) => option.value === form.city}
            placeholder={t("basedInPlaceholder")}
            empty={t("noPlace")}
            aria-label={t("basedIn")}
          />
        </FormField>
      </div>
    </>
  );
}

/** "DD / MM / YYYY" as one field: digits only, the slashes come by themselves; a full, real date sets the parts, anything less clears them. */
function BirthField({ value, onChange, invalid }: { value: DateParts; onChange: (value: DateParts) => void; invalid: boolean }) {
  const t = useTranslations("profile.edit");
  const pad = (n: string) => (n ? n.padStart(2, "0") : "");
  const [text, setText] = useState(() => (value.day && value.month && value.year ? `${pad(value.day)} / ${pad(value.month)} / ${value.year}` : ""));
  function change(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    setText(parts.join(" / "));
    if (digits.length === 8) {
      const next = { day: String(Number(digits.slice(0, 2))), month: String(Number(digits.slice(2, 4))), year: digits.slice(4, 8) };
      onChange(isoOf(next) ? next : { day: "", month: "", year: "" });
    } else onChange({ day: "", month: "", year: "" });
  }
  return <Input value={text} onChange={(e) => change(e.target.value)} inputMode="numeric" autoComplete="bday" placeholder={t("birthPlaceholder")} aria-invalid={invalid || undefined} />;
}

/** Vibe: four scales of three steps – the left word, three dots (the chosen one orange), the right word. */
function VibeSection({ value, onChange }: { value?: HouseVibe; onChange: (value: HouseVibe) => void }) {
  const tVibe = useTranslations("profile.vibe");
  return (
    <ul className="flex flex-col gap-4">
      {HOUSE_VIBE_SCALES.map(({ key, icon: Icon }) => (
        <li key={key} role="radiogroup" aria-label={tVibe(`${key}.scale`)} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <span className="flex min-w-0 items-center gap-2 text-body text-ink">
            <Icon aria-hidden className="size-4 shrink-0 text-ink/60" />
            <span className="truncate">{tVibe(`${key}.1`)}</span>
          </span>
          <span className="flex items-center gap-1">
            {HOUSE_VIBE_STEPS.map((step) => {
              const on = value?.[key] === step;
              return (
                <button
                  key={step}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={tVibe(`${key}.${step}`)}
                  onClick={() => onChange({ ...(value ?? DEFAULT_HOUSE_VIBE), [key]: step })}
                  className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-ink/5"
                >
                  <span className={cn("block size-3.5 rounded-full transition-colors duration-150", on ? "bg-accent" : "bg-ink/15")} />
                </button>
              );
            })}
          </span>
          <span className="truncate text-right text-body text-ink">{tVibe(`${key}.3`)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Verify ID: the state and "Verify" as an outline capsule; one line why – required before payouts for hosts, optional for guests. */
function VerifySection({ me }: { me: User }) {
  const t = useTranslations("profile.edit");
  const store = useStore();
  const { status } = useIdentity();
  const [open, setOpen] = useState(false);
  const hosts = store.stays.some((s) => s.hostId === me.id);
  const verified = me.verified || status === "verified";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{verified ? t("verifyDone") : status === "processing" ? t("verifyChecking") : t("verifyNot")}</p>
        <p className="text-small text-muted">{hosts ? t("verifyHost") : t("verifyGuest")}</p>
      </div>
      {!verified && status !== "processing" && (
        <Button variant="tertiary" size="sm" onClick={() => setOpen(true)} className="shadow-[inset_0_0_0_1.5px_var(--text)]">
          {t("verifyAction")}
        </Button>
      )}
      <VerifyIdSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Bio: grows with the text, the counter bottom right (/600) – the section's one help line. */
function BioField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("profile.edit");
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <FormField label={t("bio")} optional helper={<span className="flex justify-end tabular-nums">{t("bioCounter", { count: value.length, max: BIO_MAX })}</span>}>
      <Textarea ref={ref} rows={4} maxLength={BIO_MAX} value={value} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

/**
 * The live preview, sticky: "Profile | On a House" as a capsule segment (the chosen one an outline capsule). Profile renders the public
 * profile's own head and Vibe row (ProfilePreviewBody) at 1100px and scales it to the column – not clickable. On a House: how you show in a
 * crew and in a host's requests (the same components as there). The open section's part is ringed (2px orange) and scrolled into view.
 */
function ProfilePreview({ user, ageKnown, focus }: { user: User; ageKnown: boolean; focus: ProfileSectionKey | null }) {
  const t = useTranslations("profile.edit");
  const [tab, setTab] = useState<"profile" | "house">("profile");
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(0);

  // Scale the 1100px profile to the column; the frame takes its scaled height.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;
    const measure = () => {
      const s = frame.clientWidth / PREVIEW_DESIGN_W;
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [tab]);

  // The open section: its part ringed and brought into view inside the preview.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.querySelectorAll<HTMLElement>("[data-preview-focus]").forEach((el) => {
      el.removeAttribute("data-preview-focus");
    });
    if (!focus) return;
    const part = box.querySelector<HTMLElement>(`[data-preview-part="${focus}"]`);
    if (!part) return;
    part.setAttribute("data-preview-focus", "");
    const top = part.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 24;
    box.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [focus, tab, user]);

  return (
    <div>
      <div role="tablist" aria-label={t("howOthersSeeYou")} className="mb-4 flex items-center gap-1">
        {(["profile", "house"] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn(listItemStyles(tab === key), "h-9 px-4 text-body", tab === key ? "font-semibold text-ink" : "text-ink/70")}>
            {t(key === "profile" ? "previewProfile" : "previewHouse")}
          </button>
        ))}
      </div>
      <div ref={boxRef} className="profile-preview no-scrollbar max-h-[calc(100dvh-96px-120px)] overflow-y-auto overscroll-contain rounded-3xl">
        {tab === "profile" ? (
          <div ref={frameRef} inert className="relative w-full overflow-hidden" style={{ height }}>
            <div ref={innerRef} data-preview-scaled className="absolute left-0 top-0 origin-top-left p-4" style={{ width: PREVIEW_DESIGN_W, transform: `scale(${scale})` }}>
              <ProfilePreviewBody user={user} hideAge={!ageKnown} />
            </div>
          </div>
        ) : (
          <HousePreview user={user} />
        )}
      </div>
    </div>
  );
}

/** "On a House": you in a crew (the face 72px and your first name, as THE CREW shows it) and your request as the host sees it (RequestRow). */
function HousePreview({ user }: { user: User }) {
  const t = useTranslations("profile.edit");
  const store = useStore();
  const [now] = useState(() => new Date().toISOString());
  const house = store.stays.find((s) => s.status === "published" && s.hostId !== user.id);
  const request: JoinRequest | null = house ? { id: "preview-request", stayId: house.id, userId: user.id, status: "pending", message: t("previewRequestMessage"), createdAt: now } as JoinRequest : null;
  return (
    <div inert className="flex flex-col gap-8 rounded-3xl bg-(--surface) p-6">
      <section data-preview-part="photos">
        <p className="mb-3 text-eyebrow uppercase text-ink/55">{t("previewInCrew")}</p>
        <div className="flex w-[88px] flex-col items-center text-center">
          <Avatar user={user} size="crew" />
          <span data-preview-part="basics" className="mt-2.5 max-w-full truncate text-body font-semibold text-ink">{user.name.split(" ")[0]}</span>
        </div>
      </section>
      {house && request && (
        <section data-preview-part="about">
          <p className="mb-3 text-eyebrow uppercase text-ink/55">{t("previewInRequests")}</p>
          <ul>
            <RequestRow request={request} applicant={user} stay={house} />
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Public links in the order they were added, at most MAX_SOCIAL_LINKS: each row the platform's mark, the start of its URL ("instagram.com/",
 * grey) and the handle – or a full URL for a website – and × to remove it. "+ Add link" offers the platforms not used yet.
 */
function SocialLinksEditor({ links, onChange, showErrors }: { links: SocialLink[]; onChange: (links: SocialLink[]) => void; showErrors: boolean }) {
  const t = useTranslations("profile.edit");
  const tWebsite = useTranslations("common.ui.socialRow");
  const [picking, setPicking] = useState(false);
  const unused = SOCIAL_PLATFORMS.filter((p) => !links.some((l) => l.platform === p));
  const nameOf = (platform: SocialPlatform) => SOCIAL_ICONS[platform].brand ?? tWebsite("website");
  const set = (index: number, value: string) => onChange(links.map((l, i) => (i === index ? { ...l, value } : l)));

  return (
    <div className="space-y-3">
      {links.map((link, index) => {
        const { icon: Icon } = SOCIAL_ICONS[link.platform];
        const problem = showErrors ? linkError(link) : null;
        const name = nameOf(link.platform);
        return (
          <FormField key={link.platform} label={name} srOnlyLabel error={problem ? t(`errors.${problem}`) : null}>
            <span className={cn(inputStyles, "flex items-center gap-2 focus-within:border-ink/40 focus-within:ring-3 focus-within:ring-accent/15")}>
              <Icon className="size-4 shrink-0 text-ink" aria-hidden />
              {link.platform !== "website" && <span className="shrink-0 text-body text-muted">{HANDLE_PREFIX[link.platform]}</span>}
              <input
                value={link.value}
                onChange={(e) => set(index, e.target.value)}
                placeholder={link.platform === "website" ? "https://…" : t("handlePlaceholder")}
                inputMode={link.platform === "website" ? "url" : "text"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(problem) || undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
              />
              <Button variant="tertiary" onClick={() => onChange(links.filter((_, i) => i !== index))} aria-label={t("removeLink", { platform: name })} className="-mr-2 size-8">
                <X />
              </Button>
            </span>
          </FormField>
        );
      })}

      {links.length < MAX_SOCIAL_LINKS ? (
        <div>
          <Button variant="tertiary" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
            <Plus />
            {t("addLink")}
          </Button>
          {picking && (
            <ul role="menu" className="mt-1 flex flex-wrap gap-2">
              {unused.map((platform) => {
                const { icon: Icon } = SOCIAL_ICONS[platform];
                return (
                  <li key={platform}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onChange([...links, { platform, value: "" }]);
                        setPicking(false);
                      }}
                      className={buttonStyles("secondary", "md")}
                    >
                      <Icon aria-hidden />
                      {nameOf(platform)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-small text-muted">{t("linksFull", { max: MAX_SOCIAL_LINKS })}</p>
      )}
    </div>
  );
}
