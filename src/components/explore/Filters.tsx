"use client";

import { ArrowUpDown, ChevronDown, ChevronsDown, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { ChipIcon } from "@/components/explore/FitChips";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Chip, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";
import { Anchored } from "@/components/ui/Anchored";
import { BarSheet } from "@/components/ui/BarSheet";
import { BAR_CATEGORIES_MAX, BAR_CATEGORIES_MIN } from "@/config/explore";
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
 * count beside it in a small white capsule. "compact": Explore's compact bar – a cream block 36px, radius 10, "All filters" and the count.
 * "icon": the compact bar on phones – the filter icon alone in a 36px circle, the count an orange dot-number at its corner.
 */
export function FiltersButton({
  count,
  onClick,
  expanded,
  controls,
  variant = "capsule",
  className,
}: {
  variant?: "corner" | "strong" | "capsule" | "secondary" | "compact" | "icon";
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
      aria-label={count > 0 ? tf("filtersCount", { count }) : variant === "strong" || variant === "corner" || variant === "compact" ? tf("allFilters") : t("filters")}
      data-tooltip={variant === "icon" ? t("filters") : undefined}
      className={
        variant === "corner"
          ? cn("corner-filters flex size-full items-center justify-center gap-2 whitespace-nowrap bg-(--hdr-corner-bg) pr-3 text-nav-main font-semibold text-(--hdr-corner-fg) shadow-[inset_0_0_0_1px_var(--hdr-corner-edge)] backdrop-blur-md transition-colors duration-150 hover:bg-(--hdr-corner-hover) active:bg-(--hdr-corner-active) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-inverse/50", className)
          : variant === "secondary"
          ? buttonStyles("secondary", "sm", className)
          : variant === "compact"
            ? cn("bar-capsule press relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-nav-main transition-colors duration-150", className)
          : variant === "icon"
            ? cn("press relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/8 text-ink transition-colors duration-150 hover:bg-ink/14 [&>svg]:size-4", className)
          : variant === "strong"
            ? cn("press relative inline-flex h-(--control-h) shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4.5 text-nav-main font-semibold text-inverse transition-colors duration-150 hover:bg-ink/85", className)
            : cn("filters-button relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-nav font-semibold text-ink [&>svg]:size-4", className)
      }
    >
      {/* Gives the button its text's baseline (an icon first would give the icon's bottom edge): it lines up with a title beside it. */}
      {variant !== "corner" && variant !== "icon" && <span aria-hidden className="-ml-2 w-0 overflow-hidden">{"\u200b"}</span>}
      {/* The row's strongest element is words alone: "All filters" (no icon). The others keep the icon and "Filters". */}
      {variant !== "strong" && variant !== "corner" && variant !== "compact" && <SlidersHorizontal aria-hidden />}
      {variant === "icon" ? null : variant === "strong" || variant === "corner" || variant === "compact" ? tf("allFilters") : t("filters")}
      {count > 0 &&
        (variant === "strong" || variant === "corner" || variant === "compact" ? (
          // The count: on the glass (corner, compact) a small orange circle; on the ink capsule a light one.
          <span aria-hidden className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-eyebrow leading-none tracking-normal tabular-nums", variant === "strong" ? "bg-inverse text-ink" : "bg-accent text-on-signal")}>
            {count}
          </span>
        ) : variant === "secondary" ? (
          <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-eyebrow leading-none tracking-normal text-on-signal tabular-nums">
            {count}
          </span>
        ) : (
          <span aria-hidden className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-eyebrow leading-none tracking-normal text-on-signal tabular-nums">
            {count}
          </span>
        ))}
      {/* The corner block: two stacked chevrons after the words, still. */}
      {/* Open: the chevrons point up – a second click closes. */}
      {variant === "corner" && <ChevronsDown aria-hidden className={cn("size-4 shrink-0 transition-transform duration-200", expanded && "rotate-180")} strokeWidth={2} />}
      {/* The bar's All filters: a capsule like the others, only a chevron after the words. */}
      {variant === "compact" && <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform duration-200", expanded && "rotate-180")} />}
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
            return <span key={i} className={cn("flex-1 rounded-t-[2px] transition-colors duration-150", inRange ? "bg-ink/55" : "bg-ink/14")} style={{ height: `${count === 0 ? 0 : Math.max(8, (count / tallest) * 100)}%` }} />;
          })}
        </div>
        <RangeSlider min={bounds.min} max={bounds.max} step={step} value={[current.min, current.max]} onChange={([min, max]) => set(min, max)} labels={[t("priceMin"), t("priceMax")]} formatValue={money} />
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

type ChipOption = { value: string; label: string; icon?: LucideIcon };

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
  icons = false,
}: {
  label: string;
  allLabel: string;
  moreLabel: string;
  /** Each category with its line icon before the words (Explore's compact bar) */
  icons?: boolean;

  /** The visible category chips, in order (the last one is the changing slot) */
  chips: ReadonlyArray<ChipOption>;
  /** Everything else, for the More popover */
  more: ReadonlyArray<ChipOption>;
  /** The picked categories ([] = All) */
  value: readonly string[];
  /** A category, or null for All */
  onSelect: (value: string | null) => void;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // A click on the only active chip goes back to All; any other click makes that chip the one.
  const pick = (option: string) => onSelect(value.length === 1 && value[0] === option ? null : option);
  const moreActive = more.some((o) => value.includes(o.value));

  return (
    <div className="chip-row group/chips relative flex min-w-0 items-center">
      {/* The chips keep their width (never squeezed or cut): the row scrolls sideways (ui/ScrollRow – arrows both ways, the fade only where
          there's more, trackpad and Shift + wheel; a vertical wheel scrolls the page). */}
      <ScrollRow role="radiogroup" label={label} className="flex-1">
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
            icon={icons ? <ChipIcon icon={o.icon} on={value.includes(o.value)} /> : undefined}
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
      </ScrollRow>
      {/* More: the rest as capsules, two columns, one piece with the row (ui/BarSheet). */}
      <BarSheet open={open} onClose={() => setOpen(false)} anchor={moreRef} label={moreLabel} className="p-5">
        <MoreGrid
          options={more}
          value={value}
          onPick={(v) => {
            onSelect(v);
            setOpen(false);
          }}
        />
      </BarSheet>
    </div>
  );
}

