"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** How far one arrow (or arrow key) moves the row: 80 % of what's visible. */
const STEP = 0.8;
/** The fade on a side with more to scroll to: wide enough to sit under the arrow. */
const FADE = 40;

/**
 * One horizontal zone that scrolls sideways (the categories in the header's tab, the compact bar and the phones' row): a round arrow on
 * each side only while there's more that way (left from the first pixel scrolled, right until the end), a fade only on that side, a click
 * or ←/→ (focus inside) moves 80 % of the visible width, smoothly (instant with reduced motion). Trackpads and Shift + wheel scroll it
 * natively; a vertical wheel turn is never taken – it scrolls the page. Arrows 28px, round, the words' colour at 10 % (cream on graphite);
 * on touch none (a finger swipes).
 */
export function ScrollRow({ children, label, role, className }: { children: ReactNode; label?: string; role?: string; className?: string }) {
  const t = useTranslations("explore.collections");
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const start = el.scrollLeft <= 1;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * STEP, behavior: reduce ? "auto" : "smooth" });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" && !edges.end) {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft" && !edges.start) {
      e.preventDefault();
      move(-1);
    }
  };
  // The fade only where there's more: transparent at that edge, full from 40px in.
  const mask = `linear-gradient(to right, ${edges.start ? "#000 0" : `transparent 0, #000 ${FADE}px`}, ${edges.end ? "#000 100%" : `#000 calc(100% - ${FADE}px), transparent 100%`})`;
  const arrow = "press absolute top-1/2 z-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink/10 text-ink backdrop-blur-sm transition-[opacity,background-color] duration-150 hover:bg-ink/16 pointer-coarse:hidden";

  return (
    <div className={cn("relative flex min-w-0 items-center", className)} onKeyDown={onKeyDown}>
      <div
        ref={ref}
        role={role}
        aria-label={label}
        style={{ WebkitMaskImage: mask, maskImage: mask }}
        className="no-scrollbar -my-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain py-1"
      >
        {children}
      </div>
      <button type="button" tabIndex={-1} aria-label={t("scrollBack")} onClick={() => move(-1)} className={cn(arrow, "left-0", edges.start && "pointer-events-none opacity-0")}>
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <button type="button" tabIndex={-1} aria-label={t("scrollOn")} onClick={() => move(1)} className={cn(arrow, "right-0", edges.end && "pointer-events-none opacity-0")}>
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </div>
  );
}
