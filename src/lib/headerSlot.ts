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

// The admin's search (⌘K) lives in the header too: SiteHeader renders this slot on /admin, AdminFrame portals AdminCommandSearch into it –
// inside the admin's German provider.
let adminSlot: HTMLElement | null = null;
const adminListeners = new Set<() => void>();

export function setAdminHeaderSlot(element: HTMLElement | null) {
  if (element === adminSlot) return;
  adminSlot = element;
  for (const listener of adminListeners) listener();
}

function subscribeAdmin(listener: () => void) {
  adminListeners.add(listener);
  return () => adminListeners.delete(listener);
}

/** The header's admin-search slot (null outside /admin and on the server). */
export function useAdminHeaderSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribeAdmin, () => adminSlot, () => null);
}
