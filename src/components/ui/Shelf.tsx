"use client";

import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EXPLORE_SPACING } from "@/config/explore";
import { IconButton } from "@/components/ui/IconButton";
import { registerShelf, revealInShelf, scrollShelfToSlide } from "@/lib/shelves";
import { cn } from "@/lib/utils";

/** Constant, like its plugins: a new object would make Embla start again. A row that fits has nothing to drag. */
const OPTIONS: Parameters<typeof useEmblaCarousel>[0] = { align: "start", dragFree: true, containScroll: "trimSnaps", watchDrag: (api) => api.scrollSnapList().length > 1 };

const ARROW = "absolute top-1/2 z-20 hidden -translate-y-1/2 transition-opacity duration-200 md:flex";
const ARROW_GONE = "pointer-events-none opacity-0";

/**
 * Every horizontal row: fixed-width items (each sets its own width) on one line, starting at the container's left edge
 * and running to the window's right edge. Drag, trackpad and touch through Embla, ‹ › where there's more that way.
 * Viewport, track and slides are transparent: no background, frame, shadow or filter (see .shelf in globals.css).
 */
export function Shelf({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("explore.collections");
  const plugins = useMemo(() => [WheelGesturesPlugin({ forceWheelAxis: "x" })], []);
  const [viewportRef, api] = useEmblaCarousel(OPTIONS, plugins);
  const [ends, setEnds] = useState({ prev: false, next: false });

  useEffect(() => {
    if (!api) return;
    const unregister = registerShelf(api);
    const update = () => {
      const scrolls = api.scrollSnapList().length > 1;
      const progress = api.scrollProgress();
      const prev = scrolls && progress > 0.001;
      const next = scrolls && progress < 0.999;
      setEnds((current) => (current.prev === prev && current.next === next ? current : { prev, next }));
    };
    // Focus from a script or find-in-page scrolls the viewport itself, past Embla: take that back and go there Embla's way.
    const root = api.rootNode();
    const keepFlat = () => {
      if (root.scrollLeft === 0) return;
      root.scrollLeft = 0;
      if (document.activeElement && root.contains(document.activeElement)) revealInShelf(document.activeElement, true);
    };
    root.addEventListener("scroll", keepFlat);
    update();
    api.on("scroll", update).on("select", update).on("settle", update).on("reInit", update);
    return () => {
      unregister();
      root.removeEventListener("scroll", keepFlat);
      api.off("scroll", update).off("select", update).off("settle", update).off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    // As wide as the window without its scrollbar (100vw would include one and overflow the page).
    const root = document.documentElement;
    const onResize = () => root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** A window's worth: the card cut off on the right comes first, or the same the other way. */
  function page(direction: 1 | -1) {
    if (!api) return;
    const visible = api.slidesInView();
    if (visible.length === 0) return;
    const first = visible[0];
    const last = visible[visible.length - 1];
    const slide = direction > 0 ? Math.max(last, first + 1) : Math.max(0, Math.min(first - visible.length + 1, first - 1));
    scrollShelfToSlide(api, slide, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  return (
    <div className={cn("shelf-frame", EXPLORE_SPACING.rowCards, className)}>
      <div ref={viewportRef} data-shelf className="shelf">
        <div className={cn("shelf-track", (ends.prev || ends.next) && "md:cursor-grab md:active:cursor-grabbing")}>{children}</div>
      </div>
      <IconButton variant="onImage" size="lg" tabIndex={ends.prev ? undefined : -1} aria-hidden={!ends.prev} aria-label={t("scrollBack")} onClick={() => page(-1)} className={cn(ARROW, "left-4", !ends.prev && ARROW_GONE)}>
        <ChevronLeft className="size-5" aria-hidden />
      </IconButton>
      <IconButton variant="onImage" size="lg" tabIndex={ends.next ? undefined : -1} aria-hidden={!ends.next} aria-label={t("scrollOn")} onClick={() => page(1)} className={cn(ARROW, "right-4", !ends.next && ARROW_GONE)}>
        <ChevronRight className="size-5" aria-hidden />
      </IconButton>
    </div>
  );
}
