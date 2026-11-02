"use client";

import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonStyles, type ButtonSize } from "@/components/ui/ActionButton";
import { ListRow } from "@/components/ui/ListRow";
import { MORE_POPOVER_MAX_WIDTH } from "@/config/explore";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip, ChipCheck, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";
import { Anchored } from "@/components/ui/Anchored";
import { Combobox } from "@/components/ui/Combobox";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { upcomingMonths } from "@/components/form/MonthChips";
import { convertApprox } from "@/lib/mock-extras";
import type { Currency } from "@/lib/types";
import type { SortKey } from "@/lib/exploreFilters";

/**
 * "Filters" – a secondary button (never the primary "Open a House"). Active: the number of active filters in the
 * text ("Filters · 2") – no dot, no badge.
 */
export function FiltersButton({
  count,
  onClick,
  expanded,
  controls,
  size = "lg",
  className,
}: {
  count: number;
  onClick: () => void;
  expanded?: boolean;
  /** id of the popover it opens */
  controls?: string;
  /** lg 44px (the page) · md 36px (the sticky bar, Explore's header) · sm 32px (Explore's compact header) */
  size?: ButtonSize;
  className?: string;
}) {
  const t = useTranslations("explore");
  const tf = useTranslations("explore.filtersUi");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-controls={controls}
      aria-label={count > 0 ? tf("filtersCount", { count }) : t("filters")}
      className={buttonStyles("secondary", size, className)}
    >
      <SlidersHorizontal aria-hidden />
      {count > 0 ? `${t("filters")} · ${count}` : t("filters")}
    </button>
  );
}

export interface CheckOption {
  value: string;
  label: string;
  count: number;
  /** Heading the option is listed under (country regions) */
  group?: string;
}

