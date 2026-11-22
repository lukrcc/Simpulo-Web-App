"use client";

// The overviews' detail lines (CLAUDE.md "Überblick je Seitentyp"): a tall window (≥ 820px, e.g. 1440 × 900) has room for all of them, a
// short one (1280 × 720) for fewer – the board stays static without scrolling. Read through useSyncExternalStore; the server and the first
// render assume tall (CLAUDE.md "Hydration"), the real height comes right after.
import { useSyncExternalStore } from "react";

const MIN_TALL = 820;

function subscribe(listener: () => void) {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}

export function useTallScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.innerHeight >= MIN_TALL, () => true);
}
