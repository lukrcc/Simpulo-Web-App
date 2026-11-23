// The admin dashboard's targets and weights (/admin). The numbers are computed in lib/admin/metrics.ts – never in the UI.
import { DEADLINES, FEE_MODEL, OVERVIEW_GOALS, stayExample } from "@/config/policies";

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
  fullHousesPerMonth: { better: "higher", good: OVERVIEW_GOALS.fullHousesPerMonth, warning: 25 },
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
  /** In percent: guests with at least one mutual "with you again" (Ziel 6 von 10) */
  connectionRate: { better: "higher", good: 60, warning: 40 },
  /** In percent: of those who answered, "Yes" to "Did you reach your intention?" (Partly zählt halb) – Ziel vorläufig, mit den Gründern festlegen */
  intentionReached: { better: "higher", good: 60, warning: 40 },
  /** In percent: still in touch with someone of the crew 30 days after – Ziel vorläufig */
  stillInTouch: { better: "higher", good: 50, warning: 30 },
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
/** `unansweredHours`: a request without an answer this long puts the House on "Braucht Hilfe" – the needsHelp step of DEADLINES.request. */
export const HOUSE_RISK = { deadlineDays: 7, minFill: 0.6, quietDays: 7, unansweredHours: DEADLINES.request.find((s) => s.id === "needsHelp")!.afterHours } as const;

/** Admin › Houses: the four levers for a House that needs help. */
export const HOUSE_LEVERS = ["visibility", "demand", "host", "alternative"] as const;
export type HouseLever = (typeof HOUSE_LEVERS)[number];
/**
 * The recommended lever, by the House's most pressing reason (lib/admin/metrics.ts needsHelp): a request waiting on the host → help the host;
 * a start within `alternativeDays` at under `alternativeFill` full → suggest moving the dates; otherwise close to the start → visibility; no
 * requests for a while → demand (tell the people who'd fit).
 */
export const HOUSE_LEVER_RULES = { alternativeDays: 3, alternativeFill: 0.4 } as const;
/** "✓ Erledigt" hides a House this many days; if it hasn't filled further by then, it comes back. */
export const HOUSE_DONE_RECHECK_DAYS = 3;

/** Admin › Analyse: a group with fewer Houses than this is greyed out ("zu wenig Daten") and never the sweet spot. */
export const ANALYSIS_MIN_HOUSES = 10;

/**
 * The admin's one period (Woche · Monat · Quartal · Jahr; the switch right in the click row, lib/admin/period.ts remembers the last choice):
 * the numbers count the running period up to today, the change compares with the same span of the period before – the week before, the
 * month before, the quarter before, the year before (lib/admin/metrics.ts periodRanges). Days are no tab: the overview's chart opens a week
 * into its days (drill-down, ChartLevel).
 */
export const COMPARE_PERIODS = ["week", "month", "quarter", "year"] as const;
export type ComparePeriod = (typeof COMPARE_PERIODS)[number];
export const DEFAULT_COMPARE: ComparePeriod = "week";
/** A level of the overview's chart: the periods and, one step deeper than a week, its days. */
export type ChartLevel = "day" | ComparePeriod;
/** One step deeper (the drill-down): Jahr → Quartale → Monate → Wochen → Tage. */
export const CHILD_LEVEL: Record<ComparePeriod, ChartLevel> = { year: "quarter", quarter: "month", month: "week", week: "day" };

/**
 * Targets are monthly values; a period's target is the monthly one × this (lib/admin/metrics.ts periodTarget): a day 12/365 of a month, a
 * week 12/52, a quarter 3, a year 12 (€5,000 a month → a week ≈ €1,150, a quarter €15,000, a year €60,000). Percent targets stay as they are.
 */
export const PERIOD_MONTHS: Record<ChartLevel, number> = { day: 12 / 365, week: 12 / 52, month: 1, quarter: 3, year: 12 };

/** The overview's chart per period: how many bars back (null = every year with data). */
export const PERIOD_CHART: Record<ComparePeriod, number | null> = { week: 12, month: 12, quarter: 8, year: null };

/**
 * Which way is better, per main number – the change's colour follows better/worse, never more/less (sage better, ember worse, grey ±0).
 * `unit`: "percent" numbers change in percentage points ("▲ +3 Pkt."), the rest absolute plus relative ("▲ +3 (+8,6 %)").
 */
