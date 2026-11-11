"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { currencyForRegion, deviceCurrency, readManualCurrency, readViewerCountry } from "@/lib/currency";
import { getCurrentUser, useStore } from "@/lib/store";
import { currencyLabel, useSetViewerCurrency } from "./CurrencyPicker";

const SHOWN_KEY = "simpulo:currency-hint";
/** After hydration and the first paint: the hint never competes with the page arriving. */
const DELAY_MS = 1500;

/**
 * Once ever: the server's country and the device (time zone, else a language tag with a country) point at different currencies – e.g. a
 * German phone in New York. Prices follow the country; the toast offers the device's with one click ("Prices in $ USD · Switch to € EUR").
 * Not with an own pick or a profile currency. A deliberate exception to "toasts only answer your own action": it is about the prices you see.
 */
export function CurrencyHint() {
  const t = useTranslations("common.ui.currency");
  const showToast = useToast();
  const pick = useSetViewerCurrency();
  const me = getCurrentUser(useStore());
  const latest = useRef({ me, pick, showToast, t });
  useEffect(() => {
    latest.current = { me, pick, showToast, t };
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      const { me, pick, showToast, t } = latest.current;
      if (me?.preferredCurrency || readManualCurrency()) return;
      const fromCountry = currencyForRegion(readViewerCountry());
      const fromDevice = deviceCurrency();
      if (!fromCountry || !fromDevice || fromCountry === fromDevice) return;
      try {
        if (localStorage.getItem(SHOWN_KEY)) return;
        localStorage.setItem(SHOWN_KEY, "1");
      } catch {
        return; // nowhere to remember it – better never than every visit
      }
      showToast(t("hint", { current: currencyLabel(fromCountry) }), "done", undefined, {
        ms: 8000,
        action: { label: t("hintSwitch", { other: currencyLabel(fromDevice) }), onClick: () => pick(fromDevice) },
      });
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
