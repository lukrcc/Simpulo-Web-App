// What we believe and want to prove (Admin › Data & Algorithm). The statement, how it's measured and the target live here; the current value
// and the verdict come from the data (getHypothesisResults in lib/data – mock values now).

export type HypothesisStatus = "open" | "supported" | "rejected";

export interface Hypothesis {
  id: string;
  statement: string;
  /** What is measured */
  metric: string;
  /** The value that would support it */
  target: string;
}

export const HYPOTHESES: readonly Hypothesis[] = [
  { id: "topicsFirst", statement: "Fitness, Founder and Creator Houses fill first", metric: "Median days to full: these three vs. all others", target: "≥ 30 % faster" },
  { id: "proFaster", statement: "Pro hosts fill Houses faster", metric: "Median days to full: pro vs. share hosts", target: "≥ 20 % faster" },
  { id: "reservedFill", statement: "Houses with 2+ reservations become full", metric: "Share of Houses with 2+ reservations that fill", target: "≥ 80 %" },
  { id: "peopleRebook", statement: "Mutual \"Your people\" leads to more rebookings", metric: "Rebooking rate with vs. without a mutual connection", target: "≥ 1.5×" },
  { id: "shortTrips", statement: "Short trips fill faster than month-long Houses", metric: "Median days to full: ≤ 5 nights vs. 28+ nights", target: "≥ 25 % faster" },
  { id: "tiktokConverts", statement: "TikTok sign-ups turn into requests more often than Instagram", metric: "Request rate within 60 days, per source", target: "≥ 1.2×" },
];