export const CHANGE_RULES = {
  /** Launch › Marketing › Trichter */
  /** Geld */
  takeRate: { better: "higher", unit: "percent" },
  perGuest: { better: "higher", unit: "count" },
  perHost: { better: "higher", unit: "count" },
  refunds: { better: "lower", unit: "count" },
  mktContacted: { better: "higher", unit: "count" },
  mktReplyRate: { better: "higher", unit: "percent" },
  mktDemoRate: { better: "higher", unit: "percent" },
  mktHouseRate: { better: "higher", unit: "percent" },
  mktFilledHouses: { better: "higher", unit: "count" },
  /** Launch › Marketing › Countdown: the rings, against a week ago */
  mktHousesOpened: { better: "higher", unit: "count" },
  mktHubs: { better: "higher", unit: "count" },
  mktWaitlist: { better: "higher", unit: "count" },
  /** Launch › Marketing › Partner › Wirkung */
  partnerVisits: { better: "higher", unit: "count" },
  partnerRequests: { better: "higher", unit: "count" },
  partnerPaid: { better: "higher", unit: "count" },
  partnerRevenue: { better: "higher", unit: "eur" },
  profit: { better: "higher", unit: "eur" },
  fullHouses: { better: "higher", unit: "count" },
  reservedShare: { better: "higher", unit: "percent" },
  /** Admin › Houses: Houses that need help (fewer is better) */
  needsHelp: { better: "lower", unit: "count" },
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
  installRateAll: { better: "higher", unit: "percent" },
  paidBookings: { better: "higher", unit: "count" },
  /** Wachstum › Kosten pro Buchung: marketing costs ÷ bookings – lower is better */
  costPerBooking: { better: "lower", unit: "eur" },
  inboxOpen: { better: "lower", unit: "count" },
  openHouses: { better: "higher", unit: "count" },
  growthPct: { better: "higher", unit: "percent" },
  askBefore: { better: "neutral", unit: "ratio" },
  askToRequest: { better: "higher", unit: "percent" },
  askNote: { better: "higher", unit: "percent" },
  costPerGuest: { better: "lower", unit: "eur" },
  valueToCost: { better: "higher", unit: "ratio" },
  runwayMonths: { better: "higher", unit: "ratio" },
  /** Danach (Bogen): prepared – Verbindungsrate, Absicht erreicht, noch in Kontakt nach 30 Tagen */
  connectionRate: { better: "higher", unit: "percent" },
  intentionReached: { better: "higher", unit: "percent" },
  stillInTouch: { better: "higher", unit: "percent" },
  /** Wachstum: the funnel of the chosen period against the one before */
  visitors: { better: "higher", unit: "count" },
  requests: { better: "higher", unit: "count" },
  paid: { better: "higher", unit: "count" },
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


/** The overview's targets (each number's status dot is measured against it): reservations 60 %, repeat guests 25 %. */
export const OVERVIEW_TARGETS = {
  reservedShare: LAUNCH_CRITERIA.reservedShare * 100,
  repeatRate: 25,
  /** Gäste with at least one mutual choice ("Mit dir wieder") – 6 of 10 */
  connectionRate: 60,
  /** Wachstum: what a guest is worth in a year over what winning them cost – at least 3 */
  valueToCost: 3,
  /** Geld: months the bank balance lasts at the average costs of the last 3 months. ⚠ Platzhalter – selbst festlegen. */
  runwayMonths: 6,
} as const;

/** A warning starts at this share of a target (below it critical) – for the dynamic targets. */
export const WARNING_SHARE = 0.6;


/** Vision › Technik › Anbieter heute: a provider's cost in % of revenue – from `warning` amber, from `critical` ember with "Selbermachen prüfen". */
export const PROVIDER_COST = { warning: 5, critical: 10 } as const;

// Geld › Steuern: every rate, account and date lives in config/tax.ts (placeholders – mit Steuerberater klären).
export { TAX_DEADLINES, TAX_RESERVE_PERCENT, TAX_RESERVE_RATES } from "./tax";

/** Cost categories that count as investments: software, brand and legal, since the start. */
export const INVESTMENT_CATEGORIES = ["Software", "Marke", "Recht"] as const;


