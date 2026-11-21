"use client";

// The admin's period (Tag · Woche · Monat · Quartal · Jahr, config/admin.ts COMPARE_PERIODS): the last choice, per browser (localStorage,
// try/catch). Read through useSyncExternalStore – the server and the first render use the default (Woche), the stored choice comes right
// after (CLAUDE.md "Hydration"). TODO(backend): on the admin's account, so it follows to other devices.
import { useCallback, useSyncExternalStore } from "react";
import { COMPARE_PERIODS, DEFAULT_COMPARE, type ComparePeriod } from "@/config/admin";

const KEY = "simpulo:admin:period";
const listeners = new Set<() => void>();

function read(): ComparePeriod {
  try {
    const value = localStorage.getItem(KEY);
    return (COMPARE_PERIODS as readonly string[]).includes(value ?? "") ? (value as ComparePeriod) : DEFAULT_COMPARE;
  } catch {
    return DEFAULT_COMPARE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The chosen period and its setter – the same on every admin page with a period. */
export function useAdminPeriod(): [ComparePeriod, (period: ComparePeriod) => void] {
  const period = useSyncExternalStore(subscribe, read, () => DEFAULT_COMPARE);
  const set = useCallback((next: ComparePeriod) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // not remembered – the choice still applies until the page is left
    }
    for (const listener of listeners) listener();
  }, []);
  return [period, set];
}
