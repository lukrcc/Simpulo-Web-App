"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChipOption, ExploreControls } from "@/components/explore/ExploreControls";
import { Anchored } from "@/components/ui/Anchored";
import { Chip, ChipCheck, chipStyles, type ChipSize } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

/** The expanded row shows at most this many chips (All included), then More. */
const EXPANDED_MAX = 8;

interface HeaderChipsProps {
  controls: ExploreControls;
  /** The picked categories ([] = All) */
  value: readonly string[];
  /** "md": the expanded row (36px chips, 8px apart) · "compact": the compact bar (32px chips, 6px apart) */
  size: "md" | "compact";
}

/**
 * The header's category chips: All, as many categories as fit whole (the expanded row at most 8 chips), and always
 * "More ▾" last – no scrolling, no arrows. The row measures its width (ResizeObserver) against the chips' widths,
 * taken from an invisible copy of every chip. A picked category that doesn't fit takes the last visible chip's place.
 * More opens all categories as a 3-column grid (single choice; picking closes it).
 */
export function HeaderChips({ controls, value, size }: HeaderChipsProps) {
  const compact = size === "compact";
  const chipSize: ChipSize = compact ? "compact" : "md";
  const gap = compact ? 6 : 8;
  const cap = compact ? Infinity : EXPANDED_MAX;
  const options = useMemo(() => [...controls.chips, ...controls.more], [controls.chips, controls.more]);
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<readonly string[] | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Which categories fit: All + chips + gaps + More ≤ the row's width; a picked one that doesn't swaps in last.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const widths = [...measure.children].map((el) => (el as HTMLElement).offsetWidth);
      const [allW, ...rest] = widths;
      const moreW = rest.pop() ?? 0;
      const avail = row.clientWidth;
      let used = allW + gap + moreW;
      const fits: number[] = [];
      for (let i = 0; i < options.length && fits.length + 2 <= cap; i++) {
        if (used + rest[i] + gap > avail) break;
        fits.push(i);
        used += rest[i] + gap;
      }
      const picked = options.findIndex((o) => value.includes(o.value));
      if (picked >= 0 && !fits.includes(picked)) {
        while (fits.length > 0 && used + rest[picked] + gap > avail) used -= rest[fits.pop()!] + gap;
        if (used + rest[picked] + gap <= avail) fits.push(picked);
      }
      const next = fits.map((i) => options[i].value);
      setShown((current) => (current && current.length === next.length && current.every((v, i) => v === next[i]) ? current : next));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(row);
    return () => observer.disconnect();
  }, [options, value, gap, cap]);

  // The popover closes on a click outside it (and outside its chip – that one toggles) and on Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!popoverRef.current?.contains(target) && !moreRef.current?.contains(target)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMoreOpen(false);
      moreRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // A click on the only active chip goes back to All; any other click makes that chip the one.
  const pick = (vibe: string) => controls.onSelect(value.length === 1 && value[0] === vibe ? null : vibe);
  const visible: ChipOption[] = (shown ?? []).map((v) => options.find((o) => o.value === v)).filter((o): o is ChipOption => o !== undefined);
  const moreActive = value.some((v) => !shown?.includes(v));

  return (
    <div ref={rowRef} data-chip-row className="relative w-full min-w-0">
      {/* Every chip once, invisible – what the row measures. Active ones with their check, More with one (its widest). */}
      <div ref={measureRef} aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 flex w-max">
        <span className={chipStyles(value.length === 0, { size: chipSize })}>{controls.labels.all}</span>
        {options.map((o) => (
          <span key={o.value} className={cn(chipStyles(value.includes(o.value), { size: chipSize }), "[&>svg]:size-3.5")}>
            {value.includes(o.value) && <ChipCheck />}
            <span>{o.label}</span>
          </span>
        ))}
        <span className={chipStyles(true, { size: chipSize })}>
          <ChipCheck />
          {controls.labels.more}
          <ChevronDown className="size-3.5" aria-hidden />
        </span>
      </div>

      <div role="radiogroup" aria-label={controls.labels.row} className={cn("flex items-center", compact ? "gap-1.5" : "gap-2", shown === null && "invisible")}>
        <button type="button" role="radio" aria-checked={value.length === 0} onClick={() => controls.onSelect(null)} className={chipStyles(value.length === 0, { size: chipSize })}>
          {controls.labels.all}
        </button>
        {visible.map((o) => (
          <Chip key={o.value} role="radio" aria-checked={value.includes(o.value)} active={value.includes(o.value)} size={chipSize} title={o.label} onClick={() => pick(o.value)}>
            {o.label}
          </Chip>
        ))}
        <button ref={moreRef} type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-haspopup="true" className={chipStyles(moreActive, { size: chipSize })}>
          {moreActive && <ChipCheck />}
          {controls.labels.more}
          <ChevronDown className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")} aria-hidden />
        </button>
      </div>

      {moreOpen && (
        <Anchored anchor={moreRef} ref={popoverRef} align="end">
          {/* surface, 16px radius, 12px inside; every category, three per row. */}
          <div
            role="radiogroup"
            aria-label={controls.labels.more}
            className="animate-fade-in grid w-[min(420px,calc(100vw-32px))] grid-cols-3 gap-2 rounded-2xl bg-surface p-3 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
          >
            {options.map((o) => (
              <Chip
                key={o.value}
                role="radio"
                aria-checked={value.includes(o.value)}
                active={value.includes(o.value)}
                size="compact"
                title={o.label}
                onClick={() => {
                  pick(o.value);
                  setMoreOpen(false);
                }}
                className="w-full shrink"
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </Anchored>
      )}
    </div>
  );
}
