"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Anchored } from "@/components/ui/Anchored";
import { DarkMenuItem, darkMenuClass, darkMenuScroll } from "@/components/ui/DarkMenu";
import { Chip, chipStyles, TextChipLabel } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
  /** Its line icon, 16px before the words (ink 60 %; picked #F0633A) */
  icon?: LucideIcon;
}

/** A category's icon in the row: 16px, ink 60 %; on the picked (black) capsule #F0633A. */
export function ChipIcon({ icon: Icon, on }: { icon?: LucideIcon; on: boolean }) {
  if (!Icon) return null;
  return (
    <span aria-hidden className={cn("mr-1 flex shrink-0 transition-colors duration-150", on ? "text-accent" : "text-ink/60")}>
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

/** No gap between the text chips: their 12px padding each side puts the words 24px apart. */
const GAP = 0;
/** A chosen category carries no ✕ any more. */
const REMOVE_W = 0;

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
 * Open Houses' categories as text (40px, 15px, 24px between the words; the picked one the black capsule): All, as many categories as fit
 * whole up to the sort, and always "More ⌄" right after them – no scrolling, no arrows, no big gap. The row measures its width (ResizeObserver)
 * against the chips' widths,
 * taken from an invisible copy of every chip. A picked category that doesn't fit takes the last visible chip's place.
 * More opens all categories as capsule chips in a 3-column grid (single choice; picking closes it).
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
      let used = allW + GAP + moreW + (value.length > 0 ? REMOVE_W : 0);
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
      {/* Every chip once, invisible – what the row measures. */}
      {/* Clipped: in the page's flow its full width would otherwise widen the document. */}
      <div className="absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={measureRef} aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 flex w-max">
          <span className={chipStyles(false, { variant: "plain", size: "lg" })}>
            <TextChipLabel>{labels.all}</TextChipLabel>
          </span>
          {options.map((o) => (
            <span key={o.value} className={chipStyles(false, { variant: "bare", size: "lg" })}>
              <ChipIcon icon={o.icon} on={false} />
              <TextChipLabel>{o.label}</TextChipLabel>
            </span>
          ))}
          <span className={chipStyles(false, { variant: "bare", size: "lg" })}>
            <TextChipLabel>{labels.more}</TextChipLabel>
            <ChevronDown aria-hidden />
          </span>
        </div>
      </div>

      {/* "All" is the quiet default: no pill – bold ink while nothing is picked. The categories are text (15px, ink 70 %); a picked one is the
          black capsule with white text. 40px, the row's height. */}
      <div role="radiogroup" aria-label={labels.row} className={cn("relative flex items-center", shown === null && "invisible")}>
        <Chip variant="plain" size="lg" role="radio" aria-checked={value.length === 0} active={value.length === 0} onClick={() => onSelect(null)}>
          {labels.all}
        </Chip>
        {visible.map((o) => (
          <Chip key={o.value} variant="bare" size="lg" role="radio" aria-checked={value.includes(o.value)} active={value.includes(o.value)} title={o.label} icon={<ChipIcon icon={o.icon} on={value.includes(o.value)} />} onClick={() => pick(o.value)}>
            {o.label}
          </Chip>
        ))}
                  <Chip ref={moreRef} variant="bare" size="lg" active={moreActive} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-haspopup="true" trailing={<ChevronDown className={cn("transition-transform", moreOpen && "rotate-180")} aria-hidden />}>
            {labels.more}
          </Chip>
      </div>

      {moreOpen && (
        <Anchored anchor={moreRef} ref={popoverRef} align="end">
          {/* Every category, two per row, in the dark menu: the chosen one on 12 % white with its check. */}
          <div role="radiogroup" aria-label={labels.more} className={cn(darkMenuClass, darkMenuScroll, "grid w-[min(400px,calc(100vw-32px))] grid-cols-2 gap-0.5")}>
            {options.map((o) => (
              <DarkMenuItem
                key={o.value}
                role="radio"
                aria-checked={value.includes(o.value)}
                selected={value.includes(o.value)}
                onClick={() => {
                  pick(o.value);
                  setMoreOpen(false);
                }}
              >
                {o.label}
              </DarkMenuItem>
            ))}
          </div>
        </Anchored>
      )}
    </div>
  );
}
