"use client";

import { Check, ChevronUp, Circle, Link2, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { FormCard, FormCards, FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { StepNumber } from "@/components/GetTheApp";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Img } from "@/components/ui/Img";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { useFormat } from "@/i18n/format";
import { linkDomain } from "@/lib/mock-extras";
import type { Currency, Stay, User, Vibe } from "@/lib/types";
import { CURRENCIES, VIBES, cn, countryNames, nightsBetween } from "@/lib/utils";
import {
  BUDGET_SCALE,
  CUSTOM_VIBE_MAX,
  HOST_NOTE_MAX,
  LOOKING_FOR_MAX,
  MAX_IDEAS,
  MAX_NIGHTS,
  PITCH_FIELDS,
  TITLE_MAX,
  fieldId,
  isLink,
  joinDayParts,
  pitchCount,
  suggestionVibe,
  type About,
  type AboutField,
  type FieldKey,
  type FormState,
} from "./model";
import { WHERE_OPTIONS, areaOptions, placeOf, regionShortName } from "./places";

export type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
/** Several fields at once (e.g. region + area from one pick) */
export type Patch = (patch: Partial<FormState>) => void;

/** Shared by the steps: the visible error of a field (null until touched / Next attempted) and marking it touched. */
export interface FieldHelpers {
  errorOf: (key: FieldKey) => string | null;
  touch: (key: FieldKey) => void;
}

// No class merging here, so active and inactive each set their own background.
const chipClass = "rounded-full border px-4 py-2 text-sm transition-colors";
const chipInactiveClass = "border-[#E7E5E4] bg-[#FAFAF9] hover:border-neutral-400";
const chipActiveClass = "border-ink bg-ink text-white";
/** Smaller tap-to-insert suggestion chips (starters, title ideas, card note examples) */
const suggestionClass =
  "max-w-full truncate rounded-full border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-[13px] text-zinc-600 transition-colors hover:border-ink hover:text-ink";

/* ───────────────────────── 1 · The House ───────────────────────── */

interface HouseStepProps extends FieldHelpers {
  form: FormState;
  update: Update;
  patch: Patch;
  minSpots: number;
  /** Earliest start (tomorrow), "" before hydration */
  minStart: string;
  languages: { own: string[]; common: string[] };
  language: string;
  currency: Currency;
  /** Editing a House whose place is locked: price and currency are managed on the Manage page. */
  locked: boolean;
}

export function HouseStep({ form, update, patch, minSpots, minStart, languages, language, currency, locked, errorOf, touch }: HouseStepProps) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const areas = areaOptions(form.region);
  const titles = useTitleSuggestions(form);
  const dateError = errorOf("startDate") ?? errorOf("endDate");

  return (
    <FormCards>
      <FormCard title={t("cards.vibe")} description={t("vibeHint")}>
        <VibePicker form={form} patch={patch} />
      </FormCard>

      <FormCard title={t("cards.where")}>
        <FormField id={fieldId("region")} label={t("where")} error={errorOf("region")} group>
          <Combobox
            aria-label={t("where")}
            value={form.region}
            options={WHERE_OPTIONS}
            onPick={(option) => {
              const place = placeOf(option);
              // Picking an area directly fills both; a region leaves the area open.
              patch({ region: place.region, city: place.city ?? "", cityOpen: !place.city });
              touch("region");
            }}
            onFreeText={(text) => {
              if (text !== form.region) patch({ region: text, city: "", cityOpen: true });
              touch("region");
            }}
            isSelected={(option) => {
              const place = placeOf(option);
              return place.region === form.region && (place.city === undefined || place.city === form.city);
            }}
            placeholder={t("wherePlaceholder")}
            empty={t("whereEmpty")}
            invalid={Boolean(errorOf("region"))}
            onBlur={() => touch("region")}
          />
        </FormField>
        {form.region.trim() && (
          <FormField label={t("area")} optional group>
            <Combobox
              aria-label={t("area")}
              value={form.cityOpen ? t("stillOpen") : form.city}
              pinned={{ value: "__open", label: t("stillOpen"), hint: t("stillOpenHint") }}
              options={areas}
              onPick={(option) => patch(option.value === "__open" ? { city: "", cityOpen: true } : { city: option.label, cityOpen: false })}
              onFreeText={(text) => patch({ city: text, cityOpen: false })}
              isSelected={(option) => (option.value === "__open" ? form.cityOpen : !form.cityOpen && option.label === form.city)}
              placeholder={t("areaPlaceholder")}
              empty={t("areaEmpty")}
            />
          </FormField>
        )}
        <FormField id={fieldId("startDate")} label={t("when")} error={dateError} group>
          {/* Jump target for end-date problems – the one control covers both dates. */}
          <span id={fieldId("endDate")} className="block">
            <DateRangePicker
              start={form.startDate}
              end={form.endDate}
              min={minStart}
              maxNights={MAX_NIGHTS}
              invalid={Boolean(dateError)}
              onChange={(start, end) => {
                patch({ startDate: start, endDate: end });
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
        </FormField>
      </FormCard>

      <FormCard title={t("cards.title")}>
        <FormField
          id={fieldId("title")}
          label={t("title")}
          error={errorOf("title")}
          aside={<span className="text-xs tabular-nums text-zinc-400">{t("titleCount", { count: form.title.trim().length, max: TITLE_MAX })}</span>}
          helper={titles.length > 0 ? t("titleSuggestionsHint") : t("titleSuggestionsLater")}
        >
          <input
            className={formInput}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            onBlur={() => touch("title")}
            placeholder={titles[0] ?? t("titlePlaceholder")}
            maxLength={TITLE_MAX}
            aria-invalid={Boolean(errorOf("title")) || undefined}
          />
        </FormField>
        {titles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {titles.map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  update("title", title);
                  touch("title");
                }}
                aria-pressed={form.title === title}
                className={cn(suggestionClass, form.title === title && "border-solid border-ink text-ink")}
              >
                {title}
              </button>
            ))}
          </div>
        )}
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
            <optgroup label={t("languagesYours")}>
              {languages.own.map((code) => (
                <option key={code} value={code}>
                  {format.language(code)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("languagesOther")}>
              {languages.common.map((code) => (
                <option key={code} value={code}>
                  {format.language(code)}
                </option>
              ))}
            </optgroup>
          </select>
        </FormField>
      </FormCard>

      <FormCard title={t("cards.budget")}>
        {locked ? <p className="text-sm text-zinc-500">{t("lockedNote")}</p> : <BudgetField form={form} patch={patch} currency={currency} />}
      </FormCard>
    </FormCards>
  );
}

/** The vibe chips (single select) plus "+ Custom", which turns into a small inline input. */
function VibePicker({ form, patch }: { form: FormState; patch: Patch }) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const custom = form.customVibe !== null;
  return (
    <div role="group" aria-label={t("cards.vibe")} className="flex flex-wrap gap-2">
      {VIBES.map((v) => {
        const active = !custom && form.vibe === v.key;
        return (
          <button
            key={v.key}
            type="button"
            aria-pressed={active}
            onClick={() => patch({ vibe: v.key, customVibe: null })}
            className={cn(chipClass, active ? chipActiveClass : chipInactiveClass)}
          >
            {format.vibe(v.key)}
          </button>
        );
      })}
      {custom ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-white py-0.5 pl-4 pr-1">
          <input
            autoFocus
            value={form.customVibe ?? ""}
            maxLength={CUSTOM_VIBE_MAX}
            onChange={(e) => patch({ customVibe: e.target.value })}
            placeholder={t("customPlaceholder")}
            aria-label={t("customLabel")}
            className="h-8 w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <button
            type="button"
            onClick={() => patch({ customVibe: null })}
            aria-label={t("customLabel")}
            className="flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-black/5"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => patch({ customVibe: "" })} className={cn(chipClass, chipInactiveClass, "inline-flex items-center gap-1")}>
          <Plus className="size-3.5" aria-hidden />
          {t("custom")}
        </button>
      )}
    </div>
  );
}

