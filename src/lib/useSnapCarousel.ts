"use client";

import { useCallback, useRef, useState } from "react";

/** State for a CSS scroll-snap carousel whose slides are each 100% of the track width. */
export function useSnapCarousel<T extends HTMLElement>(count: number) {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const track = ref.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive(Math.max(0, Math.min(count - 1, index)));
  }, [count]);

  const scrollTo = useCallback((index: number) => {
    const track = ref.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }, []);

  return { ref, active, onScroll, scrollTo };
}
