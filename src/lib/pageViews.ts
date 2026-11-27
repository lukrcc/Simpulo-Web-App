"use client";

// The view chosen in the bar's middle, per tab, for the session (CLAUDE.md "Kopfleiste als Seitenwerkzeug"): sessionStorage (try/catch), read
// after hydration – the first render is the default (Hydration rule).
import { useCallback, useSyncExternalStore } from "react";

const KEY = "simpulo:page-views";
const listeners = new Set<() => void>();
let cache: Record<string, string> | null = null;

function read(): Record<string, string> {
  if (cache) return cache;
  try {
    cache = JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Record<string, string>;
  } catch {
    cache = {};
  }
  return cache;
}

function write(tab: string, view: string) {
  cache = { ...read(), [tab]: view };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // not kept – still switched for now
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The tab's chosen view (one of `allowed`, else the fallback) and its setter. */
export function usePageView<T extends string>(tab: string, allowed: readonly T[], fallback: T): [T, (view: T) => void] {
  const stored = useSyncExternalStore(subscribe, () => read()[tab] ?? null, () => null);
  const view = stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
  const set = useCallback((next: T) => write(tab, next), [tab]);
  return [view, set];
}