/** Three title ideas from vibe + place + duration ("Fitness House Canggu", "Canggu Fitness Month", "Two Weeks of Training in Bali"). */
function useTitleSuggestions(form: FormState): string[] {
  const t = useTranslations("create.house");
  const customLabel = form.customVibe?.trim();
  const vibe: Vibe | "" = form.customVibe !== null ? (customLabel ? "mixed" : "") : form.vibe;
  const region = regionShortName(form.region);
  if (!vibe || !region) return [];
  const place = !form.cityOpen && form.city.trim() ? form.city.trim() : region;
  const vibeWord = customLabel ? customLabel.replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : t(`titleVibes.${vibe}`);
  const activity = customLabel || t(`activities.${vibe}`);
  const nights = form.startDate && form.endDate ? nightsBetween(form.startDate, form.endDate) : 0;
  const period = nights >= 25 && nights <= 35 ? "month" : nights >= 5 && nights <= 9 ? "week" : "other";
  const duration = durationKey(nights);
  const ideas = [
    t("titleTemplates.house", { vibe: vibeWord, place }),
    t("titleTemplates.period", { place, vibe: vibeWord, period: t(`periods.${period}`) }),
    nights > 0
      ? t("titleTemplates.of", { duration: duration ? t(`durations.${duration}`) : t("durations.nights", { count: nights }), activity, region })
      : t("titleTemplates.ofNoDates", { activity, region }),
  ];
  return Array.from(new Set(ideas.filter((idea) => idea.length <= TITLE_MAX)));
}

