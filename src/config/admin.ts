// The admin dashboard's targets and weights (/admin). The numbers are computed in lib/admin/metrics.ts – never in the UI.
import { FEE_MODEL, stayExample } from "@/config/policies";

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

/** What Simpulo earns in a month (service fees + its share of host fees, EUR): the move's target. */
export const PROFIT_TARGET_PER_MONTH = 5000;

/**
 * The target that decides the move (Admin › Cockpit, on the Ember stage): €5,000 profit a month, six completed months in a row. Full Houses
 * per month is the supply number behind it (Cockpit › Supply, and Vision).
 */
export const MOVE_TARGET = { profitPerMonth: PROFIT_TARGET_PER_MONTH, months: 6, fullHousesPerMonth: 35 } as const;

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
  /** EUR kept per full House this month, against the fee model (feeModelPerFullHouse, ≈ 95 €) */
  revenuePerFullHouse: { better: "higher", good: feeModelPerFullHouse(), warning: Math.round(feeModelPerFullHouse() * 0.6) },
  /** Support tickets still new or open (not merged) */
  openTickets: { better: "lower", good: 10, warning: 25 },
  /** An open safety ticket is always critical */
  openSafetyTickets: { better: "lower", good: 0, warning: 0 },
} as const satisfies Record<string, { better: "higher" | "lower"; good: number; warning: number }>;

export type StatusMetric = keyof typeof STATUS_RULES;

/** The host tiers (Admin › Applications and Houses › Hosts; Vision › Hosts). */
export const HOST_TIERS = ["share", "pro", "anchor"] as const;

/**
 * The suggested tier (lib/admin/metrics.ts suggestTier): no host fee = share, with a host fee = pro, from `anchorFromFollowers` followers =
 * anchor. An admin can set it by hand (logged).
 */
export const HOST_TIER_RULES = { anchorFromFollowers: 100_000 } as const;

/** Anchor creators wanted: 1–2 per topic and hub (Cockpit › Supply, "Anchor creators: X of target"). */
export const ANCHOR_TARGET = { perTopicAndHub: { min: 1, max: 2 } } as const;

/**
 * Admin › Houses ("Welche Houses brauchen Hilfe?"): an upcoming House is at risk when one rule holds – it starts in under `deadlineDays`
 * days and is under `minFill` full; no request for `quietDays` days; a request unanswered for longer than `unansweredHours`.
 */
export const HOUSE_RISK = { deadlineDays: 7, minFill: 0.6, quietDays: 7, unansweredHours: 48 } as const;

/** Admin › Analyse: a group with fewer Houses than this is greyed out ("zu wenig Daten") and never the sweet spot. */
export const ANALYSIS_MIN_HOUSES = 10;

/**
 * The profit chart on the overview: the value axis grows with the data – the first step whose `max` holds the highest month, ticks every
 * `step`. Milestones are fine lines across the chart (their label in lib/i18n/admin.de.ts cockpit.milestones), shown only once the axis
 * reaches them; the move at €5,000 is the first.
 */
export const profitMilestones = {
  axis: [
    { max: 5_000, step: 1_000 },
    { max: 10_000, step: 2_500 },
    { max: 25_000, step: 5_000 },
    { max: 50_000, step: 10_000 },
    { max: 100_000, step: 20_000 },
  ],
  lines: [{ value: PROFIT_TARGET_PER_MONTH, key: "move" }],
  /** The ladder beside the chart (bottom first): reached steps sage, the next with its progress in percent, the rest empty circles. */
  ladder: [
    { value: PROFIT_TARGET_PER_MONTH, key: "move" },
    { value: 10_000, key: null },
    { value: 25_000, key: null },
    { value: 50_000, key: null },
    { value: 100_000, key: null },
  ],
  /** The switch "Achse" under the chart: "Aktuell" (the axis grows with the data, above) or a fixed top. */
  fixedAxes: [10_000, 25_000, 50_000, 100_000],
} as const;

/**
 * Change "like a stock" under every main number of the overview (lib/admin/metrics.ts getChange): compared with the same day of the period
 * before (on the 15th with the state on the 15th of last month), so a running month is fair. The default and the switch's order.
 */
export const COMPARE_PERIODS = ["week", "month", "year"] as const;
export type ComparePeriod = (typeof COMPARE_PERIODS)[number];
export const DEFAULT_COMPARE: ComparePeriod = "month";

/**
 * Which way is better, per main number – the change's colour follows better/worse, never more/less (sage better, ember worse, grey ±0).
 * `unit`: "percent" numbers change in percentage points ("▲ +3 Pkt."), the rest absolute plus relative ("▲ +3 (+8,6 %)").
 */
