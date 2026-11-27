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

// The page's own views in the middle of the bar (CLAUDE.md "Kopfleiste als Seitenwerkzeug"): every page but Explore and the admin – Your houses,
// Messages, Profile … portal their HeaderViews into it. One element, outside React, like the Explore slot.
let pageSlot: HTMLElement | null = null;
const pageListeners = new Set<() => void>();

export function setPageSlot(element: HTMLElement | null) {
  if (element === pageSlot) return;
  pageSlot = element;
  for (const listener of pageListeners) listener();
}

function subscribePage(listener: () => void) {
  pageListeners.add(listener);
  return () => pageListeners.delete(listener);
}

/** The bar's middle for a page's views (null on Explore, in the admin and on the server). */
export function usePageSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribePage, () => pageSlot, () => null);
}