function durationKey(nights: number) {
  if (nights >= 6 && nights <= 8) return "week";
  if (nights >= 13 && nights <= 15) return "twoWeeks";
  if (nights >= 20 && nights <= 22) return "threeWeeks";
  if (nights >= 27 && nights <= 31) return "month";
  if (nights >= 58 && nights <= 62) return "twoMonths";
  return null;
}

/**
 * Budget per person as a two-handle slider in the House currency (from the host's country – "EUR · change").
 * "Skip – decide together" is on while both ends are empty; dragging turns it off.
 */
function BudgetField({ form, patch, currency }: { form: FormState; patch: Patch; currency: Currency }) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const [changingCurrency, setChangingCurrency] = useState(false);
  const scale = BUDGET_SCALE[currency];
  const skipped = !form.budgetMin && !form.budgetMax;
  const clamp = (n: number) => Math.min(Math.max(n, scale.min), scale.max);
  const value: [number, number] = skipped ? scale.start : [clamp(Number(form.budgetMin || form.budgetMax)), clamp(Number(form.budgetMax || form.budgetMin))];
  const setRange = ([min, max]: [number, number]) => patch({ budgetMin: String(min), budgetMax: String(max) });

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{t("budget")}</p>
        {changingCurrency ? (
          <select
            autoFocus
            aria-label={t("currencyLabel")}
            value={currency}
            onChange={(e) => {
              // Another currency means another scale – a set range starts over at its defaults.
              const next = e.target.value as Currency;
              patch({ currency: next, ...(!skipped && { budgetMin: String(BUDGET_SCALE[next].start[0]), budgetMax: String(BUDGET_SCALE[next].start[1]) }) });
              setChangingCurrency(false);
            }}
            onBlur={() => setChangingCurrency(false)}
            className="h-8 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] px-2 text-[13px] outline-none"
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[13px] text-zinc-500">
            {currency} ·{" "}
            <button type="button" onClick={() => setChangingCurrency(true)} className="font-medium text-ink underline underline-offset-2">
              {t("currencyChange")}
            </button>
          </p>
        )}
      </div>

      <p className={cn("text-xl font-semibold tabular-nums", skipped && "text-zinc-400")} aria-live="polite">
        {t("budgetRange", { range: format.priceRange(value[0], value[1], currency) })}
      </p>
      <RangeSlider
        min={scale.min}
        max={scale.max}
        step={scale.step}
        value={value}
        onChange={setRange}
        muted={skipped}
        labels={[t("budgetMinLabel"), t("budgetMaxLabel")]}
        formatValue={(n) => format.price(n, currency)}
      />
      <div className="flex justify-between text-xs tabular-nums text-zinc-400">
        <span>{format.price(scale.min, currency)}</span>
        <span>{format.price(scale.max, currency)}</span>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-black/5 pt-3 text-sm">
        <span>
          <span className="block font-medium">{t("skipBudget")}</span>
          {skipped && <span className="block text-[13px] text-zinc-500">{t("budgetSkipped")}</span>}
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={skipped}
          onChange={(e) => (e.target.checked ? patch({ budgetMin: "", budgetMax: "" }) : setRange(scale.start))}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-6 w-10 shrink-0 rounded-full bg-black/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30"
        />
      </label>
      <p className="text-[13px] text-zinc-500">{t("currencyHint")}</p>
    </div>
  );
}

/* ───────────────────────── 2 · Your pitch ───────────────────────── */

interface PitchStepProps extends FieldHelpers {
  form: FormState;
  update: Update;
  patch: Patch;
  showIdeas: boolean;
}

