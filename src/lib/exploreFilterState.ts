"use client";

// The one Explore filter state (category, country, month, budget, language, sort) – it lives in the URL. Every filter
// control reads it with useExploreFilters() and writes it with setExploreFilters(): a change pushes a history entry, so
// Back undoes it, and Back / Forward update every control. Server render and hydration: no filters (the URL is read
// right after), so the feed is still prerendered.
import { useSyncExternalStore } from "react";
import { EMPTY_FILTERS, parseFilters, withFilters, type ExploreFilters } from "./exploreFilters";
import { VIBES } from "./catalog";

const KNOWN_VIBES = VIBES.map((v) => v.key);
const listeners = new Set<() => void>();
/** Parsed once per query string, so the snapshot stays the same object between renders. */
let cache: { search: string; filters: ExploreFilters } | null = null;

function snapshot(): ExploreFilters {
  const search = window.location.search;
  if (cache?.search !== search) cache = { search, filters: parseFilters(new URLSearchParams(search), KNOWN_VIBES) };
  return cache.filters;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useExploreFilters(): ExploreFilters {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY_FILTERS);
}

/** Changes to the same filter this close together share one history entry (a budget drag isn't 40 Back steps). */
const COALESCE_MS = 1000;
let lastPush: { key: string; at: number } | null = null;

/**
 * New filters: a history entry with them in the query (other parameters stay), then every reader updates. `key` names
 * what changed – repeated changes of it within a second replace that entry instead of adding one.
 */
export function setExploreFilters(next: ExploreFilters, key = "") {
  const url = new URL(window.location.href);
  const target = url.pathname + withFilters(url.searchParams, next) + url.hash;
  if (target === url.pathname + url.search + url.hash) return;
  const now = Date.now();
  const coalesce = key !== "" && lastPush?.key === key && now - lastPush.at < COALESCE_MS;
  if (coalesce) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);
  lastPush = { key, at: now };
  listeners.forEach((listener) => listener());
}