export const CHANGE_RULES = {
  profit: { better: "higher", unit: "eur" },
  fullHouses: { better: "higher", unit: "count" },
  reservedShare: { better: "higher", unit: "percent" },
  repeatRate: { better: "higher", unit: "percent" },
  perHouse: { better: "higher", unit: "eur" },
  daysToFull: { better: "lower", unit: "days" },
  /** Geld › Steuern */
  revenue: { better: "higher", unit: "eur" },
  costs: { better: "lower", unit: "eur" },
  /** Neither better nor worse – more reserve follows more profit: the change in ink */
  taxReserve: { better: "neutral", unit: "eur" },
  missingReceipts: { better: "lower", unit: "count" },
  /** The north star and the numbers around it */
  sharedNights: { better: "higher", unit: "count" },
  bookingVolume: { better: "higher", unit: "eur" },
  annualRevenue: { better: "higher", unit: "eur" },
  activeUsers: { better: "higher", unit: "count" },
  installRateIos: { better: "higher", unit: "percent" },
  installRateAndroid: { better: "higher", unit: "percent" },
  costPerGuest: { better: "lower", unit: "eur" },
  valueToCost: { better: "higher", unit: "ratio" },
  runwayMonths: { better: "higher", unit: "ratio" },
} as const satisfies Record<string, { better: "higher" | "lower" | "neutral"; unit: "eur" | "count" | "percent" | "days" | "ratio" }>;
export type ChangeMetric = keyof typeof CHANGE_RULES;

/**
 * What Simpulo keeps at one full House by the fee model (config/policies.ts FEE_MODEL): every guest's service fee (10 % of their share) plus
 * 10 % of a host fee – for the one example House (STAY_EXAMPLE: €1,260 · 4 people → 3 guests × €32; no host fee) ≈ 95 €. The target of
 * "Einnahme pro vollem House".
 */
export function feeModelPerFullHouse(): number {
  const ex = stayExample();
  const guests = ex.people - 1;
  return Math.round(guests * ((ex.share * FEE_MODEL.serviceFeePercent) / 100) + guests * ((0 * FEE_MODEL.hostFeeCommissionPercent) / 100));
}

/**
 * Full Houses a month needed for the move – dynamic: €5,000 over what one full House brings (measured this month; without a measurement the fee
 * model), rounded up. 5.000 € / 116 € → 44.
 */
export const fullHousesTarget = (perFullHouse: number | null) => Math.ceil(PROFIT_TARGET_PER_MONTH / (perFullHouse && perFullHouse > 0 ? perFullHouse : feeModelPerFullHouse()));

/** The overview's targets (each number's status dot is measured against it): reservations 60 %, repeat guests 25 %. */
export const OVERVIEW_TARGETS = {
  reservedShare: LAUNCH_CRITERIA.reservedShare * 100,
  repeatRate: 25,
  /** Wachstum: what a guest is worth in a year over what winning them cost – at least 3 */
  valueToCost: 3,
  /** Geld: months the bank balance lasts at the average costs of the last 3 months. ⚠ Platzhalter – selbst festlegen. */
  runwayMonths: 6,
} as const;

/** A warning starts at this share of a target (below it critical) – for the dynamic targets. */
export const WARNING_SHARE = 0.6;

/** "Months in a row at €5,000: X / 6" */
export const STREAK_MONTHS = MOVE_TARGET.months;

/** Admin › Money: the share of profit set aside for taxes, before "left in the company". Not tax advice – a rough reserve. */
export const TAX_RESERVE_PERCENT = 30;

/** Vision › Technik › Anbieter heute: a provider's cost in % of revenue – from `warning` amber, from `critical` ember with "Selbermachen prüfen". */
export const PROVIDER_COST = { warning: 5, critical: 10 } as const;

// ── Geld › Steuern ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Orientierung, keine Steuerberatung: every rate and date here is a placeholder until the tax advisor sets it.

/**
 * The tax reserve split (Geld › Steuern): income tax and trade tax as a share of the profit after costs; VAT is not a rate here – it is the
 * VAT owed from the journal (output tax − input tax, lib/admin/ledger.ts). ⚠ Platzhalter – mit Steuerberater festlegen.
 */
export const TAX_RESERVE_RATES = {
  /** TODO: mit Steuerberater festlegen */
  incomeTaxPercent: 25,
  /** TODO: mit Steuerberater festlegen */
  tradeTaxPercent: 14,
} as const;

/** Cost categories that count as investments ("Für die Bewertung beim Umzug"): software, brand and legal, since the start. */
export const INVESTMENT_CATEGORIES = ["Software", "Marke", "Recht"] as const;

/**
 * Tax deadlines (Geld › Steuern › Fristen, and "Heute" from `showInTodayDays` days before). Recurring dates as rules, the advisor's
 * appointments as dates. ⚠ Platzhalter – mit Steuerberater festlegen (e.g. monthly or quarterly VAT returns, an extension of the deadline).
 */
export const TAX_DEADLINES = {
  showInTodayDays: 7,
  /** USt-Voranmeldung: on this day of every month (for the month before) */
  vatReturn: { day: 10 },
  /** Einkommensteuer-Vorauszahlung: these months, this day */
  incomeTaxPrepayment: { months: [3, 6, 9, 12], day: 10 },
  /** Gewerbesteuer-Vorauszahlung */
  tradeTaxPrepayment: { months: [2, 5, 8, 11], day: 15 },
  /** DAC7 report for the year before */
  dac7: { month: 1, day: 31 },
  /** Appointments with the tax advisor (YYYY-MM-DD, the topic) */
  advisor: [
    { date: "2026-12-03", topic: "Jahresgespräch und Fragenliste" },
    { date: "2027-03-11", topic: "Jahresabschluss 2026" },
  ],
} as const;
