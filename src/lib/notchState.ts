"use client";

import { useSyncExternalStore } from "react";
import { BAND_HEIGHT } from "./appMode";

/*
 * The header's tab, three stages: "nav" (as deep as the nav needs), "filters" (grown to the content's width, with Explore's chip row
 * in it) and "panel" (the whole filter panel, up to 80vh). The chip row is automatic while Open Houses is behind the header, and by hand through its handle. The page that has filters
 * registers here (ExploreFilterBar), the header draws them (SiteHeader, useNotchShape). The same logic is meant for the
 * later mobile view.
 */

export type NotchMode = "nav" | "filters" | "panel";

/** The header's height at the tab, open: everything that scrolls to just under it. */
export const NOTCH_OPEN_TOTAL = 132 + BAND_HEIGHT;

interface NotchSnapshot {
  mode: NotchMode;
  source: "auto" | "manual";
  /** The page offers the handle (Explore; Collections only opens by itself) */
  handle: boolean;
  /** Where a page's filters go */
  slot: HTMLElement | null;
  /** Where the whole filter panel goes */
  panelSlot: HTMLElement | null;
  /** The chip row's right corner: "All filters" as a block filling it */
  cornerSlot: HTMLElement | null;
  /** The chip row is what lies under the panel (it's open by itself or by hand) */
  chips: boolean;
  /** Open Houses is behind the header: the chip row needs no scrim */
  auto: boolean;
}

let auto = false;
/** By hand, over what auto says. Cleared whenever auto changes. */
let manual: "open" | "closed" | null = null;
let handle = false;
let slot: HTMLElement | null = null;
let panelSlot: HTMLElement | null = null;
let cornerSlot: HTMLElement | null = null;
let panel = false;
/** The page's way of saying "from here on this counts as being in the section". */
let adopt: (() => void) | null = null;

const SERVER_SNAPSHOT: NotchSnapshot = { mode: "nav", source: "auto", handle: false, slot: null, panelSlot: null, cornerSlot: null, chips: false, auto: false };
let snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit() {
  const open = manual ? manual === "open" : auto;
  snapshot = { mode: panel ? "panel" : open ? "filters" : "nav", source: manual || panel ? "manual" : "auto", handle, slot, panelSlot, cornerSlot, chips: open, auto };
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
  panel = false;
  manual = auto ? (open ? null : "closed") : open ? "open" : null;
  emit();
}

export function setNotchSlot(element: HTMLElement | null) {
  slot = element;
  emit();
}

export function setNotchPanelSlot(element: HTMLElement | null) {
  panelSlot = element;
  emit();
}

export function setNotchCornerSlot(element: HTMLElement | null) {
  cornerSlot = element;
  emit();
}

/** "All filters" as a block in the chip row's right corner: this wide (its straight part), flush with the tab's top, right and bottom. */
export const NOTCH_CORNER_W = 160;
/** The chip row's content lies this far inside the container's edges. */
export const NOTCH_SLOT_INSET = 20;
/** The row's last element ("Soonest first") keeps this far from the block's curve. */
export const NOTCH_CORNER_GAP = 16;

/** The handle's three stops: 0 nav · 1 chips · 2 the whole panel. */
export function setNotchStage(stage: 0 | 1 | 2) {
  if (stage === 2) {
    panel = true;
    emit();
  } else setNotchOpen(stage === 1);
}

/** Escape, a click beside it, its ✕: back to what was there, unless that was a chip row opened by hand only for this. */
export function closeNotchPanel() {
  panel = false;
  if (manual === "open") manual = null;
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
    panel = false;
    emit();
  };
}

/** A filter was picked while the tab is open by hand: the page scrolls to the grid, and the tab goes over to auto. */
export function adoptNotchToAuto() {
  if (manual === "open") adopt?.();
}