export function PitchStep({ form, update, patch, showIdeas, errorOf, touch }: PitchStepProps) {
  const t = useTranslations("create.pitch");
  const tStarters = useTranslations("create.starters");
  const vibe = suggestionVibe(form);
  const starters = (field: "lookingFor" | "why" | "day") => tStarters.raw(`${vibe}.${field}`) as string[];
  const lookingForRef = useRef<HTMLTextAreaElement>(null);
  const whyRef = useRef<HTMLTextAreaElement>(null);
  const dayRef = useRef<HTMLTextAreaElement>(null);
  const partLabels: [string, string, string] = [t("dayParts.morning"), t("dayParts.afternoon"), t("dayParts.evening")];

  return (
    <FormCards>
      <FormCard title={t("cards.pitch")} description={t("cards.pitchDescription")}>
        <div className="space-y-2">
          <FormField
            id={fieldId("lookingForText")}
            label={t("lookingFor")}
            error={errorOf("lookingForText")}
            helper={t("lookingForHint")}
            aside={<span className="text-xs tabular-nums text-zinc-400">{t("lookingForCount", { count: form.lookingForText.length, max: LOOKING_FOR_MAX })}</span>}
          >
            <Starters items={starters("lookingFor")} onPick={(s) => insert("lookingForText", s, lookingForRef)} />
            <AutoTextarea
              ref={lookingForRef}
              rows={2}
              maxLength={LOOKING_FOR_MAX}
              value={form.lookingForText}
              onChange={(e) => update("lookingForText", e.target.value)}
              onBlur={() => touch("lookingForText")}
              placeholder={t("lookingForPlaceholder")}
              aria-invalid={Boolean(errorOf("lookingForText")) || undefined}
            />
          </FormField>
        </div>

        <FormField id={fieldId("whyText")} label={t("why")} optional>
          <Starters items={starters("why")} onPick={(s) => insert("whyText", s, whyRef)} />
          <AutoTextarea ref={whyRef} value={form.whyText} onChange={(e) => update("whyText", e.target.value)} placeholder={t("whyPlaceholder")} />
        </FormField>

        <FormField id={fieldId("dayText")} label={t("day")} optional group>
          <div className="mb-2 inline-flex rounded-full border border-[#E7E5E4] bg-[#FAFAF9] p-0.5 text-[13px]">
            {([false, true] as const).map((template) => {
              const active = (form.dayParts !== null) === template;
              return (
                <button
                  key={String(template)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patch({ dayParts: template ? (form.dayParts ?? ["", "", ""]) : null })}
                  className={cn("h-8 rounded-full px-3 font-medium transition-colors", active ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-ink")}
                >
                  {template ? t("dayModeTemplate") : t("dayModeFree")}
                </button>
              );
            })}
          </div>
          {form.dayParts ? (
            <div className="space-y-2">
              {form.dayParts.map((part, i) => (
                <label key={i} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[13px] font-medium text-zinc-500">{partLabels[i]}</span>
                  <input
                    className={formInput}
                    value={part}
                    maxLength={80}
                    onChange={(e) => {
                      const parts = form.dayParts!.map((p, j) => (j === i ? e.target.value : p)) as [string, string, string];
                      patch({ dayParts: parts, dayText: joinDayParts(parts, partLabels) });
                    }}
                    placeholder={t(`dayPartPlaceholders.${(["morning", "afternoon", "evening"] as const)[i]}`)}
                  />
                </label>
              ))}
            </div>
          ) : (
            <>
              <Starters items={starters("day")} onPick={(s) => insert("dayText", s, dayRef)} />
              <AutoTextarea ref={dayRef} value={form.dayText} onChange={(e) => update("dayText", e.target.value)} placeholder={t("dayPlaceholder")} />
            </>
          )}
        </FormField>
      </FormCard>

      <FormCard title={t("cards.hostNote")}>
        <FormField
          id={fieldId("hostNote")}
          label={t("hostNote")}
          optional
          aside={<span className="text-xs tabular-nums text-zinc-400">{t("hostNoteCount", { count: form.hostNote.length, max: HOST_NOTE_MAX })}</span>}
        >
          <input
            className={formInput}
            value={form.hostNote}
            maxLength={HOST_NOTE_MAX}
            onChange={(e) => update("hostNote", e.target.value)}
            placeholder={t("hostNotePlaceholder")}
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          {(t.raw("hostNoteExamples") as string[]).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => update("hostNote", example)}
              aria-pressed={form.hostNote === example}
              className={cn(suggestionClass, form.hostNote === example && "border-solid border-ink text-ink")}
            >
              {example}
            </button>
          ))}
        </div>
      </FormCard>

      {/* Create only – after publishing, ideas go straight into the crew chat. */}
      {showIdeas && (
        <FormCard title={t("cards.ideas")} description={t("ideasHint")}>
          <IdeasField ideas={form.accommodationIdeas} onChange={(ideas) => update("accommodationIdeas", ideas)} />
        </FormCard>
      )}
    </FormCards>
  );

  /** Adds a starter (after what's there) and puts the cursor at the end, ready to finish the sentence. */
  function insert(key: "lookingForText" | "whyText" | "dayText", starter: string, ref: { current: HTMLTextAreaElement | null }) {
    const current = form[key].trimEnd();
    const next = current ? `${current} ${starter}` : starter;
    update(key, key === "lookingForText" ? next.slice(0, LOOKING_FOR_MAX) : next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }
}

