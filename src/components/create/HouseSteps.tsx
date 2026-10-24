"use client";

import { Check, Circle, Link2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FormCard, FormCards, FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { StepNumber } from "@/components/GetTheApp";
import { CONTACT_FIELDS, SOCIAL_FIELDS } from "@/components/profile/profileFields";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useFormat } from "@/i18n/format";
import { linkDomain } from "@/lib/mock-extras";
import type { Currency, Stay, User } from "@/lib/types";
import { CURRENCIES, VIBES, cn, nightsBetween } from "@/lib/utils";
import {
  BIO_MAX,
  HOST_NOTE_MAX,
  MAX_IDEAS,
  PITCH_FIELDS,
  fieldId,
  isLink,
  pitchCount,
  type About,
  type AboutField,
  type FieldKey,
  type FormState,
} from "./model";

export type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

/** Shared by the steps: the visible error of a field (null until touched / Next attempted) and marking it touched. */
export interface FieldHelpers {
  errorOf: (key: FieldKey) => string | null;
  touch: (key: FieldKey) => void;
}

// No class merging here, so active and inactive each set their own background.
const chipClass = "rounded-full border px-4 py-2 text-sm transition-colors";
const chipInactiveClass = "border-[#E7E5E4] bg-[#FAFAF9] hover:border-neutral-400";
const chipActiveClass = "border-ink bg-ink text-white";

/* ───────────────────────── 1 · The House ───────────────────────── */

interface HouseStepProps extends FieldHelpers {
  form: FormState;
  update: Update;
  minSpots: number;
  /** Codes to pick from */
  languages: string[];
  language: string;
  currency: Currency;
  /** Editing a House whose place is locked: price and currency are managed on the Manage page. */
  locked: boolean;
}

export function HouseStep({ form, update, minSpots, languages, language, currency, locked, errorOf, touch }: HouseStepProps) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const symbol = format.currencySymbol(currency);
  return (
    <FormCards>
      <FormCard title={t("cards.where")}>
        <FormField id={fieldId("title")} label={t("title")} error={errorOf("title")}>
          <input
            className={formInput}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            onBlur={() => touch("title")}
            placeholder={t("titlePlaceholder")}
            maxLength={80}
            aria-invalid={Boolean(errorOf("title")) || undefined}
          />
        </FormField>
        <FormField id={fieldId("region")} label={t("region")} helper={t("regionHint")} error={errorOf("region")}>
          <input
            className={formInput}
            value={form.region}
            onChange={(e) => update("region", e.target.value)}
            onBlur={() => touch("region")}
            placeholder={t("regionPlaceholder")}
            aria-invalid={Boolean(errorOf("region")) || undefined}
          />
        </FormField>
        <div>
          <FormField label={t("city")} optional>
            <input
              className={formInput}
              value={form.cityOpen ? "" : form.city}
              disabled={form.cityOpen}
              onChange={(e) => update("city", e.target.value)}
              placeholder={form.cityOpen ? t("cityOpenPlaceholder") : t("cityPlaceholder")}
            />
          </FormField>
          <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.cityOpen}
              onChange={(e) => update("cityOpen", e.target.checked)}
              className="size-5 accent-[var(--color-ink)]"
            />
            {t("cityOpen")}
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField id={fieldId("startDate")} label={t("startDate")} error={errorOf("startDate")}>
            <input
              type="date"
              className={formInput}
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              onBlur={() => touch("startDate")}
              aria-invalid={Boolean(errorOf("startDate")) || undefined}
            />
          </FormField>
          <FormField id={fieldId("endDate")} label={t("endDate")} error={errorOf("endDate")}>
            <input
              type="date"
              className={formInput}
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => {
                update("endDate", e.target.value);
                touch("endDate");
              }}
              onBlur={() => touch("endDate")}
              aria-invalid={Boolean(errorOf("endDate")) || undefined}
            />
          </FormField>
        </div>
      </FormCard>

      <FormCard title={t("cards.crew")}>
        <FormField id={fieldId("spotsTotal")} label={t("crewSize")} error={errorOf("spotsTotal")} group>
          <div className="flex gap-1 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-1">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={form.spotsTotal === n}
                disabled={n < minSpots}
                onClick={() => update("spotsTotal", n)}
                className={cn(
                  "h-9 flex-1 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  form.spotsTotal === n ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-ink",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label={t("language")} helper={t("languageHint")}>
          <select className={formInput} value={language} onChange={(e) => update("language", e.target.value)}>
            {languages.map((code) => (
              <option key={code} value={code}>
                {format.language(code)}
              </option>
            ))}
          </select>
        </FormField>
      </FormCard>

      <FormCard title={t("cards.vibe")}>
        <div role="group" aria-label={t("cards.vibe")} className="flex flex-wrap gap-2">
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
      </FormCard>

      <FormCard title={t("cards.budget")}>
        {locked ? (
          <p className="text-sm text-zinc-500">{t("lockedNote")}</p>
        ) : (
          <FormField label={t("budget")} helper={t("budgetHint")} optional group>
            <div className="flex items-center gap-2">
              <MoneyInput symbol={symbol} label={t("budgetFrom")} value={form.budgetMin} onChange={(v) => update("budgetMin", v)} placeholder={t("budgetFromPlaceholder")} />
              <span className="text-zinc-400" aria-hidden>
                –
              </span>
              <MoneyInput symbol={symbol} label={t("budgetTo")} value={form.budgetMax} onChange={(v) => update("budgetMax", v)} placeholder={t("budgetToPlaceholder")} />
              <select
                aria-label={t("currency")}
                className={cn(formInput, "w-auto shrink-0 px-3")}
                value={currency}
                onChange={(e) => update("currency", e.target.value as Currency)}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </FormField>
        )}
      </FormCard>
    </FormCards>
  );
}

