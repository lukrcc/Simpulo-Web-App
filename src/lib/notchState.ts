"use client";

import { useSyncExternalStore } from "react";
import { BAND_HEIGHT } from "./appMode";

/*
 * The header's tab: "nav" (as deep as the nav needs) or "filters" (grown to the content's width, with Explore's filters in
 * it). Automatic while Open Houses is behind the header, and by hand through its handle. The page that has filters
 * registers here (ExploreFilterBar), the header draws them (SiteHeader, useNotchShape). The same logic is meant for the
 * later mobile view.
 */

export type NotchMode = "nav" | "filters";

/** The header's height at the tab, open: everything that scrolls to just under it. */
export const NOTCH_OPEN_TOTAL = 140 + BAND_HEIGHT;

interface NotchSnapshot {
  mode: NotchMode;
  source: "auto" | "manual";
  /** The page offers the handle (Explore; Collections only opens by itself) */
  handle: boolean;
  /** Where a page's filters go */
  slot: HTMLElement | null;
}

let auto = false;
/** By hand, over what auto says. Cleared whenever auto changes. */
let manual: "open" | "closed" | null = null;
let handle = false;
let slot: HTMLElement | null = null;
/** The page's way of saying "from here on this counts as being in the section". */
let adopt: (() => void) | null = null;

const SERVER_SNAPSHOT: NotchSnapshot = { mode: "nav", source: "auto", handle: false, slot: null };
let snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit() {
  const open = manual ? manual === "open" : auto;
  snapshot = { mode: open ? "filters" : "nav", source: manual ? "manual" : "auto", handle, slot };
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useNotchState(): NotchSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}

export function setNotchAuto(next: boolean) {
  if (next === auto) return;
  auto = next;
  manual = null;
  emit();
}

/** The handle, Escape, a click outside. */
export function setNotchOpen(open: boolean) {
  manual = auto ? (open ? null : "closed") : open ? "open" : null;
  emit();
}

export function setNotchSlot(element: HTMLElement | null) {
  slot = element;
  emit();
}

/** A page with filters is showing. Returns how to take it back. */
export function registerNotchFilters(options: { handle: boolean; adopt: () => void }): () => void {
  handle = options.handle;
  adopt = options.adopt;
  emit();
  return () => {
    handle = false;
    adopt = null;
    auto = false;
    manual = null;
    emit();
  };
}

/** A filter was picked while the tab is open by hand: the page scrolls to the grid, and the tab goes over to auto. */
export function adoptNotchToAuto() {
  if (manual === "open") adopt?.();
}
