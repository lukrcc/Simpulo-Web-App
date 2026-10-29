"use client";

import { useCallback, useRef, useState } from "react";

/**
 * State for a CSS scroll-snap carousel whose slides are each 100% of the track width. Swipe, arrows and dots share one
 * index: the scroll position. While an arrow's smooth scroll is still on its way, the next step counts from where it's
 * heading – one click is one slide, never two.
 */
export function useSnapCarousel<T extends HTMLElement>(count: number) {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);
  const target = useRef<number | null>(null);

  const onScroll = useCallback(() => {
    const track = ref.current;
    if (!track || track.clientWidth === 0) return;
    const exact = track.scrollLeft / track.clientWidth;
    const index = Math.max(0, Math.min(count - 1, Math.round(exact)));
    setActive(index);
    // Arrived (or the user swiped elsewhere): steps count from the position again.
    if (Math.abs(exact - index) < 0.01) target.current = null;
  }, [count]);

  const scrollTo = useCallback(
    (index: number) => {
      const track = ref.current;
      if (!track) return;
      const next = Math.max(0, Math.min(count - 1, index));
      target.current = next;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: next * track.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [count],
  );

  const step = useCallback((delta: 1 | -1) => scrollTo((target.current ?? active) + delta), [scrollTo, active]);

  return { ref, active, onScroll, scrollTo, step };
}
