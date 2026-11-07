"use client";

import { getCurrentUser, useStore } from "./store";
import type { Currency } from "./types";

/**
 * The viewer's currency: their profile setting, else € – everywhere, server and browser alike (not the browser's locale: an en-GB
 * browser used to show £, en-US $).
 */
export function usePreferredCurrency(): Currency {
  const me = getCurrentUser(useStore());
  return me?.preferredCurrency ?? "EUR";
}
