"use client";

import { useEffect, useRef } from "react";

/** Past this much scroll the desktop header goes compact. */
const SHRINK_AFTER_PX = 40;

/**
 * Watches an invisible 40px strip at the very top of the page (IntersectionObserver – no scroll listener): once it's
 * scrolled away, `data-header-compact` goes on <html> and globals.css shrinks the desktop header bar and hides the
 * claim; back at the top it comes off again.
 */
export function HeaderShrink() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = ref.current;
    if (!sentinel) return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete root.dataset.headerCompact;
      else root.dataset.headerCompact = "";
    });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      delete root.dataset.headerCompact;
    };
  }, []);
  // Positioned against the document (body isn't positioned), so it scrolls away with the page.
  return <div ref={ref} aria-hidden style={{ height: SHRINK_AFTER_PX }} className="pointer-events-none absolute inset-x-0 top-0" />;
}
