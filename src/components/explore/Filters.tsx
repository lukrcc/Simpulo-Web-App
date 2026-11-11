"use client";

import { ArrowUpDown, ChevronDown, ChevronsDown, SlidersHorizontal } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MORE_POPOVER_MAX_WIDTH } from "@/config/explore";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Chip, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";
import { Anchored } from "@/components/ui/Anchored";
import { DarkMenuItem, darkMenuClass, darkMenuScroll } from "@/components/ui/DarkMenu";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { convertApprox } from "@/lib/rates";
import type { Currency } from "@/lib/types";
import type { SortKey } from "@/lib/exploreFilters";

/**
 * "Filters". "strong": the filter row's (and the header tab's) strongest element at its right end – "All filters" in words (no icon), filled
 * like the active Explore tab: ink, white semibold text, no gradient; --control-h, 15px, padding 0 18px; active filters as their number in a
 * small white capsule inside ("All filters · 3"). "capsule": the phones' row – a filled capsule (ink 7 %, hover 12 %), the count a small
 * orange circle at its corner. "secondary": beside a section's title. "corner": the header tab's chip row – a block filling the row's right
 * corner (the tab cuts it to its corners and its own concave curves), ink, hover ink 88 %, "All filters" white semibold 15px, centred, the
 * count beside it in a small white capsule.
 */
export function FiltersButton({
  count,
  onClick,
  expanded,
  controls,
  variant = "capsule",
  className,
}: {
  variant?: "corner" | "strong" | "capsule" | "secondary";
  count: number;
  onClick: () => void;
  expanded?: boolean;
  /** id of the popover it opens */
  controls?: string;
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
      aria-label={count > 0 ? tf("filtersCount", { count }) : variant === "strong" || variant === "corner" ? tf("allFilters") : t("filters")}
      className={
        variant === "corner"
          ? cn("corner-filters flex size-full items-center justify-center gap-2 whitespace-nowrap bg-(--hdr-corner-bg) pr-3 text-nav-main font-semibold text-(--hdr-corner-fg) transition-colors duration-150 hover:bg-(--hdr-corner-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50", className)
          : variant === "secondary"
          ? buttonStyles("secondary", "sm", className)
          : variant === "strong"
            ? cn("press relative inline-flex h-(--control-h) shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4.5 text-nav-main font-semibold text-white transition-colors duration-150 hover:bg-ink/85", className)
            : cn("filters-button relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-nav font-semibold text-ink [&>svg]:size-4", className)
      }
    >
      {/* Gives the button its text's baseline (an icon first would give the icon's bottom edge): it lines up with a title beside it. */}
      {variant !== "corner" && <span aria-hidden className="-ml-2 w-0 overflow-hidden">{"\u200b"}</span>}
      {/* The row's strongest element is words alone: "All filters" (no icon). The others keep the icon and "Filters". */}
      {variant !== "strong" && variant !== "corner" && <SlidersHorizontal aria-hidden />}
      {variant === "strong" || variant === "corner" ? tf("allFilters") : t("filters")}
      {count > 0 &&
        (variant === "strong" || variant === "corner" ? (
          <span aria-hidden className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-eyebrow leading-none tracking-normal tabular-nums", variant === "corner" ? "bg-(--hdr-corner-fg) text-(--hdr-corner-bg)" : "bg-white text-ink")}>
            {count}
          </span>
        ) : variant === "secondary" ? (
          <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-eyebrow leading-none tracking-normal text-white tabular-nums">
            {count}
          </span>
        ) : (
          <span aria-hidden className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-eyebrow leading-none tracking-normal text-white tabular-nums">
            {count}
          </span>
        ))}
      {/* The corner block: two stacked chevrons after the words, still. */}
      {variant === "corner" && <ChevronsDown aria-hidden className="size-4 shrink-0" strokeWidth={2} />}
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

const HISTOGRAM_BARS = 24;

/**
 * Price per person: a mini histogram of the Houses' prices over the range (bars in the chosen range ink, the rest
 * line), the two-handle slider and the range as text ("€50 – €2,100", each number editable on a click) – shown in the viewer's currency, kept
 * in EUR (the URL's unit; ≈ for other currencies).
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
    // The histogram (40px) over the slider, the range as text on the right – each number can be clicked and typed.
    <div className="flex items-center gap-6">
      <div className="min-w-0 flex-1">
        {/* Over the slider's track (12px in from either side, like the track). */}
        <div aria-hidden className="mx-3 flex h-10 items-end gap-px">
          {bars.map((count, i) => {
            const at = bounds.min + ((i + 0.5) / HISTOGRAM_BARS) * span;
            const inRange = at >= current.min && at <= current.max;
            return <span key={i} className={cn("flex-1 rounded-t-[2px] transition-colors duration-150", inRange ? "bg-accent/60" : "bg-ink/14")} style={{ height: `${count === 0 ? 0 : Math.max(8, (count / tallest) * 100)}%` }} />;
          })}
        </div>
        <RangeSlider min={bounds.min} max={bounds.max} step={step} value={[current.min, current.max]} onChange={([min, max]) => set(min, max)} labels={[t("priceMin"), t("priceMax")]} formatValue={money} tone="accent" />
      </div>
      <p className="shrink-0 whitespace-nowrap text-body font-semibold text-ink tabular-nums">
        <EditableAmount key={`min-${current.min}`} label={t("min")} text={money(current.min)} amount={toUser(current.min)} onCommit={(amount) => set(toEur(amount), current.max)} />
        <span className="text-muted"> – </span>
        <EditableAmount key={`max-${current.max}`} label={t("max")} text={money(current.max)} amount={toUser(current.max)} onCommit={(amount) => set(current.min, toEur(amount))} />
      </p>
    </div>
  );
}

