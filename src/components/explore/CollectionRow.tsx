"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { StayCard } from "@/components/StayCard";
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
    <section aria-labelledby={`collection-${collection.id}`} className="py-2">
      <RowHeader
        id={`collection-${collection.id}`}
        title={t(`${collection.id}.title`)}
        subline={t(`${collection.id}.subline`)}
        seeAll={{ href: `/collections/${collection.slug}`, label: t("seeAll"), ariaLabel: t("seeAllLabel", { title: t(`${collection.id}.title`) }) }}
      />
      <ScrollRow>
        {stays.map((stay) => (
          <div key={stay.id} className="w-65 shrink-0 snap-start">
            <StayCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} compact />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/** Heading + subline on the left, "See all →" on the right – the header of every horizontal row. */
export function RowHeader({ id, title, subline, seeAll }: { id: string; title: string; subline: string; seeAll?: { href: string; label: string; ariaLabel?: string } }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-2xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 text-muted">{subline}</p>
      </div>
      {seeAll && (
        <Link href={seeAll.href} aria-label={seeAll.ariaLabel} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline">
          {seeAll.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

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
    // 8px under the row's heading: with the scroller's 28px room on top, a lifted card stays 8px+ clear of the heading.
    <div className={cn("group relative mt-2", className)}>
      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        {...dragHandlers}
        // Edge to edge: as wide as the window and centred on it (left 50% + translate, no negative margins), padded by the
        // page gutter (--row-gutter), so the first card lines up with the heading and nothing is cut off at rest. 28px
        // above and below for lifted cards and their shadow. No background, border or mask.
        className="lift-row no-scrollbar relative left-1/2 flex w-[calc(100vw-var(--scrollbar-w,0px))] -translate-x-1/2 snap-x snap-mandatory scroll-px-(--row-gutter) gap-4 overflow-x-auto px-(--row-gutter) py-7 md:cursor-grab md:active:cursor-grabbing"
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
