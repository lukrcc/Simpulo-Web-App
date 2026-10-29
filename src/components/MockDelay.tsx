"use client";

import { useEffect, useState, type ReactNode } from "react";

interface MockDelayProps {
  /** How long the fallback stays up after mount – simulates a network round trip with mock data. */
  ms?: number;
  fallback: ReactNode;
  children: ReactNode;
}

/** Set after the first page load has hydrated – later mounts are in-app navigations. */
let initialLoadDone = false;

/**
 * Simulates a network round trip with mock data: on in-app navigations it shows `fallback` for `ms`, then
 * `children` for good (re-renders never bring the fallback back). The first page load renders `children` right away
 * – on the server too, so crawlers and the first paint get the real content; server render and hydration match.
 * Remove once real data loads.
 */
export function MockDelay({ ms = 400, fallback, children }: MockDelayProps) {
  const [waiting, setWaiting] = useState(() => initialLoadDone);

  useEffect(() => {
    initialLoadDone = true;
    if (!waiting) return;
    const timer = window.setTimeout(() => setWaiting(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms, waiting]);

  return waiting ? fallback : children;
}
