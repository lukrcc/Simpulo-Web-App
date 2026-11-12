"use client";

// Explore's quick search lives in the header (SiteHeader renders the slot, ExploreFeed portals its controls into it – the same filter state as
// the page). One element, outside React.
import { useSyncExternalStore } from "react";

let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function setHeaderSlot(element: HTMLElement | null) {
  if (element === slot) return;
  slot = element;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The header's quick-search slot on Explore (null elsewhere and on the server). */
export function useHeaderSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribe, () => slot, () => null);
}