/** Tap-to-insert sentence starters, shown as "Early risers who…". */
function Starters({ items, onPick }: { items: string[]; onPick: (starter: string) => void }) {
  const t = useTranslations("create.pitch");
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("startWith")}>
      {items.map((starter) => (
        <button key={starter} type="button" onClick={() => onPick(starter)} className={suggestionClass}>
          {starter.replace(/[\s–-]+$/, "")}…
        </button>
      ))}
    </div>
  );
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
  /** Which fields to show: all four when logged out, only the missing ones for an incomplete profile */
  fields: AboutField[];
  full: boolean;
}

/** Only what a House needs: face photo, first name, age, country. Links and bio live in Edit profile. */
export function AboutFields({ about, update, fields, full, errorOf, touch }: AboutFieldsProps) {
  const t = useTranslations("create");
  const locale = useLocale();
  const countries = useMemo(() => countryNames(locale).map((name) => ({ value: name, label: name })), [locale]);
  const show = (field: AboutField) => full || fields.includes(field);
  const showPerson = show("name") || show("age") || show("country");
  const age = Number(about.age) || 0;
  const setAge = (n: number) => update("aboutAge", String(Math.min(Math.max(n, 18), 99)));

  return (
    <FormCards>
      {!full && <p className="rounded-[24px] bg-white px-6 py-4 text-sm text-zinc-600">{t("about.missingIntro")}</p>}
      {show("photo") && (
        <FormCard id={fieldId("photo")} title={t("about.photos")} description={t("about.photosHint")}>
          <div className="max-w-40">
            <PhotoUploader
              photos={about.photos.slice(0, 1)}
              slots={1}
              labels="profile"
              onChange={(photos) => {
                update("aboutPhotos", photos);
                touch("photo");
              }}
            />
          </div>
          {errorOf("photo") && (
            <p role="alert" className="text-[13px] text-red-600">
              {errorOf("photo")}
            </p>
          )}
        </FormCard>
      )}

      {showPerson && (
        <FormCard title={t("about.cards.you")}>
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
            <FormField id={fieldId("age")} label={t("about.age")} error={errorOf("age")} group>
              <div className="inline-flex items-center gap-1 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-1">
                <button
                  type="button"
                  onClick={() => setAge(age ? age - 1 : 25)}
                  disabled={age > 0 && age <= 18}
                  aria-label={t("about.younger")}
                  className="flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-white disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={99}
                  value={about.age}
                  onChange={(e) => update("aboutAge", e.target.value)}
                  onBlur={() => touch("age")}
                  placeholder={t("about.agePlaceholder")}
                  aria-label={t("about.age")}
                  aria-invalid={Boolean(errorOf("age")) || undefined}
                  className="h-9 w-14 bg-transparent text-center text-[15px] tabular-nums outline-none [appearance:textfield] placeholder:text-neutral-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setAge(age ? age + 1 : 25)}
                  disabled={age >= 99}
                  aria-label={t("about.older")}
                  className="flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-white disabled:opacity-30"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </FormField>
          )}
          {show("country") && (
            <FormField id={fieldId("country")} label={t("about.country")} error={errorOf("country")} group>
              <Combobox
                aria-label={t("about.country")}
                value={about.country}
                options={countries}
                onPick={(option) => {
                  update("aboutCountry", option.value);
                  touch("country");
                }}
                isSelected={(option) => option.value === about.country}
                placeholder={t("about.countryPlaceholder")}
                empty={t("about.countryEmpty")}
                invalid={Boolean(errorOf("country"))}
                onBlur={() => touch("country")}
              />
            </FormField>
          )}
        </FormCard>
      )}
      <p className="px-2 text-[13px] text-zinc-500">{t("about.laterHint")}</p>
    </FormCards>
  );
}

