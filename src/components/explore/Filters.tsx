"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Pill trigger shared by every filter popover: white, 1px border, "Country · 2" when active (then an ink border). */
export const pillClass = (active: boolean) =>
  cn(
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border bg-white px-4 text-sm font-medium text-ink transition-colors",
    active ? "border-ink" : "border-black/10 hover:border-black/25",
  );

interface FilterPopoverProps {
  label: string;
  /** Selected values – shown as "Label · 2" */
  count?: number;
  /** Replaces "Label · n" on the pill, e.g. the chosen sort (active look only with count > 0) */
  valueLabel?: string;
  /** "23 houses" in the footer */
  resultLabel: string;
  onClear?: () => void;
  /** Wider popover (month grid, budget) */
  wide?: boolean;
  align?: "left" | "right";
  children: ReactNode;
}

/**
 * One filter behind a pill: a white card (16px radius, soft shadow, scrolls past its max height) whose changes apply
 * live, with "Clear" and the result count in the footer. Closes on outside click and Escape.
 */
export function FilterPopover({ label, count = 0, valueLabel, resultLabel, onClear, wide = false, align = "left", children }: FilterPopoverProps) {
  const t = useTranslations("explore.filtersUi");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} className={pillClass(count > 0)}>
        {valueLabel ?? (count > 0 ? `${label} · ${count}` : label)}
        <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          className={cn(
            "animate-fade-in absolute top-full z-40 mt-2 flex max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(30,30,34,0.14)] ring-1 ring-black/5",
            wide ? "w-[22rem]" : "w-80",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="scroll-pane min-h-0 flex-1 p-3">{children}</div>
          <div className="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3 text-sm">
            {onClear ? (
              <button type="button" onClick={onClear} disabled={count === 0} className="font-medium text-ink underline-offset-4 hover:underline disabled:text-zinc-300 disabled:no-underline">
                {t("clear")}
              </button>
            ) : (
              <span />
            )}
            <span className="text-zinc-500">{resultLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CheckOption {
  value: string;
  label: string;
  count: number;
  /** Heading the option is listed under (country regions) */
  group?: string;
}

/** Checkbox list with optional search and group headings; options with no Houses for the other filters dim. */
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
        <label className="mb-2 flex items-center gap-2 rounded-xl bg-page px-3 py-2.5">
          <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-zinc-400"
          />
        </label>
      )}
      {visible.length === 0 && <p className="px-2 py-3 text-sm text-zinc-500">{t("noMatches")}</p>}
      {groups.map((group) => (
        <div key={group || "all"} className="mt-1 first:mt-0">
          {group && <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{group}</p>}
          {visible
            .filter((o) => (o.group ?? "") === group)
            .map((option) => {
              const checked = value.includes(option.value);
              return (
                <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(checked ? value.filter((v) => v !== option.value) : [...value, option.value])}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30",
                      checked ? "border-ink bg-ink text-white" : "border-black/20 bg-white",
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-[15px]", option.count === 0 && !checked ? "text-zinc-400" : "text-ink")}>{option.label}</span>
                  <span className="shrink-0 text-sm tabular-nums text-zinc-500">{option.count}</span>
                </label>
              );
            })}
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
    "pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow";

  return (
    <div className="px-2 pb-1 pt-2">
      <p className="text-center text-lg font-semibold tabular-nums text-ink">
        {format(current.min)} – {format(current.max)}
        {current.max >= bounds.max && "+"}
      </p>
      <p className="text-center text-xs text-zinc-500">{t("perPerson")}</p>
      <div className="relative mt-4 h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-black/10" />
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
      <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-500">
        <span>{format(bounds.min)}</span>
        <span>{format(bounds.max)}+</span>
      </div>
    </div>
  );
}

/**
 * Vibe chips, multi-select ("All" clears the others). One row that scrolls sideways with soft edges where it overflows;
 * ‹ › buttons while hovering it on desktop.
 */
export function VibeChipRow({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const t = useTranslations("explore.filtersUi");
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const el = ref.current;
    if (el) setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: "smooth" });
  // Fade only the edge that has more to scroll to.
  const mask = `linear-gradient(to right, ${edges.start ? "black" : "transparent"}, black 32px, black calc(100% - 32px), ${edges.end ? "black" : "transparent"})`;
  const chip = (active: boolean) => cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors", active ? "bg-ink text-white" : "bg-white text-ink hover:bg-zinc-100");
  const arrow = "absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-md md:group-hover:flex";

  return (
    <div className="group relative min-w-0">
      <div ref={ref} onScroll={update} role="group" aria-label={label} className="no-scrollbar flex gap-2 overflow-x-auto" style={{ maskImage: mask, WebkitMaskImage: mask }}>
        <button type="button" aria-pressed={value.length === 0} onClick={() => onChange([])} className={chip(value.length === 0)}>
          {allLabel}
        </button>
        {options.map((o) => {
          const active = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={active} onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])} className={chip(active)}>
              {o.label}
            </button>
          );
        })}
      </div>
      {!edges.start && (
        <button type="button" aria-label={t("scrollBack")} onClick={() => page(-1)} className={cn(arrow, "-left-3")}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label={t("scrollOn")} onClick={() => page(1)} className={cn(arrow, "-right-3")}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** One chip per selected value with ×, "Clear all", and the result count. Nothing when no filter is set. */
export function ActiveFilterChips({ chips, onClearAll, resultLabel }: { chips: ActiveChip[]; onClearAll: () => void; resultLabel: string }) {
  const t = useTranslations("explore.filtersUi");
  if (chips.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-ink">{resultLabel}</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={t("remove", { label: chip.label })}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-ink/[0.06] pl-3 pr-2 text-sm text-ink transition-colors hover:bg-ink/10"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="ml-1 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-ink hover:underline">
        {t("clearAll")}
      </button>
    </div>
  );
}
