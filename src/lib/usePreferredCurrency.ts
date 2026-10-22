"use client";

import { useSyncExternalStore } from "react";
import { getCurrentUser, useStore } from "./store";
import type { Currency } from "./types";
import { currencyForLocale } from "./utils";

const noSubscribe = () => () => {};

/**
 * The viewer's currency for approximate conversions: their profile setting, else their browser locale.
 * null on the server and during hydration (no "≈" line in the static HTML).
 */
export function usePreferredCurrency(): Currency | null {
  const me = getCurrentUser(useStore());
  const browser = useSyncExternalStore(noSubscribe, () => currencyForLocale(navigator.language), () => null);
  return me?.preferredCurrency ?? browser;
}
