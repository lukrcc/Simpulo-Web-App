"use client";

import { useFormatLocale } from "@/i18n/formatLocale";
import { useTranslations } from "next-intl";
import { useFormat } from "@/i18n/format";
import type { Currency, Stay } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";

type PricedStay = Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency"> & Partial<Pick<Stay, "hostFeePerPerson">>;

/** An amount of the House in the viewer's currency (profile, else browser) and number format. */
export function useViewerAmount(): (amount: number, from: Currency) => string {
  const format = useFormat();
  const currency = usePreferredCurrency() ?? "EUR";
  const locale = useFormatLocale();
  return (amount, from) => format.viewerAmount(amount, from, currency, locale);
}

/** A card's price as parts (CLAUDE.md "Preis auf Karten – eine Zahl"): "€560 pp" and whether it is an estimate ("est."), plus the cap. */
export function useViewerPrice(stay: PricedStay & Partial<Pick<Stay, "priceCap">>) {
  const format = useFormat();
  const currency = usePreferredCurrency() ?? "EUR";
  const locale = useFormatLocale();
  return format.viewerPrice(stay, currency, locale);
}

/** One price on a photo card: "€560 pp" and a small grey "est." after it for a variable price. */
export function CardPrice({ stay, className }: { stay: PricedStay & Partial<Pick<Stay, "priceCap">>; className?: string }) {
  const t = useTranslations("common");
  const price = useViewerPrice(stay);
  return (
    <p className={className}>
      {price.label}
      {price.estimated && <span className="ml-1 text-small font-medium opacity-70">{t("estimated")}</span>}
    </p>
  );
}

export function useViewerPriceLabel(stay: PricedStay): string {
  const format = useFormat();
  const currency = usePreferredCurrency() ?? "EUR";
  const locale = useFormatLocale();
  return format.viewerPriceLabel(stay, currency, locale);
}