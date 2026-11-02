"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ExploreControls } from "@/components/explore/ExploreControls";
import { Anchored } from "@/components/ui/Anchored";
import { Chip, ChipCheck, chipStyles } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

/** The chip row's scroll position, shared by the expanded and the compact row (as a fraction of the scroll width). */
export interface ChipOffset {
  left: number;
  width: number;
}
/** The shared offset's accessors (SiteHeader keeps it in a ref). */
export interface ChipOffsetStore {
  read: () => ChipOffset;
  write: (offset: ChipOffset) => void;
}

const MORE_POPOVER_MAX_WIDTH = 520;

interface HeaderChipsProps {
  controls: ExploreControls;
  /** The picked categories ([] = All) */
  value: readonly string[];
  /** "md": the expanded row (36px chips, 8px apart) · "compact": the compact bar (32px chips, 6px apart, 40px fades, arrows) */
  size: "md" | "compact";
  /** Whether this row is the one shown – it takes over the shared scroll offset when it becomes so */
  active: boolean;
  offset: ChipOffsetStore;
}

/**
 * The header's category chips: All, the row's chips, More. One scrolling line (never squeezed or cut) – also with
 * the mouse wheel; its ends fade where there's more. Compact: 32px arrow circles absolute over the padded ends,
 * outside the scroller, while that direction has more. Only chips in the scroller.
 */
export function HeaderChips({ controls, value, size, active, offset }: HeaderChipsProps) {
  const compact = size === "compact";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const [moreOpen, setMoreOpen] = useState(false);

  // Edges (for the fades and arrows), the wheel, and the shared offset: written while this row is the active one.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setEdges((e) => (e.atStart === atStart && e.atEnd === atEnd ? e : { atStart, atEnd }));
      if (active) offset.write({ left: el.scrollLeft, width: el.scrollWidth });
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
  }, [active, offset]);

  // Becoming the shown row: pick up where the other one was (proportionally – the chips differ in size).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!active || !el) return;
    const { left, width } = offset.read();
    if (width > 0) el.scrollLeft = (left / width) * el.scrollWidth;
  }, [active, offset]);

  // The More popover closes on a click outside it (and outside its chip – that one toggles) and on Escape.
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

  const page = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.6, behavior: reduce ? "auto" : "smooth" });
  };
  // A click on the only active chip goes back to All; any other click makes that chip the one.
  const pick = (vibe: string) => controls.onSelect(value.length === 1 && value[0] === vibe ? null : vibe);
  const chipSize = compact ? "compact" : "md";
  const moreActive = controls.more.some((o) => value.includes(o.value));
  const arrow = "chip-arrow absolute top-1/2 z-10 -translate-y-1/2";

  return (
    <div
      data-chip-row
      className="chip-row relative min-w-0"
      data-at-start={edges.atStart || undefined}
      data-at-end={edges.atEnd || undefined}
      style={{ "--fade": compact ? "40px" : "12px" } as CSSProperties}
    >
      {compact && !edges.atStart && (
        <button type="button" tabIndex={-1} aria-hidden onClick={() => page(-1)} className={cn(arrow, "left-0")}>
          <ChevronLeft aria-hidden />
        </button>
      )}
      <div
        ref={scrollerRef}
        role="radiogroup"
        aria-label={controls.labels.row}
        className={cn("chip-scroller no-scrollbar flex min-w-0 overflow-x-auto py-1", compact ? "gap-1.5 px-10" : "gap-2")}
      >
        <button type="button" role="radio" aria-checked={value.length === 0} onClick={() => controls.onSelect(null)} className={cn(chipStyles(value.length === 0, { size: chipSize }), "shrink-0")}>
          {controls.labels.all}
        </button>
        {controls.chips.map((o) => (
          <Chip key={o.value} role="radio" aria-checked={value.includes(o.value)} active={value.includes(o.value)} size={chipSize} title={o.label} onClick={() => pick(o.value)}>
            {o.label}
          </Chip>
        ))}
        {controls.more.length > 0 && (
          <button ref={moreRef} type="button" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} aria-haspopup="true" className={chipStyles(moreActive, { size: chipSize })}>
            {moreActive && <ChipCheck />}
            {controls.labels.more}
            <ChevronDown className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>
      {compact && !edges.atEnd && (
        <button type="button" tabIndex={-1} aria-hidden onClick={() => page(1)} className={cn(arrow, "right-0")}>
          <ChevronRight aria-hidden />
        </button>
      )}
      {moreOpen && (
        <Anchored anchor={moreRef} ref={popoverRef} align="end">
          <div
            role="group"
            aria-label={controls.labels.more}
            style={{ width: `min(${MORE_POPOVER_MAX_WIDTH}px, calc(100vw - 32px))` }}
            className="animate-fade-in grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-3 shadow-[0_8px_24px_color-mix(in_srgb,var(--ink)_10%,transparent)]"
          >
            {controls.more.map((o) => (
              <Chip
                key={o.value}
                active={value.includes(o.value)}
                size="row"
                title={o.label}
                onClick={() => {
                  controls.onSelect(o.value);
                  setMoreOpen(false);
                }}
                className="shrink"
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
