"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { listItemStyles } from "@/components/ui/listSelection";
import { CURRENCY_CODES, currencyName, currencySymbol, isCurrency, setViewerCurrency, type CurrencyCode } from "@/lib/currency";
import { getCurrentUser, useStore } from "@/lib/store";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn } from "@/lib/utils";

/** "€ EUR" – how a currency is named wherever it can be changed; "SAR" alone where the sign is the code. */
export const currencyLabel = (code: CurrencyCode) => {
  const symbol = currencySymbol(code);
  return symbol === code ? code : `${symbol} ${code}`;
};

/**
 * Picking a currency, from anywhere (footer, filters, booking card, first-visit hint): saved in this browser as the viewer's own pick;
 * logged in also in the profile, so it holds on every device.
 */
export function useSetViewerCurrency() {
  const store = useStore();
  const me = getCurrentUser(store);
  return useCallback(
    (code: CurrencyCode) => {
      setViewerCurrency(code);
      if (me && me.preferredCurrency !== code) store.updateCurrentUser({ preferredCurrency: code });
    },
    [me, store],
  );
}

/**
 * The viewer's currency as a small text select ("€ EUR ⌄"): the footer (muted), beside "Price per person" in the filters (`tone="ink"`).
 * Prices everywhere follow it (≈ when it differs from the House's).
 */
export function CurrencyPicker({ tone = "muted", className }: { tone?: "muted" | "ink"; className?: string }) {
  const t = useTranslations("footer");
  const current = usePreferredCurrency();
  const pick = useSetViewerCurrency();
  return (
    <label
      className={cn(
        "relative inline-flex items-center text-small transition-colors",
        tone === "ink" ? "text-ink hover:text-ink/70" : "text-muted hover:text-ink",
        className,
      )}
    >
      <span className="sr-only">{t("currency")}</span>
      <select
        value={current}
        onChange={(e) => {
          if (isCurrency(e.target.value)) pick(e.target.value);
        }}
        className="min-h-11 cursor-pointer appearance-none bg-transparent pr-4 md:min-h-0"
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {currencyLabel(code)}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-0 size-3" />
    </label>
  );
}

/** The choice as a sheet (booking card "Change"): every currency, the current one marked; a pick closes it. */
export function CurrencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("common.ui.currency");
  const current = usePreferredCurrency();
  const pick = useSetViewerCurrency();
  return (
    <Sheet open={open} onClose={onClose} title={t("sheetTitle")} subtitle={t("sheetSubtitle")}>
      <ul className="-mx-2 flex flex-col gap-0.5">
        {CURRENCY_CODES.map((code) => {
          const selected = code === current;
          return (
            <li key={code}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  pick(code);
                  onClose();
                }}
                className={listItemStyles(selected, "flex w-full items-center gap-3 px-4 py-2.5 text-left")}
              >
                <span className="w-14 shrink-0 text-body font-semibold text-ink">{currencyLabel(code)}</span>
                <span className="min-w-0 flex-1 truncate text-body text-muted">{currencyName(code)}</span>
                {selected && <Check aria-hidden className="size-4 shrink-0 text-ink" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
