"use client";

import { useSyncExternalStore } from "react";
import { serverViewerCurrencySnapshot, subscribeViewerCurrency, viewerCurrencySnapshot } from "./currency";
import { getCurrentUser, useStore } from "./store";
import type { Currency } from "./types";

/**
 * The viewer's currency (order in src/lib/currency.ts): their own pick in this browser > the profile setting (logged in) > the country the
 * server saw > the device's time zone > a language tag with a country > EUR. EUR on the server and during hydration, so the static HTML is
 * one currency.
 */
export function usePreferredCurrency(): Currency {
  const me = getCurrentUser(useStore());
  const { manual, detected } = useSyncExternalStore(subscribeViewerCurrency, viewerCurrencySnapshot, serverViewerCurrencySnapshot);
  return manual ?? me?.preferredCurrency ?? detected;
}