/** More's capsules: two columns, each the column's full width – its line icon left, the number of open Houses right, muted ("Founder · 12"). */
function MoreGrid({ options, value, onPick, countOf }: { options: ReadonlyArray<ChipOption>; value: readonly string[]; onPick: (value: string) => void; countOf?: (value: string) => number }) {
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <Chip key={o.value} role="radio" aria-checked={value.includes(o.value)} active={value.includes(o.value)} size="md" title={o.label} icon={o.icon ? <o.icon aria-hidden /> : undefined} onClick={() => onPick(o.value)} className="w-full min-w-0 justify-start [&>span]:flex-1">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate">{o.label}</span>
            {countOf && <span className="tabular-nums text-muted">{countOf(o.value)}</span>}
          </span>
        </Chip>
      ))}
    </div>
  );
}

/**
 * The bar's categories (Explore's header): no "All" (nothing picked = all), no scrolling, no arrows. As many of TOP_CATEGORIES (in their
 * order) as fit between Short trips and All filters with the bar's 20px gaps – at least BAR_CATEGORIES_MIN, at most BAR_CATEGORIES_MAX –
 * measured on hidden copies (ResizeObserver on the bar's slot and its other groups); never wrapping or cutting a word. What's left (less than a
 * capsule) stays before the right group, not between the categories. Then "More ▾" with the rest (ui/BarSheet, right-aligned to it). A
 * category picked from More (or one that doesn't fit) comes first in the group, with a × that clears it. Single choice; a click on the chosen
 * one clears it.
 */
