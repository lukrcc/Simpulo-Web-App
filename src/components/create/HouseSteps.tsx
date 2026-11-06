"use client";

import { ChevronRight, ImagePlus, Plus, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { PlaceCombobox } from "@/components/explore/PlaceCombobox";
import { useMonthName } from "@/components/explore/SearchFields";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { MonthName, newYearOf, shortMonth, upcomingMonths } from "@/components/form/MonthChips";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip, ChipCheck, selectedSurface } from "@/components/ui/Chip";
import { ChipIndicator } from "@/components/ui/ChipIndicator";
import { Combobox } from "@/components/ui/Combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Img } from "@/components/ui/Img";
import { WAITLIST_MAX_LIMIT } from "@/lib/waitlist";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { useFormat } from "@/i18n/format";
import { hostProgrammeEarning } from "@/lib/fees";
import { linkDomain } from "@/lib/links";
import type { Currency, User, Vibe } from "@/lib/types";
import { CURRENCIES, VIBES, cn, nightsBetween } from "@/lib/utils";
import { SearchDemandHint } from "./SearchDemandHint";
import {
  BUDGET_SCALE,
  CUSTOM_VIBE_MAX,
  HOST_NOTE_MAX,
  LOOKING_FOR_MAX,
  MAX_COVER_PHOTOS,
  MAX_NIGHTS,
  MAX_PROPOSALS,
  OPTIONAL_GROUPS,
  SPOTS_MAX,
  SPOTS_MIN,
  TITLE_MAX_NEW,
  detailDone,
  fieldId,
  formPlaceOf,
  isLink,
  monthBounds,
  suggestionVibe,
  type DetailKey,
  type FieldKey,
  type FormState,
  type HouseTemplate,
  type StepKey,
} from "./model";
import { regionShortName } from "./places";

/** Several fields at once (e.g. region + city from one pick) */
export type Patch = (patch: Partial<FormState>) => void;

/** Shared by the steps: the form, the visible error of a field (null until touched / Next tried) and marking it touched. */
export interface StepProps {
  form: FormState;
  patch: Patch;
  errorOf: (key: FieldKey) => string | null;
  touch: (key: FieldKey) => void;
}

/** A field's error line under a group of chips (FormField shows it for single fields). */
function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-small text-red-600">
      {text}
    </p>
  ) : null;
}

/** A label over what it labels: small and muted, the answer free on the page. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-small text-muted">{label}</p>
      {children}
    </div>
  );
}

const newId = () => `p-${Math.random().toString(36).slice(2, 9)}`;

/* ───────────────────────── 1 · Theme ───────────────────────── */

/** The categories as text chips, one sliding capsule (single select), plus "Custom", which opens a small field. */
export function VibeStep({ form, patch, errorOf }: StepProps) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const custom = form.customVibe !== null;
  return (
    <div id={fieldId("vibe")} className="space-y-4">
      <div role="group" aria-label={t("vibe")} className="relative flex flex-wrap gap-1">
        <ChipIndicator />
        {VIBES.map((v) => (
          <Chip key={v.key} variant="text" active={!custom && form.vibe === v.key} onClick={() => patch({ vibe: v.key, customVibe: null })}>
            {format.vibe(v.key)}
          </Chip>
        ))}
        <Chip variant="text" active={custom} onClick={() => patch({ customVibe: custom ? null : "" })}>
          {t("custom")}
        </Chip>
      </div>
      {custom && (
        <input
          autoFocus
          value={form.customVibe ?? ""}
          maxLength={CUSTOM_VIBE_MAX}
          onChange={(e) => patch({ customVibe: e.target.value })}
          placeholder={t("customPlaceholder")}
          aria-label={t("customLabel")}
          className={cn(formInput, "max-w-80")}
        />
      )}
      <ErrorLine text={errorOf("vibe")} />
    </div>
  );
}

/* ───────────────────────── 2 · Where + when ───────────────────────── */

