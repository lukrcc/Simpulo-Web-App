"use client";

import { Check, ChevronDown, Link2, Minus, Plus, Sparkles, Users, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { Combobox } from "@/components/ui/Combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ListRow } from "@/components/ui/ListRow";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Switch } from "@/components/ui/Switch";
import { useFormat } from "@/i18n/format";
import { hostProgrammeEarning } from "@/lib/fees";
import { linkDomain } from "@/lib/links";
import type { Currency, Stay, User, Vibe } from "@/lib/types";
import { CURRENCIES, VIBES, addDays, addMonths, cn, nightsBetween } from "@/lib/utils";
import {
  BUDGET_SCALE,
  CUSTOM_VIBE_MAX,
  HOST_NOTE_MAX,
  LOOKING_FOR_MAX,
  MAX_IDEAS,
  MAX_NIGHTS,
  SPOTS_MAX,
  SPOTS_QUICK,
  fieldId,
  isLink,
  suggestionVibe,
  type FieldKey,
  type FormState,
  type HouseTemplate,
  type StepKey,
} from "./model";
import { PlaceSearch } from "./PlaceSearch";
import { regionShortName } from "./places";

/** Several fields at once (e.g. region + area from one pick) */
export type Patch = (patch: Partial<FormState>) => void;

/** Shared by the steps: the form, the visible error of a field (null until touched / Next tried) and marking it touched. */
export interface StepProps {
  form: FormState;
  patch: Patch;
  errorOf: (key: FieldKey) => string | null;
  touch: (key: FieldKey) => void;
}

/** A tap-to-use suggestion: a chip like any other. */
function SuggestionChip({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <Chip active={active} onClick={onClick}>
      {label}
    </Chip>
  );
}

/** A field's error line under a group of chips (FormField shows it for single fields). */
function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-small text-red-600">
      {text}
    </p>
  ) : null;
}

/* ───────────────────────── 1 · Vibe ───────────────────────── */

/** The vibe chips (single select) plus "+ Custom", which turns into a small inline input. */
export function VibeStep({ form, patch, errorOf }: StepProps) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const custom = form.customVibe !== null;
  return (
    <div id={fieldId("vibe")} className="space-y-3">
      <div role="group" aria-label={t("vibe")} className="flex flex-wrap gap-2">
        {VIBES.map((v) => (
          <Chip key={v.key} active={!custom && form.vibe === v.key} onClick={() => patch({ vibe: v.key, customVibe: null })}>
            {format.vibe(v.key)}
          </Chip>
        ))}
        {custom ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-surface py-0.5 pl-4 pr-1">
            <input
              autoFocus
              value={form.customVibe ?? ""}
              maxLength={CUSTOM_VIBE_MAX}
              onChange={(e) => patch({ customVibe: e.target.value })}
              placeholder={t("customPlaceholder")}
              aria-label={t("customLabel")}
              className="h-8 w-32 bg-transparent text-small outline-none placeholder:text-muted"
            />
            <Button variant="tertiary" onClick={() => patch({ customVibe: null })} aria-label={t("customRemove")} className="size-8">
              <X />
            </Button>
          </span>
        ) : (
          <Chip active={false} icon={<Plus aria-hidden />} onClick={() => patch({ customVibe: "" })}>
            {t("custom")}
          </Chip>
        )}
      </div>
      <ErrorLine text={errorOf("vibe")} />
    </div>
  );
}

/* ───────────────────────── 2 · Where ───────────────────────── */

export function WhereStep({ form, patch, errorOf, touch }: StepProps) {
  const t = useTranslations("create.house");
  return (
    <div className="space-y-5">
      <FormField id={fieldId("region")} label={t("where")} error={errorOf("region")} group prominent>
        <PlaceSearch
          kind="region"
          aria-label={t("where")}
          value={form.region}
          onPick={(place) => {
            // Picking an area directly fills both; a region keeps the area only if it's the same region.
            patch({ region: place.region, city: place.city ?? (place.region === form.region ? form.city : "") });
            touch("region");
          }}
          onFreeText={(text) => {
            if (text !== form.region) patch({ region: text, city: "" });
            touch("region");
          }}
          placeholder={t("wherePlaceholder")}
          empty={t("whereEmpty")}
          invalid={Boolean(errorOf("region"))}
          onBlur={() => touch("region")}
        />
      </FormField>
      {form.region.trim() && (
        <FormField label={t("area")} optional group prominent>
          <PlaceSearch
            kind="area"
            within={form.region}
            aria-label={t("area")}
            value={form.city}
            onPick={(place) => patch({ city: place.city ?? place.label })}
            onFreeText={(text) => patch({ city: text })}
            placeholder={t("areaPlaceholder")}
            empty={t("areaEmpty")}
          />
        </FormField>
      )}
    </div>
  );
}

