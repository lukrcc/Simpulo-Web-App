"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EXPLORE_SPACING } from "@/config/explore";
import { IconButton } from "@/components/ui/IconButton";
import { reducedMotion } from "@/lib/shelves";
import { cn } from "@/lib/utils";

const ARROW = "absolute top-1/2 z-20 hidden -translate-y-1/2 transition-opacity duration-200 md:flex";
const ARROW_GONE = "pointer-events-none opacity-0";

/**
 * Every horizontal row (CLAUDE.md "Flüssiges, ruhiges horizontales Scrollen"): a NATIVE horizontal scroller – the browser moves it at the
 * speed of the trackpad, Shift + wheel or the finger (no scroll hijacking, no library), with snap points (scroll-snap-type: x proximity, each
 * card snap-align start on the page's edge; phones mandatory: a swipe rests on the next card) and overscroll-behavior-x: contain (no
 * accidental "back"). The first card starts on the page's grid, the row runs past the window's right edge, scrolled also past the left one.
 * ‹ › scroll about one visible width (scrollBy, smooth; reduced motion: at once), shown only where there's more that way – read in one
 * passive scroll listener, throttled to a frame. Viewport, track and slides transparent (.shelf in globals.css).
 * variant="flat" (Explore's shelves): no effect that depends on position or hover.
 */
export function Shelf({
  children,
  className,
  variant = "default",
  top = EXPLORE_SPACING.rowCards,
  snap = true,
  copies = 1,
  startIndex = 0,
  step = "page",
  onRest,
  frameProps,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "flat";
  /** Room above the cards (default: --space-inner) */
  top?: string;
  /** Snap points on the cards (default); false: free native scrolling (the Spotlight) */
  snap?: boolean;
  /** Endless (CLAUDE.md "Spotlight natives Scrollen"): the children are this many identical copies of one list; the row starts in the middle
   *  copy and, only once it rests (scrollend or 400ms without a scroll event), jumps back by whole copies when less than one copy is left to an
   *  edge – the same picture, so nothing visibly moves. The arrows are always there. */
  copies?: number;
  /** Endless: the card (index in one copy) the row starts on, at the left gutter */
  startIndex?: number;
  /** What an arrow scrolls: about a visible width (default) or one card */
  step?: "page" | "card";
  /** Called whenever the row has come to rest (and once at the start) */
  onRest?: (viewport: HTMLDivElement) => void;
  frameProps?: Record<`data-${string}`, string | boolean | undefined>;
}) {
  const t = useTranslations("explore.collections");
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ prev: false, next: false });
  const endless = copies > 1;
  const onRestRef = useRef(onRest);
  useEffect(() => {
    onRestRef.current = onRest;
  });

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;
    let frame = 0;
    let restTimer = 0;
    // Endless: until the visitor moves it, the row (re)starts on startIndex of the middle copy – also when its cards get their size later.
    let touched = false;
    const cards = () => root.firstElementChild?.children;
    const gutter = () => parseFloat(getComputedStyle(root).scrollPaddingInlineStart) || 0;
    const copyWidth = () => {
      const list = cards();
      if (!list || list.length < copies) return 0;
      const per = list.length / copies;
      return (list[per] as HTMLElement).offsetLeft - (list[0] as HTMLElement).offsetLeft;
    };
    const place = () => {
      const list = cards();
      if (!endless || touched || !list) return;
      const per = list.length / copies;
      const card = list[Math.floor(copies / 2) * per + Math.min(startIndex, per - 1)] as HTMLElement | undefined;
      if (card) root.scrollLeft = card.offsetLeft - gutter();
    };
    const rest = () => {
      restTimer = 0;
      delete root.dataset.scrolling;
      if (endless) {
        const width = copyWidth();
        const max = root.scrollWidth - root.clientWidth;
        if (width > 0 && (root.scrollLeft < width || max - root.scrollLeft < width)) {
          // Back towards the middle copy by whole copies: the same cards in the same place.
          const middle = Math.floor(copies / 2) * width;
          root.scrollLeft += Math.round((middle - root.scrollLeft) / width) * width;
        }
      }
      onRestRef.current?.(root);
    };
    const update = () => {
      frame = 0;
      if (endless) {
        setEnds((current) => (current.prev && current.next ? current : { prev: true, next: true }));
        return;
      }
      const max = root.scrollWidth - root.clientWidth;
      const prev = root.scrollLeft > 1;
      const next = root.scrollLeft < max - 1;
      setEnds((current) => (current.prev === prev && current.next === next ? current : { prev, next }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      if (onRestRef.current || endless) {
        root.dataset.scrolling = "";
        window.clearTimeout(restTimer);
        restTimer = window.setTimeout(rest, 400);
      }
    };
    const onScrollEnd = () => {
      window.clearTimeout(restTimer);
      rest();
    };
    const touch = () => {
      touched = true;
    };
    place();
    update();
    if (onRestRef.current) onRestRef.current(root);
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("scrollend", onScrollEnd);
    for (const type of ["pointerdown", "wheel", "touchstart", "keydown"]) root.addEventListener(type, touch, { passive: true });
    const observer = new ResizeObserver(() => {
      place();
      onScroll();
    });
    observer.observe(root);
    const track = root.firstElementChild;
    if (track) observer.observe(track);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(restTimer);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", onScrollEnd);
      for (const type of ["pointerdown", "wheel", "touchstart", "keydown"]) root.removeEventListener(type, touch);
      observer.disconnect();
    };
  }, [copies, endless, startIndex]);

  useEffect(() => {
    // As wide as the window without its scrollbar (100vw would include one and overflow the page).
    const root = document.documentElement;
    const onResize = () => root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** About one visible width (less the page's margin, so the card cut off on the right comes first), or one card (step="card"). */
  function page(direction: 1 | -1) {
    const root = viewportRef.current;
    if (!root) return;
    root.dispatchEvent(new Event("pointerdown"));
    let distance: number;
    if (step === "card") {
      const card = root.firstElementChild?.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(root.firstElementChild as Element).columnGap) || 0;
      distance = card ? card.offsetWidth + gap : root.clientWidth;
    } else {
      const gutter = parseFloat(getComputedStyle(root).scrollPaddingInlineStart) || 0;
      distance = Math.max(1, root.clientWidth - 2 * gutter);
    }
    root.scrollBy({ left: direction * distance, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  return (
    <div {...frameProps} className={cn("shelf-frame", variant === "flat" && "shelf-flat", top, className)}>
      <div ref={viewportRef} data-shelf data-snap={snap ? undefined : "off"} className="shelf">
        <div className="shelf-track">{children}</div>
      </div>
      <IconButton data-shelf-arrow variant="onImage" size="lg" tabIndex={ends.prev ? undefined : -1} aria-hidden={!ends.prev} aria-label={t("scrollBack")} onClick={() => page(-1)} className={cn(ARROW, "left-4", !ends.prev && ARROW_GONE)}>
        <ChevronLeft className="size-5" aria-hidden />
      </IconButton>
      <IconButton data-shelf-arrow variant="onImage" size="lg" tabIndex={ends.next ? undefined : -1} aria-hidden={!ends.next} aria-label={t("scrollOn")} onClick={() => page(1)} className={cn(ARROW, "right-4", !ends.next && ARROW_GONE)}>
        <ChevronRight className="size-5" aria-hidden />
      </IconButton>
    </div>
  );
}
