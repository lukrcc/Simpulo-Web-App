"use client";

import { useEffect, useState, type ReactNode } from "react";

interface MockDelayProps {
  /** How long the fallback stays up after mount – simulates a network round trip with mock data. */
  ms?: number;
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Shows `fallback` for `ms` after the first mount, then `children` for good (re-renders never bring the fallback back).
 * Server render and hydration both start on the fallback, so there's no mismatch. Remove once real data loads.
 */
export function MockDelay({ ms = 400, fallback, children }: MockDelayProps) {
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setWaiting(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);

  return waiting ? fallback : children;
}
