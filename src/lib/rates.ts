import type { Currency } from "./types";

/**
 * Static rates, units per 1 EUR. Only for the "≈" hint next to a price – never for what's charged.
 * A real app would fetch daily rates server-side.
 */
export const RATES_PER_EUR: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  AUD: 1.65,
  THB: 38.5,
  IDR: 17500,
};

/** Converts between currencies with these rates. */
export function convertApprox(amount: number, from: Currency, to: Currency): number {
  return (amount / RATES_PER_EUR[from]) * RATES_PER_EUR[to];
}
