// Admin › Market Cap (/admin/market-cap): a rough estimate of what Simpulo is worth – three methods, each "base (last 12 months) ×
// multiple". The multiples are ranges; where in its range a method sits follows monthly revenue growth (below 3 % the lower third, 3–10 %
// the middle, above 10 % the upper) and repeat guests shift it one step (below 15 % down, from 30 % up). Rough orientation, no appraisal –
// set and adjust here (founders). Computed in lib/admin/metrics.ts marketCap.

export type ValuationMethod = "profit" | "revenue" | "bookingVolume";
export const VALUATION_METHODS: readonly ValuationMethod[] = ["profit", "revenue", "bookingVolume"];

/** The full multiple range per method (× the base of the last 12 months). */
export const VALUATION_MULTIPLES: Record<ValuationMethod, { min: number; max: number }> = {
  profit: { min: 2, max: 5 },
  revenue: { min: 3, max: 10 },
  bookingVolume: { min: 0.5, max: 2 },
};

/** Monthly revenue growth (percent per month, average of the last 6 full months) → the step in the range: 0 lower, 1 middle, 2 upper third. */
export const GROWTH_STEPS = { middleFrom: 3, upperFrom: 10 } as const;

/** Repeat guests (percent): below `downBelow` one step lower, from `upFrom` one step higher (clamped to the range). */
export const REPEAT_SHIFT = { downBelow: 15, upFrom: 30 } as const;

/** Fewer than this many months of data: the base is the last 3 months × 4 ("hochgerechnet"). */
export const FULL_YEAR_MONTHS = 12;
