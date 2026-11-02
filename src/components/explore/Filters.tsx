"use client";

import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formInput } from "@/components/form/FormLayout";
import { buttonStyles, type ButtonSize } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { MORE_POPOVER_MAX_WIDTH } from "@/config/explore";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip, ChipCheck, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";
import { Anchored } from "@/components/ui/Anchored";
import type { SortKey } from "@/lib/exploreFilters";

/**
 * "Filters" – a secondary button (never the primary "Open a House"). Active: "Filters" with the number of active
 * filters as a Badge.
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
      {t("filters")}
      {count > 0 && <Badge>{count}</Badge>}
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

/**
 * Checkbox list (ListRows: checkbox, label, number of Houses as a Badge) with optional search and group headings;
 * options with no Houses for the other filters dim.
 */
export function CheckboxList({
  options,
  value,
  onChange,
  searchPlaceholder,
}: {
  options: CheckOption[];
  value: string[];
  onChange: (value: string[]) => void;
  searchPlaceholder?: string;
}) {
  const t = useTranslations("explore.filtersUi");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const visible = needle ? options.filter((o) => o.label.toLocaleLowerCase().includes(needle)) : options;
  const groups = [...new Set(visible.map((o) => o.group ?? ""))];

  return (
    <div>
      {searchPlaceholder && (
        <label className="relative mb-2 block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={cn(formInput, "pl-10")}
          />
        </label>
      )}
      {visible.length === 0 && <p className="py-3 text-sm text-muted">{t("noMatches")}</p>}
      {groups.map((group) => (
        <div key={group || "all"} className="mt-1 first:mt-0">
          {group && <p className="pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{group}</p>}
          <ul className="divide-y divide-line">
            {visible
              .filter((o) => (o.group ?? "") === group)
              .map((option) => {
                const checked = value.includes(option.value);
                return (
                  <li key={option.value}>
                    <label className="block cursor-pointer">
                      <ListRow
                        lead={<Checkbox checked={checked} onChange={() => onChange(checked ? value.filter((v) => v !== option.value) : [...value, option.value])} />}
                        title={<span className={option.count === 0 && !checked ? "text-muted" : undefined}>{option.label}</span>}
                        aside={<Badge>{option.count}</Badge>}
                      />
                    </label>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Budget per person: two handles on one track (min–max). */
export function BudgetSlider({
  bounds,
  value,
  onChange,
  format,
}: {
  bounds: { min: number; max: number };
  value: { min: number; max: number } | null;
  onChange: (value: { min: number; max: number } | null) => void;
  format: (amount: number) => string;
}) {
  const t = useTranslations("explore.filtersUi");
  const current = value ?? bounds;
  const step = bounds.max - bounds.min > 2000 ? 50 : 10;
  const pct = (n: number) => ((n - bounds.min) / Math.max(1, bounds.max - bounds.min)) * 100;
  // The whole range again = no budget filter.
  const set = (next: { min: number; max: number }) => onChange(next.min <= bounds.min && next.max >= bounds.max ? null : next);
  const thumb =
    "pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-surface [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow";

  return (
    <div className="px-2 pb-1 pt-2">
      <p className="text-center text-lg font-semibold tabular-nums text-ink">
        {format(current.min)} – {format(current.max)}
        {current.max >= bounds.max && "+"}
      </p>
      <p className="text-center text-xs text-muted">{t("perPerson")}</p>
      <div className="relative mt-4 h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink/10" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${pct(current.min)}%`, right: `${100 - pct(current.max)}%` }} />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={current.min}
          aria-label={t("budgetMin")}
          onChange={(e) => set({ min: Math.min(Number(e.target.value), current.max - step), max: current.max })}
          className={thumb}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={current.max}
          aria-label={t("budgetMax")}
          onChange={(e) => set({ min: current.min, max: Math.max(Number(e.target.value), current.min + step) })}
          className={thumb}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-muted">
        <span>{format(bounds.min)}</span>
        <span>{format(bounds.max)}+</span>
      </div>
    </div>
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
 * The filter panel: from the right edge (400px; phones: the full width), surface with a shadow over a 20 % ink overlay.
 * Body scrolls, footer pinned. Closes on the overlay, Escape and whatever the footer does; the page behind doesn't
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
      <button type="button" aria-label={tCommon("close")} tabIndex={-1} onClick={onClose} className="animate-fade-in absolute inset-0 cursor-default bg-ink/20" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(400px,100vw)] flex-col border-l border-line bg-surface shadow-[-12px_0_40px_color-mix(in_srgb,var(--ink)_14%,transparent)] outline-none motion-safe:animate-panel-in"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={tCommon("close")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-bg">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {/* The sections one under the other, each split from the next by a line. */}
        <div className="scroll-pane min-h-0 flex-1 divide-y divide-line px-6 [&>*]:py-6">{children}</div>
        <div className="flex items-center justify-between gap-4 border-t border-line px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>
      </div>
    </div>
  );
}

