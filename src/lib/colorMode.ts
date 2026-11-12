"use client";

// The colour mode, for comparing (Dev menu only – no switch for users, no prefers-color-scheme): "hybrid" (the default: dark stages, light
// floor), "light" (stages light too, Ember tiles stay dark) or "dark" (dark floor). data-mode on <html>; every colour follows from the tokens
// (src/styles/tokens.css). The header is graphite in all three.
import { useSyncExternalStore } from "react";

export type ColorMode = "hybrid" | "light" | "dark";
export const COLOR_MODES: readonly ColorMode[] = ["hybrid", "light", "dark"];
export const COLOR_MODE_KEY = "simpulo:mode";

/** For the inline script in app/layout.tsx: sets the attribute before the first paint, so a page never flashes the other mode. */
export const COLOR_MODE_SCRIPT = `try{var m=localStorage.getItem(${JSON.stringify(COLOR_MODE_KEY)});document.documentElement.setAttribute("data-mode",m==="light"||m==="dark"?m:"hybrid")}catch(e){document.documentElement.setAttribute("data-mode","hybrid")}`;

export function setColorMode(mode: ColorMode) {
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode);
  } catch {
    // storage blocked: this page only
  }
  document.documentElement.setAttribute("data-mode", mode);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
  return () => observer.disconnect();
}

const read = (): ColorMode => {
  const mode = document.documentElement.dataset.mode;
  return mode === "light" || mode === "dark" ? mode : "hybrid";
};

/** The mode right now (hybrid on the server). */
export function useColorMode(): ColorMode {
  return useSyncExternalStore(subscribe, read, () => "hybrid");
}
