"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "@/i18n/format";
import { convertApprox } from "@/lib/mock-extras";
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

type PricedStay = Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency">;

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

/**
 * Fixed price (once locked), rough budget, or "Budget TBD" – one all-in number per person.
 * The fee breakdown only appears later, in the payment step.
 */
export function PriceLine({ stay, size = "sm", compact = false, className }: PriceLineProps) {
  const t = useTranslations("common");
  const format = useFormat();
  const price = stayPrice(stay);
  // Only a hint for the viewer – the House is priced and charged in its own currency.
  const approx = useApproxAmount(stay);

  if (compact) {
    return (
      <p className={cn("font-semibold", price.kind === "tbd" ? "text-neutral-500" : "text-ink", className)}>
        {format.priceLabel(stay)}
      </p>
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
      <p className={cn("font-semibold", size === "lg" ? "text-2xl" : "text-base", price.kind === "tbd" ? "text-neutral-500" : "text-ink")}>
        {amount}
      </p>
      {approx && <p className="mt-0.5 text-[13px] text-zinc-500">{t("ui.priceLine.approx", { amount: approx, currency: stay.currency })}</p>}
      <p className="mt-0.5 text-[13px] text-zinc-500">{t("ui.priceLine.note")}</p>
    </div>
  );
}
