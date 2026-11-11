"use client";

// The header's theme, a test: "light" (the default) or "dark" – data-header on <html>, chosen in the Dev menu, kept in this browser. All
// colours come from CSS variables (globals.css, --hdr-*); nothing here but the switch.
import { useSyncExternalStore } from "react";

export type HeaderTheme = "light" | "dark";
export const HEADER_THEME_KEY = "simpulo:header";

/** For the inline script in app/layout.tsx: sets the attribute before the first paint, so the header never flashes the other theme. */
export const HEADER_THEME_SCRIPT = `try{var h=localStorage.getItem(${JSON.stringify(HEADER_THEME_KEY)});document.documentElement.setAttribute("data-header",h==="dark"?"dark":"light")}catch(e){document.documentElement.setAttribute("data-header","light")}`;

export function setHeaderTheme(theme: HeaderTheme) {
  try {
    localStorage.setItem(HEADER_THEME_KEY, theme);
  } catch {
    // storage blocked: this page only
  }
  document.documentElement.setAttribute("data-header", theme);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-header"] });
  return () => observer.disconnect();
}

/** The header's theme right now (light on the server). */
export function useHeaderTheme(): HeaderTheme {
  return useSyncExternalStore(subscribe, () => (document.documentElement.dataset.header === "dark" ? "dark" : "light"), () => "light");
}
