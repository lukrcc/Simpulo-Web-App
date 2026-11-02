"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { StayCard } from "@/components/StayCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Collection } from "@/lib/collections";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A mouse drag only scrolls once it has moved this far – below it, it's a click. */
const DRAG_THRESHOLD_PX = 6;

/**
 * Mouse drag-to-scroll for a horizontal scroller (touch and trackpads scroll natively, shift + wheel too). Past the
 * threshold the drag owns the pointer, snapping pauses, and the click that ends the drag is swallowed – a short
 * click still opens the House.
 */
function useDragScroll(ref: RefObject<HTMLDivElement | null>) {
  const drag = useRef<{ x: number; left: number; id: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, id: e.pointerId, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      el.setPointerCapture(d.id);
      el.style.scrollSnapType = "none";
    }
    el.scrollLeft = d.left - dx;
  }
  function onPointerUp() {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    if (el.hasPointerCapture(d.id)) el.releasePointerCapture(d.id);
    // Snapping back on settles the row on the nearest card edge.
    el.style.scrollSnapType = "";
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 0);
  }
  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (!swallowClick.current) return;
    e.preventDefault();
    e.stopPropagation();
    swallowClick.current = false;
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
    // No native image/link dragging while drag-scrolling.
    onDragStart: (e: DragEvent) => e.preventDefault(),
  };
}

/**
 * A themed row between the grid sections: heading, subline and compact cards in a horizontal snap scroller (no
 * visible scrollbar). Phones swipe it (it runs to the screen edge); desktop gets ‹ › buttons while hovering. The
 * scroller's vertical padding leaves room for the cards' hover scale.
 */
export function CollectionRow({ collection, stays }: { collection: Collection; stays: Stay[] }) {
  const t = useTranslations("explore.collections");
  const store = useStore();
  return (
    <section aria-labelledby={`collection-${collection.id}`}>
      <RowHeader
        id={`collection-${collection.id}`}
        eyebrow={t(`${collection.id}.eyebrow`)}
        title={t(`${collection.id}.title`)}
        subline={t(`${collection.id}.subline`)}
        seeAll={{ href: `/collections/${collection.slug}`, label: t("seeAll"), ariaLabel: t("seeAllLabel", { title: t(`${collection.id}.title`) }) }}
      />
      <ScrollRow>
        {stays.map((stay) => (
          <div key={stay.id} className="w-90 shrink-0 snap-start">
            <StayCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} compact />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/** The header of every horizontal row – the section heading (SectionHeader): title, "See all →", count badge. */
export const RowHeader = SectionHeader;

/**
 * Horizontal snap row of fixed-width items (they set their own width and snap-start): trackpad, shift + wheel and
 * touch scroll natively, a mouse drags it, ‹ › appear on desktop hover where there's more. No visible scrollbar; on
 * phones it runs to the screen edge.
 */
export function ScrollRow({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("explore.collections");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragScroll(scrollerRef);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    // The scroller is as wide as the window without its scrollbar (100vw would include one and overflow the page).
    const root = document.documentElement;
    const onResize = () => {
      root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
      updateEdges();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateEdges]);

  function page(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" });
  }

  // On the content edges (the page gutter), centred on the cards, above them.
  const arrow =
    "absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink shadow-md transition-opacity duration-200 hover:bg-bg md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";

  return (
    // 32px from the row's heading to the cards; the scroller's room for lifted cards and their shadow is cancelled by
    // its negative margins, so it costs no layout.
    <div className={cn("group relative mt-8", className)}>
      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        {...dragHandlers}
        // Edge to edge: as wide as the window and centred on it (left 50% + translate), padded by the page gutter
        // (--row-gutter, ≥ 24px), so the first card lines up with the heading and a lifted card's shadow isn't cut off
        // at the left; to the right the row runs to the window's edge. 40px above and below for the lift and the
        // 40px-blur shadow (overflow-x: auto clips vertically too, so this is what keeps the shadow whole), taken back
        // by the same negative margins – the layout stays as it is. Cards 360px wide, 24px apart. No background,
        // border or mask.
        className="lift-row no-scrollbar relative left-1/2 -my-10 flex w-[calc(100vw-var(--scrollbar-w,0px))] -translate-x-1/2 snap-x snap-mandatory scroll-px-(--row-gutter) gap-6 overflow-x-auto px-(--row-gutter) py-10 md:cursor-grab md:active:cursor-grabbing"
      >
        {children}
      </div>
      {/* Only where there's more to see in that direction. */}
      {!edges.start && (
        <button type="button" aria-label={t("scrollBack")} onClick={() => page(-1)} className={cn(arrow, "left-0 -translate-x-1/2")}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label={t("scrollOn")} onClick={() => page(1)} className={cn(arrow, "right-0 translate-x-1/2")}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
