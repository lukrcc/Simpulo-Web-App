"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SortKey } from "@/lib/exploreFilters";

export interface ChipOption {
  value: string;
  label: string;
}

/** What Explore hands the site header: the category chips and the Sort / Filters shortcuts (the state itself is in the URL – useExploreFilters). */
export interface ExploreControls {
  /** The row's chips, in order (the last one is the changing slot) */
  chips: ReadonlyArray<ChipOption>;
  /** Everything else, for the More popover */
  more: ReadonlyArray<ChipOption>;
  labels: { row: string; all: string; more: string };
  /** A category, or null for All */
  onSelect: (vibe: string | null) => void;
  /** The sort shortcut – null while the feed is too small to need one */
  sort: { options: ReadonlyArray<{ value: SortKey; label: string }>; onChange: (sort: SortKey) => void } | null;
  /** The Filters button: active filters, whether the panel is open, and opening it */
  filters: { count: number; open: boolean; onOpen: () => void };
}

interface Registered {
  /** The data, serialised – the header re-renders when it changes */
  key: string;
  /** Always the latest controls (callbacks included) */
  get: () => ExploreControls;
}

const ExploreControlsContext = createContext<{ registered: Registered | null; register: (next: Registered | null) => void }>({
  registered: null,
  register: () => {},
});

/** Around the app: Explore registers its controls here, the site header renders them. */
export function ExploreControlsProvider({ children }: { children: ReactNode }) {
  const [registered, setRegistered] = useState<Registered | null>(null);
  const register = useCallback((next: Registered | null) => {
    setRegistered((current) => (current?.key === next?.key && current?.get === next?.get ? current : next));
  }, []);
  return <ExploreControlsContext value={{ registered, register }}>{children}</ExploreControlsContext>;
}

/** The header's side: Explore's controls, or null away from Explore (and before it has mounted). */
export function useExploreControls(): ExploreControls | null {
  const { registered } = useContext(ExploreControlsContext);
  return registered?.get() ?? null;
}

/**
 * Explore's side: publishes its controls (null withdraws them). The callbacks are read live through a ref, so the
 * header never calls a stale one; the header re-renders only when the data (`key`) changes.
 */
export function useRegisterExploreControls(controls: ExploreControls | null) {
  const { register } = useContext(ExploreControlsContext);
  const latest = useRef(controls);
  useEffect(() => {
    latest.current = controls;
  });
  const has = controls !== null;
  const key = controls ? JSON.stringify([controls.chips, controls.more, controls.labels, controls.sort?.options ?? null, controls.filters.count, controls.filters.open]) : "";
  const get = useCallback(() => latest.current!, []);
  useEffect(() => {
    register(has ? { key, get } : null);
  }, [has, key, get, register]);
  useEffect(() => () => register(null), [register]);
}