/* ───────────────────────── 3 · When ───────────────────────── */

const QUICK_DATES = [
  { key: "week", end: (start: string) => addDays(start, 7) },
  { key: "twoWeeks", end: (start: string) => addDays(start, 14) },
  { key: "month", end: (start: string) => addMonths(start, 1) },
] as const;

export function WhenStep({ form, patch, errorOf, touch, minStart }: StepProps & { /** Earliest start (tomorrow), "" before hydration */ minStart: string }) {
  const t = useTranslations("create.house");
  const tQuick = useTranslations("common.ui.dateRange.quick");
  const dateError = errorOf("startDate") ?? errorOf("endDate");
  // Quick picks run from the chosen start – or from the earliest one when none is chosen yet.
  const from = form.startDate || minStart;
  return (
    <div className="space-y-4">
      <FormField id={fieldId("startDate")} label={t("when")} error={dateError} group prominent>
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
      <div role="group" aria-label={t("quickDates")} className="flex flex-wrap gap-2">
        {QUICK_DATES.map(({ key, end }) => (
          <Chip
            key={key}
            disabled={!from}
            active={Boolean(form.startDate) && form.endDate === end(form.startDate)}
            onClick={() => {
              patch({ startDate: from, endDate: end(from) });
              touch("startDate");
              touch("endDate");
            }}
          >
            {tQuick(key)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── 4 · Crew size ───────────────────────── */

export function CrewStep({ form, patch, errorOf, minSpots }: StepProps & { /** The crew already in (editing) – it can't get smaller */ minSpots: number }) {
  const t = useTranslations("create.house");
  const n = form.spotsTotal;
  const set = (value: number) => patch({ spotsTotal: Math.min(Math.max(value, minSpots), SPOTS_MAX) });
  return (
    <div id={fieldId("spotsTotal")} className="space-y-5">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="lg" icon onClick={() => set(n - 1)} disabled={n <= minSpots} aria-label={t("crewMinus")}>
          <Minus />
        </Button>
        <output aria-live="polite" className="w-14 text-center text-h2 tabular-nums">
          {n}
        </output>
        <Button variant="secondary" size="lg" icon onClick={() => set(n + 1)} disabled={n >= SPOTS_MAX} aria-label={t("crewPlus")}>
          <Plus />
        </Button>
        <span className="text-body text-muted">{t("crewUnit")}</span>
      </div>
      <div role="group" aria-label={t("crewQuick")} className="flex flex-wrap gap-2">
        {SPOTS_QUICK.map((size) => (
          <Chip key={size} active={n === size} disabled={size < minSpots} onClick={() => set(size)}>
            {size}
          </Chip>
        ))}
      </div>
      <ErrorLine text={errorOf("spotsTotal")} />
    </div>
  );
}

/* ───────────────────────── 5 · Budget ───────────────────────── */

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

export function BudgetStep({ form, patch, errorOf, touch, currency, locked }: StepProps & { currency: Currency; /** Editing a locked place: price and currency live on the Manage page */ locked: boolean }) {
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
    <div className="space-y-5">
      <FormField label={t("currencyLabel")} group prominent>
        <Combobox
          aria-label={t("currencyLabel")}
          value={currency}
          options={currencies}
          onPick={(option) => {
            // Another currency means another scale – the range starts over at its defaults.
            const next = option.value as Currency;
            if (next !== currency) patch({ currency: next, budgetMin: String(BUDGET_SCALE[next].start[0]), budgetMax: String(BUDGET_SCALE[next].start[1]) });
          }}
          isSelected={(option) => option.value === currency}
          className="max-w-40"
        />
      </FormField>

      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-body font-medium text-ink">{t("decideTogether")}</span>
        <Switch on={form.budgetTbd} label={t("decideTogether")} onChange={(on) => patch({ budgetTbd: on })} />
      </div>

      {!form.budgetTbd && (
        <div id={fieldId("budget")} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("budgetFrom")} prominent>
              <AmountInput value={form.budgetMin} onChange={(v) => patch({ budgetMin: v })} currency={currency} label={t("budgetFrom")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            </FormField>
            <FormField label={t("budgetTo")} prominent>
              <AmountInput value={form.budgetMax} onChange={(v) => patch({ budgetMax: v })} currency={currency} label={t("budgetTo")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            </FormField>
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
    </div>
  );
}

/* ───────────────────────── 6 · Title ───────────────────────── */

export function TitleStep({ form, patch, errorOf, touch, titleMax }: StepProps & { titleMax: number }) {
  const t = useTranslations("create.house");
  const titles = useTitleSuggestions(form, titleMax);
  return (
    <div className="space-y-3">
      <FormField
        id={fieldId("title")}
        label={t("title")}
        prominent
        error={errorOf("title")}
        aside={<span className="text-small tabular-nums text-muted">{t("titleCount", { count: form.title.length, max: titleMax })}</span>}
      >
        <input
          className={formInput}
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
          onBlur={() => touch("title")}
          placeholder={titles[0] ?? t("titlePlaceholder")}
          maxLength={titleMax}
          aria-invalid={Boolean(errorOf("title")) || undefined}
        />
      </FormField>
      {titles.length > 0 && (
        <div role="group" aria-label={t("titleSuggestions")} className="flex flex-wrap gap-2">
          {titles.map((title) => (
            <SuggestionChip
              key={title}
              label={title}
              active={form.title === title}
              onClick={() => {
                patch({ title });
                touch("title");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Three title ideas from vibe + place + duration ("Fitness House Canggu", "Canggu Fitness Month", "Two Weeks of Training in Bali"). */
function useTitleSuggestions(form: FormState, titleMax: number): string[] {
  const t = useTranslations("create.house");
  const customLabel = form.customVibe?.trim();
  const vibe: Vibe | "" = form.customVibe !== null ? (customLabel ? "social" : "") : form.vibe;
  const region = regionShortName(form.region);
  if (!vibe || !region) return [];
  const place = form.city.trim() || region;
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

/* ───────────────────────── 7 · Pitch ───────────────────────── */

export function PitchStep({ form, patch, errorOf, touch }: StepProps) {
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
      <FormField
        id={fieldId("lookingForText")}
        label={t("lookingFor")}
        prominent
        error={errorOf("lookingForText")}
        aside={<span className="text-small tabular-nums text-muted">{t("lookingForCount", { count: form.lookingForText.length, max: LOOKING_FOR_MAX })}</span>}
      >
        <AutoTextarea
          ref={ref}
          rows={3}
          maxLength={LOOKING_FOR_MAX}
          value={form.lookingForText}
          onChange={(e) => patch({ lookingForText: e.target.value })}
          onBlur={() => touch("lookingForText")}
          placeholder={t("lookingForPlaceholder")}
          aria-invalid={Boolean(errorOf("lookingForText")) || undefined}
        />
      </FormField>
      <div role="group" aria-label={t("startWith")} className="flex flex-wrap gap-2">
        {starters.map((starter) => (
          <SuggestionChip key={starter} label={`${starter.replace(/[\s–-]+$/, "")}…`} onClick={() => insert(starter)} />
        ))}
      </div>
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

/* ───────────────────────── 8 · Host experience ───────────────────────── */

interface HostStepProps extends StepProps {
  currency: Currency;
  /** Only hosts who may charge one can offer a program */
  allowed: boolean;
}

export function HostStep({ form, patch, errorOf, touch, currency, allowed }: HostStepProps) {
  const t = useTranslations("create.host");
  const format = useFormat();
  const program = form.hostExperience === "program" && allowed;
  const fee = Math.round(Number(form.hostFee)) || 0;
  const earning = hostProgrammeEarning(fee);
  const options: Array<{ key: FormState["hostExperience"]; icon: LucideIcon; disabled?: boolean }> = [
    { key: "rent", icon: Users },
    { key: "program", icon: Sparkles, disabled: !allowed },
  ];

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label={t("label")} className="grid gap-3 sm:grid-cols-2">
        {options.map(({ key, icon: Icon, disabled }) => {
          const active = form.hostExperience === key && !disabled;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => patch({ hostExperience: key })}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                active ? "bg-(--select-bg)" : "bg-ink/5 hover:bg-ink/10",
              )}
            >
              <Icon className="size-6 text-ink" aria-hidden />
              <span>
                <span className="block text-body font-medium text-ink">{t(`${key}.title`)}</span>
                <span className="mt-0.5 block text-small text-muted">{disabled ? t("proOnly") : t(`${key}.text`)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {program && (
        <div className="space-y-3">
          <FormField label={t("amount")} prominent error={errorOf("hostFee")}>
            <AmountInput
              id={fieldId("hostFee")}
              value={form.hostFee}
              onChange={(v) => patch({ hostFee: v })}
              currency={currency}
              label={t("amount")}
              invalid={Boolean(errorOf("hostFee"))}
              onBlur={() => touch("hostFee")}
            />
          </FormField>
          {fee > 0 && (
            <p className="text-body font-medium text-accent" aria-live="polite">
              {t("earn", { amount: format.price(earning, currency), total: format.price(earning * Math.max(0, form.spotsTotal - 1), currency) })}
            </p>
          )}
          <p className="text-small text-muted">{t("note")}</p>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Make it better (optional) ───────────────────────── */

type ExtraKey = "why" | "day" | "hostNote" | "ideas" | "crewGroup";

export function ExtrasStep({ form, patch, errorOf, touch, showIdeas }: StepProps & { /** Create only – ideas are posted into the crew chat on publish */ showIdeas: boolean }) {
  const t = useTranslations("create.extras");
  const tPitch = useTranslations("create.pitch");
  const tHouse = useTranslations("create.house");
  const filled: Record<ExtraKey, boolean> = {
    why: form.whyText.trim() !== "",
    day: form.dayText.trim() !== "",
    hostNote: form.hostNote.trim() !== "",
    ideas: form.accommodationIdeas.some((l) => l.trim() !== ""),
    crewGroup: form.crewGroupUrl.trim() !== "",
  };
  // A wrong crew group link opens its row, so the error is in view.
  const [open, setOpen] = useState<ExtraKey | null>(errorOf("crewGroupUrl") ? "crewGroup" : null);
  const keys: ExtraKey[] = showIdeas ? ["why", "day", "hostNote", "ideas", "crewGroup"] : ["why", "day", "hostNote", "crewGroup"];

  const fields: Record<ExtraKey, ReactNode> = {
    why: <AutoTextarea aria-label={t("rows.why")} value={form.whyText} onChange={(e) => patch({ whyText: e.target.value })} placeholder={tPitch("whyPlaceholder")} />,
    day: <AutoTextarea aria-label={t("rows.day")} value={form.dayText} onChange={(e) => patch({ dayText: e.target.value })} placeholder={tPitch("dayPlaceholder")} />,
    hostNote: (
      <div className="space-y-3">
        <FormField label={t("rows.hostNote")} aside={<span className="text-small tabular-nums text-muted">{tPitch("hostNoteCount", { count: form.hostNote.length, max: HOST_NOTE_MAX })}</span>}>
          <input className={formInput} value={form.hostNote} maxLength={HOST_NOTE_MAX} onChange={(e) => patch({ hostNote: e.target.value })} placeholder={tPitch("hostNotePlaceholder")} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          {(tPitch.raw("hostNoteExamples") as string[]).map((example) => (
            <SuggestionChip key={example} label={example} active={form.hostNote === example} onClick={() => patch({ hostNote: example })} />
          ))}
        </div>
      </div>
    ),
    ideas: <IdeasField ideas={form.accommodationIdeas} onChange={(ideas) => patch({ accommodationIdeas: ideas })} />,
    crewGroup: (
      <FormField id={fieldId("crewGroupUrl")} label={tHouse("crewGroupUrl")} error={errorOf("crewGroupUrl")}>
        <input
          className={formInput}
          value={form.crewGroupUrl}
          onChange={(e) => patch({ crewGroupUrl: e.target.value })}
          onBlur={() => touch("crewGroupUrl")}
          placeholder="https://chat.whatsapp.com/…"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errorOf("crewGroupUrl")) || undefined}
        />
      </FormField>
    ),
  };

  return (
    <ul className="-my-2">
      {keys.map((key) => (
        <ExtraRow key={key} title={t(`rows.${key}`)} added={filled[key]} open={open === key} onToggle={() => setOpen(open === key ? null : key)}>
          {fields[key]}
        </ExtraRow>
      ))}
    </ul>
  );
}

/** One collapsible row: 56px head (title, "Added" badge, chevron), the field below while open. */
function ExtraRow({ title, added, open, onToggle, children }: { title: string; added: boolean; open: boolean; onToggle: () => void; children: ReactNode }) {
  const t = useTranslations("create.extras");
  const id = useId();
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex min-h-14 w-full items-center gap-3 text-left">
        <span className="flex-1 text-body text-ink">{title}</span>
        {added && <Badge icon={<Check aria-hidden />}>{t("added")}</Badge>}
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={id} className="pb-4">
          {children}
        </div>
      )}
    </li>
  );
}

/** One link input to start, "+ Add" up to 3; each valid link gets a preview row. */
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
                <Button variant="tertiary" size="lg" icon onClick={() => onChange(slots.filter((_, j) => j !== i))} aria-label={t("removeIdea", { number: i + 1 })}>
                  <X />
                </Button>
              )}
            </div>
            {link && isLink(link) && <ListRow lead={<Link2 aria-hidden />} title={linkDomain(link)} subtitle={t("ideaPreview")} />}
          </div>
        );
      })}
      {slots.length < MAX_IDEAS && (
        <Button variant="tertiary" onClick={() => onChange([...slots, ""])}>
          <Plus />
          {t("addIdea")}
        </Button>
      )}
    </div>
  );
}

/* ───────────────────────── 9 · Publish ───────────────────────── */

interface PublishStepProps {
  stay: Stay;
  form: FormState;
  me?: User;
  editing: boolean;
  /** The steps of this flow (without "host" when host experiences are off) */
  steps: StepKey[];
  /** Steps that still have a problem – their rows say "Missing" */
  missing: StepKey[];
  /** "Edit": opens that question; its Next leads back here */
  onEdit: (step: StepKey) => void;
  /** People invited on publish ("Open again", "Invite to a House") – and whether they will be */
  invites: { count: number; on: boolean; set: (on: boolean) => void };
  template: { on: boolean; set: (on: boolean) => void };
}

/** The review: every answer as a row with "Edit", the host's profile, "Save as template". The card is in the preview. */
export function PublishStep({ stay, form, me, editing, steps, missing, onEdit, invites, template }: PublishStepProps) {
  const t = useTranslations("create.publish");
  const tRows = useTranslations("create.extras.rows");
  const tHost = useTranslations("create.host");
  const format = useFormat();
  const nights = stay.startDate && stay.endDate ? nightsBetween(stay.startDate, stay.endDate) : 0;
  const ideas = form.accommodationIdeas.map((l) => l.trim()).filter(isLink);
  const vibe = form.customVibe !== null ? form.customVibe.trim() : form.vibe ? format.vibe(form.vibe) : "";

  const required: Array<{ step: StepKey; label: string; value: string }> = [
    { step: "vibe", label: t("rows.vibe"), value: vibe },
    { step: "where", label: t("rows.where"), value: stay.region.trim() ? format.placeLabel(stay) : "" },
    { step: "when", label: t("rows.when"), value: nights > 0 ? t("datesNights", { dates: format.shortRange(stay.startDate, stay.endDate), nights: format.nights(nights) }) : "" },
    { step: "crew", label: t("rows.crew"), value: format.people(stay.spotsTotal) },
    { step: "budget", label: t("rows.budget"), value: format.priceLabel(stay) },
    { step: "title", label: t("rows.title"), value: form.title.trim() },
    { step: "pitch", label: t("rows.pitch"), value: form.lookingForText.trim() },
    {
      step: "host",
      label: t("rows.host"),
      value: stay.hostFeePerPerson ? t("programValue", { amount: format.price(stay.hostFeePerPerson, stay.currency) }) : tHost("rent.title"),
    },
  ];
  // Optional answers only when given – all of them are edited on "Make it better".
  const optional: Array<{ key: string; label: string; value: string }> = [
    { key: "why", label: tRows("why"), value: form.whyText.trim() },
    { key: "day", label: tRows("day"), value: form.dayText.trim() },
    { key: "hostNote", label: tRows("hostNote"), value: form.hostNote.trim() },
    { key: "ideas", label: tRows("ideas"), value: !editing && ideas.length > 0 ? ideas.map(linkDomain).join(", ") : "" },
    { key: "crewGroup", label: tRows("crewGroup"), value: form.crewGroupUrl.trim() },
  ];
  const rows = [
    ...required.filter((row) => steps.includes(row.step)).map((row) => ({ ...row, key: row.step, missing: missing.includes(row.step) })),
    ...optional.filter((row) => row.value).map((row) => ({ ...row, step: "extras" as const, missing: missing.includes("extras") && row.key === "crewGroup" })),
  ];

  return (
    <div className="space-y-6">
      <ul className="-mt-2">
        {rows.map(({ key, step, label, value, missing: isMissing }) => (
          <li key={key}>
            <ListRow
              title={
                <span className="flex items-baseline gap-3">
                  <span className="w-32 shrink-0 text-small text-muted">{label}</span>
                  {isMissing ? (
                    <span className="font-medium text-red-600">{t("missing")}</span>
                  ) : (
                    <span className="min-w-0 truncate text-ink">{value}</span>
                  )}
                </span>
              }
              action={
                <Button variant="tertiary" onClick={() => onEdit(step)} aria-label={t("editLabel", { field: label })}>
                  {t("edit")}
                </Button>
              }
            />
          </li>
        ))}
      </ul>

      <ProfileSection me={me} />

      {(invites.count > 0 || !editing) && (
        <div className="space-y-1 pt-4">
          {invites.count > 0 && <CheckRow label={t("inviteCrew", { count: invites.count })} checked={invites.on} onChange={invites.set} />}
          {!editing && <CheckRow label={t("saveTemplate")} checked={template.on} onChange={template.set} />}
        </div>
      )}
    </div>
  );
}

/** "Your profile": avatar, name, languages – what the card shows. No photo or name: a note with "Edit profile". */
function ProfileSection({ me }: { me?: User }) {
  const t = useTranslations("create.publish.profile");
  if (!me) {
    return (
      <section className="pt-5">
        <h3 className="text-body font-medium text-ink">{t("title")}</h3>
        <p className="mt-1 text-small text-muted">{t("loggedOut")}</p>
      </section>
    );
  }
  const missing = [!me.photos[0] && t("photo"), !me.name.trim() && t("name")].filter((item): item is string => Boolean(item));
  return (
    <section className="pt-5">
      <h3 className="text-body font-medium text-ink">{t("title")}</h3>
      <ListRow
        lead={<Avatar user={me} size="md" />}
        title={me.name.trim() || <span className="font-medium text-red-600">{t("noName")}</span>}
        subtitle={me.languages.length > 0 ? me.languages.join(", ") : t("noLanguages")}
      />
      {missing.length > 0 && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-red-600">
          {t("hint", { items: missing.join(" & ") })}
          <Button variant="tertiary" href="/profile/edit">
            {t("edit")}
          </Button>
        </p>
      )}
    </section>
  );
}

/** A checkbox row: 44px, the box on the left. */
function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/* ───────────────────────── Templates ───────────────────────── */

/** "Start from a template": the saved templates as cards above step 1; picking one fills everything but the dates. */
export function TemplatePicker({ templates, onPick, onRemove, className }: { templates: HouseTemplate[]; onPick: (template: HouseTemplate) => void; onRemove: (id: string) => void; className?: string }) {
  const t = useTranslations("create.templates");
  const format = useFormat();
  return (
    <section className={cn("max-w-160", className)}>
      <h2 className="mb-3 text-body font-medium text-ink">{t("title")}</h2>
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