/* ───────────────────────── 4 · Publish ───────────────────────── */

/** Left column of the last step: the card as it shows up in the feed. */
export function PublishCard({ card, loginNote }: { card: ReactNode; loginNote: boolean }) {
  const t = useTranslations("create.publish");
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-zinc-500">{t("intro")}</p>
      <div className="mx-auto w-full max-w-100">{card}</div>
      {loginNote && <p className="text-center text-sm text-zinc-500">{t("loginBeforeLive")}</p>}
    </div>
  );
}

/** Right (sticky) column of the last step: summary and what happens next. */
export function PublishAside({ stay, form }: { stay: Stay; form: FormState }) {
  const t = useTranslations("create.publish");
  const format = useFormat();
  const nights = stay.startDate && stay.endDate ? nightsBetween(stay.startDate, stay.endDate) : 0;
  const dates = format.longRange(stay.startDate, stay.endDate);
  const rows: Array<[string, string, boolean?]> = [
    [t("place"), format.placeLabel(stay)],
    [t("dates"), nights > 0 ? t("datesNights", { dates, nights: format.nights(nights) }) : dates, true],
    [t("crew"), format.people(stay.spotsTotal)],
    [t("budget"), format.priceLabel(stay)],
    [t("language"), format.language(stay.language)],
    [t("pitch"), t("pitchCount", { count: pitchCount(form), total: PITCH_FIELDS.length })],
  ];
  const next = ["share", "requests", "pick"] as const;
  return (
    <FormCards>
      <FormCard title={t("summary")}>
        <dl className="divide-y divide-black/5 text-sm">
          {rows.map(([label, value, nowrap]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <dt className="shrink-0 text-zinc-500">{label}</dt>
              <dd className={cn("min-w-0 text-right font-medium", nowrap && "whitespace-nowrap")}>{value}</dd>
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
  );
}

/* ───────────────────────── Checklist ───────────────────────── */

export type ChecklistKey = "title" | "place" | "dates" | "lookingFor" | "photo" | "hostNote";
type ChecklistItem = { key: ChecklistKey; done: boolean };

/**
 * One progress line ("4 of 6 done ▾") that opens the items as an overlay above it – the preview column never
 * grows. `expanded`: always open, as a plain list (the mobile preview sheet).
 */
export function Checklist({ items, onJump, expanded = false }: { items: ChecklistItem[]; onJump: (key: ChecklistKey) => void; expanded?: boolean }) {
  const t = useTranslations("create.checklist");
  const [open, setOpen] = useState(false);
  const done = items.filter((i) => i.done).length;
  const list = (
    <ul className={cn("rounded-[24px] bg-white p-2", !expanded && "absolute inset-x-0 bottom-full z-20 mb-2 shadow-xl ring-1 ring-black/5")}>
      {items.map(({ key, done: itemDone }) => (
        <li key={key}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onJump(key);
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-black/5"
          >
            {itemDone ? (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <Circle className="size-5 shrink-0 text-zinc-300" aria-hidden />
            )}
            <span className={cn("flex-1", itemDone ? "text-ink" : "text-zinc-500")}>{t(`items.${key}`)}</span>
            <span className="sr-only">{itemDone ? t("done") : t("missing")}</span>
          </button>
        </li>
      ))}
    </ul>
  );
  if (expanded) return <div className="mt-4">{list}</div>;
  return (
    <div className="relative mt-3">
      {open && list}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left text-sm hover:bg-white/70"
      >
        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
          <span className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width]" style={{ width: `${(done / items.length) * 100}%` }} />
        </span>
        <span className="shrink-0 font-medium tabular-nums">{t("progress", { done, total: items.length })}</span>
        <ChevronUp className={cn("size-4 shrink-0 text-zinc-500 transition-transform", !open && "rotate-180")} aria-hidden />
      </button>
    </div>
  );
}
