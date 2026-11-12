"use client";

// Dev-only switches that aren't feature flags (Dev menu › Scenario / Data & look), kept in this browser (localStorage, try/catch). Outside
// APP_MODE "dev" every reader gets the defaults – nothing here ever changes what users see.
import { useSyncExternalStore } from "react";
import { APP_MODE } from "./appMode";

/** "House role": Auto = the real role (lib/useHouseRole.ts); otherwise /h/[id] shows that role's view. */
export type HouseRoleOverride = "auto" | "visitor" | "member" | "host";
export const HOUSE_ROLE_OVERRIDES: readonly HouseRoleOverride[] = ["auto", "visitor", "member", "host"];

export interface DevSettings {
  houseRole: HouseRoleOverride;
  /** "Simulate installed app": is-standalone on <html>, safe areas 47px / 34px, no install hints (lib/install.ts) */
  installedApp: boolean;
}

const DEFAULTS: DevSettings = { houseRole: "auto", installedApp: false };
export const DEV_SETTINGS_KEY = "simpulo:dev";
const DEV = APP_MODE === "dev";

const listeners = new Set<() => void>();
let current: DevSettings | null = null;

function read(): DevSettings {
  if (current) return current;
  try {
    current = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(DEV_SETTINGS_KEY) ?? "{}") as Partial<DevSettings>) };
  } catch {
    current = DEFAULTS;
  }
  return current;
}

export function subscribeDevSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The installed-app simulation on <html>: is-standalone (like a real install) and sim-standalone (the simulated safe areas). */
function applyInstalledApp(on: boolean) {
  const html = document.documentElement;
  html.classList.toggle("sim-standalone", on);
  if (on) html.classList.add("is-standalone");
  else if (!window.matchMedia("(display-mode: standalone)").matches && (navigator as Navigator & { standalone?: boolean }).standalone !== true) html.classList.remove("is-standalone");
}

export function setDevSetting<K extends keyof DevSettings>(key: K, value: DevSettings[K]) {
  current = { ...read(), [key]: value };
  try {
    localStorage.setItem(DEV_SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // not saved – still switched for this visit
  }
  if (key === "installedApp") applyInstalledApp(value as boolean);
  for (const listener of listeners) listener();
}

/** Outside React: the setting right now (defaults outside dev and on the server). */
export function readDevSetting<K extends keyof DevSettings>(key: K): DevSettings[K] {
  return !DEV || typeof window === "undefined" ? DEFAULTS[key] : read()[key];
}

export function useDevSetting<K extends keyof DevSettings>(key: K): DevSettings[K] {
  return useSyncExternalStore(subscribeDevSettings, () => readDevSetting(key), () => DEFAULTS[key]);
}
