// The admin dashboard's targets and weights (/admin). The numbers are computed in lib/admin/metrics.ts – never in the UI.

/** When Simpulo is ready to launch (admin › Overview, as progress bars). */
export const LAUNCH_CRITERIA = {
  /** Real Houses (not examples), open or booked */
  houses: 50,
  /** Cities with at least `hubMinHouses` real Houses – 2 to 3 hubs */
  hubs: { min: 2, max: 3 },
  hubMinHouses: 5,
  /** Share of real Houses with at least `reservationsMin` reservations */
  reservedShare: 0.6,
  reservationsMin: 2,
  /** Waitlist sign-ups */
  waitlist: 1000,
} as const;

/** The target that decides the move (admin › Overview): full Houses per month. */
export const MOVE_TARGET = { fullHousesPerMonth: 35 } as const;

/**
 * admin › Topics: a score per category from four signals, each scaled 0–100 against the strongest category, then weighted (the weights add up
 * to 1). Reservations count most – people putting their name down is the clearest demand.
 */
export const TOPIC_WEIGHTS = {
  reservations: 0.4,
  applications: 0.25,
  waitlistInterest: 0.25,
  hostFeeShare: 0.1,
} as const;

/** What Simpulo earns in a month (service fees + its share of host fees, EUR): the target the Cockpit's "Money" measures against. */
export const PROFIT_TARGET_PER_MONTH = 5000;

/**
 * The status of every number with a target (good · warning · critical) – read only through getStatus() in lib/admin/metrics.ts. `higher`:
 * at or above `good` is good, at or above `warning` is warning, below is critical; `lower` the other way round (days until full). Numbers
 * without a rule have no status (a quiet dot). Status colours never appear without one of these.
 */
export const STATUS_RULES = {
  fullHousesPerMonth: { better: "higher", good: MOVE_TARGET.fullHousesPerMonth, warning: 20 },
  profitPerMonth: { better: "higher", good: PROFIT_TARGET_PER_MONTH, warning: 2500 },
  realHouses: { better: "higher", good: LAUNCH_CRITERIA.houses, warning: 25 },
  hubs: { better: "higher", good: LAUNCH_CRITERIA.hubs.min, warning: 1 },
  /** In percent */
  reservedShare: { better: "higher", good: LAUNCH_CRITERIA.reservedShare * 100, warning: 40 },
  waitlist: { better: "higher", good: LAUNCH_CRITERIA.waitlist, warning: 500 },
  /** Open applications pile up: few is good */
  openApplications: { better: "lower", good: 10, warning: 25 },
  /** In percent: pairs who both confirmed "Lived with" */
  mutualShare: { better: "higher", good: 50, warning: 30 },
  /** In percent: guests in two or more Houses */
  repeatRate: { better: "higher", good: 25, warning: 15 },
  /** Median days from opening to full */
  daysToFull: { better: "lower", good: 14, warning: 30 },
} as const satisfies Record<string, { better: "higher" | "lower"; good: number; warning: number }>;

export type StatusMetric = keyof typeof STATUS_RULES;

/** "Months in a row above target: X / 6" */
export const STREAK_MONTHS = 6;
