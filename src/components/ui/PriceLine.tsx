import type { Stay } from "@/lib/types";
import { cn, formatBudget, formatPrice, stayPrice, stayPriceLabel } from "@/lib/utils";

interface PriceLineProps {
  stay: Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency">;
  size?: "sm" | "lg";
  /** Short form for tight spots like the sticky mobile CTA bar ("€480 pp") */
  compact?: boolean;
  className?: string;
}

/** Fixed price (once locked), rough budget, or "Budget TBD" – with the Simpulo fee note where it applies. */
export function PriceLine({ stay, size = "sm", compact = false, className }: PriceLineProps) {
  const price = stayPrice(stay);

  if (compact) {
    return (
      <div className={className}>
        <p className={cn("font-semibold", price.kind === "tbd" ? "text-neutral-500" : "text-ink")}>{stayPriceLabel(stay)}</p>
        <p className="text-xs text-neutral-500">
          {price.kind === "price" && `incl. ${formatPrice(price.fee, stay.currency)} Simpulo fee`}
          {price.kind === "budget" && "Rough budget"}
          {price.kind === "tbd" && "Ask the host"}
        </p>
      </div>
    );
  }

  const big = size === "lg" ? "text-2xl" : "text-base";
  const unit = cn("font-normal text-neutral-500", size === "lg" ? "text-base" : "text-sm");

  return (
    <div className={className}>
      {price.kind === "price" && (
        <>
          <p className={cn("font-semibold text-ink", big)}>
            {formatPrice(price.amount, stay.currency)} <span className={unit}>per person</span>
          </p>
          <p className="text-xs text-neutral-500">incl. {formatPrice(price.fee, stay.currency)} Simpulo fee</p>
        </>
      )}
      {price.kind === "budget" && (
        <>
          <p className={cn("font-semibold text-ink", big)}>
            <span className={unit}>Budget</span> ~{formatBudget(price.min, price.max, stay.currency)}{" "}
            <span className={unit}>per person</span>
          </p>
          <p className="text-xs text-neutral-500">Final price once the house is locked</p>
        </>
      )}
      {price.kind === "tbd" && <p className={cn("font-semibold text-neutral-500", big)}>Budget TBD – ask the host</p>}
    </div>
  );
}
