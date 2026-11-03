"use client";

import { useSyncExternalStore } from "react";

/** The split breakpoint (globals.css) – where Houses and Messages switch to master–detail. */
const query = "(min-width: 1100px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** false on the server and during hydration, then the real value. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
