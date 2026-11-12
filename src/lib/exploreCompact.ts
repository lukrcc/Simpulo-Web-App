"use client";

// Explore, scrolled: header and filters become ONE compact bar (components/layout/header/CompactExploreBar). One state for both sides – the
// full header hides while it's on, the bar shows – kept here, outside React, and mirrored on <html data-explore-compact>.
import { useEffect, useSyncExternalStore } from "react";

/** Below this the page is "at the top": always the full header. */
export const COMPACT_FROM_Y = 120;
/** Scrolling up by this much (from the lowest point since) brings the full header back. */
export const EXPAND_ON_UP = 40;

let compact = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === compact) return;
  compact = next;
  if (next) document.documentElement.setAttribute("data-explore-compact", "");
  else document.documentElement.removeAttribute("data-explore-compact");
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Is Explore's compact bar showing (false on the server and everywhere but Explore)? */
export function useExploreCompact(): boolean {
  return useSyncExternalStore(subscribe, () => compact, () => false);
}

/** Back to the full header now – "All filters" from the compact bar opens the panel in the header's tab. */
export function expandExploreHeader() {
  set(false);
}

/**
 * Explore watches the scroll while `enabled` (a passive listener, one read per frame – it never holds the wheel): down past 120px → compact;
 * up by 40px, or above 120px → full. Leaving Explore (or disabling) restores the full header.
 */
export function useExploreCompactWatch(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lastY = window.scrollY;
    // The turning point: the lowest y since the last downward stretch – scrolling up is measured from there.
    let low = lastY;
    let frame = 0;
    const read = () => {
      frame = 0;
      // A sheet or the header's panel locks the page (lockScroll: the body fixed, scrollY 0): nothing moved – wait for it to come back.
      if (document.body.style.position === "fixed") return;
      const y = window.scrollY;
      if (y < COMPACT_FROM_Y) set(false);
      else if (y > lastY) {
        low = y;
        set(true);
      } else if (low - y >= EXPAND_ON_UP) set(false);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      set(false);
    };
  }, [enabled]);
}
