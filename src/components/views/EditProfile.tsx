"use client";

import { Eye, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import {
  FormCard,
  FormCards,
  FormContainer,
  FormField,
  FormGrid,
  FormHeader,
  PreviewColumn,
  StickyFormBar,
  formInput,
  formTextarea,
} from "@/components/form/FormLayout";
import { profileCrews } from "@/components/profile/Crews";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { CardTab } from "@/components/ui/CardTab";
import { Combobox, type ComboOption } from "@/components/ui/Combobox";
import { NotchedCard } from "@/components/ui/NotchedCard";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Sheet } from "@/components/ui/Sheet";
import { SOCIAL_ICONS } from "@/components/ui/socialIcons";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { MAX_AGE, MIN_AGE, ageOn, isoOf, partsOf, useTodayIso, type DateParts } from "@/lib/birthDate";
import { COUNTRIES, PLACES } from "@/lib/places";
import { getCurrentUser, useStore, type ProfilePatch } from "@/lib/store";
import { HANDLE_PREFIX, MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS, isValidHandle, isValidWebsite, normalizeSocialValue } from "@/lib/socialLinks";
import type { SocialLink, SocialPlatform, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;
const BIO_MAX = 600;

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
  };
}

/** The profile as it would look after saving – drives the live preview and the saved patch. */
function draftOf(me: User, form: FormState, today: string | null): User {
  const birthDate = isoOf(form.birth);
  return {
    ...me,
    photos: form.photos,
    name: form.name.trim() || me.name,
    birthDate: birthDate ?? me.birthDate,
    // The age is always derived from the date (until a full date is picked: the saved age).
    age: birthDate && today ? ageOn(birthDate, today) : me.age,
    country: form.country.trim(),
    city: form.city.trim(),
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

/** Field (or card) each error belongs to – scrolled into view on a failed save. */
const ERROR_TARGET: Record<FormError, string> = {
  photo: "edit-photos",
  name: "edit-name",
  birthDate: "edit-birth-date",
  underAge: "edit-birth-date",
  country: "edit-country",
  links: "edit-links",
};

/** /profile/edit – form left, live preview right (behind a "Preview" button on mobile). */
function EditProfileForm({ me }: { me: User }) {
  const t = useTranslations("profile.edit");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [initial] = useState<FormState>(() => formOf(me));
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<FormError | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const today = useTodayIso();
  /** Where the user wanted to go while there were unsaved changes */
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const draft = draftOf(me, form, today);

  // router.push (Save, discard) is programmatic – the guard only intercepts link clicks and tab closes.
  useLeaveGuard(dirty, setPendingHref);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function leave(href: string) {
    router.push(href);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    const problem = validate(form, today);
    if (problem) {
      setError(problem);
      document.getElementById(ERROR_TARGET[problem])?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const patch: ProfilePatch = {
      photos: draft.photos,
      name: draft.name,
      age: draft.age,
      birthDate: draft.birthDate,
      country: draft.country,
      city: draft.city,
      languages: draft.languages,
      bio: draft.bio,
      socials: draft.socials,
    };
    store.updateCurrentUser(patch);
    showToast(t("saved"));
    leave("/profile");
  }

  const errorText = (key: FormError) => (error === key ? t(`errors.${key}`) : null);
  const birthDate = isoOf(form.birth);
  const countryOptions: ComboOption[] = (COUNTRIES.includes(form.country) || !form.country ? COUNTRIES : [form.country, ...COUNTRIES]).map(
    (c) => ({ value: c, label: c }),
  );

  const formColumn = (
    <form onSubmit={save} noValidate>
      <FormCards>
        <FormCard id={ERROR_TARGET.photo} title={t("photos")} description={t("photosHint", { max: MAX_PHOTOS })}>
          <PhotoUploader photos={form.photos} onChange={(photos) => update("photos", photos)} slots={MAX_PHOTOS} labels="profile" />
          {error === "photo" && (
            <p role="alert" className="text-small text-red-600">
              {t("errors.photo")}
            </p>
          )}
        </FormCard>

        <FormCard title={t("about")}>
          <FormField id={ERROR_TARGET.name} label={t("name")} error={errorText("name")}>
            <input
              className={formInput}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="given-name"
              aria-invalid={error === "name" || undefined}
            />
          </FormField>
          <FormField
            id={ERROR_TARGET.birthDate}
            label={t("birthDate")}
            group
            error={errorText("birthDate") ?? errorText("underAge")}
            helper={birthDate && today ? t("birthDateAge", { age: ageOn(birthDate, today) }) : t("birthDateHelper")}
          >
            <BirthDateSelects value={form.birth} onChange={(birth) => update("birth", birth)} today={today} invalid={error === "birthDate" || error === "underAge"} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id={ERROR_TARGET.country} label={t("country")} error={errorText("country")} group>
              <Combobox
                value={form.country}
                options={countryOptions}
                onPick={(option) => update("country", option.value)}
                isSelected={(option) => option.value === form.country}
                placeholder={t("countryPlaceholder")}
                empty={t("noCountry")}
                invalid={error === "country"}
                aria-label={t("country")}
              />
            </FormField>
            <FormField label={t("basedIn")} helper={t("basedInHelper")} optional group>
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
          <FormField label={t("languages")} helper={t("languagesHelper")} optional group>
            <LanguageInput languages={form.languages} onChange={(languages) => update("languages", languages)} soft />
          </FormField>
          <BioField value={form.bio} onChange={(bio) => update("bio", bio)} />
        </FormCard>

        <FormCard id={ERROR_TARGET.links} title={t("publicLinks")} description={t("linksHelper", { max: MAX_SOCIAL_LINKS })}>
          <SocialLinksEditor links={form.socials} onChange={(socials) => update("socials", socials)} showErrors={error === "links"} />
        </FormCard>
      </FormCards>

      {/* Save bar: only while there are unsaved changes – slides up, sticks to the bottom of the form column.
          Cancel puts the form back to the saved profile. */}
      {dirty && (
        <StickyFormBar slideIn>
          <p className="min-w-0 flex-1 truncate text-small text-muted" aria-live="polite">
            {t("unsaved")}
          </p>
          <Button
            variant="tertiary"
            onClick={() => {
              setForm(initial);
              setError(null);
            }}
          >
            {t("cancel")}
          </Button>
          <Button type="submit">{t("save")}</Button>
        </StickyFormBar>
      )}
    </form>
  );

  return (
    <FormContainer>
      <FormHeader
        title={t("title")}
        aside={
          <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="lg:hidden">
            <Eye />
            {t("previewButton")}
          </Button>
        }
      />
      <FormGrid
        form={formColumn}
        preview={
          <PreviewColumn label={t("howOthersSeeYou")}>
            <LivePreview user={draft} />
          </PreviewColumn>
        }
      />

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={t("howOthersSeeYou")}>
        <LivePreview user={draft} />
      </Sheet>
      <ConfirmSheet
        open={pendingHref !== null}
        title={t("discardTitle")}
        description={t("discardDescription")}
        confirmLabel={t("discardConfirm")}
        onClose={() => setPendingHref(null)}
        onConfirm={() => {
          const href = pendingHref ?? "/profile";
          setPendingHref(null);
          leave(href);
        }}
      />
    </FormContainer>
  );
}

/**
 * Unsaved changes: closing/reloading the tab asks the browser's own question; in-app links are caught (capture
 * phase) and routed through our confirm sheet instead.
 */
function useLeaveGuard(active: boolean, onBlockedLink: (href: string) => void) {
  const callback = useRef(onBlockedLink);
  useEffect(() => {
    callback.current = onBlockedLink;
  });
  useEffect(() => {
    if (!active) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      callback.current(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}

/** The profile card exactly as on /profile, fed with the draft – plus where photo 1 shows up. */
function LivePreview({ user }: { user: User }) {
  const t = useTranslations("profile.edit");
  const tProfile = useTranslations("profile");
  const store = useStore();
  const hosted = store.stays.filter((s) => s.hostId === user.id).length;
  const joined = store.joinRequests.filter((r) => r.userId === user.id && r.status === "accepted").length;

  return (
    <div>
      <ProfileCard
        user={user}
        // How others see you: never your own "Lived with".
        crews={profileCrews(store, user.id, null)}
        stats={tProfile.rich("stats", {
          hosted,
          joined,
          b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
          hostedLink: (chunks) => <span>{chunks}</span>,
          joinedLink: (chunks) => <span>{chunks}</span>,
        })}
      />
      <div className={cn(cardClass, "mt-4 flex items-center gap-4")}>
        <NotchedCard
          className="aspect-4/5 w-24 shrink-0"
          clipClassName="rounded-2xl bg-line"
          tab={<CardTab host={user} bg="var(--surface)" className="h-7 scale-[0.8] origin-top-left" />}
        >
          {user.photos[0] && <Img src={user.photos[0]} alt="" fill sizes="96px" className="object-cover" />}
        </NotchedCard>
        <p className="text-small text-muted">{t("photoOnHouses")}</p>
      </div>
    </div>
  );
}

/**
 * Date of birth as three native selects (day, month, year) – typing jumps to an option, no stepper. Years run from
 * MIN_AGE to MAX_AGE back from today; a day that doesn't exist in the month is caught by validation.
 */
function BirthDateSelects({ value, onChange, today, invalid }: { value: DateParts; onChange: (value: DateParts) => void; today: string | null; invalid: boolean }) {
  const t = useTranslations("profile.edit");
  const locale = useLocale();
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const thisYear = today ? Number(today.slice(0, 4)) : null;
  const years = thisYear ? Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => String(thisYear - MIN_AGE - i)) : [];
  // A saved year outside the range (or before today is known) stays selectable.
  if (value.year && !years.includes(value.year)) years.unshift(value.year);
  const select = (key: keyof DateParts, label: string, options: Array<{ value: string; label: string }>) => (
    <Select value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} aria-label={label} aria-invalid={invalid || undefined}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_6.5rem] gap-3">
      {select("day", t("day"), Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })))}
      {select("month", t("month"), Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName.format(Date.UTC(2000, i, 1)) })))}
      {select("year", t("year"), years.map((y) => ({ value: y, label: y })))}
    </div>
  );
}

/** Bio: 5 rows to start, grows with the text, counter bottom-right. */
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
    <FormField
      label={t("bio")}
      optional
      helper={
        <span className="flex justify-between gap-4">
          <span>{t("bioHelper")}</span>
          <span className="shrink-0 tabular-nums">{t("bioCounter", { count: value.length, max: BIO_MAX })}</span>
        </span>
      }
    >
      <textarea ref={ref} rows={5} maxLength={BIO_MAX} value={value} onChange={(e) => onChange(e.target.value)} className={formTextarea} />
    </FormField>
  );
}

/**
 * Public links in the order they were added, at most MAX_SOCIAL_LINKS: each row is the platform's mark and the start
 * of its URL ("instagram.com/") before the handle – or a full URL for a website – and × to remove it. "Add link" offers
 * the platforms not used yet. Problems show per row once a save was tried.
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
          <FormField key={link.platform} label={name} error={problem ? t(`errors.${problem}`) : null}>
            <span className={cn(formInput, "flex items-center gap-2 focus-within:ring-2 focus-within:ring-accent")}>
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