/** "€50": a number that becomes a small field on a click; Enter or leaving it commits, Escape keeps the old one. */
function EditableAmount({ label, text, amount, onCommit }: { label: string; text: string; amount: number; onCommit: (amount: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const n = Number((draft ?? "").replace(/[^\d]/g, ""));
    if (draft !== null && draft.trim() !== "" && Number.isFinite(n) && n !== amount) onCommit(n);
    setDraft(null);
  };
  if (draft === null) {
    return (
      <button type="button" onClick={() => setDraft(String(amount))} aria-label={`${label}: ${text}`} className="rounded-md px-1 underline decoration-ink/20 underline-offset-4 transition-colors hover:decoration-ink">
        {text}
      </button>
    );
  }
  return (
    <input
      autoFocus
      inputMode="numeric"
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
      className="filter-control h-8 w-20 rounded-full px-3 text-right text-body tabular-nums text-ink outline-none focus:ring-2 focus:ring-ink/25"
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

  const { ref: scrollerRef, edges } = useChipScroller();
  // A click on the only active chip goes back to All; any other click makes that chip the one.
  const pick = (option: string) => onSelect(value.length === 1 && value[0] === option ? null : option);
  const moreActive = more.some((o) => value.includes(o.value));

  return (
    <div ref={rootRef} className="chip-row group/chips relative flex min-w-0 items-center" data-at-start={edges.atStart || undefined} data-at-end={edges.atEnd || undefined}>
      {/* The chips keep their width (never squeezed or cut): the row scrolls sideways (trackpad, Shift + wheel) – its
          ends fading out where there's more (.chip-scroller in globals.css). */}
      <div ref={scrollerRef} role="radiogroup" aria-label={label} className="chip-scroller no-scrollbar -my-1 flex min-w-0 flex-1 gap-0.5 overflow-x-auto overscroll-x-contain py-1">
        {/* "All": the quiet default – no pill, bold ink while nothing is picked. The categories are text; the chosen one the black capsule. */}
        <Chip variant="plain" size="lg" role="radio" aria-checked={value.length === 0} active={value.length === 0} onClick={() => onSelect(null)}>
          {allLabel}
        </Chip>
        {chips.map((o) => (
          <Chip
            key={o.value}
            role="radio"
            aria-checked={value.includes(o.value)}
            active={value.includes(o.value)}
            variant="bare"
            size="lg"
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
            data-more-active={moreActive || undefined}
            className={chipStyles(false, { variant: "bare", size: "lg" })}
          >
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
          className="chip-more-popover animate-fade-in absolute right-0 top-full z-40 mt-2 grid grid-cols-3 gap-2 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-3 shadow-[0_8px_24px_color-mix(in_srgb,var(--ink)_10%,transparent)]"
        >
          {more.map((o) => (
            <Chip
              key={o.value}
              active={value.includes(o.value)}
              size="md"
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
 * visible width per arrow click (smooth, instant with reduced motion). Sideways it scrolls natively (trackpad, Shift + wheel);
 * a vertical wheel turn is never taken – it always scrolls the page.
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
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);
  return { ref, edges };
}

/** Closes something on a pointer down outside `root` (and outside `also`, e.g. a portalled panel) and on Escape (focus back to `returnTo`). */
export function useDismiss(open: boolean, close: () => void, root: React.RefObject<HTMLElement | null>, returnTo?: React.RefObject<HTMLElement | null>, also?: React.RefObject<HTMLElement | null>) {
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
export function SortList<T extends string = SortKey>({ options, value, onChange }: { options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (sort: T) => void }) {
  // Rows of the dark menu: the chosen one on 12 % white with its check.
  return (
    <div role="radiogroup">
      {options.map((o) => (
        <DarkMenuItem key={o.value} role="radio" aria-checked={value === o.value} selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </DarkMenuItem>
      ))}
    </div>
  );
}

/**
 * The row's sort shortcut (only with enough Houses – see SORT_INLINE_THRESHOLD): plain text with its arrow, 40px, with the current order
 * that opens the same choices as the panel's Sort section, right under it.
 */
export function SortCapsule({ label, name, variant = "chip", children }: { label: string; /** What it chooses, for screen readers: "Sort" unless it says */ name?: string; /** "chip": a text chip in the filter rows · "tertiary": the text button beside a section's title */ variant?: "chip" | "tertiary"; children: ReactNode }) {
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
        aria-label={`${name ?? t("sort")}: ${label}`}
        className={variant === "tertiary" ? buttonStyles("tertiary", "sm") : "press inline-flex h-(--control-h) shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-4.5 text-nav-main text-ink/80 transition-colors duration-150 hover:bg-ink/5 hover:text-ink [&_svg]:size-4"}
      >
        <ArrowUpDown className="sm:hidden" aria-hidden />
        <span className="max-sm:sr-only">{label}</span>
        <ChevronDown className={cn("transition-transform max-sm:hidden", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        // In a portal: the site header clips its overflow.
        <Anchored anchor={buttonRef} ref={panelRef} align="end">
          {/* A pick closes it. */}
          <div id={id} role="dialog" aria-label={name ?? t("sort")} onClick={(e) => (e.target as Element).closest('[role="radio"]') && setOpen(false)} className={cn(darkMenuClass, darkMenuScroll, "w-60")}>
            {children}
          </div>
        </Anchored>
      )}
    </div>
  );
}