/** The place search; once there's a place, it stands as a chip (a tap searches again). The months follow. */
export function WhereStep({ form, patch, errorOf, touch, today, editing }: StepProps & { /** "" before hydration */ today: string; editing: boolean }) {
  const t = useTranslations("create.house");
  const format = useFormatter();
  const id = useId();
  const months = today ? upcomingMonths(new Date(`${today}T00:00:00Z`)) : [];
  const exact = form.datesMode === "exact";
  const bounds = monthBounds(form.month, today);
  const placeName = [form.city.trim(), form.region.trim()].filter(Boolean).join(", ");
  return (
    <div className="space-y-6">
      <div id={fieldId("region")}>
        {form.region.trim() ? (
          <Chip active size="lg" onClick={() => patch({ region: "", city: "" })} aria-label={t("changePlace", { place: placeName })}>
            <span className="flex items-center gap-1.5">
              {placeName}
              <X className="size-3.5" aria-hidden />
            </span>
          </Chip>
        ) : (
          <PlaceCombobox
            id={`${id}-place`}
            label={t("where")}
            placeholder={t("wherePlaceholder")}
            onPick={(place) => {
              patch(formPlaceOf(place));
              touch("region");
            }}
          />
        )}
        {errorOf("region") && <div className="mt-2"><ErrorLine text={errorOf("region")} /></div>}
      </div>

      {(form.region.trim() || editing) && (
        <Group label={t("when")}>
          {exact ? (
            <ExactDates form={form} patch={patch} errorOf={errorOf} touch={touch} today={today} />
          ) : (
            // Six by two; on phones three per row.
            <div id={fieldId("month")} className="relative grid grid-cols-3 gap-1 sm:grid-cols-6">
              <ChipIndicator />
              {months.map((month, i) => (
                <Chip key={month} variant="text" active={form.month === month} onClick={() => patch({ month })} className="w-full justify-center px-1!">
                  <MonthName year={newYearOf(months, i)}>{shortMonth(format, month, false)}</MonthName>
                </Chip>
              ))}
            </div>
          )}
          <div className="mt-2 space-y-2">
            <ErrorLine text={errorOf("month")} />
            {form.datesMode !== "crew" && (
              <Button variant="tertiary" onClick={() => patch({ datesMode: exact ? "month" : "exact" })}>
                {exact ? t("justMonth") : t("exactDates")}
              </Button>
            )}
          </div>
        </Group>
      )}
      <SearchDemandHint city={form.city} region={form.region} startDate={exact ? form.startDate : bounds.start} endDate={exact ? form.endDate : bounds.end} vibe={form.vibe} />
    </div>
  );
}

function ExactDates({ form, patch, errorOf, touch, today }: StepProps & { today: string }) {
  const dateError = errorOf("startDate") ?? errorOf("endDate");
  return (
    <div id={fieldId("startDate")}>
      {/* Jump target for end-date problems – the one control covers both dates. */}
      <span id={fieldId("endDate")} className="block">
        <DateRangePicker
          start={form.startDate}
          end={form.endDate}
          min={earliest(today)}
          maxNights={MAX_NIGHTS}
          invalid={Boolean(dateError)}
          onChange={(start, end) => {
            patch({ startDate: start, endDate: end, ...(start && { month: start.slice(0, 7) }) });
            if (end) {
              touch("startDate");
              touch("endDate");
            }
          }}
          onClose={() => {
            touch("startDate");
            touch("endDate");
          }}
        />
      </span>
      {dateError && <div className="mt-2"><ErrorLine text={dateError} /></div>}
    </div>
  );
}

const earliest = (today: string) => {
  if (!today) return "";
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

/* ───────────────────────── 3 · Crew + budget ───────────────────────── */

/**
 * How many people, including the host: 2–10, the exact number (crewSize = spotsTotal, the host counts). Editing never goes below who's in, and
 * adds how many may wait on the waitlist once it's full.
 */
export function CrewStep({ form, patch, errorOf, touch, currency, locked, minSpots, editing }: StepProps & { currency: Currency; /** Editing a locked place: price and currency live on the Manage page */ locked: boolean; /** The crew already in (editing), host included */ minSpots: number; editing: boolean }) {
  const t = useTranslations("create.house");
  const tVerify = useTranslations("verification");
  return (
    <div className="space-y-8">
      <div id={fieldId("spotsTotal")}>
        <Group label={t("crewSizeQuestion")}>
          <SegmentedControl
            label={t("crewSizeQuestion")}
            className="max-w-130"
            value={form.spotsTotal}
            onChange={(spots) => patch({ spotsTotal: spots })}
            options={Array.from({ length: SPOTS_MAX - SPOTS_MIN + 1 }, (_, i) => SPOTS_MIN + i)
              .filter((n) => n >= minSpots)
              .map((n) => ({ value: n, label: String(n) }))}
          />
        </Group>
        {errorOf("spotsTotal") && <div className="mt-2"><ErrorLine text={errorOf("spotsTotal")} /></div>}
      </div>
      {/* The waitlist behind a full House – a detail for later, so only when editing. */}
      {editing && (
        <Group label={t("waitlistMax")}>
          <SegmentedControl
            label={t("waitlistMax")}
            className="max-w-80"
            value={form.waitlistMax}
            onChange={(waitlistMax) => patch({ waitlistMax })}
            options={Array.from({ length: WAITLIST_MAX_LIMIT + 1 }, (_, n) => ({ value: n, label: String(n) }))}
          />
          <p className="mt-2 text-small text-muted">{t("waitlistMaxHint")}</p>
        </Group>
      )}
      {editing && (
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-body font-semibold text-ink">{tVerify("verifiedOnly")}</p>
            <p className="mt-1 max-w-[520px] text-small text-muted">{tVerify("verifiedOnlyText")}</p>
          </div>
          <Switch on={form.verifiedGuestsOnly} label={tVerify("verifiedOnly")} onChange={(verifiedGuestsOnly) => patch({ verifiedGuestsOnly })} />
        </div>
      )}
      <BudgetFields form={form} patch={patch} errorOf={errorOf} touch={touch} currency={currency} locked={locked} allowOpen={editing} />
    </div>
  );
}

/** Typed amount with the currency symbol inside the field: digits only, no stepper. */
function AmountInput({ id, value, onChange, currency, label, invalid, onBlur }: { id?: string; value: string; onChange: (value: string) => void; currency: Currency; label: string; invalid?: boolean; onBlur?: () => void }) {
  const format = useFormat();
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-muted">{format.currencySymbol(currency)}</span>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onBlur={onBlur}
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder="0"
        className={cn(formInput, "pl-11 tabular-nums")}
      />
    </span>
  );
}

