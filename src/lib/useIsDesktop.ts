"use client";

import { useSyncExternalStore } from "react";
import { MEDIA } from "@/config/breakpoints";

/** Desktop (≥ 1100px, config/breakpoints.ts = split in globals.css) – where Houses and Messages switch to master–detail. */
const query = MEDIA.desktop;

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** false on the server and during hydration, then the real value. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
