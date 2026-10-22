"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** iPhone, iPad (incl. iPadOS reporting as Mac with touch) and Mac – where facetime: links work. */
function detect(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua);
}

/** false on the server and during hydration, then the real value. */
export function useIsAppleDevice(): boolean {
  return useSyncExternalStore(noSubscribe, detect, () => false);
}
