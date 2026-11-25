"use client";

import { ArrowUpDown, ChevronDown, type LucideIcon } from "lucide-react";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Chip, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";
import { BarSheet } from "@/components/ui/BarSheet";
import { DarkMenuItem, darkMenuClass, darkMenuScroll } from "@/components/ui/DarkMenu";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { convertApprox } from "@/lib/rates";
import type { Currency } from "@/lib/types";
import type { SortKey } from "@/lib/exploreFilters";
import { MenuLayer } from "@/components/ui/MenuLayer";
import { HeaderPanel, useHeaderPanel } from "@/components/layout/header/HeaderPanel";
import { SUB_THEMES } from "@/config/themes";
import { activeThemes } from "@/lib/themes";

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
  head,
  aside,
}: {
  /** The Filters panel: the label left, the range and the currency (aside) right in one row above a flat histogram and the slider */
  head?: ReactNode;
  aside?: ReactNode;
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

  const range = (
    <p className="shrink-0 whitespace-nowrap text-body font-semibold text-ink tabular-nums">
      <EditableAmount key={`min-${current.min}`} label={t("min")} text={money(current.min)} amount={toUser(current.min)} onCommit={(amount) => set(toEur(amount), current.max)} />
      <span className="text-muted"> – </span>
      <EditableAmount key={`max-${current.max}`} label={t("max")} text={money(current.max)} amount={toUser(current.max)} onCommit={(amount) => set(current.min, toEur(amount))} />
    </p>
  );
  if (head !== undefined) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-h-10 items-center gap-3">
          <span className="min-w-0 flex-1">{head}</span>
          {range}
          {aside}
        </div>
        <div aria-hidden data-histogram className="mx-3 flex h-10 items-end gap-px">
          {bars.map((count, i) => {
            const at = bounds.min + ((i + 0.5) / HISTOGRAM_BARS) * span;
            const inRange = at >= current.min && at <= current.max;
            return <span key={i} data-in={inRange || undefined} className={cn("flex-1 rounded-t-[2px] transition-colors duration-150", inRange ? "bg-ink/55" : "bg-ink/14")} style={{ height: `${count === 0 ? 0 : Math.max(8, (count / tallest) * 100)}%` }} />;
          })}
        </div>
        <RangeSlider min={bounds.min} max={bounds.max} step={step} value={[current.min, current.max]} onChange={([min, max]) => set(min, max)} labels={[t("priceMin"), t("priceMax")]} formatValue={money} />
      </div>
    );
  }

  return (
    // The histogram (40px) over the slider, the range as text on the right – each number can be clicked and typed.
    <div className="flex items-center gap-6">
      <div className="min-w-0 flex-1">
        {/* Over the slider's track (12px in from either side, like the track). */}
        <div aria-hidden data-histogram className="mx-3 flex h-10 items-end gap-px">
          {bars.map((count, i) => {
            const at = bounds.min + ((i + 0.5) / HISTOGRAM_BARS) * span;
            const inRange = at >= current.min && at <= current.max;
            return <span key={i} data-in={inRange || undefined} className={cn("flex-1 rounded-t-[2px] transition-colors duration-150", inRange ? "bg-ink/55" : "bg-ink/14")} style={{ height: `${count === 0 ? 0 : Math.max(8, (count / tallest) * 100)}%` }} />;
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

/** A category's icon in a chip: 16px, ink 60 %; on the picked capsule the accent. */
function ChipIcon({ icon: Icon, on }: { icon?: LucideIcon; on: boolean }) {
  if (!Icon) return null;
  return (
    <span aria-hidden className={cn("mr-1 flex shrink-0 transition-colors duration-150", on ? "text-accent" : "text-ink/60")}>
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

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
  lead,
}: {
  /** Right after "All", before the categories (below 1100px: Short trips) */
  lead?: ReactNode;
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
      <ScrollRow role="radiogroup" label={label} className="flex-1" active={value.join(",")}>
        {/* "All": the quiet default – no pill, bold ink while nothing is picked. The categories are text; the chosen one the black capsule. */}
        <Chip variant="plain" size="lg" role="radio" aria-checked={value.length === 0} active={value.length === 0} onClick={() => onSelect(null)}>
          {allLabel}
        </Chip>
        {lead}
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
 * "Themes ▾" in the header (CLAUDE.md "Aufräumen – ein Design"): one entry – "Themes", or what's chosen ("Wellness", "Yoga") – opening the
 * header's panel (HeaderPanel: full width under the bar, hover 200ms or click, stays open once you work in it, only one open). Inside every
 * active top theme (config/themes.ts – new ones appear by themselves) as a column, its active sub themes under it as plain text links; six
 * equal columns. Keyboard: ↓ on the button opens it on the first theme, ↑ ↓ within a column, ← → between columns, Escape closes.
 */
export function BarCategories({ label, themesLabel, all, value, onSelect, onSelectSub, sub = null, buttonClass }: { label: string; /** The button's words with nothing chosen: "Themes" */ themesLabel: string; /** Every category */ all: ReadonlyArray<ChipOption>; value: readonly string[]; onSelect: (value: string | null) => void; /** A sub theme picked (its top theme and its id) */ onSelectSub?: (parent: string, sub: string) => void; /** The sub theme chosen now */ sub?: string | null; /** The button's look (the header's entries) */ buttonClass?: string }) {
  const tSub = useTranslations("common.subThemes");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const handlers = useHeaderPanel(open, setOpen);
  const active = value.length === 1 ? value[0] : null;
  const labelOf = (id: string) => all.find((o) => o.value === id)?.label ?? id;
  const chosen = sub ? tSub(sub as "running") : active ? labelOf(active) : null;
  // ↓ on the button: the first theme takes the focus once the panel is open.
  const focusFirst = useRef(false);
  useEffect(() => {
    if (!open || !focusFirst.current) return;
    focusFirst.current = false;
    panelRef.current?.querySelector<HTMLElement>("[data-theme-link]")?.focus();
  }, [open]);
  const columns = activeThemes().map((id) => ({ id, subs: SUB_THEMES.filter((x) => x.parent === id && x.status === "active" && !x.mergedInto) }));
  const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || !("themeLink" in el.dataset)) return;
    const col = Number(el.dataset.col);
    const row = Number(el.dataset.row);
    const at = (c: number, r: number) => panelRef.current?.querySelector<HTMLElement>(`[data-col="${c}"][data-row="${r}"]`);
    const next = e.key === "ArrowDown" ? at(col, row + 1) : e.key === "ArrowUp" ? at(col, row - 1) : e.key === "ArrowRight" ? at(col + 1, 0) : e.key === "ArrowLeft" ? at(col - 1, 0) : undefined;
    if (next === undefined && !e.key.startsWith("Arrow")) return;
    e.preventDefault();
    next?.focus();
  };
  const close = () => setOpen(false);
  const link = "rounded-md text-left outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";
  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center">
      <button
        ref={buttonRef}
        type="button"
        {...handlers.trigger}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown") return;
          e.preventDefault();
          focusFirst.current = true;
          setOpen(true);
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="themes-menu"
        data-on={chosen ? "" : undefined}
        className={buttonClass}
      >
        <span className="truncate">{chosen ?? themesLabel}</span>
      </button>
      <HeaderPanel id="themes-menu" open={open} onClose={close} label={label} handlers={handlers.panel} triggerRef={rootRef} panelRef={panelRef}>
        <div role="menu" aria-label={label} onKeyDown={move} className="grid grid-cols-[repeat(6,auto)] justify-between gap-x-8 gap-y-7">
          {columns.map((c, col) => (
            <div key={c.id} className="flex min-w-0 flex-col items-start gap-2">
              <button type="button" role="menuitem" tabIndex={open ? 0 : -1} data-theme-link="" data-col={col} data-row={0} onClick={() => (close(), onSelect(value.length === 1 && value[0] === c.id && !sub ? null : c.id))} className={cn(link, "text-body font-semibold text-ink hover:underline", value.includes(c.id) && !sub && "underline underline-offset-4")}>
                {labelOf(c.id)}
              </button>
              {c.subs.map((x, i) => (
                <button key={x.id} type="button" role="menuitem" tabIndex={open ? 0 : -1} data-theme-link="" data-col={col} data-row={i + 1} onClick={() => (close(), onSelectSub ? onSelectSub(c.id, x.id) : onSelect(c.id))} className={cn(link, "text-small text-muted hover:text-ink", sub === x.id && "font-semibold text-ink")}>
                  {tSub(x.id as "running")}
                </button>
              ))}
            </div>
          ))}
        </div>
      </HeaderPanel>
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
      {/* In a portal: the site header clips its overflow. Phones: a sheet from the bottom. A pick closes it. */}
      <MenuLayer
        open={open}
        onClose={() => setOpen(false)}
        anchor={buttonRef}
        panelRef={panelRef}
        label={name ?? t("sort")}
        tone="dark"
        panelProps={{ id, role: "dialog", "aria-label": name ?? t("sort"), onClick: (e) => (e.target as Element).closest('[role="radio"]') && setOpen(false) }}
        panelClassName={cn(darkMenuClass, darkMenuScroll, "w-60")}
      >
        {children}
      </MenuLayer>
    </div>
  );
}
