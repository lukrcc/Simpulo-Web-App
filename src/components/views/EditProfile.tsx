"use client";

import { Eye, Lock, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type FormEvent } from "react";
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
import { getPastCrewMates } from "@/components/profile/PastCrews";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { CONTACT_FIELDS, SOCIAL_FIELDS, contactInputMode, normalizeContact, normalizeSocial, type SocialKey } from "@/components/profile/profileFields";
import { buttonClass } from "@/components/ui/button";
import { CardTab } from "@/components/ui/CardTab";
import { NotchedCard } from "@/components/ui/NotchedCard";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { CONTACT_CHANNELS } from "@/components/ui/CrewContacts";
import { Img } from "@/components/ui/Img";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Sheet } from "@/components/ui/Sheet";
import { SOCIAL_NETWORKS } from "@/components/ui/SocialRow";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore, type ProfilePatch } from "@/lib/store";
import type { PrivateContacts, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;
const BIO_MAX = 600;
/** Link rows shown before "+ Add link" (filled ones always show). */
const VISIBLE_LINK_ROWS = 3;

type ContactKey = (typeof CONTACT_FIELDS)[number];

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
  age: string;
  country: string;
  city: string;
  languages: string[];
  bio: string;
  socials: Partial<Record<SocialKey, string>>;
  contacts: Partial<Record<ContactKey, string>>;
}

function formOf(me: User): FormState {
  return {
    photos: me.photos,
    name: me.name,
    age: String(me.age),
    country: me.country,
    city: me.city,
    languages: me.languages,
    bio: me.bio,
    socials: Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, me[key] ?? ""])),
    contacts: Object.fromEntries(CONTACT_FIELDS.map((key) => [key, me.privateContacts?.[key] ?? ""])),
  };
}

/** The profile as it would look after saving – drives the live preview and the saved patch. */
function draftOf(me: User, form: FormState): User {
  const privateContacts: PrivateContacts = {};
  for (const key of CONTACT_FIELDS) {
    const value = normalizeContact(key, form.contacts[key] ?? "");
    if (value) privateContacts[key] = value;
  }
  const draft: User = {
    ...me,
    photos: form.photos,
    name: form.name.trim() || me.name,
    age: Number(form.age) || me.age,
    country: form.country.trim(),
    city: form.city.trim(),
    languages: form.languages,
    bio: form.bio.trim().slice(0, BIO_MAX),
    privateContacts,
  };
  for (const { key } of SOCIAL_FIELDS) draft[key] = normalizeSocial(key, form.socials[key] ?? "") || undefined;
  return draft;
}

type FormError = "photo" | "name" | "age" | "country";

/** Required: a photo, first name, age, country. Everything else is optional. */
function validate(form: FormState): FormError | null {
  if (form.photos.length === 0) return "photo";
  if (!form.name.trim()) return "name";
  const age = Number(form.age);
  if (!(age >= 18 && age <= 99)) return "age";
  if (!form.country.trim()) return "country";
  return null;
}

