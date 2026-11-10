"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { CURRENCY_CODES, currencySymbol, isCurrency, setViewerCurrency } from "@/lib/currency";
import { getCurrentUser, useStore } from "@/lib/store";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";

/**
 * The viewer's currency in the footer ("€ EUR"): prices on cards show in it (≈). Saved in this browser; logged in also in the profile
 * (Settings › Preferences shows the same).
 */
export function CurrencyPicker() {
  const t = useTranslations("footer");
  const store = useStore();
  const me = getCurrentUser(store);
  const current = usePreferredCurrency();
  return (
    <label className="relative inline-flex items-center text-small text-muted transition-colors hover:text-ink">
      <span className="sr-only">{t("currency")}</span>
      <select
        value={current}
        onChange={(e) => {
          const code = e.target.value;
          if (!isCurrency(code)) return;
          setViewerCurrency(code);
          if (me) store.updateCurrentUser({ preferredCurrency: code });
        }}
        className="min-h-11 cursor-pointer appearance-none bg-transparent pr-4 md:min-h-0"
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {currencySymbol(code)} {code}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-0 size-3" />
    </label>
  );
}
