"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { useFormat } from "@/i18n/format";
import { convertApprox } from "@/lib/rates";
import type { Stay } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, stayPrice } from "@/lib/utils";

interface PriceLineProps {
  stay: PricedStay;
  size?: "sm" | "lg";
  /** Short form for tight spots like the sticky mobile CTA bar ("€480 pp") */
  compact?: boolean;
  className?: string;
}

type PricedStay = Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency"> & Partial<Pick<Stay, "hostFeePerPerson">>;

/**
 * The House's price or budget in the viewer's currency ("$430–650"), rounded – or null when there's nothing to
 * convert (no price yet, same currency, or not known yet during hydration). Hosts and guests never convert.
 */
export function useApproxAmount(stay: PricedStay): string | null {
  const format = useFormat();
  const preferred = usePreferredCurrency();
  const price = stayPrice(stay);
  if (preferred === null || preferred === stay.currency || price.kind === "tbd") return null;
  return price.kind === "price"
    ? format.approx(convertApprox(price.amount, stay.currency, preferred), preferred)
    : format.approxRange(convertApprox(price.min, stay.currency, preferred), convertApprox(price.max, stay.currency, preferred), preferred);
}

const noSubscribe = () => () => {};

/**
 * A card's price line, in the viewer's currency and number format only: "€450 pp", "€400–550 pp" or "Price set with
 * crew". EUR and "en" on the server and during hydration, so the static HTML is one currency too.
 */
export function useViewerPriceLabel(stay: PricedStay): string {
  const format = useFormat();
  const currency = usePreferredCurrency() ?? "EUR";
  const locale = useSyncExternalStore(noSubscribe, () => navigator.language, () => "en");
  return format.viewerPriceLabel(stay, currency, locale);
}

/**
 * Fixed price (once locked), rough budget, or "Budget TBD" – one all-in number per person.
 * The fee breakdown only appears later, in the payment step.
 */
export function PriceLine({ stay, size = "sm", compact = false, className }: PriceLineProps) {
  const t = useTranslations("common");
  const tPremium = useTranslations("growth.premium");
  const format = useFormat();
  const price = stayPrice(stay);
  // Only a hint for the viewer – the House is priced and charged in its own currency.
  const approx = useApproxAmount(stay);

  // A host fee is always shown apart from the stay, as its own line: "Host experience · €60".
  const hostFee = stay.hostFeePerPerson ? format.price(stay.hostFeePerPerson, stay.currency) : null;

  if (compact) {
    return (
      <div className={className}>
        <p className={cn("font-semibold", price.kind === "tbd" ? "text-muted" : "text-ink")}>{format.priceLabel(stay)}</p>
        {hostFee && <p className="text-small text-muted">{tPremium("compactProgramme", { amount: hostFee })}</p>}
      </div>
    );
  }

  const amount =
    price.kind === "price"
      ? t("ui.priceLine.perPerson", { price: format.price(price.amount, stay.currency) })
      : price.kind === "budget"
        ? t("ui.priceLine.budgetPerPerson", { range: format.priceRange(price.min, price.max, stay.currency) })
        : t("budgetTbd");

  return (
    <div className={className}>
      <p className={cn("font-semibold", size === "lg" ? "text-h3" : "text-body", price.kind === "tbd" ? "text-muted" : "text-ink")}>
        {amount}
      </p>
      {hostFee && (
        <p className={cn("mt-1 text-ink", size === "lg" ? "text-body" : "text-body")}>
          {tPremium("programme")} <span className="text-muted/60">·</span> <span className="font-medium tabular-nums">{hostFee}</span>
          <span className="text-muted"> {tPremium("perPerson")}</span>
        </p>
      )}
      {approx && <p className="mt-0.5 text-small text-muted">{t("ui.priceLine.approx", { amount: approx, currency: stay.currency })}</p>}
      <p className="mt-0.5 text-small text-muted">{t("ui.priceLine.note")}</p>
    </div>
  );
}
