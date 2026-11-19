"use client";

import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_COLOR, THEME_COOKIE, type ResolvedTheme, type ThemePref } from "./themeScript";

export { THEME_PREFS, type ResolvedTheme, type ThemePref } from "./themeScript";

/** Light and dark mode on the client: the device's choice, applying it, following the system (lib/themeScript.ts says the rest). */
/** A year – the device keeps the choice until it's changed. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(): ThemePref {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(light|dark|system)`));
    return (match?.[1] as ThemePref | undefined) ?? "system";
  } catch {
    return "system";
  }
}

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** The resolved mode for a choice: "system" asks the device. */
export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref !== "system") return pref;
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Applies a choice on this device: the cookie (so the next first paint is right), data-theme on <html>, the theme-color metas. "system" keeps
 * the metas' own media queries (one per mode, from app/layout.tsx viewport) – the browser picks.
 */
export function applyThemePref(pref: ThemePref) {
  try {
    document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch {
    // Cookies blocked: the choice still holds for this page.
  }
  syncDocument(pref);
  emit();
}

function syncDocument(pref: ThemePref) {
  const html = document.documentElement;
  const resolved = resolveTheme(pref);
  html.setAttribute("data-theme", resolved);
  html.setAttribute("data-theme-pref", pref);
  for (const meta of Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))) {
    // "system": each meta has its media query and its own colour back; a fixed choice: both say the chosen mode's colour.
    const media = meta.getAttribute("media") ?? "";
    meta.setAttribute("content", pref === "system" ? THEME_COLOR[media.includes("dark") ? "dark" : "light"] : THEME_COLOR[resolved]);
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // "system" follows the device when it switches (sunset, Control Center).
  const media = window.matchMedia(DARK_QUERY);
  const onMedia = () => {
    if (readCookie() === "system") syncDocument("system");
    onChange();
  };
  media.addEventListener("change", onMedia);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onMedia);
  };
}

/** This device's choice (the cookie). On the server and while hydrating: "system" (CLAUDE.md "Hydration"). */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readCookie, () => "system");
}

/** The mode in effect right now. On the server and while hydrating: "light". */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/** The device's cookie, read without a hook (the account sync). */
export const themeCookiePref = readCookie;

/** After hydration (ThemeSync): the document as the cookie says – also the theme-color metas, which may come after the head script. */
export function syncThemeDocument() {
  syncDocument(readCookie());
}