/** One section of the filter panel: 20px inside, a 13px/600 muted title (and an optional note at its right). */
export function PanelSection({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-muted">{title}</h3>
        {note && <span className="text-xs tabular-nums text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** Chips in an even grid (32px) – single choice; the first option ("Any") clears and carries no check. */
export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  label,
}: {
  options: ReadonlyArray<{ value: T | null; label: string }>;
  value: T | null;
  onChange: (value: T | null) => void;
  columns: 2 | 3;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-1.5", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {options.map((o) => (
        <Chip
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          active={value === o.value}
          check={o.value !== null}
          size="compact"
          onClick={() => onChange(o.value)}
          className="w-full justify-center"
        >
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

/**
 * The next 12 months as chips in two rows of six (multi-select, no scrolling) – short month names; the note above
 * names the span. Mount on the client only (the panel is): it reads today's date.
 */
export function MonthGrid({ value, onChange, label }: { value: readonly string[]; onChange: (months: string[]) => void; label: string }) {
  const format = useFormatter();
  const [months] = useState(() => upcomingMonths(new Date()));
  const date = (month: string) => new Date(`${month}-01T00:00:00Z`);
  const long = (month: string) => format.dateTime(date(month), { month: "long", year: "numeric", timeZone: "UTC" });
  const toggle = (month: string) => onChange(value.includes(month) ? value.filter((m) => m !== month) : [...value, month].toSorted());
  return (
    <div role="group" aria-label={label} className="grid grid-cols-6 gap-1.5">
      {months.map((month) => (
        <Chip
          key={month}
          active={value.includes(month)}
          size="compact"
          aria-label={long(month)}
          title={long(month)}
          onClick={() => toggle(month)}
          // px-1! – the chip size's own 14px sides would win otherwise (no tailwind-merge) and cut "May" short.
          className="w-full justify-center gap-0.5 px-1!"
        >
          {format.dateTime(date(month), { month: "short", timeZone: "UTC" })}
        </Chip>
      ))}
    </div>
  );
}

/** The months' span for MonthGrid's note: "Nov 2026 – Oct 2027". */
export function monthSpan(format: ReturnType<typeof useFormatter>, now: Date): string {
  const months = upcomingMonths(now);
  const label = (month: string) => format.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "short", year: "numeric", timeZone: "UTC" });
  return `${label(months[0])} – ${label(months.at(-1)!)}`;
}

const HISTOGRAM_BARS = 24;

/**
 * Price per person: a mini histogram of the Houses' prices over the range (bars in the chosen range ink, the rest
 * line), the two-handle slider (the chosen range soft accent) and Min / Max fields – shown in the viewer's currency, kept in EUR (the URL's unit; ≈ for other currencies).
 */
export function PriceFilter({
  bounds,
  prices,
  value,
  onChange,
  currency,
}: {
  /** EUR */
  bounds: { min: number; max: number };
  /** Each House's price per person in EUR (the middle of a budget range) */
  prices: readonly number[];
  value: { min: number; max: number } | null;
  onChange: (value: { min: number; max: number } | null) => void;
  currency: Currency;
}) {
  const t = useTranslations("explore.filtersUi");
  const format = useFormatter();
  const current = value ?? bounds;
  const span = Math.max(1, bounds.max - bounds.min);
  const step = span > 2000 ? 50 : 10;
  const toUser = (eur: number) => Math.round(convertApprox(eur, "EUR", currency));
  const toEur = (amount: number) => Math.round(convertApprox(amount, currency, "EUR"));
  const money = (eur: number) => format.number(toUser(eur), { style: "currency", currency, maximumFractionDigits: 0 });
  // The whole range again = no price filter.
  const set = (min: number, max: number) => {
    const lo = Math.max(bounds.min, Math.min(min, max - step));
    const hi = Math.min(bounds.max, Math.max(max, lo + step));
    onChange(lo <= bounds.min && hi >= bounds.max ? null : { min: lo, max: hi });
  };
  const bars = Array.from({ length: HISTOGRAM_BARS }, () => 0);
  for (const price of prices) bars[Math.min(HISTOGRAM_BARS - 1, Math.max(0, Math.floor(((price - bounds.min) / span) * HISTOGRAM_BARS)))]++;
  const tallest = Math.max(1, ...bars);

  return (
    <div>
      {/* Over the slider's track (12px in from either side, like the track). */}
      <div aria-hidden className="mx-3 flex h-8 items-end gap-px">
        {bars.map((count, i) => {
          const at = bounds.min + ((i + 0.5) / HISTOGRAM_BARS) * span;
          const inRange = at >= current.min && at <= current.max;
          return <span key={i} className={cn("flex-1 rounded-t-[2px] transition-colors duration-150", inRange ? "bg-ink" : "bg-line")} style={{ height: `${count === 0 ? 0 : Math.max(8, (count / tallest) * 100)}%` }} />;
        })}
      </div>
      <RangeSlider min={bounds.min} max={bounds.max} step={step} value={[current.min, current.max]} onChange={([min, max]) => set(min, max)} labels={[t("priceMin"), t("priceMax")]} formatValue={money} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <PriceField key={`min-${current.min}`} label={t("min")} amount={toUser(current.min)} currency={currency} onCommit={(amount) => set(toEur(amount), current.max)} />
        <PriceField key={`max-${current.max}`} label={t("max")} amount={toUser(current.max)} currency={currency} onCommit={(amount) => set(current.min, toEur(amount))} />
      </div>
    </div>
  );
}

/** A 40px amount field with its label inside; committed on Enter and on leaving it (re-keyed when the value moves). */
function PriceField({ label, amount, currency, onCommit }: { label: string; amount: number; currency: Currency; onCommit: (amount: number) => void }) {
  const [draft, setDraft] = useState(String(amount));
  const commit = () => {
    const n = Number(draft.replace(/[^\d]/g, ""));
    if (draft.trim() !== "" && Number.isFinite(n) && n !== amount) onCommit(n);
    else setDraft(String(amount));
  };
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-ink">
      <span className="text-xs text-muted">{label}</span>
      <input
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="min-w-0 flex-1 bg-transparent text-right text-sm tabular-nums text-ink outline-none"
      />
      <span className="text-xs text-muted">{currency}</span>
    </label>
  );
}

/** Languages: one searchable field, several picks (each pick toggles; the field lists what's picked). */
export function LanguageFilter({ options, value, onChange, label, placeholder }: { options: ReadonlyArray<{ value: string; label: string; count: number }>; value: readonly string[]; onChange: (value: string[]) => void; label: string; placeholder: string }) {
  const picked = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  return (
    <Combobox
      aria-label={label}
      value={picked.join(", ")}
      placeholder={placeholder}
      options={options.map((o) => ({ value: o.value, label: o.label, hint: String(o.count) }))}
      isSelected={(o) => value.includes(o.value)}
      onPick={(o) => onChange(value.includes(o.value) ? value.filter((v) => v !== o.value) : [...value, o.value])}
    />
  );
}

