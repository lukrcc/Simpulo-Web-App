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
export function Shelf({ children, className, variant = "default", top = EXPLORE_SPACING.rowCards }: { children: ReactNode; className?: string; variant?: "default" | "flat"; /** Room above the cards (default: --space-inner) */ top?: string }) {
  const t = useTranslations("explore.collections");
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ prev: false, next: false });

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = root.scrollWidth - root.clientWidth;
      const prev = root.scrollLeft > 1;
      const next = root.scrollLeft < max - 1;
      setEnds((current) => (current.prev === prev && current.next === next ? current : { prev, next }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(root);
    const track = root.firstElementChild;
    if (track) observer.observe(track);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // As wide as the window without its scrollbar (100vw would include one and overflow the page).
    const root = document.documentElement;
    const onResize = () => root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** About one visible width (less the page's margin, so the card cut off on the right comes first); the snap points settle it on a card. */
  function page(direction: 1 | -1) {
    const root = viewportRef.current;
    if (!root) return;
    const gutter = parseFloat(getComputedStyle(root).scrollPaddingInlineStart) || 0;
    root.scrollBy({ left: direction * Math.max(1, root.clientWidth - 2 * gutter), behavior: reducedMotion() ? "auto" : "smooth" });
  }

  return (
    <div className={cn("shelf-frame", variant === "flat" && "shelf-flat", top, className)}>
      <div ref={viewportRef} data-shelf className="shelf">
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