function BudgetFields({ form, patch, errorOf, touch, currency, locked, allowOpen }: StepProps & { currency: Currency; locked: boolean; /** Houses opened with no budget keep that choice when edited; new ones always say a range */ allowOpen: boolean }) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const scale = BUDGET_SCALE[currency];
  const empty = !form.budgetMin && !form.budgetMax;

  // Fresh budget: start from the currency's typical range, so the slider and the fields agree from the first look.
  const fillStart = useEffectEvent(() => patch({ budgetMin: String(scale.start[0]), budgetMax: String(scale.start[1]) }));
  useEffect(() => {
    if (!locked && !form.budgetTbd && empty) fillStart();
  }, [locked, form.budgetTbd, empty]);

  if (locked) return <p className="text-body text-muted">{t("lockedNote")}</p>;

  const clamp = (n: number) => Math.min(Math.max(n, scale.min), scale.max);
  const low = Number(form.budgetMin) || scale.start[0];
  const high = Number(form.budgetMax) || scale.start[1];
  const sliderValue: [number, number] = [clamp(Math.min(low, high)), clamp(Math.max(low, high))];
  const currencies = CURRENCIES.map((code) => ({ value: code, label: code }));

  return (
    <Group label={t("budgetLabel")}>
      {allowOpen && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-body text-ink">{t("decideTogether")}</span>
          <Switch on={form.budgetTbd} label={t("decideTogether")} onChange={(on) => patch({ budgetTbd: on })} />
        </div>
      )}
      {!form.budgetTbd && (
        <div id={fieldId("budget")} className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_128px] gap-3">
            <AmountInput value={form.budgetMin} onChange={(v) => patch({ budgetMin: v })} currency={currency} label={t("budgetFrom")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            <AmountInput value={form.budgetMax} onChange={(v) => patch({ budgetMax: v })} currency={currency} label={t("budgetTo")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            <Combobox
              aria-label={t("currencyLabel")}
              value={currency}
              options={currencies}
              onPick={(option) => {
                // Another currency means another scale – the range starts over at its defaults.
                const next = option.value as Currency;
                if (next !== currency) patch({ currency: next, budgetMin: String(BUDGET_SCALE[next].start[0]), budgetMax: String(BUDGET_SCALE[next].start[1]) });
              }}
            />
          </div>
          <RangeSlider
            min={scale.min}
            max={scale.max}
            step={scale.step}
            value={sliderValue}
            onChange={([min, max]) => patch({ budgetMin: String(min), budgetMax: String(max) })}
            labels={[t("budgetFrom"), t("budgetTo")]}
            formatValue={(n) => format.price(n, currency)}
          />
          <ErrorLine text={errorOf("budget")} />
        </div>
      )}
    </Group>
  );
}

/* ───────────────────────── 4 · Cover + title ───────────────────────── */

const COVER_MAX_WIDTH = 1600;

