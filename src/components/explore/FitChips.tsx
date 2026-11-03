"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Anchored } from "@/components/ui/Anchored";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Chip, ChipCheck, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
}

/** The chips' gap (gap-2). */
const GAP = 8;

interface FitChipsProps {
  /** The categories, in order: those that fit are shown, all of them are under More */
  options: ReadonlyArray<ChipOption>;
  labels: { row: string; all: string; more: string };
  /** The picked categories ([] = All) */
  value: readonly string[];
  /** A category, or null for All */
  onSelect: (vibe: string | null) => void;
}

/**
 * Open Houses' category chips (36px, 14px/500): All, as many categories as fit whole, and always "More ▾" last – no scrolling, no arrows. The row measures its width (ResizeObserver) against the chips' widths,
 * taken from an invisible copy of every chip. A picked category that doesn't fit takes the last visible chip's place.
 * More opens all categories as a 3-column grid (single choice; picking closes it).
 */
export function FitChips({ options, labels, value, onSelect }: FitChipsProps) {
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
      let used = allW + GAP + moreW;
      const fits: number[] = [];
      for (let i = 0; i < options.length; i++) {
        if (used + rest[i] + GAP > avail) break;
        fits.push(i);
        used += rest[i] + GAP;
      }
      const picked = options.findIndex((o) => value.includes(o.value));
      if (picked >= 0 && !fits.includes(picked)) {
        while (fits.length > 0 && used + rest[picked] + GAP > avail) used -= rest[fits.pop()!] + GAP;
        if (used + rest[picked] + GAP <= avail) fits.push(picked);
      }
      const next = fits.map((i) => options[i].value);
      setShown((current) => (current && current.length === next.length && current.every((v, i) => v === next[i]) ? current : next));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(row);
    return () => observer.disconnect();
  }, [options, value]);

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
  const pick = (vibe: string) => onSelect(value.length === 1 && value[0] === vibe ? null : vibe);
  const visible: ChipOption[] = (shown ?? []).map((v) => options.find((o) => o.value === v)).filter((o): o is ChipOption => o !== undefined);
  const moreActive = value.some((v) => !shown?.includes(v));

  return (
    <div ref={rowRef} data-chip-row className="relative w-full min-w-0">
      {/* Every chip once, invisible – what the row measures. Active ones with their check, More with one (its widest). */}
      {/* Clipped: in the page's flow its full width would otherwise widen the document. */}
      <div className="absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={measureRef} aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 flex w-max">
          <span className={chipStyles(value.length === 0, { size: "md" })}>{labels.all}</span>
          {options.map((o) => (
            <span key={o.value} className={cn(chipStyles(value.includes(o.value), { size: "md" }), "[&>svg]:size-3.5")}>
              {value.includes(o.value) && <ChipCheck />}
              <span>{o.label}</span>
            </span>
          ))}
          <span className={chipStyles(true, { size: "md" })}>
            <ChipCheck />
            {labels.more}
            <ChevronDown className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>

      <div role="radiogroup" aria-label={labels.row} className={cn("flex items-center gap-2", shown === null && "invisible")}>
        <button type="button" role="radio" aria-checked={value.length === 0} onClick={() => onSelect(null)} className={chipStyles(value.length === 0, { size: "md" })}>
          {labels.all}
        </button>
        {visible.map((o) => (
          <Chip key={o.value} role="radio" aria-checked={value.includes(o.value)} active={value.includes(o.value)} size="md" title={o.label} onClick={() => pick(o.value)}>
            {o.label}
          </Chip>
        ))}
        <button ref={moreRef} type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-haspopup="true" className={chipStyles(moreActive, { size: "md" })}>
          {moreActive && <ChipCheck />}
          {labels.more}
          <ChevronDown className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")} aria-hidden />
        </button>
      </div>

      {moreOpen && (
        <Anchored anchor={moreRef} ref={popoverRef} align="end">
          {/* Every category, three per row. */}
          <GlassPanel
            role="radiogroup"
            aria-label={labels.more}
            className="animate-fade-in grid w-[min(420px,calc(100vw-32px))] grid-cols-3 gap-2 p-3"
          >
            {options.map((o) => (
              <Chip
                key={o.value}
                role="radio"
                aria-checked={value.includes(o.value)}
                active={value.includes(o.value)}
                size="sm"
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
          </GlassPanel>
        </Anchored>
      )}
    </div>
  );
}