/** Field (or card) each error belongs to – scrolled into view on a failed save. */
const ERROR_TARGET: Record<FormError, string> = {
  photo: "edit-photos",
  name: "edit-name",
  age: "edit-age",
  country: "edit-country",
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
  /** Where the user wanted to go while there were unsaved changes */
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const draft = draftOf(me, form);

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
    const problem = validate(form);
    if (problem) {
      setError(problem);
      document.getElementById(ERROR_TARGET[problem])?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const patch: ProfilePatch = {
      photos: draft.photos,
      name: draft.name,
      age: draft.age,
      country: draft.country,
      city: draft.city,
      languages: draft.languages,
      bio: draft.bio,
      privateContacts: draft.privateContacts,
    };
    // An emptied link is removed (undefined overrides the stored value).
    for (const { key } of SOCIAL_FIELDS) patch[key] = draft[key];
    store.updateCurrentUser(patch);
    showToast(t("saved"));
    leave("/profile");
  }

  const errorText = (key: FormError) => (error === key ? t(`errors.${key}`) : null);

  const formColumn = (
    <form onSubmit={save} noValidate>
      <FormCards>
        <FormCard id={ERROR_TARGET.photo} title={t("photos")} description={t("photosHint", { max: MAX_PHOTOS })}>
          <PhotoUploader photos={form.photos} onChange={(photos) => update("photos", photos)} slots={MAX_PHOTOS} labels="profile" />
          {error === "photo" && (
            <p role="alert" className="text-[13px] text-red-600">
              {t("errors.photo")}
            </p>
          )}
        </FormCard>

        <FormCard title={t("about")}>
          <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
            <FormField id={ERROR_TARGET.name} label={t("name")} error={errorText("name")}>
              <input
                className={formInput}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="given-name"
                aria-invalid={error === "name" || undefined}
              />
            </FormField>
            <FormField id={ERROR_TARGET.age} label={t("age")} error={errorText("age")}>
              <input
                className={formInput}
                type="number"
                inputMode="numeric"
                min={18}
                max={99}
                value={form.age}
                onChange={(e) => update("age", e.target.value)}
                aria-invalid={error === "age" || undefined}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id={ERROR_TARGET.country} label={t("country")} error={errorText("country")}>
              <input
                className={formInput}
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                autoComplete="country-name"
                aria-invalid={error === "country" || undefined}
              />
            </FormField>
            <FormField label={t("basedIn")} helper={t("basedInHelper")} optional>
              <input className={formInput} value={form.city} onChange={(e) => update("city", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t("languages")} helper={t("languagesHelper")} optional group>
            <LanguageInput languages={form.languages} onChange={(languages) => update("languages", languages)} soft />
          </FormField>
          <BioField value={form.bio} onChange={(bio) => update("bio", bio)} />
        </FormCard>

        <FormCard title={t("publicLinks")} description={t("linksHelper")}>
          <LinkRows
            options={SOCIAL_FIELDS.map(({ key }) => {
              const network = SOCIAL_NETWORKS.find((n) => n.key === key);
              return {
                key,
                label: network?.label ?? "",
                icon: network?.icon,
                color: network?.color,
                dark: network?.dark,
              };
            })}
            values={form.socials}
            onChange={(socials) => update("socials", socials)}
          />
        </FormCard>

        <FormCard
          title={t("crewOnly")}
          description={
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
              {t("crewOnlyLine")}
            </span>
          }
        >
          <LinkRows
            options={CONTACT_FIELDS.map((key) => {
              const channel = CONTACT_CHANNELS.find((c) => c.key === key);
              return {
                key,
                label: "",
                icon: channel?.icon,
                color: channel?.color,
                inputMode: contactInputMode(key),
              };
            })}
            values={form.contacts}
            onChange={(contacts) => update("contacts", contacts)}
            channelLabels
          />
        </FormCard>
      </FormCards>

      {/* Save bar: sticks to the bottom of the form column (no tab bar on this page on mobile). */}
      <StickyFormBar>
        <p className="min-w-0 flex-1 truncate text-sm text-zinc-500" aria-live="polite">
          {dirty ? t("unsaved") : t("noChanges")}
        </p>
        <button type="button" onClick={() => (dirty ? setPendingHref("/profile") : leave("/profile"))} className={buttonClass("ghost", "md")}>
          {t("cancel")}
        </button>
        <button type="submit" disabled={!dirty} className={buttonClass("dark", "md")}>
          {t("save")}
        </button>
      </StickyFormBar>
    </form>
  );

  return (
    <FormContainer>
      <FormHeader
        title={t("title")}
        aside={
          <button type="button" onClick={() => setPreviewOpen(true)} className={buttonClass("secondary", "sm", "lg:hidden")}>
            <Eye className="size-4" />
            {t("previewButton")}
          </button>
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
        showCrewContacts
        pastCrewMates={getPastCrewMates(store, user.id)}
        stats={tProfile.rich("stats", {
          hosted,
          joined,
          b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
          hostedLink: (chunks) => <span>{chunks}</span>,
          joinedLink: (chunks) => <span>{chunks}</span>,
        })}
      />
      <div className="mt-4 flex items-center gap-4 rounded-[24px] bg-white p-4">
        <NotchedCard
          className="aspect-4/5 w-24 shrink-0"
          clipClassName="rounded-2xl bg-neutral-200"
          tab={<CardTab host={user} bg="#ffffff" className="h-7 scale-[0.8] origin-top-left" />}
        >
          {user.photos[0] && <Img src={user.photos[0]} alt="" fill sizes="96px" className="object-cover" />}
        </NotchedCard>
        <p className="text-sm text-zinc-600">{t("photoOnHouses")}</p>
      </div>
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

interface LinkOption<K extends string> {
  key: K;
  /** Platform name (public links); crew channels use the translated channel names */
  label: string;
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
  color?: string;
  dark?: boolean;
  inputMode?: "text" | "tel";
}

/**
 * One row per platform with its icon as the input prefix. Filled rows always show; empty ones only up to
 * VISIBLE_LINK_ROWS, the rest via "+ Add link". × empties a row and hides it.
 */
function LinkRows<K extends string>({
  options,
  values,
  onChange,
  channelLabels = false,
}: {
  options: LinkOption<K>[];
  values: Partial<Record<K, string>>;
  onChange: (values: Partial<Record<K, string>>) => void;
  /** Use the crew-contact channel names as labels */
  channelLabels?: boolean;
}) {
  const t = useTranslations("profile.edit");
  const tChannel = useTranslations("common.ui.crewContacts.channel");
  const [shown, setShown] = useState<K[]>(() => {
    const filled = options.filter((o) => values[o.key]?.trim()).map((o) => o.key);
    const fillers = options.filter((o) => !filled.includes(o.key)).map((o) => o.key);
    return [...filled, ...fillers.slice(0, Math.max(0, VISIBLE_LINK_ROWS - filled.length))];
  });
  const [picking, setPicking] = useState(false);
  const hidden = options.filter((o) => !shown.includes(o.key));
  const labelOf = (o: LinkOption<K>) => (channelLabels ? tChannel(o.key as ContactKey) : o.label);

  return (
    <div className="space-y-3">
      {options
        .filter((o) => shown.includes(o.key))
        .map((option) => {
          const Icon = option.icon;
          const label = labelOf(option);
          return (
            <FormField key={option.key} label={label} optional>
              <span className="relative block">
                <span
                  className={cn(
                    "pointer-events-none absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg",
                    option.dark || !option.color ? "bg-ink text-white" : "bg-white shadow-xs ring-1 ring-black/5",
                  )}
                >
                  {Icon && <Icon className="size-4" style={option.color ? { color: option.color } : undefined} />}
                </span>
                <input
                  className={cn(formInput, "pl-12 pr-10")}
                  value={values[option.key] ?? ""}
                  inputMode={option.inputMode}
                  onChange={(e) => onChange({ ...values, [option.key]: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...values, [option.key]: "" });
                    setShown((s) => s.filter((k) => k !== option.key));
                  }}
                  aria-label={t("removeLink", { platform: label })}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-black/5 hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </span>
            </FormField>
          );
        })}

      {hidden.length > 0 && (
        <div className="relative">
          <button type="button" onClick={() => setPicking((p) => !p)} aria-expanded={picking} className={buttonClass("ghost", "sm", "-ml-2")}>
            <Plus className="size-4" />
            {t("addLink")}
          </button>
          {picking && (
            <ul role="menu" className="mt-1 flex flex-wrap gap-2">
              {hidden.map((option) => {
                const Icon = option.icon;
                return (
                  <li key={option.key}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShown((s) => [...s, option.key]);
                        setPicking(false);
                      }}
                      className="flex h-9 items-center gap-2 rounded-full border border-[#E7E5E4] bg-[#FAFAF9] pl-2 pr-3 text-sm hover:border-neutral-400"
                    >
                      {Icon && <Icon className="size-4" style={option.color && !option.dark ? { color: option.color } : undefined} />}
                      {labelOf(option)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
