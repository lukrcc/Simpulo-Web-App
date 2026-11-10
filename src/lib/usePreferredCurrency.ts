"use client";

import { useSyncExternalStore } from "react";
import { subscribeViewerCurrency, viewerCurrencySnapshot } from "./currency";
import { getCurrentUser, useStore } from "./store";
import type { Currency } from "./types";

/**
 * The viewer's currency: their profile setting; else what they picked in this browser (the footer, Settings); on a first visit what the
 * browser's locale suggests (saved then). EUR on the server and during hydration, so the static HTML is one currency.
 */
export function usePreferredCurrency(): Currency {
  const me = getCurrentUser(useStore());
  const local = useSyncExternalStore(subscribeViewerCurrency, viewerCurrencySnapshot, () => "EUR" as Currency);
  return me?.preferredCurrency ?? local;
}