type ChipOption = { value: string; label: string };

/**
 * The header row's category chips – single choice, like radio buttons: "All" (on while no category is picked), the
 * fixed first ones, one changing last slot, then "More". Clicking the active chip goes back to "All". "More" opens a
 * 3-column grid of the rest (at most MORE_POPOVER_MAX_WIDTH); picking one there makes it the last chip and active – the
 * chip it replaces moves into "More" (`onSelect` gets the pick; the parent puts it into the slot).
 * Never scrolls or overflows: on narrow screens the padding shrinks, and the category chips (not All / More) may shrink
 * and cut their label short (…). Several categories at once only come from the filter panel – then every picked chip
 * in the row is shown active.
 */
export function CategoryRow({
  label,
  allLabel,
  moreLabel,
  chips,
  more,
  value,
  onSelect,
}: {
  label: string;
  allLabel: string;
  moreLabel: string;
  /** The visible category chips, in order (the last one is the changing slot) */
  chips: ReadonlyArray<ChipOption>;
  /** Everything else, for the More popover */
  more: ReadonlyArray<ChipOption>;
  /** The picked categories ([] = All) */
  value: readonly string[];
  /** A category, or null for All */
  onSelect: (value: string | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Closes on a click outside it (and outside its chip – that one toggles) and on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!popoverRef.current?.contains(target) && !moreRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      moreRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chip = (active: boolean) => chipStyles(active, { size: "row" });
  const { ref: scrollerRef, edges } = useChipScroller();
  // A click on the only active chip goes back to All; any other click makes that chip the one.
  const pick = (option: string) => onSelect(value.length === 1 && value[0] === option ? null : option);
  const moreActive = more.some((o) => value.includes(o.value));

  return (
    <div ref={rootRef} className="chip-row group/chips relative flex min-w-0 items-center" data-at-start={edges.atStart || undefined} data-at-end={edges.atEnd || undefined}>
      {/* The chips keep their width (never squeezed or cut): the row scrolls sideways – also with the mouse wheel – its
          ends fading out where there's more (.chip-scroller in globals.css). */}
      <div ref={scrollerRef} role="radiogroup" aria-label={label} className="chip-scroller no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        <button type="button" role="radio" aria-checked={value.length === 0} onClick={() => onSelect(null)} className={cn(chip(value.length === 0), "shrink-0")}>
          {allLabel}
        </button>
        {chips.map((o) => (
          <Chip
            key={o.value}
            role="radio"
            aria-checked={value.includes(o.value)}
            active={value.includes(o.value)}
            size="row"
            title={o.label}
            onClick={() => pick(o.value)}
          >
            {o.label}
          </Chip>
        ))}
        {more.length > 0 && (
          <button
            ref={moreRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="true"
            className={chip(moreActive)}
          >
            {moreActive && <ChipCheck />}
            {moreLabel}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <div
          ref={popoverRef}
          role="group"
          aria-label={moreLabel}
          style={{ width: `min(${MORE_POPOVER_MAX_WIDTH}px, calc(100vw - 32px))` }}
          className="chip-more-popover animate-fade-in absolute right-0 top-full z-40 mt-2 grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-3 shadow-[0_8px_24px_color-mix(in_srgb,var(--ink)_10%,transparent)]"
        >
          {more.map((o) => (
            <Chip
              key={o.value}
              active={value.includes(o.value)}
              size="row"
              title={o.label}
              onClick={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              className="shrink"
            >
              {o.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The chip row's scroller: whether it can scroll back / on (re-measured on scroll and resize), a page of 60 % of its
 * visible width per arrow click (smooth, instant with reduced motion), and the mouse wheel's vertical turn as sideways
 * scroll while there's room – at either end the page scrolls as usual.
 */
function useChipScroller() {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setEdges((e) => (e.atStart === atStart && e.atEnd === atEnd ? e : { atStart, atEnd }));
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0 || (e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);
  return { ref, edges };
}

/** Closes something on a pointer down outside `root` (and outside `also`, e.g. a portalled panel) and on Escape (focus back to `returnTo`). */
function useDismiss(open: boolean, close: () => void, root: React.RefObject<HTMLElement | null>, returnTo?: React.RefObject<HTMLElement | null>, also?: React.RefObject<HTMLElement | null>) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!root.current?.contains(target) && !also?.current?.contains(target)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeRef.current();
      returnTo?.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, root, returnTo, also]);
}

/** The sort choices as radio rows – the capsule's popover and the panel's Sort section. */
export function SortList({ options, value, onChange }: { options: ReadonlyArray<{ value: SortKey; label: string }>; value: SortKey; onChange: (sort: SortKey) => void }) {
  // Its own radio group name: the list can be on the page more than once (header, compact header, panel).
  const name = useId();
  return (
    <div role="radiogroup" className="divide-y divide-line">
      {options.map((o) => (
        <label key={o.value} className="block cursor-pointer px-2">
          <ListRow title={o.label} action={<Checkbox radio name={name} checked={value === o.value} onChange={() => onChange(o.value)} />} />
        </label>
      ))}
    </div>
  );
}

/**
 * The row's sort shortcut (only with enough Houses – see SORT_INLINE_THRESHOLD): a 36px capsule with the current order
 * that opens the same choices as the panel's Sort section, right under it.
 */
export function SortCapsule({ label, children, size = "md" }: { label: string; children: ReactNode; /** "lg": 44px (Explore's header) */ size?: ButtonSize }) {
  const t = useTranslations("explore");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useDismiss(open, () => setOpen(false), rootRef, buttonRef, panelRef);
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${t("sort")}: ${label}`}
        className={buttonStyles("secondary", size)}
      >
        <ArrowUpDown aria-hidden />
        <span className="max-sm:sr-only">{label}</span>
      </button>
      {open && (
        // In a portal: the site header clips its overflow.
        <Anchored anchor={buttonRef} ref={panelRef} align="end">
          <div
            id={id}
            role="dialog"
            aria-label={t("sort")}
            onChange={() => setOpen(false)}
            className="animate-fade-in w-60 rounded-xl border border-line bg-surface p-2 shadow-[0_8px_24px_color-mix(in_srgb,var(--ink)_10%,transparent)]"
          >
            {children}
          </div>
        </Anchored>
      )}
    </div>
  );
}

/**
 * Place / date search for the row (only with very many Houses – see SEARCH_INLINE_THRESHOLD): one field, "Lisbon" or
 * "March"; on Enter `onSearch` turns the text into the matching filters.
 */
export function PlaceDateSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const t = useTranslations("explore.filtersUi");
  const [query, setQuery] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) onSearch(query.trim());
      }}
      className="relative hidden shrink-0 md:block"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceDate")}
        aria-label={t("searchPlaceDate")}
        className="h-9 w-56 rounded-full border border-line bg-surface pl-9 pr-4 text-sm outline-none placeholder:text-muted focus:border-accent"
      />
    </form>
  );
}

/**
 * The filter panel: slides in from the right (400px, floating 8px from the edges, 24px left corners; phones: the full
 * width), surface with a soft shadow over a 12 % ink overlay that blurs the page 4px.
 * Sections split by lines (they fit a 900px window without scrolling; smaller ones scroll the body), footer pinned. Closes on the overlay, Escape and whatever the footer does; the page behind doesn't
 * scroll by hand meanwhile, and focus goes back to what opened it.
 */
export function FilterPanel({ open, onClose, title, footer, children }: { open: boolean; onClose: () => void; title: string; footer: ReactNode; children: ReactNode }) {
  const tCommon = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* 12 % ink with a 4px blur over the page, fading in with the panel. */}
      <button type="button" aria-label={tCommon("close")} tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-ink/12 backdrop-blur-[4px] motion-safe:animate-overlay-in" />
      {/* From md it floats: 8px from the window's top, bottom and right edge, 24px corners on its left side. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(400px,100vw)] flex-col overflow-hidden bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.12)] outline-none motion-safe:animate-panel-in md:inset-y-2 md:right-2 md:rounded-l-3xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={tCommon("close")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-bg">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {/* The sections one under the other, each split from the next by a line. */}
        <div className="scroll-pane min-h-0 flex-1 divide-y divide-line">{children}</div>
        <div className="flex items-center justify-between gap-4 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>
      </div>
    </div>
  );
}

