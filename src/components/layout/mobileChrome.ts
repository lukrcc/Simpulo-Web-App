"use client";

import { useEffect, useState } from "react";
import { useIsStandalone } from "@/lib/install";
import { useStore } from "@/lib/store";
import { mobileChromeFor, type MobileChrome } from "./nav";

/**
 * Which mobile navigation this visitor gets (< md). Logged out during server rendering and hydration (useStore
 * masks the user, useIsStandalone is false), so the server HTML always shows the mobile header.
 */
export function useMobileChrome(): MobileChrome {
  const standalone = useIsStandalone();
  const loggedIn = useStore().currentUserId !== null;
  return mobileChromeFor(standalone, loggedIn);
}

/** Ignore scroll jitter below this many pixels. */
const SCROLL_THRESHOLD = 8;
/** Near the top of the page the bar always shows. */
const TOP_ZONE = 56;

/**
 * Docked tab bar: true while the visitor scrolls down, false on scroll up, near the top and at the page end.
 * Keyed by `key` (the pathname), so a new page always starts with the bar visible.
 */
export function useHideOnScroll(key: string, enabled: boolean): boolean {
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - SCROLL_THRESHOLD;
      const delta = y - lastY;
      if (y < TOP_ZONE || atEnd || delta < -SCROLL_THRESHOLD) setHiddenFor(null);
      else if (delta > SCROLL_THRESHOLD) setHiddenFor(key);
      // Small moves add up until they pass the threshold.
      else return;
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [key, enabled]);

  return enabled && hiddenFor === key;
}