function MoneyInput({ value, onChange, placeholder, symbol, label }: { value: string; onChange: (value: string) => void; placeholder: string; symbol: string; label: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">{symbol}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        aria-label={label}
        className={cn(formInput, symbol.length > 1 ? "pl-11" : "pl-8")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ───────────────────────── 2 · Your pitch ───────────────────────── */

/** Label `create.pitch.<message>`, placeholder `create.pitch.<message>Placeholder`. */
const PITCH_MESSAGES = { whyText: "why", dayText: "day", lookingForText: "lookingFor" } as const;

export function PitchStep({ form, update, showIdeas }: { form: FormState; update: Update; showIdeas: boolean }) {
  const t = useTranslations("create.pitch");
  return (
    <FormCards>
      <FormCard title={t("cards.pitch")} description={t("cards.pitchDescription")}>
        {PITCH_FIELDS.map((key) => {
          const message = PITCH_MESSAGES[key];
          return (
            <FormField key={key} id={fieldId(key)} label={t(message)} optional>
              <AutoTextarea value={form[key]} onChange={(e) => update(key, e.target.value)} placeholder={t(`${message}Placeholder`)} />
            </FormField>
          );
        })}
      </FormCard>

      <FormCard title={t("cards.hostNote")}>
        <FormField
          id={fieldId("hostNote")}
          label={t("hostNote")}
          optional
          helper={
            <span className="flex justify-between gap-4">
              <span>{t("hostNoteHint")}</span>
              <span className="shrink-0 tabular-nums">{t("hostNoteCount", { count: form.hostNote.length, max: HOST_NOTE_MAX })}</span>
            </span>
          }
        >
          <input
            className={formInput}
            value={form.hostNote}
            maxLength={HOST_NOTE_MAX}
            onChange={(e) => update("hostNote", e.target.value)}
            placeholder={t("hostNotePlaceholder")}
          />
        </FormField>
      </FormCard>

      {/* Create only – after publishing, ideas go straight into the crew chat. */}
      {showIdeas && (
        <FormCard title={t("cards.ideas")} description={t("ideasHint")}>
          <IdeasField ideas={form.accommodationIdeas} onChange={(ideas) => update("accommodationIdeas", ideas)} />
        </FormCard>
      )}
    </FormCards>
  );
}

/** Textarea that starts at 3 rows and grows with its text. */
function AutoTextarea(props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "className">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={3} className={formTextarea} {...props} />;
}

/** One link input to start, "+ Add" up to 3; each valid link gets a placeholder preview row. */
function IdeasField({ ideas, onChange }: { ideas: string[]; onChange: (ideas: string[]) => void }) {
  const t = useTranslations("create.pitch");
  const slots = ideas.length > 0 ? ideas : [""];
  return (
    <div className="space-y-2">
      {slots.map((value, i) => {
        const link = value.trim();
        return (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="url"
                inputMode="url"
                aria-label={t("ideaLabel", { number: i + 1 })}
                className={formInput}
                value={value}
                onChange={(e) => onChange(slots.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={i === 0 ? t("ideaPlaceholder") : t("ideaPlaceholderMore")}
              />
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(slots.filter((_, j) => j !== i))}
                  aria-label={t("removeIdea", { number: i + 1 })}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-black/5"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {link && isLink(link) && (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#E7E5E4] bg-white p-2">
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
      {slots.length < MAX_IDEAS && (
        <button type="button" onClick={() => onChange([...slots, ""])} className={buttonClass("ghost", "sm", "-ml-2")}>
          <Plus className="size-4" />
          {t("addIdea")}
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── 3 · About you ───────────────────────── */

/** Complete profile: a compact summary with "Edit profile" and "Looks good". */
export function AboutSummary({ me, onContinue }: { me: User; onContinue: () => void }) {
  const t = useTranslations("create.about");
  const format = useFormat();
  return (
    <FormCard id={fieldId("photo")} title={t("cards.summary")} description={t("cards.summaryDescription")}>
      <div className="flex items-center gap-3">
        <Avatar user={me} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{me.name}</p>
          <p className="truncate text-sm text-zinc-500">{format.ageAndCountry(me)}</p>
        </div>
      </div>
      {me.photos.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {me.photos.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-4/5 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              <Img src={src} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onContinue} className={buttonClass("dark", "md")}>
          {t("looksGood")}
        </button>
        <Link href="/profile/edit" className={buttonClass("secondary", "md")}>
          {t("editProfile")}
        </Link>
      </div>
    </FormCard>
  );
}

interface AboutFieldsProps extends FieldHelpers {
  about: About;
  update: Update;
  /** Which required fields to show; all of them (plus the optional rest) when logged out */
  fields: AboutField[];
  full: boolean;
}

/** Logged out: the whole "About you" form. Incomplete profile: only the missing required fields. */
export function AboutFields({ about, update, fields, full, errorOf, touch }: AboutFieldsProps) {
  const t = useTranslations("create");
  const tContacts = useTranslations("common.ui.crewContacts");
  const show = (field: AboutField) => full || fields.includes(field);
  const showPerson = show("name") || show("age") || show("country");
  return (
    <FormCards>
      {!full && (
        <p className="rounded-[24px] bg-white px-6 py-4 text-sm text-zinc-600">{t("about.missingIntro")}</p>
      )}
      {show("photo") && (
        <FormCard id={fieldId("photo")} title={t("about.photos")} description={t("about.photosHint")}>
          <PhotoUploader
            photos={about.photos}
            onChange={(photos) => {
              update("aboutPhotos", photos);
              touch("photo");
            }}
          />
          {errorOf("photo") && (
            <p role="alert" className="text-[13px] text-red-600">
              {errorOf("photo")}
            </p>
          )}
        </FormCard>
      )}

      {showPerson && (
        <FormCard title={t("about.cards.you")}>
          {(show("name") || show("age")) && (
            <div className={cn("grid gap-3", show("name") && show("age") && "grid-cols-[minmax(0,1fr)_6.5rem]")}>
              {show("name") && (
                <FormField id={fieldId("name")} label={t("about.name")} error={errorOf("name")}>
                  <input
                    className={formInput}
                    value={about.name}
                    onChange={(e) => update("aboutName", e.target.value)}
                    onBlur={() => touch("name")}
                    placeholder={t("about.namePlaceholder")}
                    autoComplete="given-name"
                    aria-invalid={Boolean(errorOf("name")) || undefined}
                  />
                </FormField>
              )}
              {show("age") && (
                <FormField id={fieldId("age")} label={t("about.age")} error={errorOf("age")}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={18}
                    max={99}
                    className={formInput}
                    value={about.age}
                    onChange={(e) => update("aboutAge", e.target.value)}
                    onBlur={() => touch("age")}
                    placeholder={t("about.agePlaceholder")}
                    aria-invalid={Boolean(errorOf("age")) || undefined}
                  />
                </FormField>
              )}
            </div>
          )}
          {show("country") && (
            <FormField id={fieldId("country")} label={t("about.country")} error={errorOf("country")}>
              <input
                className={formInput}
                value={about.country}
                onChange={(e) => update("aboutCountry", e.target.value)}
                onBlur={() => touch("country")}
                placeholder={t("about.countryPlaceholder")}
                autoComplete="country-name"
                aria-invalid={Boolean(errorOf("country")) || undefined}
              />
            </FormField>
          )}
          {full && (
            <>
              <FormField label={t("about.languages")} optional group>
                <LanguageInput languages={about.languages} onChange={(languages) => update("aboutLanguages", languages)} soft />
              </FormField>
              <FormField
                label={t("about.bio")}
                optional
                helper={<span className="block text-right tabular-nums">{t("about.bioHint", { count: about.bio.length, max: BIO_MAX })}</span>}
              >
                <AutoTextarea maxLength={BIO_MAX} value={about.bio} onChange={(e) => update("aboutBio", e.target.value)} placeholder={t("about.bioPlaceholder")} />
              </FormField>
            </>
          )}
        </FormCard>
      )}

      {full && (
        <>
          <FormCard title={t("about.publicLinks")} description={t("about.publicLinksHint")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map(({ key, placeholder }) => (
                <FormField key={key} label={t(`socials.${key}`)} optional>
                  <input
                    className={formInput}
                    value={about.socials[key] ?? ""}
                    onChange={(e) => update("aboutSocials", { ...about.socials, [key]: e.target.value })}
                    placeholder={t(`socialPlaceholders.${placeholder}`)}
                  />
                </FormField>
              ))}
            </div>
          </FormCard>
          <FormCard title={t("about.crewOnly")} description={t("about.crewOnlyHint")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_FIELDS.map((key) => (
                <FormField key={key} label={tContacts(`channel.${key}`)} optional>
                  <input
                    className={formInput}
                    value={about.contacts[key] ?? ""}
                    onChange={(e) => update("aboutContacts", { ...about.contacts, [key]: e.target.value })}
                    placeholder={t(`contactPlaceholders.${key}`)}
                    inputMode={key === "telegram" || key === "discord" || key === "facetime" ? "text" : "tel"}
                  />
                </FormField>
              ))}
            </div>
          </FormCard>
        </>
      )}
    </FormCards>
  );
}

/* ───────────────────────── 4 · Publish ───────────────────────── */

export function PublishSummary({ stay, form, card, loginNote }: { stay: Stay; form: FormState; card: ReactNode; loginNote: boolean }) {
  const t = useTranslations("create.publish");
  const format = useFormat();
  const nights = stay.startDate && stay.endDate ? nightsBetween(stay.startDate, stay.endDate) : 0;
  const rows: Array<[string, string]> = [
    [t("place"), format.placeLabel(stay)],
    [t("dates"), nights > 0 ? t("datesNights", { dates: format.longRange(stay.startDate, stay.endDate), nights: format.nights(nights) }) : format.longRange(stay.startDate, stay.endDate)],
    [t("crew"), format.people(stay.spotsTotal)],
    [t("budget"), format.priceLabel(stay)],
    [t("language"), format.language(stay.language)],
    [t("pitch"), t("pitchCount", { count: pitchCount(form), total: PITCH_FIELDS.length })],
  ];
  const next = ["share", "requests", "pick"] as const;
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,22.5rem)_minmax(0,1fr)] md:gap-8">
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">{t("intro")}</p>
        <div className="mx-auto max-w-90">{card}</div>
        {loginNote && <p className="text-sm text-zinc-500">{t("loginBeforeLive")}</p>}
      </div>
      <FormCards>
        <FormCard title={t("summary")}>
          <dl className="divide-y divide-black/5 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <dt className="shrink-0 text-zinc-500">{label}</dt>
                <dd className="min-w-0 text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </FormCard>
        <FormCard title={t("next")}>
          <ol className="space-y-4">
            {next.map((key, i) => (
              <li key={key} className="flex gap-3">
                <StepNumber n={i + 1} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t(`steps.${key}.title`)}</p>
                  <p className="text-[13px] text-zinc-500">{t(`steps.${key}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </FormCard>
      </FormCards>
    </div>
  );
}

/* ───────────────────────── Checklist ───────────────────────── */

export type ChecklistKey = "title" | "dates" | "photo" | "pitch" | "hostNote";

export function Checklist({ items, onJump }: { items: Array<{ key: ChecklistKey; done: boolean; detail?: string }>; onJump: (key: ChecklistKey) => void }) {
  const t = useTranslations("create.checklist");
  return (
    <ul className="mt-4 rounded-[24px] bg-white p-2">
      {items.map(({ key, done, detail }) => (
        <li key={key}>
          <button type="button" onClick={() => onJump(key)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-black/5">
            {done ? (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <Circle className="size-5 shrink-0 text-zinc-300" aria-hidden />
            )}
            <span className={cn("flex-1", done ? "text-ink" : "text-zinc-500")}>{t(`items.${key}`)}</span>
            {detail && <span className="text-xs tabular-nums text-zinc-400">{detail}</span>}
            <span className="sr-only">{done ? t("done") : t("missing")}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
