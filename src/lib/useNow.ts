"use client";

import { useSyncExternalStore } from "react";

// One shared browser clock for relative times and countdowns ("2h ago", "Expires in 31h"). The snapshot is a cached value that only
// changes on the minute tick – reading Date.now() in getSnapshot would give React a new value on every call (an infinite-loop warning).
const MINUTE_MS = 60_000;
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;

const roundedNow = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  timer ??= setInterval(() => {
    now = roundedNow();
    for (const listener of listeners) listener();
  }, MINUTE_MS);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function snapshot() {
  if (now === 0) now = roundedNow();
  return now;
}

/** Now, to the minute, in the browser; null on the server (no server clock reads). Updates every minute. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