export function BarCategories({ label, moreLabel, top, all, value, onSelect, countOf }: { label: string; moreLabel: string; /** The bar's own, in order */ top: readonly string[]; /** Every category */ all: ReadonlyArray<ChipOption>; value: readonly string[]; onSelect: (value: string | null) => void; /** Open Houses per category, shown in More */ countOf?: (value: string) => number }) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<{ n: number; first: boolean }>({ n: BAR_CATEGORIES_MIN, first: false });
  const active = value.length === 1 ? value[0] : null;
  const option = (key: string) => all.find((o) => o.value === key);
  const candidates = useMemo(() => top.slice(0, BAR_CATEGORIES_MAX), [top]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    const slot = root?.parentElement;
    if (!root || !measure || !slot) return;
    // The slot's other flex items (a display: contents wrapper counts by its children).
    const others = () =>
      Array.from(slot.children)
        .filter((el) => el !== root)
        .flatMap((el) => (getComputedStyle(el).display === "contents" ? Array.from(el.children) : [el])) as HTMLElement[];
    const count = () => {
      const gap = parseFloat(getComputedStyle(slot).columnGap) || 0;
      const items = others();
      const room = slot.clientWidth - items.reduce((sum, el) => sum + el.offsetWidth, 0) - gap * items.length;
      const chips = Array.from(measure.children) as HTMLElement[];
      const more = chips.at(-1)!.offsetWidth;
      const widthOf = (key: string) => chips.find((c) => c.dataset.key === key)?.offsetWidth ?? 0;
      const pickedWidth = chips.find((c) => c.dataset.key === "picked")?.offsetWidth ?? 0;
      const fit = (widths: number[]) => {
        let n = 0;
        let used = more;
        for (const w of widths.slice(0, BAR_CATEGORIES_MAX)) {
          if (used + w + 8 > room) break;
          used += w + 8;
          n += 1;
        }
        // At least BAR_CATEGORIES_MIN – unless even those would push All filters into the right group (narrow windows): then only what fits.
        const minWidth = more + widths.slice(0, BAR_CATEGORIES_MIN).reduce((sum, w) => sum + w + 8, 0);
        return minWidth <= room ? Math.max(BAR_CATEGORIES_MIN, n) : n;
      };
      let n = fit(candidates.map(widthOf));
      let first = false;
      // The chosen one isn't among them: it comes first (with its ×), the others after it.
      if (active && !candidates.slice(0, n).includes(active)) {
        first = true;
        n = fit([pickedWidth, ...candidates.filter((k) => k !== active).map(widthOf)]);
      }
      setLayout((l) => (l.n === n && l.first === first ? l : { n, first }));
    };
    count();
    const observer = new ResizeObserver(count);
    observer.observe(slot);
    for (const el of others()) observer.observe(el);
    return () => observer.disconnect();
  }, [active, candidates]);

  const shown = layout.first && active ? [active, ...candidates.filter((k) => k !== active)].slice(0, layout.n) : candidates.slice(0, layout.n);
  const visible = shown.map(option).filter((o): o is ChipOption => Boolean(o));
  const more = all.filter((o) => !shown.includes(o.value));
  const pick = (key: string) => onSelect(value.length === 1 && value[0] === key ? null : key);
  const chip = (o: ChipOption, on: boolean, clear: boolean, key?: string) => (
    <Chip
      key={key ?? o.value}
      data-key={key ?? o.value}
      role="radio"
      aria-checked={on}
      active={on}
      variant="bare"
      size="lg"
      title={o.label}
      icon={<ChipIcon icon={o.icon} on={on} />}
      trailing={clear ? <X aria-hidden className="size-3.5 shrink-0" /> : undefined}
      onClick={() => pick(o.value)}
    >
      {o.label}
    </Chip>
  );
  const moreWords = (
    <>
      {moreLabel}
      <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
    </>
  );
  const moreClass = chipStyles(false, { variant: "bare", size: "lg" });
  const activeOption = active ? option(active) : undefined;
  return (
    <div ref={rootRef} className="chip-row relative flex shrink-0 items-center">
      {/* The hidden copies the count is measured from – same classes, so the same sizes. */}
      <div aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 h-0 overflow-hidden">
        <div ref={measureRef} role="radiogroup" className="flex w-max">
          {candidates.map((key) => {
            const o = option(key);
            return o ? chip(o, false, false) : null;
          })}
          {activeOption && chip(activeOption, true, true, "picked")}
          <button type="button" tabIndex={-1} className={moreClass}>
            {moreWords}
          </button>
        </div>
      </div>
      <div role="radiogroup" aria-label={label} className="flex items-center">
        {visible.map((o) => chip(o, value.includes(o.value), layout.first && o.value === active))}
        {more.length > 0 && (
          <button ref={moreRef} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog" className={moreClass}>
            {moreWords}
          </button>
        )}
      </div>
      <BarSheet open={open} onClose={() => setOpen(false)} anchor={moreRef} align="end" label={moreLabel} className="p-5">
        <MoreGrid
          countOf={countOf}
          options={more}
          value={value}
          onPick={(v) => {
            onSelect(v);
            setOpen(false);
          }}
        />
      </BarSheet>
    </div>
  );
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