/** A picked photo as a data URL, scaled down: it has to survive in the draft. */
async function fileToPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, COVER_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** "Pick a cover": your own photos (up to six, the first is the cover) or one that fits the theme and place. Then the title and the card note. */
export function CoverStep({ form, patch, errorOf, touch, suggestions }: StepProps & { suggestions: string[] }) {
  const t = useTranslations("create.cover");
  const tHouse = useTranslations("create.house");
  const tPitch = useTranslations("create.pitch");
  const titles = useTitleSuggestions(form, TITLE_MAX_NEW);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // The title starts as "{Theme} House {Place}", yours to change.
  const fillTitle = useEffectEvent(() => {
    if (!form.title && titles[0]) patch({ title: titles[0] });
  });
  useEffect(() => fillTitle(), []);

  async function add(files: FileList | null) {
    const images = [...(files ?? [])].filter((file) => file.type.startsWith("image/")).slice(0, MAX_COVER_PHOTOS);
    // A file that can't be read as an image is simply left out.
    const results = await Promise.allSettled(images.map(fileToPhoto));
    const photos = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    patch({ photos: [...form.photos, ...photos].slice(0, MAX_COVER_PHOTOS) });
    touch("photos");
  }
  const pickSuggestion = (src: string) => {
    patch({ photos: form.photos.includes(src) ? form.photos.filter((photo) => photo !== src) : [src, ...form.photos].slice(0, MAX_COVER_PHOTOS) });
    touch("photos");
  };

  return (
    <div className="space-y-8">
      <div id={fieldId("photos")} className="space-y-4">
        <div className={cn("grid gap-4", suggestions.length > 0 && "sm:grid-cols-2")}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void add(e.dataTransfer.files);
            }}
            className={cn("flex min-h-64 flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center transition-colors duration-150", dragging ? selectedSurface : "bg-ink/5 hover:bg-ink/8")}
          >
            <ImagePlus className="size-6 text-muted" aria-hidden />
            <span className="text-body font-semibold text-ink">{t("drop")}</span>
            <span className="text-small text-muted">{t("dropHint", { max: MAX_COVER_PHOTOS })}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
          {suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-small text-muted">{t("suggestions")}</p>
              <div role="group" aria-label={t("suggestions")} className="grid grid-cols-3 gap-2">
                {suggestions.map((src, i) => {
                  const chosen = form.photos.includes(src);
                  return (
                    <button key={src} type="button" aria-pressed={chosen} aria-label={t("suggestion", { number: i + 1 })} onClick={() => pickSuggestion(src)} className="relative block aspect-3/4 overflow-hidden rounded-2xl bg-ink/5">
                      <Img src={src} alt="" fill sizes="120px" className="object-cover" />
                      {chosen && (
                        <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-(--select-bg)">
                          <ChipCheck />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {form.photos.length > 0 && (
          <ul aria-label={t("yours")} className="flex flex-wrap gap-2">
            {form.photos.map((src, i) => (
              <li key={src} className="relative">
                <button type="button" disabled={i === 0} onClick={() => patch({ photos: [src, ...form.photos.filter((photo) => photo !== src)] })} aria-label={i === 0 ? t("isCover") : t("makeCover")} className="relative block h-20 w-15 overflow-hidden rounded-xl bg-ink/5">
                  <Img src={src} alt="" fill sizes="60px" className="object-cover" />
                  {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-small text-white">{t("cover")}</span>}
                </button>
                <button type="button" onClick={() => patch({ photos: form.photos.filter((photo) => photo !== src) })} aria-label={t("remove")} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <ErrorLine text={errorOf("photos")} />
      </div>
      <FormField id={fieldId("title")} label={tHouse("title")} error={errorOf("title")} aside={<span className="text-small tabular-nums text-muted">{tHouse("titleCount", { count: form.title.length, max: TITLE_MAX_NEW })}</span>}>
        <input className={formInput} value={form.title} onChange={(e) => patch({ title: e.target.value })} onBlur={() => touch("title")} placeholder={titles[0] ?? tHouse("titlePlaceholder")} maxLength={TITLE_MAX_NEW} aria-invalid={Boolean(errorOf("title")) || undefined} />
      </FormField>
      <FormField label={tHouse("cardNote")} optional aside={<span className="text-small tabular-nums text-muted">{tPitch("hostNoteCount", { count: form.hostNote.length, max: HOST_NOTE_MAX })}</span>}>
        <input className={formInput} value={form.hostNote} maxLength={HOST_NOTE_MAX} onChange={(e) => patch({ hostNote: e.target.value })} placeholder={tPitch("hostNotePlaceholder")} />
      </FormField>
    </div>
  );
}

/* ───────────────────────── Ready to open? ───────────────────────── */

/** What the four answers came to, each with its way back. */
export function ReadySummary({ rows, onEdit }: { rows: Array<{ key: string; label: string; value: string; step: StepKey }>; onEdit: (step: StepKey) => void }) {
  const t = useTranslations("create.ready");
  return (
    <dl className="space-y-4">
      {rows.map(({ key, label, value, step }) => (
        <div key={key} className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <dt className="text-small text-muted">{label}</dt>
            <dd className="mt-0.5 text-body font-semibold text-ink">{value}</dd>
          </div>
          <Button variant="tertiary" onClick={() => onEdit(step)} aria-label={t("editLabel", { label })}>
            {t("edit")}
          </Button>
        </div>
      ))}
    </dl>
  );
}

/** The optional details by group: what's there in muted after the name, an accent check once it's done, "Add" while it's empty. */
export function OptionalList({ form, details, invalid, onOpen }: { form: FormState; details: DetailKey[]; invalid: StepKey[]; onOpen: (step: DetailKey) => void }) {
  const t = useTranslations("create.details");
  const tReady = useTranslations("create.ready");
  const summary = useDetailSummary(form);
  return (
    <div className="space-y-6">
      {OPTIONAL_GROUPS.map((group) => {
        const rows = group.details.filter((key) => details.includes(key));
        if (rows.length === 0) return null;
        return (
          <section key={group.key} aria-label={tReady(`groups.${group.key}`)}>
            <h2 className="mb-1 text-eyebrow uppercase text-ink/55">{tReady(`groups.${group.key}`)}</h2>
            <ul>
              {rows.map((key) => {
                const done = detailDone(key, form);
                const value = summary(key);
                return (
                  <li key={key}>
                    <button type="button" onClick={() => onOpen(key)} className="-mx-3 flex min-h-11 w-[calc(100%+24px)] items-center gap-2 rounded-2xl px-3 text-left transition-colors duration-150 hover:bg-(--chip-bg)">
                      <span className="flex w-4 shrink-0 justify-center">{done && <ChipCheck />}</span>
                      <span className="min-w-0 flex-1 truncate text-body text-ink">
                        {t(`rows.${key}`)}
                        {value && <span className="text-muted"> · {value}</span>}
                      </span>
                      {invalid.includes(key) ? <span className="shrink-0 text-small text-red-600">{t("fix")}</span> : !done && <span className="shrink-0 text-small font-semibold text-ink">{tReady("add")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Details (optional) ───────────────────────── */

export function TitleDetail({ form, patch, errorOf, touch, titleMax }: StepProps & { titleMax: number }) {
  const t = useTranslations("create.house");
  const tPitch = useTranslations("create.pitch");
  const titles = useTitleSuggestions(form, titleMax);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FormField id={fieldId("title")} label={t("title")} error={errorOf("title")} aside={<span className="text-small tabular-nums text-muted">{t("titleCount", { count: form.title.length, max: titleMax })}</span>}>
          <input className={formInput} value={form.title} onChange={(e) => patch({ title: e.target.value })} onBlur={() => touch("title")} placeholder={titles[0] ?? t("titlePlaceholder")} maxLength={titleMax} aria-invalid={Boolean(errorOf("title")) || undefined} />
        </FormField>
        {titles.length > 0 && (
          <div role="group" aria-label={t("titleSuggestions")} className="flex flex-wrap gap-2">
            {titles.map((title) => (
              <Chip key={title} active={form.title === title} onClick={() => patch({ title })}>
                {title}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <FormField label={t("cardNote")} optional aside={<span className="text-small tabular-nums text-muted">{tPitch("hostNoteCount", { count: form.hostNote.length, max: HOST_NOTE_MAX })}</span>}>
          <input className={formInput} value={form.hostNote} maxLength={HOST_NOTE_MAX} onChange={(e) => patch({ hostNote: e.target.value })} placeholder={tPitch("hostNotePlaceholder")} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          {(tPitch.raw("hostNoteExamples") as string[]).map((example) => (
            <Chip key={example} active={form.hostNote === example} onClick={() => patch({ hostNote: example })}>
              {example}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhotosDetail({ form, patch }: StepProps) {
  return <PhotoUploader photos={form.photos} onChange={(photos) => patch({ photos })} slots={5} labels="house" />;
}

export function WhyDetail({ form, patch }: StepProps) {
  const t = useTranslations("create.pitch");
  const tRows = useTranslations("create.extras.rows");
  return (
    <div className="space-y-5">
      <FormField label={tRows("why")}>
        <AutoTextarea value={form.whyText} onChange={(e) => patch({ whyText: e.target.value })} placeholder={t("whyPlaceholder")} />
      </FormField>
      <FormField label={tRows("day")}>
        <AutoTextarea value={form.dayText} onChange={(e) => patch({ dayText: e.target.value })} placeholder={t("dayPlaceholder")} />
      </FormField>
    </div>
  );
}

/** A deadline for the vote, the proposals' optional last word. */
function DeadlineField({ value, onChange, min }: { value: string; onChange: (value: string) => void; min: string }) {
  const t = useTranslations("create.vote");
  return (
    <FormField label={t("deadline")} optional>
      <input type="date" className={cn(formInput, "max-w-56")} value={value} min={min} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

/** Exact dates, or 1–3 ranges for the crew to vote on. */
export function DatesDetail({ form, patch, errorOf, touch, today }: StepProps & { today: string }) {
  const t = useTranslations("create.vote");
  const proposals = form.dateProposals;
  const setMode = (datesMode: FormState["datesMode"]) =>
    patch({ datesMode, ...(datesMode === "crew" && proposals.length === 0 && { dateProposals: [{ id: newId(), start: "", end: "" }] }) });
  return (
    <div className="space-y-6">
      <SegmentedControl
        label={t("datesLabel")}
        value={form.datesMode}
        onChange={setMode}
        options={[
          { value: "month", label: t("monthOnly") },
          { value: "exact", label: t("exact") },
          { value: "crew", label: t("decideWithCrew") },
        ]}
      />
      {form.datesMode === "exact" && <ExactDates form={form} patch={patch} errorOf={errorOf} touch={touch} today={today} />}
      {form.datesMode === "crew" && (
        <div id={fieldId("dateProposals")} className="space-y-4">
          <p className="text-body text-muted">{t("explainDates")}</p>
          {proposals.map((proposal, i) => (
            <div key={proposal.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <DateRangePicker
                  start={proposal.start}
                  end={proposal.end}
                  min={earliest(today)}
                  maxNights={MAX_NIGHTS}
                  onChange={(start, end) => patch({ dateProposals: proposals.map((p) => (p.id === proposal.id ? { ...p, start, end } : p)) })}
                  onClose={() => touch("dateProposals")}
                />
              </div>
              {proposals.length > 1 && (
                <Button variant="tertiary" size="md" icon onClick={() => patch({ dateProposals: proposals.filter((p) => p.id !== proposal.id) })} aria-label={t("remove", { number: i + 1 })}>
                  <X />
                </Button>
              )}
            </div>
          ))}
          {proposals.length < MAX_PROPOSALS && (
            <Button variant="tertiary" onClick={() => patch({ dateProposals: [...proposals, { id: newId(), start: "", end: "" }] })}>
              <Plus />
              {t("add")}
            </Button>
          )}
          <ErrorLine text={errorOf("dateProposals")} />
          <DeadlineField value={form.datesDeadline} onChange={(datesDeadline) => patch({ datesDeadline })} min={earliest(today)} />
        </div>
      )}
    </div>
  );
}

/** The place: the host sorts it out later, or the crew votes on 1–3 links with a price. */
/** "Add a photo of the place" (optional): the accommodation tile on the House page uses it when the listing's link has no picture. */
function PlacePhoto({ value, onChange }: { value: string; onChange: (photo: string) => void }) {
  const t = useTranslations("create.house");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      {value && <Img src={value} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />}
      <Button variant="tertiary" className="-ml-4" onClick={() => inputRef.current?.click()}>
        <ImagePlus aria-hidden />
        {value ? t("placePhotoChange") : t("placePhoto")}
      </Button>
      {value && (
        <Button variant="tertiary" onClick={() => onChange("")}>
          {t("placePhotoRemove")}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void fileToPhoto(file).then(onChange, () => {});
        }}
      />
    </div>
  );
}

export function AccommodationDetail({ form, patch, errorOf, touch, currency, locked, today }: StepProps & { currency: Currency; locked: boolean; today: string }) {
  const t = useTranslations("create.vote");
  const tHouse = useTranslations("create.house");
  const proposals = form.placeProposals;
  if (locked) return <p className="text-body text-muted">{tHouse("lockedNote")}</p>;
  const setMode = (accommodationMode: FormState["accommodationMode"]) =>
    patch({ accommodationMode, ...(accommodationMode === "crew" && proposals.length === 0 && { placeProposals: [{ id: newId(), link: "", price: "" }] }) });
  return (
    <div className="space-y-6">
      <SegmentedControl
        label={t("placeLabel")}
        value={form.accommodationMode}
        onChange={setMode}
        options={[
          { value: "later", label: t("later") },
          { value: "crew", label: t("decideWithCrew") },
        ]}
      />
      {form.accommodationMode === "later" && <p className="text-body text-muted">{t("explainLater")}</p>}
      <PlacePhoto value={form.accommodationPhoto} onChange={(accommodationPhoto) => patch({ accommodationPhoto })} />
      {form.accommodationMode === "crew" && (
        <div id={fieldId("placeProposals")} className="space-y-4">
          <p className="text-body text-muted">{t("explainPlace")}</p>
          {proposals.map((proposal, i) => {
            const set = (change: Partial<typeof proposal>) => patch({ placeProposals: proposals.map((p) => (p.id === proposal.id ? { ...p, ...change } : p)) });
            const link = proposal.link.trim();
            return (
              <div key={proposal.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_128px_auto] items-center gap-2">
                  <input type="url" inputMode="url" aria-label={t("linkLabel", { number: i + 1 })} className={formInput} value={proposal.link} onChange={(e) => set({ link: e.target.value })} onBlur={() => touch("placeProposals")} placeholder="https://www.airbnb.com/rooms/…" />
                  <AmountInput value={proposal.price} onChange={(price) => set({ price })} currency={currency} label={t("priceLabel", { number: i + 1 })} onBlur={() => touch("placeProposals")} />
                  {proposals.length > 1 ? (
                    <Button variant="tertiary" size="md" icon onClick={() => patch({ placeProposals: proposals.filter((p) => p.id !== proposal.id) })} aria-label={t("remove", { number: i + 1 })}>
                      <X />
                    </Button>
                  ) : (
                    <span aria-hidden className="size-11" />
                  )}
                </div>
                {link && isLink(link) && <p className="mt-1 text-small text-muted">{linkDomain(link)}</p>}
              </div>
            );
          })}
          <p className="text-small text-muted">{t("pricePerPerson")}</p>
          {proposals.length < MAX_PROPOSALS && (
            <Button variant="tertiary" onClick={() => patch({ placeProposals: [...proposals, { id: newId(), link: "", price: "" }] })}>
              <Plus />
              {t("add")}
            </Button>
          )}
          <ErrorLine text={errorOf("placeProposals")} />
          <DeadlineField value={form.accommodationDeadline} onChange={(accommodationDeadline) => patch({ accommodationDeadline })} min={earliest(today)} />
        </div>
      )}
    </div>
  );
}

/** Same flow for everyone: a program is one more detail, up to 30 % of the share. */
export function HostDetail({ form, patch, errorOf, touch, currency, allowed }: StepProps & { currency: Currency; /** Only hosts who may charge one can offer a program */ allowed: boolean }) {
  const t = useTranslations("create.host");
  const format = useFormat();
  if (!allowed) return <p className="text-body text-muted">{t("proOnly")}</p>;
  const program = form.hostExperience === "program";
  const fee = Math.round(Number(form.hostFee)) || 0;
  const earning = hostProgrammeEarning(fee);
  return (
    <div className="space-y-5">
      <SegmentedControl
        label={t("label")}
        value={form.hostExperience}
        onChange={(hostExperience) => patch({ hostExperience })}
        options={[
          { value: "rent", label: t("rent.title") },
          { value: "program", label: t("program.title") },
        ]}
      />
      <p className="text-body text-muted">{t(`${form.hostExperience}.text`)}</p>
      {program && (
        <div className="space-y-3">
          <FormField label={t("amount")} error={errorOf("hostFee")}>
            <AmountInput id={fieldId("hostFee")} value={form.hostFee} onChange={(v) => patch({ hostFee: v })} currency={currency} label={t("amount")} invalid={Boolean(errorOf("hostFee"))} onBlur={() => touch("hostFee")} />
          </FormField>
          {fee > 0 && (
            <p className="text-body font-medium text-ink" aria-live="polite">
              {t("earn", { amount: format.price(earning, currency), total: format.price(earning * Math.max(0, form.spotsTotal - 1), currency) })}
            </p>
          )}
          <p className="text-small text-muted">{t("note")}</p>
        </div>
      )}
    </div>
  );
}

export function LookingForDetail({ form, patch, errorOf, touch }: StepProps) {
  const t = useTranslations("create.pitch");
  const tStarters = useTranslations("create.starters");
  const starters = (tStarters.raw(`${suggestionVibe(form)}.lookingFor`) as string[]).slice(0, 3);
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Adds a starter (after what's there) and puts the cursor at the end, ready to finish the sentence. */
  function insert(starter: string) {
    const current = form.lookingForText.trimEnd();
    patch({ lookingForText: (current ? `${current} ${starter}` : starter).slice(0, LOOKING_FOR_MAX) });
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  return (
    <div className="space-y-3">
      <FormField id={fieldId("lookingForText")} label={t("lookingFor")} error={errorOf("lookingForText")} aside={<span className="text-small tabular-nums text-muted">{t("lookingForCount", { count: form.lookingForText.length, max: LOOKING_FOR_MAX })}</span>}>
        <AutoTextarea ref={ref} rows={3} maxLength={LOOKING_FOR_MAX} value={form.lookingForText} onChange={(e) => patch({ lookingForText: e.target.value })} onBlur={() => touch("lookingForText")} placeholder={t("lookingForPlaceholder")} aria-invalid={Boolean(errorOf("lookingForText")) || undefined} />
      </FormField>
      <div role="group" aria-label={t("startWith")} className="flex flex-wrap gap-2">
        {starters.map((starter) => (
          <Chip key={starter} active={false} onClick={() => insert(starter)}>
            {`${starter.replace(/[\s–-]+$/, "")}…`}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function RulesDetail({ form, patch }: StepProps) {
  const t = useTranslations("create.house");
  return (
    <FormField label={t("rulesLabel")} helper={t("rulesHelper")}>
      <AutoTextarea rows={4} value={form.rulesText} onChange={(e) => patch({ rulesText: e.target.value })} placeholder={t("rulesPlaceholder")} />
    </FormField>
  );
}

export function LanguagesDetail({ form, patch }: StepProps) {
  return <LanguageInput languages={form.languages} onChange={(languages) => patch({ languages })} />;
}

export function CrewGroupDetail({ form, patch, errorOf, touch }: StepProps) {
  const t = useTranslations("create.house");
  return (
    <FormField id={fieldId("crewGroupUrl")} label={t("crewGroupUrl")} error={errorOf("crewGroupUrl")}>
      <input className={formInput} value={form.crewGroupUrl} onChange={(e) => patch({ crewGroupUrl: e.target.value })} onBlur={() => touch("crewGroupUrl")} placeholder="https://chat.whatsapp.com/…" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={Boolean(errorOf("crewGroupUrl")) || undefined} />
    </FormField>
  );
}

/* ───────────────────────── The list of details ───────────────────────── */

function DetailRow({ title, value, done, invalid, onOpen }: { title: string; value?: string; done: boolean; invalid?: boolean; onOpen: () => void }) {
  const t = useTranslations("create.details");
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 rounded-2xl py-2 text-left outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink/25">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", done ? "bg-(--select-bg)" : "bg-ink/5")}>{done && <ChipCheck />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">{title}</span>
          {invalid ? <span className="block text-small text-red-600">{t("fix")}</span> : value && <span className="block truncate text-small text-muted">{value}</span>}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  );
}

/** "Add details": each with its check. Editing also lists the three required answers on top. */
export function DetailsList({ form, details, required, invalid, onOpen }: { form: FormState; details: DetailKey[]; required?: Array<{ step: StepKey; value: string }>; invalid: StepKey[]; onOpen: (step: StepKey) => void }) {
  const t = useTranslations("create.details");
  const summary = useDetailSummary(form);
  return (
    <ul>
      {required?.map(({ step, value }) => <DetailRow key={step} title={t(`rows.${step as "vibe"}`)} value={value} done={!invalid.includes(step)} invalid={invalid.includes(step)} onOpen={() => onOpen(step)} />)}
      {details.map((key) => <DetailRow key={key} title={t(`rows.${key}`)} value={summary(key)} done={detailDone(key, form)} invalid={invalid.includes(key)} onOpen={() => onOpen(key)} />)}
    </ul>
  );
}

function useDetailSummary(form: FormState) {
  const t = useTranslations("create.vote");
  const monthName = useMonthName();
  return (key: DetailKey): string | undefined => {
    if (key === "title") return form.title.trim() || undefined;
    if (key === "photos" && form.photos.length > 0) return String(form.photos.length);
    if (key === "languages") return form.languages.join(", ") || undefined;
    if (key === "dates") return form.datesMode === "crew" ? t("decideWithCrew") : form.datesMode === "month" && form.month ? monthName(form.month) : undefined;
    if (key === "accommodation" && form.accommodationMode === "crew") return t("decideWithCrew");
    if (key === "rules") return form.rulesText.split("\n").find((rule) => rule.trim());
    if (key === "why") return form.whyText.trim() || undefined;
    if (key === "lookingFor") return form.lookingForText.trim() || undefined;
    return undefined;
  };
}

/** No photo or name: publishing waits for them. */
export function ProfileNote({ me }: { me?: User }) {
  const t = useTranslations("create.publish.profile");
  if (!me) return <p className="text-small text-muted">{t("loggedOut")}</p>;
  const missing = [!me.photos[0] && t("photo"), !me.name.trim() && t("name")].filter((item): item is string => Boolean(item));
  if (missing.length === 0) return null;
  return (
    <p role="alert" className="flex flex-wrap items-center gap-3 text-small text-red-600">
      <Avatar user={me} size="sm" />
      {t("hint", { items: missing.join(" & ") })}
      <Button variant="tertiary" href="/profile/edit">
        {t("edit")}
      </Button>
    </p>
  );
}

/** Three title ideas from vibe + place + duration ("Fitness House Canggu", "Canggu Fitness Month", "Two Weeks of Training in Bali"). */
export function useTitleSuggestions(form: FormState, titleMax: number): string[] {
  const t = useTranslations("create.house");
  const customLabel = form.customVibe?.trim();
  const vibe: Vibe | "" = form.customVibe !== null ? (customLabel ? "social" : "") : form.vibe;
  const region = regionShortName(form.region);
  if (!vibe || !region) return [];
  const place = form.city.trim() || region;
  const vibeWord = customLabel ? customLabel.replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : t(`titleVibes.${vibe}`);
  const activity = customLabel || t(`activities.${vibe}`);
  const nights = form.datesMode === "exact" && form.startDate && form.endDate ? nightsBetween(form.startDate, form.endDate) : 0;
  const period = nights >= 25 && nights <= 35 ? "month" : nights >= 5 && nights <= 9 ? "week" : "other";
  const duration = durationKey(nights);
  const ideas = [
    t("titleTemplates.house", { vibe: vibeWord, place }),
    t("titleTemplates.period", { place, vibe: vibeWord, period: t(`periods.${period}`) }),
    nights > 0
      ? t("titleTemplates.of", { duration: duration ? t(`durations.${duration}`) : t("durations.nights", { count: nights }), activity, region })
      : t("titleTemplates.ofNoDates", { activity, region }),
  ];
  return Array.from(new Set(ideas.filter((idea) => idea.length <= titleMax)));
}

function durationKey(nights: number) {
  if (nights >= 6 && nights <= 8) return "week";
  if (nights >= 13 && nights <= 15) return "twoWeeks";
  if (nights >= 20 && nights <= 22) return "threeWeeks";
  if (nights >= 27 && nights <= 31) return "month";
  if (nights >= 58 && nights <= 62) return "twoMonths";
  return null;
}

/** Textarea that starts at 3 rows (or `rows`) and grows with its text. */
function AutoTextarea({ ref, rows = 3, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { ref?: Ref<HTMLTextAreaElement> }) {
  const own = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [props.value]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      rows={rows}
      className={formTextarea}
      {...props}
    />
  );
}

/* ───────────────────────── Invites and templates ───────────────────────── */

/** A checkbox row: 44px, the box on the left. */
export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** "Start from a template": the saved templates as cards above step 1; picking one fills everything but the dates. */
export function TemplatePicker({ templates, onPick, onRemove, className }: { templates: HouseTemplate[]; onPick: (template: HouseTemplate) => void; onRemove: (id: string) => void; className?: string }) {
  const t = useTranslations("create.templates");
  const format = useFormat();
  return (
    <section className={className}>
      <h2 className="mb-3 text-small text-muted">{t("title")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const { form } = template;
          const vibe = form.customVibe?.trim() || (form.vibe ? format.vibe(form.vibe) : "");
          const title = form.title.trim() || t("untitled");
          return (
            <li key={template.id} className="flex items-start gap-2 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 transition-colors hover:border-ink">
              <button type="button" onClick={() => onPick(template)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-body font-medium text-ink">{title}</span>
                <span className="mt-0.5 block truncate text-small text-muted">
                  {[vibe, regionShortName(form.region), format.people(form.spotsTotal)].filter(Boolean).join(" · ")}
                </span>
              </button>
              <Button variant="tertiary" onClick={() => onRemove(template.id)} aria-label={t("remove", { title })} className="size-6">
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
