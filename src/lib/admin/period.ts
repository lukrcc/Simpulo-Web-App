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

// ── The day inside a week (Woche → Mo … So · Ganze Woche) ─────────────────────────────────────────────────────────────────────────

const DAY_KEY = "simpulo:admin:period-day";
const dayListeners = new Set<() => void>();

function readDay(): number | null {
  try {
    const value = localStorage.getItem(DAY_KEY);
    const n = value === null ? NaN : Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
  } catch {
    return null;
  }
}

function subscribeDay(listener: () => void) {
  dayListeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === DAY_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    dayListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The day chosen inside "Woche" (0 = Monday … 6 = Sunday; null = the whole week, the default) – remembered like the period. Only meant while
 * the period is "Woche" (CLAUDE.md "Zeitraum mit Tagen").
 */
export function useAdminDay(): [number | null, (day: number | null) => void] {
  const day = useSyncExternalStore(subscribeDay, readDay, () => null);
  const set = useCallback((next: number | null) => {
    try {
      if (next === null) localStorage.removeItem(DAY_KEY);
      else localStorage.setItem(DAY_KEY, String(next));
    } catch {
      // not remembered – the choice still applies until the page is left
    }
    for (const listener of dayListeners) listener();
  }, []);
  return [day, set];
}

const DAY_MS = 86_400_000;
/** The Monday of the week that holds `date` (YYYY-MM-DD). */
export function mondayOf(date: string): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return new Date(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
}
/** The date of weekday `day` (0 = Monday) in the week that holds `date`. */
export function dayOfWeek(date: string, day: number): string {
  return new Date(Date.parse(`${mondayOf(date)}T00:00:00Z`) + day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The focus every period page computes with: null for the running period, or – "Woche" with a day chosen (not in the future) – that day,
 * compared with the same weekday a week before (lib/admin/metrics.ts rangesFor "day").
 */
export function useAdminFocus(today: string): { level: "day"; from: string } | null {
  const [period] = useAdminPeriod();
  const [day] = useAdminDay();
  if (period !== "week" || day === null) return null;
  const date = dayOfWeek(today, day);
  return date <= today ? { level: "day", from: date } : null;
}

