"use client";

import { useSyncExternalStore } from "react";
import { clockNow } from "./clock";
import { subscribeDevSettings } from "./devSettings";

// One shared browser clock for relative times and countdowns ("2h ago", "Expires in 31h"). The snapshot is a cached value that only
// changes on the minute tick – reading Date.now() in getSnapshot would give React a new value on every call (an infinite-loop warning).
const MINUTE_MS = 60_000;
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;

// The dev menu's clock shift (lib/clock.ts) counts too: countdowns follow the time travel.
const roundedNow = () => Math.floor(clockNow() / MINUTE_MS) * MINUTE_MS;

let unsubDev: (() => void) | undefined;
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  unsubDev ??= subscribeDevSettings(() => {
    now = roundedNow();
    for (const listener of listeners) listener();
  });
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
