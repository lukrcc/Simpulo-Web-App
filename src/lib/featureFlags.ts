"use client";

// Feature flags (mock): defaults below, switchable per browser from the DevSwitcher (localStorage).
import { useSyncExternalStore } from "react";

export interface FeatureFlags {
  /** Pro hosts: the host fee ("Host experience"), what it includes (hostOffer) and the "Pro host" label. Off = none of it exists. */
  hostPremium: boolean;
}

export type FeatureFlag = keyof FeatureFlags;

export const DEFAULT_FLAGS: FeatureFlags = {
  hostPremium: process.env.NEXT_PUBLIC_FLAG_HOST_PREMIUM !== "false",
};

const FLAGS_KEY = "simpulo:flags";
const listeners = new Set<() => void>();
let current: FeatureFlags | null = null;

function read(): FeatureFlags {
  if (current) return current;
  try {
    current = { ...DEFAULT_FLAGS, ...(JSON.parse(localStorage.getItem(FLAGS_KEY) ?? "{}") as Partial<FeatureFlags>) };
  } catch {
    current = DEFAULT_FLAGS;
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFeatureFlag(flag: FeatureFlag, on: boolean) {
  current = { ...read(), [flag]: on };
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify(current));
  } catch {
    // not saved – still switched for this visit
  }
  for (const listener of listeners) listener();
}

/** All flags; the server render (and hydration) uses the defaults. */
export function useFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_FLAGS);
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return useFeatureFlags()[flag];
}
