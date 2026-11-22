// Every number of the admin dashboard (/admin) – computed here, never in the UI. Pure functions over the app data and the admin collections;
// the targets and weights come from config/admin.ts.
//
// Rule (CLAUDE.md "Admin"): the admin reads only pre-computed statistics. With Firebase, a Cloud Function runs every hour and writes
// statistics documents (stats/hourly/{hour}, stats/daily/{day}: counts per channel, referrer, House, funnel steps, money, the month rows);
// these functions then read those documents – never the raw collections (events, requests, payments). Until then they compute the same
// numbers from the mock records. TODO(firestore): an adapter `getStats(from, to)` in lib/data and these functions over its result.
import { HOST_REFERRAL } from "@/config/policies";
import { firstPaidStayOf } from "@/lib/hostReferral";
import { PROVIDER_COST, ANALYSIS_MIN_HOUSES, ANCHOR_TARGET, CHANGE_RULES, OVERVIEW_TARGETS, WARNING_SHARE, feeModelPerFullHouse, type ChangeMetric, type ChartLevel, type ComparePeriod, COMPARE_PERIODS, HOUSE_RISK, HOUSE_LEVER_RULES, HOUSE_DONE_RECHECK_DAYS, type HouseLever, PERIOD_CHART, PERIOD_MONTHS, HOST_TIER_RULES, HOST_TIERS, LAUNCH_CRITERIA, STATUS_RULES, TAX_RESERVE_PERCENT, TOPIC_WEIGHTS, type StatusMetric } from "@/config/admin";
import { FEE_MODEL, OVERVIEW_GOALS } from "@/config/policies";
import { LENGTH_BOUNDS, SIZE_BOUNDS, SPECTRUM_ROWS, SPECTRUM_SPARSE_SHARE, SPECTRUM_TOP, type SpectrumRowKey } from "@/config/spectrum";
import { STRIPE_FEE } from "@/config/tax";
import { convert, isCurrency } from "@/lib/currency";
import { VIBES } from "@/lib/catalog";
import type { Thread } from "@/lib/types";
import type { HypothesisStatus } from "@/config/hypotheses";
import { ACCOMMODATION_CATEGORIES, accommodationOf, type AccommodationCategoryId } from "@/config/accommodation";
import { MATRIX_HOUSES_FROM, type DepthUnlockMeasure, type RevenueMeasure } from "@/config/vision";
import type { ModelId } from "@/config/models";
import type { AdminData, ContentPost, CostCategory, CostEntry, HouseOutcome, LedgerEntry, MarketingContact, MarketingPartner, MetricsHistory, OverviewSnapshot } from "@/lib/data";
import { FALLBACK_RULES, FUNNEL_ASSUMPTIONS, LAUNCH_DATE, LAUNCH_PHASES, MARKETING_START_DATE, PROJECTION_HOUSES, STRATEGY_RINGS, STRATEGY_WEEK_BARS, STRATEGY_WEEKS, type LaunchPhaseKey, type StrategyMetric } from "@/config/marketing";
import { READINESS, READINESS_ITEMS, VALUATION, type ReadinessKey } from "@/config/funding";
import { answersSlowly, responseRate } from "@/lib/requests";
import type { GrowthEvent } from "@/lib/growth";
import { convertApprox } from "@/lib/rates";
import type { Currency } from "@/lib/types";
import { TICKET_CATEGORIES, waitlistStatus, type WaitlistEntry, type Report, type ModerationNotice, type HouseInvite, type HostApplication, type HostTier, type User, type JoinRequest, type LivedWith, type Payment, type PlatformPhase, type Stay, type SupportTicket, type TicketCategory, type Vibe } from "@/lib/types";

export interface AdminInputs {
  stays: readonly Stay[];
  users: readonly User[];
  joinRequests: readonly JoinRequest[];
  livedWith: readonly LivedWith[];
  payments: readonly Payment[];
  admin: AdminData;
  /** The months behind the Cockpit and Money (mock); null = computed from the records alone */
  history: MetricsHistory | null;
  /** Admin › Analyse: the Houses' outcomes (mock history); null = derived from the records (outcomesFromRecords) */
  outcomes: readonly HouseOutcome[] | null;
  /** Reports people sent (Admin › Hosts › Review) */
  reports: readonly Report[];
  /** Statements of reasons and their appeals (the store) */
  notices: readonly ModerationNotice[];
  /** The bookkeeping journal (lib/admin/ledger.ts); null without one */
  ledger: readonly LedgerEntry[] | null;
  /** The chats (only their counts and times are read – never their content) */
  threads?: readonly Thread[];
  phase: PlatformPhase;
  /** YYYY-MM-DD */
  today: string;
  /** Now in ms (the browser's clock with the Dev menu's time shift, lib/clock.ts) – for hours-precise rules (open requests); else today noon */
  now?: number;
}

// ── Status ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type Status = "good" | "warning" | "critical";

/** The one place a number gets a status colour: the rule from config/admin.ts STATUS_RULES. null = no value yet (no colour). */
export function getStatus(metric: StatusMetric, value: number | null): Status | null {
  if (value === null || Number.isNaN(value)) return null;
  const rule = STATUS_RULES[metric];
  if (rule.better === "higher") return value >= rule.good ? "good" : value >= rule.warning ? "warning" : "critical";
  return value <= rule.good ? "good" : value <= rule.warning ? "warning" : "critical";
}

/**
 * A status against a target that isn't fixed (the overview's dynamic full-House target, the fee model): good at or past the target, warning
 * from WARNING_SHARE of it (lower is better: up to target ÷ WARNING_SHARE), else critical.
 */
export function statusAgainst(value: number | null, target: number, better: "higher" | "lower" = "higher"): Status | null {
  if (value === null || Number.isNaN(value)) return null;
  if (better === "higher") return value >= target ? "good" : value >= target * WARNING_SHARE ? "warning" : "critical";
  return value <= target ? "good" : value <= target / WARNING_SHARE ? "warning" : "critical";
}

// ── Change "like a stock" ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** better · worse · same – the change's colour (sage · ember · grey), by CHANGE_RULES, never by more/less. */
export type Trend = "better" | "worse" | "same" | "neutral";

export interface Change {
  /** current − previous; for percent numbers in percentage points */
  delta: number;
  /** delta / previous (0.086 = +8,6 %); null for percent numbers (points only) or without a previous value above 0 */
  relative: number | null;
  trend: Trend;
  unit: "eur" | "count" | "percent" | "days" | "ratio";
}

/**
 * THE change of a main number against its earlier value – the one place it is computed (the overview's numbers, every admin main number
 * after it). null without both values.
 */
export function getChange(metric: ChangeMetric, current: number | null, previous: number | null): Change | null {
  if (current === null || previous === null || Number.isNaN(current) || Number.isNaN(previous)) return null;
  const rule = CHANGE_RULES[metric];
  // Ratios ("Wert ÷ Kosten", months of runway) keep one decimal; everything else whole numbers.
  const unit: Change["unit"] = rule.unit;
  const round = (n: number) => (unit === "ratio" ? Math.round(n * 10) / 10 : Math.round(n));
  const delta = Math.round((round(current) - round(previous)) * 10) / 10;
  const better: "higher" | "lower" | "neutral" = rule.better;
  const trend: Trend = delta === 0 ? "same" : better === "neutral" ? "neutral" : (delta > 0) === (better === "higher") ? "better" : "worse";
  return { delta, relative: unit === "percent" || previous <= 0 ? null : delta / round(previous), trend, unit };
}

// ── Periods: Tag · Woche · Monat · Quartal · Jahr ─────────────────────────────────────────────────────────────────────────────────────

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const addMonths = (date: string, n: number) => {
  const [y, m] = date.split("-").map(Number);
  return isoDay(Date.UTC(y, m - 1 + n, 1));
};

/** The first day of the period that holds `date`: the day itself, Monday, the 1st, the quarter's first month, 1 January. */
export function periodStart(date: string, period: ChartLevel): string {
  const [y, m] = date.split("-").map(Number);
  if (period === "day") return date;
  if (period === "week") return isoDay(dayMs(date) - ((new Date(dayMs(date)).getUTCDay() + 6) % 7) * DAY_MS);
  if (period === "month") return isoDay(Date.UTC(y, m - 1, 1));
  if (period === "quarter") return isoDay(Date.UTC(y, Math.floor((m - 1) / 3) * 3, 1));
  return isoDay(Date.UTC(y, 0, 1));
}

/** The start of the period `n` periods after (negative: before) the one starting at `start`. */
function shiftPeriod(start: string, period: ChartLevel, n: number): string {
  if (period === "day") return isoDay(dayMs(start) + n * DAY_MS);
  if (period === "week") return isoDay(dayMs(start) + 7 * n * DAY_MS);
  return addMonths(start, n * (period === "month" ? 1 : period === "quarter" ? 3 : 12));
}

/** The last day of the period that starts at `start` (a week: Sunday). */
export function periodEnd(start: string, period: ChartLevel): string {
  return isoDay(dayMs(shiftPeriod(periodStart(start, period), period, 1)) - DAY_MS);
}

/**
 * A stretch (`from` – `to`, at most up to today) and what it is compared with – the same span of the period before: a day the same weekday a
 * week back (fairer than yesterday), a week/month/quarter/year the period before up to the same day in it (never past its end).
 */
export function rangesFor(level: ChartLevel, from: string, to: string, today: string) {
  const curTo = to < today ? to : today;
  if (level === "day") {
    const back = isoDay(dayMs(from) - 7 * DAY_MS);
    return { current: { from, to: curTo }, previous: { from: back, to: back } };
  }
  const prevFrom = level === "week" ? isoDay(dayMs(from) - 7 * DAY_MS) : shiftPeriod(from, level, -1);
  const prevLast = isoDay(dayMs(from) - DAY_MS);
  const span = Math.round((dayMs(curTo) - dayMs(from)) / DAY_MS);
  const prevTo = isoDay(Math.min(dayMs(prevFrom) + span * DAY_MS, dayMs(prevLast)));
  return { current: { from, to: curTo }, previous: { from: prevFrom, to: prevTo } };
}

/** The running period up to today and the same span of the period before (rangesFor). */
export function periodRanges(today: string, period: ComparePeriod) {
  const from = periodStart(today, period);
  return rangesFor(period, from, periodEnd(from, period), today);
}

/** The last day of the range compared with (YYYY-MM-DD) – for "ggü. …". */
export function compareDate(today: string, period: ComparePeriod): string {
  return periodRanges(today, period).previous.to;
}

/** A monthly target on another period (config/admin.ts PERIOD_MONTHS): euros to the nearest 10, counts whole (at least 1). */
export function periodTarget(monthly: number, period: ChartLevel, format: "eur" | "count"): number {
  const value = monthly * PERIOD_MONTHS[period];
  return format === "eur" ? Math.round(value / 10) * 10 : Math.max(1, Math.round(value));
}

interface DayRow {
  date: string;
  /** Profit = revenue − costs (the overview's chart, the move to €5,000) */
  profit: number;
  full: number;
  nights: number;
  /** Money (Admin › Geld, Übersicht › Geld): what guests paid, what Simpulo keeps and from what, its costs */
  bookingVolume: number;
  revenue: number;
  serviceFees: number;
  hostFeeShare: number;
  refunds: number;
  stripeFees: number;
  otherCosts: number;
  /** Paying guests, and hosts whose House carries a host fee */
  guests: number;
  proHosts: number;
}

/** A calm, fixed rhythm of the days (no randomness): the weekend a little stronger, a small wobble per date. */
function dayWeight(date: string): number {
  let h = 2166136261;
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const wobble = ((h >>> 0) % 1000) / 1000;
  const weekday = new Date(dayMs(date)).getUTCDay();
  return (weekday === 5 || weekday === 6 || weekday === 0 ? 1.3 : 1) * (0.75 + 0.5 * wobble);
}

/**
 * The cost entries (Geld › Kosten) as dated amounts up to today, spread over days so no week jumps: a one-off over the ONE_OFF_DAYS (30) days
 * from its date (its amount ÷ 30 a day); a recurring one accrued over the days of every month from its first day (its monthly amount ÷ the
 * month's days).
 */
export function costEntryDays(entries: readonly CostEntry[], today: string): { date: string; amount: number; category: CostCategory; id: string }[] {
  const out: { date: string; amount: number; category: CostCategory; id: string }[] = [];
  for (const e of entries) {
    if (!e.recurring) {
      for (let d = 0; d < ONE_OFF_DAYS; d++) {
        const date = isoDay(dayMs(e.date) + d * DAY_MS);
        if (date > today) break;
        out.push({ date, amount: e.amount / ONE_OFF_DAYS, category: e.category, id: e.id });
      }
      continue;
    }
    for (let m = e.date.slice(0, 7); `${m}-01` <= today; m = addMonths(`${m}-01`, 1).slice(0, 7)) {
      const first = `${m}-01`;
      const days = Math.round((dayMs(addMonths(first, 1)) - dayMs(first)) / DAY_MS);
      for (let d = 0; d < days; d++) {
        const date = isoDay(dayMs(first) + d * DAY_MS);
        if (date > today) break;
        if (date >= e.date) out.push({ date, amount: e.amount / days, category: e.category, id: e.id });
      }
    }
  }
  return out;
}

/** A one-off cost is spread over this many days from its date (costEntryDays). */
const ONE_OFF_DAYS = 30;

/** Stripe's fee on a day's bookings (config/tax.ts STRIPE_FEE, an estimate): a percent of what guests paid plus a fixed amount per payment. */
const stripeFeeOf = (bookingVolume: number, payments: number) => (bookingVolume * STRIPE_FEE.percent) / 100 + payments * STRIPE_FEE.fixedEur;

type DayInputs = Pick<AdminInputs, "stays" | "payments" | "history" | "today"> & Partial<Pick<AdminInputs, "admin" | "ledger">>;

/**
 * Per day, as far back as known – the one source of every period (TODO(firestore): stats/daily): revenue (what Simpulo keeps), what guests
 * paid, its split into service fees and host-fee share, refunds, Stripe's fees, the cost entries, profit (revenue − costs), full Houses, their
 * shared nights, paying guests and hosts with a host fee. With a history (the mock) its monthly values are spread over the month's days in a
 * fixed rhythm (this month up to today) – the split, refunds, guests and hosts from the ledger's shares and the real Houses; without one, the
 * records: payments by the day they were paid, full Houses by their start day. Costs: Stripe automatically from the bookings, the rest the
 * entries in Geld › Kosten (AdminData.costEntries).
 */
function dailyRows(inputs: DayInputs): DayRow[] {
  const { history, today } = inputs;
  const empty = (date: string): DayRow => ({ date, profit: 0, full: 0, nights: 0, bookingVolume: 0, revenue: 0, serviceFees: 0, hostFeeShare: 0, refunds: 0, stripeFees: 0, otherCosts: 0, guests: 0, proHosts: 0 });
  const byDay = new Map<string, DayRow>();
  const at = (date: string) => byDay.get(date) ?? byDay.set(date, empty(date)).get(date)!;
  if (history) {
    const shares = moneyShares(inputs);
    const months = new Map<number, { revenue: number; full: number; nights: number; bookingVolume: number | null }>();
    for (const o of history.olderMonths ?? []) months.set(o.monthsAgo, { revenue: o.profit, full: o.full, nights: o.sharedNights, bookingVolume: null });
    for (const p of history.profitPerMonth) {
      const i = 11 - p.monthsAgo;
      const full = history.fullHousesPerMonth.find((h) => h.monthsAgo === p.monthsAgo)?.full ?? 0;
      months.set(p.monthsAgo, { revenue: p.profit, full, nights: history.series?.sharedNights[i] ?? full * 56, bookingVolume: history.series?.bookingVolume[i] ?? null });
    }
    // Months without a booking volume (older ones): the history's mean ratio of booking volume to revenue.
    const known = [...months.values()].filter((v) => v.bookingVolume !== null && v.revenue > 0);
    const ratio = known.length ? known.reduce((n, v) => n + v.bookingVolume! / v.revenue, 0) / known.length : 10;
    for (const back of [...months.keys()].toSorted((a, b) => b - a)) {
      const v = months.get(back)!;
      // The running month's value is the month's level: spread over the whole month, only the days up to today count (monthSoFar).
      const first = addMonths(periodStart(today, "month"), -back);
      const last = isoDay(dayMs(addMonths(first, 1)) - DAY_MS);
      const days: string[] = [];
      for (let t = dayMs(first); t <= dayMs(last); t += DAY_MS) days.push(isoDay(t));
      const total = days.reduce((n, d) => n + dayWeight(d), 0);
      const bv = v.bookingVolume ?? v.revenue * ratio;
      for (const d of days) {
        if (d > today) break;
        const share = dayWeight(d) / total;
        const row = at(d);
        const revenue = v.revenue * share;
        const full = v.full * share;
        const guests = full * shares.guestsPerFull;
        row.revenue += revenue;
        row.full += full;
        row.nights += v.nights * share;
        row.bookingVolume += bv * share;
        row.hostFeeShare += revenue * shares.hostFeeShare;
        row.serviceFees += revenue * (1 - shares.hostFeeShare);
        row.refunds += revenue * shares.refunds;
        row.guests += guests;
        row.proHosts += full * shares.proShare;
        row.stripeFees += stripeFeeOf(bv * share, guests);
      }
    }
  } else {
    for (const p of inputs.payments) {
      if (p.status !== "paid" && p.status !== "refunded") continue;
      if (!p.paidAt || p.paidAt.slice(0, 10) > today) continue;
      const row = at(p.paidAt.slice(0, 10));
      const eurOf = (n: number) => toEur(n, inputs.stays, p.stayId);
      const total = eurOf(p.total);
      row.bookingVolume += total;
      row.serviceFees += eurOf(p.fee);
      row.hostFeeShare += eurOf(((p.hostFee ?? 0) * FEE_MODEL.hostFeeCommissionPercent) / 100);
      row.revenue += eurOf(keptOf(p));
      row.refunds += eurOf(p.refundedAmount ?? 0);
      row.guests += 1;
      row.stripeFees += stripeFeeOf(total, 1);
    }
    for (const s of inputs.stays) {
      if (!isReal(s) || !isFull(s) || s.startDate > today) continue;
      const row = at(s.startDate.slice(0, 10));
      row.full += 1;
      row.nights += s.spotsTotal * nightsOf(s);
      if ((s.hostFeePerPerson ?? 0) > 0) row.proHosts += 1;
    }
  }
  for (const c of costEntryDays(inputs.admin?.costEntries ?? [], today)) {
    if (history && !byDay.has(c.date)) continue;
    at(c.date).otherCosts += c.amount;
  }
  for (const row of byDay.values()) row.profit = row.revenue - row.stripeFees - row.otherCosts;
  return [...byDay.values()].toSorted((a, b) => a.date.localeCompare(b.date));
}

/**
 * The shares the history's months are split by (the mock): the host-fee share of revenue and the refunds from the ledger (else 10 % / 2 %),
 * paying guests per full House (the real Houses' mean crew less the host), the share of Houses with a host fee.
 */
function moneyShares(inputs: DayInputs) {
  const ledger = inputs.ledger ?? [];
  const income = ledger.filter((e) => e.kind === "income");
  const totalIncome = income.reduce((n, e) => n + e.net, 0);
  const hostIncome = income.filter((e) => e.category === "Anteil Host-Fee").reduce((n, e) => n + e.net, 0);
  const refunds = -ledger.filter((e) => e.kind === "refund").reduce((n, e) => n + e.net, 0);
  const real = inputs.stays.filter(isReal);
  const crew = real.length ? real.reduce((n, s) => n + s.spotsTotal, 0) / real.length : 4;
  return {
    hostFeeShare: totalIncome > 0 ? hostIncome / totalIncome : 0.1,
    refunds: totalIncome > 0 ? refunds / totalIncome : 0.02,
    guestsPerFull: Math.max(1, crew - 1),
    proShare: real.length ? real.filter((s) => (s.hostFeePerPerson ?? 0) > 0).length / real.length : 0.3,
  };
}

/**
 * The share of the running month that has passed (weighted like the days, dayWeight): with a history (the mock) its month-0 values are the
 * month's level, so "this month so far" is that × this share – everywhere the same (profitPerMonth, fullHousesPerMonth, dailyRows).
 */
export function monthSoFar(today: string): number {
  const first = periodStart(today, "month");
  const last = isoDay(dayMs(addMonths(first, 1)) - DAY_MS);
  let done = 0;
  let total = 0;
  for (let t = dayMs(first); t <= dayMs(last); t += DAY_MS) {
    const w = dayWeight(isoDay(t));
    total += w;
    if (isoDay(t) <= today) done += w;
  }
  return total > 0 ? done / total : 1;
}

/** Profit, full Houses and shared nights from `from` to `to` (both included), rounded once here. */
export function rangeTotals(inputs: DayInputs, from: string, to: string) {
  const rows = dailyRows(inputs).filter((r) => r.date >= from && r.date <= to);
  return { profit: Math.round(rows.reduce((n, r) => n + r.profit, 0)), full: Math.round(rows.reduce((n, r) => n + r.full, 0)), nights: Math.round(rows.reduce((n, r) => n + r.nights, 0)) };
}

// ── Money (Übersicht › Geld, Admin › Geld) ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The money terms – ONE definition each, the same words in the ⓘ of the overview and on Geld (lib/i18n/admin.de.ts money.terms.<key>):
 * Buchungsvolumen (everything guests pay: rent, host fee, service fee) · Umsatz (what Simpulo keeps: service fees + its share of host fees)
 * · Kosten (Stripe's fees from the bookings + the entries in Geld › Kosten) · Gewinn (Umsatz − Kosten) · Take Rate (Umsatz ÷ Buchungsvolumen)
 * · Ø pro Buchung (guest: the service fee per paid booking; host: the host-fee share per House with a host fee).
 */
export const MONEY_TERMS = ["bookingVolume", "revenue", "costs", "profit", "takeRate", "perBooking", "serviceFees", "hostFeeShare", "refunds", "perGuest", "bookingPerGuest", "valuePerGuestYear", "perHost", "hostFeePerHouse", "valuePerHostYear", "stripeFees", "otherCosts", "paidOut", "openPayouts"] as const;
export type MoneyTerm = (typeof MONEY_TERMS)[number];

export interface MoneyTotals {
  bookingVolume: number;
  revenue: number;
  serviceFees: number;
  hostFeeShare: number;
  refunds: number;
  stripeFees: number;
  otherCosts: number;
  costs: number;
  profit: number;
  guests: number;
  proHosts: number;
  full: number;
  /** Umsatz ÷ Buchungsvolumen, 0–100; null without bookings */
  takeRate: number | null;
  /** Service fees per paying guest; null without guests */
  perGuest: number | null;
  /** What a paying guest booked on average */
  bookingPerGuest: number | null;
  /** Host-fee share per host with a host fee */
  perHost: number | null;
  /** Revenue per full House (each has one host) */
  revenuePerHost: number | null;
}

/** Every money number from `from` to `to` (both included) – summed from the days, rounded once here. */
export function moneyTotals(inputs: DayInputs, from: string, to: string): MoneyTotals {
  const rows = dailyRows(inputs).filter((r) => r.date >= from && r.date <= to);
  const sum = (k: keyof Omit<DayRow, "date">) => rows.reduce((n, r) => n + r[k], 0);
  const revenue = sum("revenue");
  const bookingVolume = sum("bookingVolume");
  const stripeFees = sum("stripeFees");
  const otherCosts = sum("otherCosts");
  const guests = sum("guests");
  const proHosts = sum("proHosts");
  const full = sum("full");
  const serviceFees = sum("serviceFees");
  const hostFeeShare = sum("hostFeeShare");
  const per = (n: number, d: number) => (d >= 0.5 ? Math.round(n / d) : null);
  return {
    bookingVolume: Math.round(bookingVolume),
    revenue: Math.round(revenue),
    serviceFees: Math.round(serviceFees),
    hostFeeShare: Math.round(hostFeeShare),
    refunds: Math.round(sum("refunds")),
    stripeFees: Math.round(stripeFees),
    otherCosts: Math.round(otherCosts),
    costs: Math.round(stripeFees + otherCosts),
    profit: Math.round(revenue - stripeFees - otherCosts),
    guests: Math.round(guests),
    proHosts: Math.round(proHosts),
    full: Math.round(full),
    takeRate: bookingVolume > 0 ? Math.round((revenue / bookingVolume) * 1000) / 10 : null,
    perGuest: per(serviceFees, guests),
    bookingPerGuest: per(bookingVolume, guests),
    perHost: per(hostFeeShare, proHosts),
    revenuePerHost: per(revenue, full),
  };
}

/**
 * The money numbers for a period (Woche · Monat · Quartal · Jahr) or an opened bar: the running stretch up to today against the same span of
 * the period before (periodRanges / rangesFor), each change from getChange; plus the last 365 days for "Wert pro Gast/Host im Jahr".
 */
export function moneyPeriod(inputs: DayInputs, period: ComparePeriod, focus: { level: ComparePeriod; from: string } | null = null) {
  const ranges = focus ? rangesFor(focus.level, focus.from, periodEnd(focus.from, focus.level), inputs.today) : periodRanges(inputs.today, period);
  const now = moneyTotals(inputs, ranges.current.from, ranges.current.to);
  const prev = moneyTotals(inputs, ranges.previous.from, ranges.previous.to);
  const year = moneyTotals(inputs, isoDay(dayMs(inputs.today) - 364 * DAY_MS), inputs.today);
  const yearBefore = moneyTotals(inputs, isoDay(dayMs(ranges.previous.to) - 364 * DAY_MS), ranges.previous.to);
  // Per guest and per host, not per booking: a guest books, a host hosts, more than once a year – the repeat factor from the Houses' outcomes.
  const repeat = repeatFactors(inputs);
  const perYear = (t: MoneyTotals, by: "guests" | "full") => {
    const people = t[by] / (by === "guests" ? repeat.bookingsPerGuest : repeat.housesPerHost);
    return people >= 0.5 ? Math.round(t.revenue / people) : null;
  };
  const change = (metric: ChangeMetric, a: number | null, b: number | null) => getChange(metric, a, b);
  return {
    ranges,
    level: focus?.level ?? period,
    now,
    prev,
    valuePerGuestYear: perYear(year, "guests"),
    valuePerHostYear: perYear(year, "full"),
    changes: {
      bookingVolume: change("bookingVolume", now.bookingVolume, prev.bookingVolume),
      revenue: change("revenue", now.revenue, prev.revenue),
      costs: change("costs", now.costs, prev.costs),
      profit: change("profit", now.profit, prev.profit),
      takeRate: change("takeRate", now.takeRate, prev.takeRate),
      perGuest: change("perGuest", now.perGuest, prev.perGuest),
      perHost: change("perHost", now.perHost, prev.perHost),
      serviceFees: change("revenue", now.serviceFees, prev.serviceFees),
      hostFeeShare: change("revenue", now.hostFeeShare, prev.hostFeeShare),
      refunds: change("refunds", now.refunds, prev.refunds),
      bookingPerGuest: change("perGuest", now.bookingPerGuest, prev.bookingPerGuest),
      revenuePerHost: change("perHost", now.revenuePerHost, prev.revenuePerHost),
      valuePerGuestYear: change("perGuest", perYear(year, "guests"), perYear(yearBefore, "guests")),
      valuePerHostYear: change("perHost", perYear(year, "full"), perYear(yearBefore, "full")),
      stripeFees: change("costs", now.stripeFees, prev.stripeFees),
      otherCosts: change("costs", now.otherCosts, prev.otherCosts),
    },
  };
}

/** How often one guest books and one host hosts in a year (the Houses' outcomes of the last 365 days; at least 1). */
function repeatFactors(inputs: DayInputs) {
  const outcomes = "users" in inputs ? outcomesOf(inputs as AdminInputs) : [];
  const from = isoDay(dayMs(inputs.today) - 364 * DAY_MS);
  const recent = outcomes.filter((o) => o.startDate >= from && o.startDate <= inputs.today);
  const seats = recent.reduce((n, o) => n + o.guestIds.length, 0);
  const guests = new Set(recent.flatMap((o) => o.guestIds)).size;
  const hosts = new Set(recent.map((o) => o.hostId)).size;
  return { bookingsPerGuest: guests ? Math.max(1, seats / guests) : 1, housesPerHost: hosts ? Math.max(1, recent.length / hosts) : 1 };
}

/** Geld › Überblick's chart: revenue, costs and profit per period (the last PERIOD_CHART weeks, months, quarters, years), the running one marked. */
export function moneyBuckets(inputs: DayInputs, period: ComparePeriod) {
  const count = PERIOD_CHART[period] ?? 4;
  const current = periodStart(inputs.today, period);
  return Array.from({ length: count }, (_, i) => shiftPeriod(current, period, i - count + 1)).map((from) => {
    const to = periodEnd(from, period);
    const t = moneyTotals(inputs, from, to < inputs.today ? to : inputs.today);
    return { from, to, level: period as ChartLevel, revenue: t.revenue, costs: t.costs, profit: t.profit, current: runningState(period, from, inputs.today) };
  });
}

/** Geld › Gäste: how many guests bring how much – each guest's service fees over every House (Analyse's outcomes), in fixed buckets. */
export function guestRevenueBuckets(inputs: AdminInputs) {
  const perGuest = new Map<string, number>();
  for (const o of outcomesOf(inputs)) {
    if (!o.guestIds.length) continue;
    const each = o.serviceFee / o.guestIds.length;
    for (const g of o.guestIds) perGuest.set(g, (perGuest.get(g) ?? 0) + each);
  }
  const edges = [25, 50, 100, 200] as const;
  const buckets = [...edges.map((to, i) => ({ from: i === 0 ? 0 : edges[i - 1], to: to as number | null })), { from: edges.at(-1)!, to: null }].map((b) => ({ ...b, guests: 0, revenue: 0 }));
  for (const v of perGuest.values()) {
    const b = buckets.find((x) => x.to === null || v < x.to)!;
    b.guests += 1;
    b.revenue += v;
  }
  return buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue) }));
}

/** Geld › Hosts: value per year by host tier (Share · Pro · Anchor) and the hosts who bring the most (hostOverview, the last 12 months). */
export function hostMoney(inputs: AdminInputs) {
  const hosts = hostOverview(inputs);
  const byTier = HOST_TIERS.map((tier) => {
    const list = hosts.filter((h) => h.tier === tier);
    return { tier, hosts: list.length, valuePerYear: list.reduce((n, h) => n + h.valuePerYear, 0) };
  });
  return { byTier, top: hosts.toSorted((a, b) => b.valuePerYear - a.valuePerYear).slice(0, 5) };
}

/**
 * Geld › Auszahlungen: the hosts' money (rent shares + their host fee less Simpulo's share) from the paid payments – paid out once everyone in
 * the House paid (Stay.allPaidAt, the day it went out), else still open (collected, waiting for the crew). Read only, no payout buttons.
 */
export function hostPayouts(inputs: Pick<AdminInputs, "stays" | "payments" | "users" | "today">, from: string, to: string) {
  const rows = new Map<string, { stay: Stay; amount: number; paidOutAt: string | null; settled: boolean }>();
  for (const p of inputs.payments) {
    if (p.status !== "paid") continue;
    const stay = inputs.stays.find((s) => s.id === p.stayId);
    if (!stay || stay.isExample) continue;
    const toHost = toEur(p.share + ((p.hostFee ?? 0) * (100 - FEE_MODEL.hostFeeCommissionPercent)) / 100, inputs.stays, p.stayId);
    // Paid out the day everyone had paid (Stay.allPaidAt); a booked or finished House without that stamp: the day of its last payment.
    const done = stay.allPaidAt ?? (stay.status === "booked" || stay.status === "completed" ? "settled" : null);
    const row = rows.get(stay.id) ?? { stay, amount: 0, paidOutAt: done && done !== "settled" ? done.slice(0, 10) : null, settled: done === "settled" };
    row.amount += toHost;
    if (row.settled && p.paidAt && (!row.paidOutAt || p.paidAt.slice(0, 10) > row.paidOutAt)) row.paidOutAt = p.paidAt.slice(0, 10);
    rows.set(stay.id, row);
  }
  const list = [...rows.values()].map((r) => ({ ...r, amount: Math.round(r.amount), host: inputs.users.find((u) => u.id === r.stay.hostId) ?? null }));
  const paid = list.filter((r) => r.paidOutAt && r.paidOutAt >= from && r.paidOutAt <= to && r.paidOutAt <= inputs.today);
  const open = list.filter((r) => !r.paidOutAt || r.paidOutAt > inputs.today);
  return { paid: paid.toSorted((a, b) => b.paidOutAt!.localeCompare(a.paidOutAt!)), open: open.toSorted((a, b) => b.amount - a.amount), paidTotal: paid.reduce((n, r) => n + r.amount, 0), openTotal: open.reduce((n, r) => n + r.amount, 0) };
}

/** One bar of the overview's chart (chartBuckets). */
/**
 * The ONE place that says whether a period on a chart's time axis is the running one (Regel „Admin-Diagramme“): a day, week, month, quarter
 * or year that contains today. "today" for a day (the axis says „heute“), "running" for the longer ones („läuft“), null otherwise. Every chart
 * with a time axis asks this – no component decides it itself. `start` is any day inside the period.
 */
export function runningState(level: ChartLevel, start: string, today: string): "running" | "today" | null {
  const from = periodStart(start, level);
  if (!isRunningSpan(from, periodEnd(from, level), today)) return null;
  return level === "day" ? "today" : "running";
}

/** The same question for any stretch (a phase on a timeline, a code section): today lies in [from, to], both days included. */
export const isRunningSpan = (from: string, to: string, today: string) => from <= today && today <= to;

export interface ChartBucket {
  level: ChartLevel;
  /** First and last day it covers (a week inside a month is cut to the month) */
  from: string;
  to: string;
  /** null: still ahead (no bar) */
  profit: number | null;
  /** The same span of the period before (rangesFor) – for the tooltip's change */
  previous: number | null;
  /** The running one (today lies in it – runningState): "running", a day "today", else null */
  current: "running" | "today" | null;
  /** Days only: what happened that day – new requests, paid stays, new Houses */
  events?: { requests: number; paid: number; houses: number };
}

/** A stretch of the overview's chart: the periods' root (`within` null) or one bar opened (drill-down, one level deeper). */
export interface ChartView {
  level: ChartLevel;
  /** The opened bar's stretch; null at the root (the last PERIOD_CHART periods up to today) */
  within: { from: string; to: string } | null;
}

/**
 * The bars of the overview's chart (one source: dailyRows). At the root the last weeks (12), months (12), quarters (8) or every year with
 * data, oldest first, the running one up to today; opened, the next level inside the opened bar (a year's quarters, a quarter's months, a
 * month's weeks – cut to the month –, a week's days Mo–So, still-ahead ones without a bar). Each with the same span of the period before.
 */
export function chartBuckets(inputs: Pick<AdminInputs, "stays" | "payments" | "history" | "today" | "joinRequests">, view: ChartView): ChartBucket[] {
  const rows = dailyRows(inputs);
  const { today } = inputs;
  const level = view.level;
  const starts: { from: string; to: string }[] = [];
  if (view.within) {
    for (let s = periodStart(view.within.from, level); s <= view.within.to; s = shiftPeriod(s, level, 1)) {
      const end = periodEnd(s, level);
      starts.push({ from: s < view.within.from ? view.within.from : s, to: end > view.within.to ? view.within.to : end });
    }
  } else {
    const period = level as ComparePeriod;
    const count = PERIOD_CHART[period];
    const current = periodStart(today, period);
    const firstData = rows.find((r) => r.profit > 0 || r.full > 0)?.date ?? today;
    const list: string[] = [];
    if (count === null) for (let s = periodStart(firstData, period); s <= current; s = shiftPeriod(s, period, 1)) list.push(s);
    else for (let i = count - 1; i >= 0; i--) list.push(shiftPeriod(current, period, -i));
    for (const s of list) starts.push({ from: s, to: periodEnd(s, period) });
  }
  const sum = (from: string, to: string) => Math.round(rows.filter((r) => r.date >= from && r.date <= to).reduce((n, r) => n + r.profit, 0));
  const day = (iso: string | undefined | null) => iso?.slice(0, 10);
  return starts.map(({ from, to }) => {
    const ahead = from > today;
    const r = rangesFor(level, from, to, today);
    const bucket: ChartBucket = { level, from, to, profit: ahead ? null : sum(r.current.from, r.current.to), previous: ahead ? null : sum(r.previous.from, r.previous.to), current: runningState(level, from, today) };
    if (level === "day") {
      bucket.events = {
        requests: inputs.joinRequests.filter((q) => day(q.createdAt) === from).length,
        paid: inputs.payments.filter((p) => p.status === "paid" && day(p.paidAt) === from).length,
        houses: inputs.stays.filter((st) => !st.isExample && st.status !== "draft" && st.status !== "draft_unclaimed" && day(st.createdAt) === from).length,
      };
    }
    return bucket;
  });
}

/**
 * The overview's main numbers over the period compared with (periodRanges): profit, full Houses and shared nights from the daily rows; the
 * shares (reservations, repeat guests) from the history's snapshots where there are some (the mock: week, month, year), else from the
 * monthly series of the month compared with – they need stored daily snapshots (TODO(backend): a nightly aggregate).
 */
export function previousOverview(inputs: Pick<AdminInputs, "stays" | "payments" | "history" | "today">, period: ChartLevel, ranges: ReturnType<typeof rangesFor> = periodRanges(inputs.today, period as ComparePeriod)): OverviewSnapshot {
  const { previous } = ranges;
  const totals = rangeTotals(inputs, previous.from, previous.to);
  // The stored snapshots stand for the running period only (the same day of the period before).
  const running = previous.to === periodRanges(inputs.today, period === "day" ? "week" : period).previous.to;
  const snap = running ? (inputs.history?.snapshots as Partial<Record<ChartLevel, OverviewSnapshot>> | undefined)?.[period] : undefined;
  const monthsBack = Math.round((dayMs(periodStart(inputs.today, "month")) - dayMs(periodStart(previous.to, "month"))) / (30.44 * DAY_MS));
  const repeatFromSeries = inputs.history?.series?.repeatRate.at(-1 - monthsBack) ?? null;
  return { profit: totals.profit, fullHouses: totals.full, sharedNights: totals.nights, reservedShare: snap?.reservedShare ?? null, repeatRate: snap?.repeatRate ?? repeatFromSeries };
}

/**
 * A monthly share series (history.series, the last value this month) at a day: between the month before's value and its month's, by how far
 * the month has run – so a week differs from the week before (`decimals`: 1 = to a tenth). Up to a year before the series its first value
 * (a year compared with the year before), earlier null.
 */
function shareAt(values: readonly number[] | undefined, date: string, today: string, decimals = 0): number | null {
  if (!values?.length) return null;
  const first = periodStart(date, "month");
  const back = Math.round((dayMs(periodStart(today, "month")) - dayMs(first)) / (30.44 * DAY_MS));
  const i = values.length - 1 - back;
  if (i < -values.length || i >= values.length) return null;
  if (i < 0) return values[0];
  const before = values[Math.max(0, i - 1)];
  const days = Math.round((dayMs(addMonths(first, 1)) - dayMs(first)) / DAY_MS);
  const ran = (Math.round((dayMs(date) - dayMs(first)) / DAY_MS) + 1) / days;
  const f = 10 ** decimals;
  return Math.round((before + (values[i] - before) * ran) * f) / f;
}

/**
 * The mock's connection rate of a stretch: the monthly series at its last day; a week (or day) is its own small cohort, so it wobbles by a
 * fixed −2…+2 points per week (a hash of its first day), kept inside the series' range.
 */
function connectionAt(series: readonly number[], level: ChartLevel, from: string, to: string, today: string): number | null {
  const base = shareAt(series, to, today);
  if (base === null || (level !== "week" && level !== "day")) return base;
  let h = 2166136261;
  for (const c of periodStart(from, "week")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.min(Math.max(...series), Math.max(Math.min(...series), base + ((h >>> 0) % 5) - 2));
}

/**
 * Verbindungsrate for the overview: with a history (the mock) its monthly series at the stretch's last day against the one compared with;
 * else from the records (afterMetrics: all answers so far, no comparison yet – TODO(backend): daily snapshots).
 */
export function connectionOverview(inputs: AdminInputs, ranges: ReturnType<typeof rangesFor>, level: ChartLevel) {
  const series = inputs.history?.series?.connectionRate;
  if (series) {
    const now = connectionAt(series, level, ranges.current.from, ranges.current.to, inputs.today);
    const before = connectionAt(series, level, ranges.previous.from, ranges.previous.to, inputs.today);
    return { value: now, change: getChange("connectionRate", now, before) };
  }
  return { value: afterMetrics(inputs).connectionRate.value, change: null };
}

export type HouseKind = "example" | "founding" | "real";

const DAY_MS = 86_400_000;

export const kindOf = (stay: Pick<Stay, "isExample" | "isFounding">): HouseKind => (stay.isExample ? "example" : stay.isFounding ? "founding" : "real");
/** A real House (founding ones are real too): not an example, not a draft. */
const isReal = (stay: Stay) => !stay.isExample && (stay.status === "published" || stay.status === "booked" || stay.status === "completed");
/** Real and still ahead or running: what the launch counts. */
const isLiveReal = (stay: Stay) => isReal(stay) && (stay.status === "published" || stay.status === "booked");
export const hubOf = (stay: Pick<Stay, "location" | "city">) => stay.location?.city ?? stay.city;
/** Reservations ("Vormerkungen"): the guests in besides the host – accepted, reserved (beta) or paid. */
export const reservationsOf = (stay: Pick<Stay, "spotsFilled">) => Math.max(0, stay.spotsFilled - 1);
export const fillRateOf = (stay: Pick<Stay, "spotsFilled" | "spotsTotal">) => (stay.spotsTotal > 0 ? Math.min(1, stay.spotsFilled / stay.spotsTotal) : 0);
const isFull = (stay: Stay) => stay.spotsTotal > 0 && stay.spotsFilled >= stay.spotsTotal;
const monthOf = (iso: string) => iso.slice(0, 7);

// ── Overview ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Progress {
  value: number;
  target: number;
  /** 0–1 */
  ratio: number;
}
const progress = (value: number, target: number): Progress => ({ value, target, ratio: target > 0 ? Math.min(1, value / target) : 0 });

export function overview({ stays, admin }: Pick<AdminInputs, "stays" | "admin">) {
  const real = stays.filter(isLiveReal);
  const reserved = real.filter((s) => reservationsOf(s) >= LAUNCH_CRITERIA.reservationsMin).length;
  return {
    realHouses: real.length,
    /** 0–1; null without real Houses */
    reservedShare: real.length ? reserved / real.length : null,
    waitlist: confirmedWaitlist(admin.waitlist).length,
    openApplications: admin.applications.filter((a) => a.status === "new").length,
  };
}

/** The launch criteria as progress (config/admin.ts LAUNCH_CRITERIA). */
export function launchProgress({ stays, admin }: Pick<AdminInputs, "stays" | "admin">) {
  const real = stays.filter(isLiveReal);
  const perHub = new Map<string, number>();
  for (const s of real) perHub.set(hubOf(s), (perHub.get(hubOf(s)) ?? 0) + 1);
  const hubs = [...perHub.values()].filter((n) => n >= LAUNCH_CRITERIA.hubMinHouses).length;
  const reserved = real.filter((s) => reservationsOf(s) >= LAUNCH_CRITERIA.reservationsMin).length;
  return {
    houses: progress(real.length, LAUNCH_CRITERIA.houses),
    hubs: progress(hubs, LAUNCH_CRITERIA.hubs.min),
    /** In percent points, so value and target read the same ("38 of 60 %") */
    reservedShare: progress(real.length ? Math.round((reserved / real.length) * 100) : 0, Math.round(LAUNCH_CRITERIA.reservedShare * 100)),
    // Only confirmed sign-ups count (double opt-in; unsubscribed ones never).
    waitlist: progress(confirmedWaitlist(admin.waitlist).length, LAUNCH_CRITERIA.waitlist),
  };
}

/** "YYYY-MM", `back` months before today's. */
function monthBefore(today: string, back: number): string {
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - back, 1)).toISOString().slice(0, 7);
}

/**
 * Full real Houses per month, the last 12 up to this one (so far), against the overview's monthly goal (config/policies.ts
 * OVERVIEW_GOALS.fullHousesPerMonth) – from the history where there is one (the mock), else counted from the Houses by their start month.
 */
export function fullHousesPerMonth(inputs: Pick<AdminInputs, "stays" | "history" | "today" | "payments">) {
  const { stays, history, today } = inputs;
  const full = stays.filter((s) => isReal(s) && isFull(s));
  const rows = Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i;
    const month = monthBefore(today, back);
    const level = history?.fullHousesPerMonth.find((h) => h.monthsAgo === back)?.full;
    const fromHistory = level === undefined ? undefined : back === 0 ? Math.round(level * monthSoFar(today)) : level;
    return { month, full: fromHistory ?? full.filter((s) => monthOf(s.startDate) === month).length };
  });
  const current = rows.at(-1)!.full;
  const target = OVERVIEW_GOALS.fullHousesPerMonth;
  return { rows, current, target, status: statusAgainst(current, target), progress: progress(current, target) };
}

// ── Houses ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface HouseRow {
  stay: Stay;
  kind: HouseKind;
  hub: string;
  fillRate: number;
  reservations: number;
  /** The kind of place (config/accommodation.ts) – unset: not given */
  typeLabel: string | null;
  /** The type's id (for the admin's German label) */
  typeId: string | null;
  category: AccommodationCategoryId | null;
}

/** Every House that isn't a draft: real ones first, then founding, then examples; fullest first within. */
export function houseRows({ stays }: Pick<AdminInputs, "stays">): HouseRow[] {
  const order: Record<HouseKind, number> = { real: 0, founding: 1, example: 2 };
  return stays
    .filter((s) => s.status !== "draft" && s.status !== "draft_unclaimed")
    .map((stay) => {
      const place = accommodationOf(stay.accommodationType);
      return { stay, kind: kindOf(stay), hub: hubOf(stay), fillRate: fillRateOf(stay), reservations: reservationsOf(stay), typeLabel: place?.type.label ?? null, typeId: place?.type.id ?? null, category: (place?.category.id as AccommodationCategoryId | undefined) ?? null };
    })
    .toSorted((a, b) => order[a.kind] - order[b.kind] || b.fillRate - a.fillRate || a.stay.startDate.localeCompare(b.stay.startDate));
}

export function houseKindCounts(rows: readonly HouseRow[]): Record<HouseKind, number> {
  return { real: rows.filter((r) => r.kind === "real").length, founding: rows.filter((r) => r.kind === "founding").length, example: rows.filter((r) => r.kind === "example").length };
}

// ── Waitlist ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Sign-ups over time (the running total per week, the last 12 weeks), by source (?src, none = "direct") and by category. */
/** The waitlist that counts: confirmed (double opt-in) and not unsubscribed. */
export function confirmedWaitlist(list: readonly WaitlistEntry[]): WaitlistEntry[] {
  return list.filter((e) => waitlistStatus(e) === "confirmed");
}

export function waitlistMetrics({ admin, today }: Pick<AdminInputs, "admin" | "today">) {
  const end = Date.parse(today) + DAY_MS;
  const weeks = Array.from({ length: 12 }, (_, i) => end - (11 - i) * 7 * DAY_MS);
  const overTime = weeks.map((weekEnd) => ({ week: new Date(weekEnd - DAY_MS).toISOString().slice(0, 10), total: admin.waitlist.filter((e) => Date.parse(e.createdAt) < weekEnd).length }));
  const bySource = countBy(admin.waitlist.map((e) => e.source ?? "direct"));
  const byInterest = countBy(admin.waitlist.flatMap((e) => e.interests));
  return {
    total: admin.waitlist.length,
    confirmed: confirmedWaitlist(admin.waitlist).length,
    pending: admin.waitlist.filter((e) => waitlistStatus(e) === "pending").length,
    unsubscribed: admin.waitlist.filter((e) => waitlistStatus(e) === "unsubscribed").length,
    wantsToHost: admin.waitlist.filter((e) => e.wantsToHost).length,
    referred: admin.waitlist.filter((e) => e.referredBy).length,
    lastWeek: admin.waitlist.filter((e) => Date.parse(e.createdAt) >= end - 7 * DAY_MS).length,
    overTime,
    bySource,
    byInterest: byInterest as { key: Vibe; count: number }[],
  };
}

function countBy<T extends string>(values: readonly T[]): { key: T; count: number }[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).toSorted((a, b) => b.count - a.count);
}

// ── Topics ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface TopicScore {
  vibe: Vibe;
  /** 0–100 */
  score: number;
  reservations: number;
  applications: number;
  waitlistInterest: number;
  /** 0–1: real Houses of the category with a host fee */
  hostFeeShare: number;
}

/** A score per category (config/admin.ts TOPIC_WEIGHTS): each signal scaled 0–100 against the strongest category, then weighted. */
export function topicScores({ stays, admin }: Pick<AdminInputs, "stays" | "admin">): TopicScore[] {
  const real = stays.filter(isReal);
  const raw = VIBES.map(({ key }) => {
    const houses = real.filter((s) => s.vibe === key);
    return {
      vibe: key,
      reservations: houses.reduce((n, s) => n + reservationsOf(s), 0),
      applications: admin.applications.filter((a) => a.topic === key).length,
      waitlistInterest: admin.waitlist.filter((e) => e.interests.includes(key)).length,
      hostFeeShare: houses.length ? houses.filter((s) => (s.hostFeePerPerson ?? 0) > 0).length / houses.length : 0,
    };
  });
  const max = (pick: (r: (typeof raw)[number]) => number) => Math.max(0, ...raw.map(pick));
  const scale = (value: number, top: number) => (top > 0 ? (value / top) * 100 : 0);
  const tops = { reservations: max((r) => r.reservations), applications: max((r) => r.applications), waitlistInterest: max((r) => r.waitlistInterest), hostFeeShare: max((r) => r.hostFeeShare) };
  return raw
    .map((r) => ({
      ...r,
      score: Math.round(
        TOPIC_WEIGHTS.reservations * scale(r.reservations, tops.reservations) +
          TOPIC_WEIGHTS.applications * scale(r.applications, tops.applications) +
          TOPIC_WEIGHTS.waitlistInterest * scale(r.waitlistInterest, tops.waitlistInterest) +
          TOPIC_WEIGHTS.hostFeeShare * scale(r.hostFeeShare, tops.hostFeeShare),
      ),
    }))
    .toSorted((a, b) => b.score - a.score);
}

// ── Algorithm ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const FILL_BUCKETS = [
  { key: "0-3", max: 3 },
  { key: "4-7", max: 7 },
  { key: "8-14", max: 14 },
  { key: "15-30", max: 30 },
  { key: "30+", max: Infinity },
] as const;

/**
 * The network: mutual "Your people" (both confirmed "Lived with", lib/yourPeople.ts), the repeat rate (guests in two or more real Houses) and
 * the time until a House is full (from opening to the last accepted request).
 */
export function algorithmMetrics({ stays, joinRequests, livedWith, history }: Pick<AdminInputs, "stays" | "joinRequests" | "livedWith"> & { history?: MetricsHistory | null }) {
  // The network from the history where there is one (the mock: realistic values), else counted from the records.
  const n = history?.network;
  if (n) {
    return {
      ...n,
      mutualShare: n.allPairs ? n.mutualPairs / n.allPairs : null,
      repeatRate: n.guests ? n.repeatGuests / n.guests : null,
      daysToFullBuckets: [...n.daysToFullBuckets],
    };
  }
  // Mutual pairs: each unordered pair once, mutual when both directions are confirmed.
  const pairs = new Map<string, { a: boolean; b: boolean }>();
  for (const l of livedWith) {
    const [x, y] = [l.userId, l.otherUserId].sort();
    const key = `${x}|${y}`;
    const pair = pairs.get(key) ?? { a: false, b: false };
    if (l.confirmedAt) pair[l.userId === x ? "a" : "b"] = true;
    pairs.set(key, pair);
  }
  const mutual = [...pairs.entries()].filter(([, p]) => p.a && p.b);
  const peopleWithMutual = new Set(mutual.flatMap(([key]) => key.split("|"))).size;

  const realIds = new Set(stays.filter(isReal).map((s) => s.id));
  const housesPerGuest = new Map<string, number>();
  for (const r of joinRequests) if (r.status === "accepted" && realIds.has(r.stayId)) housesPerGuest.set(r.userId, (housesPerGuest.get(r.userId) ?? 0) + 1);
  const guests = housesPerGuest.size;
  const repeat = [...housesPerGuest.values()].filter((n) => n >= 2).length;

  const daysToFull = stays
    .filter((s) => isReal(s) && isFull(s))
    .flatMap((s) => {
      const last = joinRequests.filter((r) => r.stayId === s.id && r.status === "accepted").reduce<string | null>((max, r) => (!max || r.createdAt > max ? r.createdAt : max), null);
      if (!last) return [];
      return [Math.max(0, Math.round((Date.parse(last) - Date.parse(s.createdAt)) / DAY_MS))];
    })
    .toSorted((a, b) => a - b);
  const median = daysToFull.length ? daysToFull[Math.floor(daysToFull.length / 2)] : null;
  let floor = -1;
  const buckets = FILL_BUCKETS.map(({ key, max }) => {
    const count = daysToFull.filter((d) => d > floor && d <= max).length;
    floor = max;
    return { key, count };
  });

  return {
    mutualPairs: mutual.length,
    allPairs: pairs.size,
    /** 0–1, null without pairs */
    mutualShare: pairs.size ? mutual.length / pairs.size : null,
    peopleWithMutual,
    guests,
    repeatGuests: repeat,
    /** 0–1, null without guests */
    repeatRate: guests ? repeat / guests : null,
    fullHouses: daysToFull.length,
    medianDaysToFull: median,
    daysToFullBuckets: buckets,
  };
}

// ── Money ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What Simpulo keeps from a payment: the guest's service fee and its share of the host fee. */
const keptOf = (p: Payment) => p.fee + ((p.hostFee ?? 0) * FEE_MODEL.hostFeeCommissionPercent) / 100;

/** A House-currency amount in EUR (the mock's fixed rates, lib/currency.ts); unknown currencies count as EUR. */
function toEur(amount: number, stays: readonly Stay[], stayId: string): number {
  const currency = stays.find((s) => s.id === stayId)?.currency;
  return currency && isCurrency(currency) ? convert(amount, currency, "EUR") : amount;
}

/** Profit (revenue − costs) this month, per full House this month, and in all – from the days (dailyRows). No money target. */
export function money(inputs: DayInputs) {
  const months = profitPerMonth(inputs);
  const thisMonth = months.at(-1)!.profit;
  const total = Math.round(dailyRows(inputs).reduce((n, r) => n + r.profit, 0));
  const fullThisMonth = fullHousesPerMonth({ ...inputs, history: inputs.history ?? null }).current;
  return {
    profitThisMonth: thisMonth,
    perHouse: fullThisMonth > 0 ? Math.round(thisMonth / fullThisMonth) : null,
    total,
  };
}

/** Profit (revenue − costs) per month, the last 12 up to this one (so far) – from the days (dailyRows), one source. */
export function profitPerMonth(inputs: DayInputs) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = monthBefore(inputs.today, 11 - i);
    const end = isoDay(dayMs(addMonths(`${month}-01`, 1)) - DAY_MS);
    const profit = rangeTotals(inputs, `${month}-01`, end < inputs.today ? end : inputs.today).profit;
    return { month, profit };
  });
}

// ── Cockpit ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type CockpitKey = "fullHouses" | "reservedShare" | "repeatRate" | "perHouse";

export interface CockpitNumber {
  key: CockpitKey;
  /** The number (null = none yet) */
  value: number | null;
  /** How it reads: "count" · "percent" (value 0–100) · "eur" */
  format: "count" | "percent" | "eur";
  /** The target it is measured against (its status dot) */
  target: number;
  status: Status | null;
  /** Against the day compared with (getChange); null = no earlier value */
  change: Change | null;
}

/**
 * The overview (Übersicht) for a period (Tag · Woche · Monat · Quartal · Jahr): profit, full Houses and shared nights in the running period up
 * to today (rangeTotals), each against the same span of the period before (periodRanges) and its monthly target scaled to the period
 * (periodTarget; full Houses only – no money targets); the shares (reservations, repeat guests) with their fixed targets.
 */
export function cockpit(inputs: AdminInputs, period: ComparePeriod, focus: { level: ComparePeriod; from: string } | null = null) {
  const o = overview(inputs);
  const a = algorithmMetrics(inputs);
  const pct = (ratio: number | null) => (ratio === null ? null : Math.round(ratio * 100));
  const reserved = pct(o.reservedShare);
  const repeat = pct(a.repeatRate);
  // A bar opened in the chart (drill-down): its stretch instead of the running period – the numbers follow it.
  const level = focus?.level ?? period;
  const ranges = focus ? rangesFor(focus.level, focus.from, periodEnd(focus.from, focus.level), inputs.today) : periodRanges(inputs.today, period);
  const now = rangeTotals(inputs, ranges.current.from, ranges.current.to);
  const prev = previousOverview(inputs, level, ranges);
  const perHouse = now.full > 0 ? Math.round(now.profit / now.full) : null;
  const prevPerHouse = prev.profit !== null && prev.fullHouses ? Math.round(prev.profit / prev.fullHouses) : null;
  // Targets are monthly; counts and euros scale to the period (periodTarget), shares stay.
  // Full Houses: the overview's own monthly goal (config/policies.ts OVERVIEW_GOALS, not the launch criterion), scaled to the period.
  const fullTarget = periodTarget(OVERVIEW_GOALS.fullHousesPerMonth, level, "count");
  const perHouseTarget = feeModelPerFullHouse();
  const number = (key: CockpitKey, value: number | null, format: CockpitNumber["format"], target: number, previous: number | null, metric: ChangeMetric): CockpitNumber => ({
    key,
    value,
    format,
    target,
    status: statusAgainst(value, target),
    change: getChange(metric, value, previous),
  });

  return {
    period,
    level,
    ranges,
    compareDate: ranges.previous.to,
    /** Profit in the period up to today against the same span of the period before – no money target. */
    profit: { current: now.profit, change: getChange("profit", now.profit, prev.profit) },
    /** Shared nights (people × nights in full Houses) in the period – no target. */
    nights: { current: now.nights, change: getChange("sharedNights", now.nights, prev.sharedNights ?? null) },
    areas: [
      { key: "supply", href: "/admin/houses", number: number("fullHouses", now.full, "count", fullTarget, prev.fullHouses, "fullHouses") },
      { key: "demand", href: "/admin/growth", number: number("reservedShare", reserved, "percent", OVERVIEW_TARGETS.reservedShare, prev.reservedShare, "reservedShare") },
      { key: "quality", href: "/admin/data", number: number("repeatRate", repeat, "percent", OVERVIEW_TARGETS.repeatRate, prev.repeatRate, "repeatRate") },
      { key: "money", href: "/admin/money", number: number("perHouse", perHouse, "eur", perHouseTarget, prevPerHouse, "perHouse") },
    ] as const,
  };
}

/** One capsule in "Braucht dich", in order of urgency (lib/admin/tasks.ts needsYou). */
export type NeedsYou =
  | { key: "safety" | "money" | "deadline" | "atRisk" | "applications" | "hostWarning" | "partners" | "tickets"; count: number }
  | { key: "launch"; count: number; met: number; total: number };

/** The launch criteria met (of all) – "Braucht dich" in pre-launch and beta. */
export function launchCriteriaMet(inputs: Pick<AdminInputs, "stays" | "admin">) {
  const launch = launchProgress(inputs);
  const criteria = [launch.houses, launch.hubs, launch.reservedShare, launch.waitlist];
  return { met: criteria.filter((c) => c.ratio >= 1).length, total: criteria.length };
}

// ── Data & Algorithm ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A hypothesis's verdict as a status colour: supported good, open warning, rejected critical (Admin › Data & Algorithm). */
export function hypothesisStatus(status: HypothesisStatus): Status {
  return status === "supported" ? "good" : status === "rejected" ? "critical" : "warning";
}

/** Algorithmus › Fluss: each model's success number, short for its block ("41 % gegenseitig", "9 von 38 ohne House"); null – "—". */
export function modelMeasuresShort(inputs: AdminInputs): Record<ModelId, string | null> {
  const a = algorithmMetrics(inputs);
  const real = inputs.stays.filter(isLiveReal);
  const unmet = inputs.admin.waitlist.filter((e) => e.where && !e.interests.some((v) => real.some((s) => s.vibe === v && hubOf(s) === e.where))).length;
  return {
    interestRanking: null,
    crewFit: a.mutualShare === null ? null : `${Math.round(a.mutualShare * 100)} % gegenseitig`,
    houseChemistry: null,
    demandMap: inputs.admin.waitlist.length === 0 ? null : `${unmet} von ${inputs.admin.waitlist.length} offen`,
    marketingImpact: null,
    spaceEffect: null,
    placeFit: null,
  };
}

/**
 * A hypothesis as a bar (Algorithmus › Thesen): the numbers inside its target and its value now ("≥ 30 % schneller", "41 % schneller";
 * "≥ 1,5×", "2,1×") – null where either is missing (no measure yet).
 */
export function hypothesisBar(target: string | undefined, current: string | undefined): { now: number; target: number; max: number } | null {
  const numberIn = (text: string | undefined) => {
    const m = text?.match(/-?\d+(?:[.,]\d+)?/);
    return m ? Number(m[0].replace(",", ".")) : null;
  };
  const t = numberIn(target);
  const n = numberIn(current);
  if (t === null || n === null) return null;
  return { now: n, target: t, max: Math.max(t * 1.5, n) * 1.05 };
}

/** Each model's success measure today, where the data already has it (null = not measured yet). */
export function modelMeasures(inputs: AdminInputs): Record<ModelId, string | null> {
  const a = algorithmMetrics(inputs);
  // Demand without supply: waitlist wishes (place + category) with no real House of that category in that place.
  const real = inputs.stays.filter(isLiveReal);
  const unmet = inputs.admin.waitlist.filter((e) => e.where && !e.interests.some((v) => real.some((s) => s.vibe === v && hubOf(s) === e.where))).length;
  return {
    interestRanking: null,
    crewFit: a.mutualShare === null ? null : `${Math.round(a.mutualShare * 100)} % gegenseitig`,
    houseChemistry: null,
    demandMap: `${unmet} von ${inputs.admin.waitlist.length} Wünschen auf der Warteliste ohne House`,
    marketingImpact: null,
    spaceEffect: null,
    placeFit: null,
  };
}

// ── Support ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Still to answer: new or open, not merged into another. */
export const isOpenTicket = (t: SupportTicket) => !t.mergedInto && (t.status === "new" || t.status === "open");

/** The inbox's numbers: open tickets (its status – any open safety ticket makes it critical), per category, the ideas by votes. */
export function supportMetrics(tickets: readonly SupportTicket[]) {
  const open = tickets.filter(isOpenTicket);
  const openSafety = open.filter((t) => t.category === "safety").length;
  const statuses = [getStatus("openTickets", open.length), getStatus("openSafetyTickets", openSafety)];
  const openStatus = statuses.includes("critical") ? "critical" : statuses.includes("warning") ? "warning" : statuses[0];
  return {
    open: open.length,
    openSafety,
    openStatus,
    perCategory: Object.fromEntries(TICKET_CATEGORIES.map((c) => [c, tickets.filter((t) => t.category === c && !t.mergedInto).length])) as Record<TicketCategory, number>,
    ideas: tickets.filter((t) => t.category === "idea" && !t.mergedInto).toSorted((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt)),
  };
}

/** The inbox order: open safety first, then new and open by date (newest first), then the rest. */
export function sortTickets(tickets: readonly SupportTicket[]): SupportTicket[] {
  const rank = (t: SupportTicket) => (t.category === "safety" && isOpenTicket(t) ? 0 : isOpenTicket(t) ? 1 : 2);
  return tickets.toSorted((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
}

// ── Money: what's left ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** This year: profit − tax reserve (TAX_RESERVE_PERCENT) − private withdrawals = what's still in the company. */
export function companyBalance(inputs: DayInputs & Pick<AdminInputs, "admin">) {
  const year = inputs.today.slice(0, 4);
  const profit = profitPerMonth(inputs)
    .filter((r) => r.month.startsWith(year))
    .reduce((n, r) => n + r.profit, 0);
  const taxReserve = Math.round((profit * TAX_RESERVE_PERCENT) / 100);
  const withdrawals = inputs.admin.withdrawals.filter((w) => w.date.startsWith(year)).reduce((n, w) => n + w.amount, 0);
  return { year, profit, taxReserve, taxPercent: TAX_RESERVE_PERCENT, withdrawals, left: profit - taxReserve - withdrawals };
}

/**
 * What each live source brought this month (EUR): the guests' service fees and Simpulo's share of host fees. With a history (the mock) this
 * month's profit is split in the ratio the paid payments show; without one, this month's paid payments themselves.
 */
export function revenueBySource(inputs: Pick<AdminInputs, "stays" | "payments" | "history" | "today">): Record<RevenueMeasure, number> {
  const paid = inputs.payments.filter((p) => p.status === "paid" && p.paidAt);
  // In EUR: the Houses' currencies differ (IDR, THB …), the sums and the ratio must not mix them.
  const feeOf = (p: Payment) => toEur(p.fee, inputs.stays, p.stayId);
  const hostShareOf = (p: Payment) => toEur(((p.hostFee ?? 0) * FEE_MODEL.hostFeeCommissionPercent) / 100, inputs.stays, p.stayId);
  if (!inputs.history) {
    const month = paid.filter((p) => monthOf(p.paidAt!) === monthOf(inputs.today));
    return { serviceFee: Math.round(month.reduce((n, p) => n + feeOf(p), 0)), hostFeeShare: Math.round(month.reduce((n, p) => n + hostShareOf(p), 0)) };
  }
  const fees = paid.reduce((n, p) => n + feeOf(p), 0);
  const shares = paid.reduce((n, p) => n + hostShareOf(p), 0);
  const thisMonth = profitPerMonth(inputs).at(-1)!.profit;
  const serviceFee = Math.round(thisMonth * (fees + shares > 0 ? fees / (fees + shares) : 1));
  return { serviceFee, hostFeeShare: thisMonth - serviceFee };
}

/** The most full real Houses this month in one hub (city) – Vision › Breadth & Depth, V2. */
export function fullHousesInOneHub({ stays, today }: Pick<AdminInputs, "stays" | "today">): number {
  const month = monthOf(today);
  const counts = countBy(stays.filter((s) => isReal(s) && isFull(s) && monthOf(s.startDate) === month).map((s) => hubOf(s)));
  return Math.max(0, ...counts.map((c) => c.count));
}

/** A depth unlock's value today, where it can be measured (config/vision.ts BREADTH_DEPTH); null = not measurable yet. */
export function depthUnlockValue(measure: DepthUnlockMeasure, inputs: AdminInputs): number | null {
  if (measure === "fullHousesInOneHub") return fullHousesInOneHub(inputs);
  return null;
}

/** The matrix phase (0 Pre-launch … 4 Full): pre-launch while the platform is; then by real Houses (MATRIX_HOUSES_FROM). */
export function visionPhase(inputs: Pick<AdminInputs, "stays" | "phase">): number {
  if (inputs.phase === "prelaunch") return 0;
  const real = inputs.stays.filter(isReal).length;
  return real >= MATRIX_HOUSES_FROM.full ? 4 : real >= MATRIX_HOUSES_FROM.scale ? 3 : real >= MATRIX_HOUSES_FROM.growth ? 2 : 1;
}

// ── Host tiers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The suggested tier (config/admin.ts HOST_TIER_RULES): from the follower threshold anchor, else with a host fee pro, else share. */
export function suggestTier(hasHostFee: boolean, followers: number): HostTier {
  if (followers >= HOST_TIER_RULES.anchorFromFollowers) return "anchor";
  return hasHostFee ? "pro" : "share";
}

/** An application's tier: set by hand, else suggested (a pro application means a host fee). */
export function applicationTier(a: HostApplication): { tier: HostTier; manual: boolean } {
  return a.hostTier ? { tier: a.hostTier, manual: true } : { tier: suggestTier(a.hostType === "pro", a.audienceSize ?? 0), manual: false };
}

export interface HostRow {
  user: User;
  /** Their real Houses (no examples) */
  houses: Stay[];
  hubs: string[];
  followers: number;
  tier: HostTier;
  manual: boolean;
}

/** Everyone hosting at least one real House, most Houses first – with their tier (by hand, else suggested from their Houses' host fees). */
export function hostRows({ stays, users }: Pick<AdminInputs, "stays" | "users">): HostRow[] {
  const byHost = new Map<string, Stay[]>();
  for (const stay of stays.filter(isReal)) byHost.set(stay.hostId, [...(byHost.get(stay.hostId) ?? []), stay]);
  return [...byHost.entries()]
    .flatMap(([id, houses]) => {
      const user = users.find((u) => u.id === id);
      if (!user) return [];
      const followers = user.audienceSize ?? 0;
      const suggested = suggestTier(houses.some((h) => (h.hostFeePerPerson ?? 0) > 0), followers);
      return [{ user, houses, hubs: [...new Set(houses.map(hubOf))], followers, tier: user.hostTier ?? suggested, manual: Boolean(user.hostTier) }];
    })
    .toSorted((a, b) => b.houses.length - a.houses.length || a.user.name.localeCompare(b.user.name));
}

/**
 * Cockpit › Supply: hosts per tier, and the anchors against the target – 1–2 per topic and hub (ANCHOR_TARGET), counted over the topic–hub
 * pairs the real Houses cover.
 */
export function hostMix(inputs: Pick<AdminInputs, "stays" | "users">) {
  const rows = hostRows(inputs);
  const counts = Object.fromEntries(HOST_TIERS.map((tier) => [tier, rows.filter((r) => r.tier === tier).length])) as Record<HostTier, number>;
  const pairs = new Set(inputs.stays.filter(isReal).map((s) => `${s.vibe}|${hubOf(s)}`)).size;
  return { counts, anchors: counts.anchor, target: { min: pairs * ANCHOR_TARGET.perTopicAndHub.min, max: pairs * ANCHOR_TARGET.perTopicAndHub.max } };
}

// ── By kind of place (Houses › By type) ──────────────────────────────────────────────────────────────────────────────────────────

/** Days from opening to the last accepted request, for a full House; null when not full or unknown. */
function daysToFullOf(stay: Stay, joinRequests: readonly JoinRequest[]): number | null {
  if (!isFull(stay)) return null;
  const last = joinRequests.filter((r) => r.stayId === stay.id && r.status === "accepted").reduce<string | null>((max, r) => (!max || r.createdAt > max ? r.createdAt : max), null);
  return last ? Math.max(0, Math.round((Date.parse(last) - Date.parse(stay.createdAt)) / DAY_MS)) : null;
}

/**
 * Per accommodation category, over the real Houses: how many, mean fill rate, median days to full, repeat rate (its accepted guests who are
 * in two or more real Houses) and what Simpulo kept per House (paid payments: service fee + host fee share, in EUR). Categories without Houses
 * stay in the list with null values; "not set" collects Houses without a type.
 */
export function byAccommodation({ stays, joinRequests, payments }: Pick<AdminInputs, "stays" | "joinRequests" | "payments">) {
  const real = stays.filter(isReal);
  const realIds = new Set(real.map((s) => s.id));
  const housesPerGuest = new Map<string, number>();
  for (const r of joinRequests) if (r.status === "accepted" && realIds.has(r.stayId)) housesPerGuest.set(r.userId, (housesPerGuest.get(r.userId) ?? 0) + 1);
  const row = (houses: readonly Stay[]) => {
    const ids = new Set(houses.map((s) => s.id));
    const days = houses.flatMap((s) => daysToFullOf(s, joinRequests) ?? []).toSorted((a, b) => a - b);
    const guests = new Set(joinRequests.filter((r) => r.status === "accepted" && ids.has(r.stayId)).map((r) => r.userId));
    const repeat = [...guests].filter((g) => (housesPerGuest.get(g) ?? 0) >= 2).length;
    const kept = payments.filter((p) => p.status === "paid" && ids.has(p.stayId)).reduce((n, p) => n + toEur(keptOf(p), stays, p.stayId), 0);
    return {
      houses: houses.length,
      fillRate: houses.length ? houses.reduce((n, s) => n + fillRateOf(s), 0) / houses.length : null,
      daysToFull: days.length ? days[Math.floor(days.length / 2)] : null,
      repeatRate: guests.size ? repeat / guests.size : null,
      revenuePerHouse: houses.length ? Math.round(kept / houses.length) : null,
    };
  };
  const categoryOf = (s: Stay) => accommodationOf(s.accommodationType)?.category.id ?? null;
  const rows = ACCOMMODATION_CATEGORIES.map((c) => ({ id: c.id as AccommodationCategoryId | null, label: c.label, ...row(real.filter((s) => categoryOf(s) === c.id)) }));
  const unset = real.filter((s) => categoryOf(s) === null);
  return unset.length ? [...rows, { id: null, label: null, ...row(unset) }] : rows;
}

// ── Analyse: money and retention by angle ───────────────────────────────────────────────────────────────────────────────────────

export type AnalysisPeriod = "30d" | "year" | "all";
export type AnalysisDimension = "topic" | "length" | "crew" | "category" | "origin" | "hub" | "tier" | "depth";
/** "depth" (Tiefe) only while the depth choice is on (config/platform.ts) – analysisDimensions(depthOn). "origin" (Ort-Herkunft): the host's own
 *  saved place (a window, HouseOutcome.placeId) or a place found for the House. */
export const ANALYSIS_DIMENSIONS: readonly AnalysisDimension[] = ["topic", "length", "crew", "category", "origin", "hub", "tier", "depth"];
export const analysisDimensions = (depthOn: boolean) => ANALYSIS_DIMENSIONS.filter((d) => depthOn || d !== "depth");
/** kurz ≤ 5 nights · mittel 1–3 weeks (6–27) · lang 4+ weeks (28+) */
/** The bands of Analyse › Länge and Spektrum – one definition (config/spectrum.ts LENGTH_BOUNDS): Kurz 1–5, Mittel 6–20, Lang 21+ nights. */
export const lengthBand = (nights: number) => (nights <= LENGTH_BOUNDS.shortMax ? "short" : nights <= LENGTH_BOUNDS.midMax ? "mid" : "long");
/** 2–4 · 5–8 · 9+ (host included) */
/** The bands of Analyse › Crew and Spektrum (config/spectrum.ts SIZE_BOUNDS): 2–3, 4–6, 7+ people, host included. */
export const crewBand = (size: number) => (size <= SIZE_BOUNDS.smallMax ? "2-3" : size <= SIZE_BOUNDS.midMax ? "4-6" : "7+");

/** The real records as outcomes: past real Houses with their accepted guests, what Simpulo kept (EUR), how fast they filled. */
export function outcomesFromRecords({ stays, users, joinRequests, payments, today }: Pick<AdminInputs, "stays" | "users" | "joinRequests" | "payments" | "today">): HouseOutcome[] {
  const tiers = new Map(hostRows({ stays, users }).map((r) => [r.user.id, r.tier]));
  return stays
    .filter((s) => isReal(s) && s.startDate <= today)
    .map((s) => {
      const paid = payments.filter((p) => p.stayId === s.id && p.status === "paid");
      return {
        id: s.id,
        hostId: s.hostId,
        topic: s.vibe,
        nights: Math.max(1, Math.round((Date.parse(s.endDate) - Date.parse(s.startDate)) / DAY_MS)),
        crewSize: s.spotsTotal,
        category: accommodationOf(s.accommodationType)?.category.id ?? null,
        hub: hubOf(s),
        tier: tiers.get(s.hostId) ?? "share",
        startDate: s.startDate,
        guestIds: joinRequests.filter((r) => r.stayId === s.id && r.status === "accepted").map((r) => r.userId),
        guestCountries: joinRequests.filter((r) => r.stayId === s.id && r.status === "accepted").map((r) => users.find((u) => u.id === r.userId)?.country ?? null),
        serviceFee: Math.round(paid.reduce((n, p) => n + toEur(p.fee, stays, s.id), 0)),
        hostFeeShare: Math.round(paid.reduce((n, p) => n + toEur(((p.hostFee ?? 0) * FEE_MODEL.hostFeeCommissionPercent) / 100, stays, s.id), 0)),
        daysToFull: daysToFullOf(s, joinRequests),
        fillRate: fillRateOf(s),
        depth: s.depth ?? "balanced",
        placeId: s.placeId ?? null,
      };
    });
}

const outcomesOf = (inputs: AdminInputs) => inputs.outcomes ?? outcomesFromRecords(inputs);

/** The period's first day (inclusive) and its length in days – for "per year" figures. */
function periodRange(period: AnalysisPeriod, today: string, outcomes: readonly HouseOutcome[]): { from: string; days: number } {
  const end = Date.parse(`${today}T00:00:00Z`);
  const fromMs = period === "30d" ? end - 30 * DAY_MS : period === "year" ? Date.parse(`${today.slice(0, 4)}-01-01T00:00:00Z`) : Date.parse(`${outcomes[0]?.startDate ?? today}T00:00:00Z`);
  return { from: new Date(fromMs).toISOString().slice(0, 10), days: Math.max(1, Math.round((end - fromMs) / DAY_MS)) };
}

const keptOfOutcome = (o: HouseOutcome) => o.serviceFee + o.hostFeeShare;

export interface AnalysisRow {
  key: string;
  houses: number;
  /** EUR per person per stay */
  revenuePerPerson: number | null;
  revenuePerHouse: number | null;
  daysToFull: number | null;
  /** 0–1 */
  fillRate: number | null;
  /** 0–1: guests with two or more stays in the last 12 months */
  repeat12: number | null;
  /** EUR: revenue per stay × stays per person in a year */
  valuePerPersonYear: number | null;
  /** 0–1: mutual "Mit dir wieder" among the answered pairs; null without answers (the rating isn't built – mock example values only) */
  againMutual: number | null;
  /** fewer than ANALYSIS_MIN_HOUSES */
  tooFew: boolean;
}

/** Stays per guest over the last 12 months (all Houses) – for repeat and "per year". */
function staysLastYear(outcomes: readonly HouseOutcome[], today: string): Map<string, number> {
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - 365 * DAY_MS).toISOString().slice(0, 10);
  const stays = new Map<string, number>();
  for (const o of outcomes) if (o.startDate >= from && o.startDate <= today) for (const g of o.guestIds) stays.set(g, (stays.get(g) ?? 0) + 1);
  return stays;
}

function analysisRow(key: string, group: readonly HouseOutcome[], stays: Map<string, number>): AnalysisRow {
  const people = group.reduce((n, o) => n + o.guestIds.length, 0);
  const revenue = group.reduce((n, o) => n + keptOfOutcome(o), 0);
  const days = group.flatMap((o) => (o.daysToFull === null ? [] : [o.daysToFull])).toSorted((a, b) => a - b);
  const guests = [...new Set(group.flatMap((o) => o.guestIds))];
  const perYear = guests.length ? guests.reduce((n, g) => n + Math.max(1, stays.get(g) ?? 1), 0) / guests.length : null;
  const perPerson = people ? revenue / people : null;
  return {
    key,
    houses: group.length,
    revenuePerPerson: perPerson === null ? null : Math.round(perPerson),
    revenuePerHouse: group.length ? Math.round(revenue / group.length) : null,
    daysToFull: days.length ? days[Math.floor(days.length / 2)] : null,
    fillRate: group.length ? group.reduce((n, o) => n + o.fillRate, 0) / group.length : null,
    repeat12: guests.length ? guests.filter((g) => (stays.get(g) ?? 0) >= 2).length / guests.length : null,
    valuePerPersonYear: perPerson === null || perYear === null ? null : Math.round(perPerson * perYear),
    againMutual: againShare(group),
    tooFew: group.length < ANALYSIS_MIN_HOUSES,
  };
}

function againShare(group: readonly HouseOutcome[]): number | null {
  const pairs = group.reduce((n, o) => n + (o.againPairs ?? 0), 0);
  return pairs ? group.reduce((n, o) => n + (o.againMutual ?? 0), 0) / pairs : null;
}

function dimensionKey(dimension: AnalysisDimension, o: HouseOutcome): string {
  if (dimension === "depth") return o.depth ?? "balanced";
  if (dimension === "topic") return o.topic;
  if (dimension === "length") return lengthBand(o.nights);
  if (dimension === "crew") return crewBand(o.crewSize);
  if (dimension === "category") return o.category ?? "unset";
  if (dimension === "origin") return o.placeId ? "own" : "new";
  if (dimension === "hub") return o.hub;
  return o.tier;
}

/**
 * Admin › Analyse: per angle (topic, length, crew size, kind of place, hub, host tier) the Houses that started in the period – revenue per
 * person and per House, days to full, fill rate, repeat guests (12 months), value per person per year. Most valuable first.
 */
/**
 * Analyse › Sortieren "Wachstum": per group, the Houses that began in the period against the period of the same length before it (−0.25 =
 * a quarter fewer); null for "Gesamt" or without Houses before.
 */
export function analysisGrowth(inputs: AdminInputs, dimension: AnalysisDimension, period: AnalysisPeriod): Map<string, number | null> {
  const outcomes = outcomesOf(inputs);
  const { from, days } = periodRange(period, inputs.today, outcomes);
  const before = new Date(Date.parse(`${from}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
  const count = (lo: string, hi: string) => {
    const counts = new Map<string, number>();
    for (const o of outcomes) if (o.startDate >= lo && o.startDate < hi) counts.set(dimensionKey(dimension, o), (counts.get(dimensionKey(dimension, o)) ?? 0) + 1);
    return counts;
  };
  const now = count(from, `${inputs.today}~`);
  const prev = count(before, from);
  return new Map([...now].map(([key, n]) => [key, period === "all" || !prev.get(key) ? null : n / prev.get(key)! - 1]));
}

export function analysisRows(inputs: AdminInputs, dimension: AnalysisDimension, period: AnalysisPeriod): AnalysisRow[] {
  const outcomes = outcomesOf(inputs);
  const { from } = periodRange(period, inputs.today, outcomes);
  const inPeriod = outcomes.filter((o) => o.startDate >= from && o.startDate <= inputs.today);
  const stays = staysLastYear(outcomes, inputs.today);
  const groups = new Map<string, HouseOutcome[]>();
  for (const o of inPeriod) {
    const key = dimensionKey(dimension, o);
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups.entries()].map(([key, group]) => analysisRow(key, group, stays)).toSorted((a, b) => (b.valuePerPersonYear ?? -1) - (a.valuePerPersonYear ?? -1));
}

/** One column of Analyse › Spektrum. */
export interface SpectrumCell {
  key: string;
  houses: number;
  /** Share of the period's Houses, 0–1 */
  share: number;
  /** Simpulo's service fee per paid booking (EUR) – the overview's „Ø pro Buchung · Gast“ */
  perBooking: number | null;
  /** Mutual „Mit dir wieder“ of the crew pairs who answered, 0–1 (the Houses' outcomes) */
  connection: number | null;
  /** Guests with 2+ Houses in the last 12 months, 0–1 */
  repeat: number | null;
  /** Median days until full */
  daysToFull: number | null;
  /** „Wer bucht“: the top topics (by Houses) and the guests' top countries */
  topTopics: { key: string; count: number }[];
  topCountries: { key: string; count: number }[];
  /** Under SPECTRUM_SPARSE_SHARE of the Houses – the one hint */
  sparse: boolean;
}

const topOf = (values: readonly (string | null | undefined)[]) => {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ key, count })).toSorted((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, SPECTRUM_TOP);
};

/**
 * Analyse › Spektrum: the Houses that started in the period (Woche · Monat · Quartal · Jahr, the running one up to today) – when the
 * running period has none yet (the outcomes are the Houses that ran), the last full one, and `fallback` says so – in three rows of three
 * equal columns (config/spectrum.ts: Länge, Größe, Host), each with its share, € per booking, connection rate, repeat guests, days to full
 * and who books. `averages`: guests per House and € per booking over all of them (also for the planning matrix).
 */
export function spectrum(inputs: AdminInputs, period: ComparePeriod) {
  const outcomes = outcomesOf(inputs);
  const current = periodRanges(inputs.today, period).current;
  const inRange = (from: string, to: string) => outcomes.filter((o) => o.startDate >= from && o.startDate <= to);
  let range = { from: current.from, to: current.to };
  let list = inRange(range.from, range.to);
  const fallback = list.length === 0;
  if (fallback) {
    const from = shiftPeriod(current.from, period, -1);
    range = { from, to: periodEnd(from, period) };
    list = inRange(range.from, range.to);
  }
  const stays = staysLastYear(outcomes, inputs.today);
  const keyOf: Record<SpectrumRowKey, (o: HouseOutcome) => string> = { length: (o) => lengthBand(o.nights), size: (o) => crewBand(o.crewSize), host: (o) => o.tier };
  const perBooking = (group: readonly HouseOutcome[]) => {
    const guests = group.reduce((n, o) => n + o.guestIds.length, 0);
    return guests ? Math.round(group.reduce((n, o) => n + o.serviceFee, 0) / guests) : null;
  };
  const rows = SPECTRUM_ROWS.map((row) => ({
    key: row.key,
    columns: row.columns.map((col): SpectrumCell => {
      const group = list.filter((o) => keyOf[row.key](o) === col.key);
      const base = analysisRow(col.key, group, stays);
      const share = list.length ? group.length / list.length : 0;
      return {
        key: col.key,
        houses: group.length,
        share,
        perBooking: perBooking(group),
        connection: againShare(group),
        repeat: base.repeat12,
        daysToFull: base.daysToFull,
        topTopics: topOf(group.map((o) => o.topic)),
        topCountries: topOf(group.flatMap((o) => o.guestCountries ?? [])),
        sparse: list.length > 0 && share < SPECTRUM_SPARSE_SHARE,
      };
    }),
  }));
  return { range, fallback, houses: list.length, rows, averages: spectrumAverages(list) };
}

/** Ø over a set of Houses: guests per House and Simpulo's service fee per booking – the Spektrum's bottom line and the planning matrix's base. */
export function spectrumAverages(list: readonly HouseOutcome[]) {
  const guests = list.reduce((n, o) => n + o.guestIds.length, 0);
  return { guestsPerHouse: list.length ? Math.round((guests / list.length) * 10) / 10 : null, perBooking: guests ? Math.round(list.reduce((n, o) => n + o.serviceFee, 0) / guests) : null };
}

/**
 * Ort-Herkunft › Fenster pro Ort: the saved places whose windows started in the period – how many places, how many windows on average, and
 * how many places had 1 · 2 · 3+ windows. Counted from the outcomes (HouseOutcome.placeId), all Houses that started in the period.
 */
export function windowsPerPlace(inputs: AdminInputs, period: AnalysisPeriod): { places: number; windows: number; average: number | null; buckets: readonly { key: "1" | "2" | "3+"; places: number }[] } {
  const outcomes = outcomesOf(inputs);
  const { from } = periodRange(period, inputs.today, outcomes);
  const counts = new Map<string, number>();
  for (const o of outcomes) if (o.placeId && o.startDate >= from && o.startDate <= inputs.today) counts.set(o.placeId, (counts.get(o.placeId) ?? 0) + 1);
  const values = [...counts.values()];
  const windows = values.reduce((n, v) => n + v, 0);
  return {
    places: values.length,
    windows,
    average: values.length ? windows / values.length : null,
    buckets: [
      { key: "1", places: values.filter((v) => v === 1).length },
      { key: "2", places: values.filter((v) => v === 2).length },
      { key: "3+", places: values.filter((v) => v >= 3).length },
    ],
  };
}

/** The sweet spot: the topic × length × crew size × host tier with the highest value per person per year – only from combinations with enough Houses. */
export function sweetSpot(inputs: AdminInputs, period: AnalysisPeriod) {
  const outcomes = outcomesOf(inputs);
  const { from } = periodRange(period, inputs.today, outcomes);
  const stays = staysLastYear(outcomes, inputs.today);
  const groups = new Map<string, HouseOutcome[]>();
  for (const o of outcomes.filter((x) => x.startDate >= from && x.startDate <= inputs.today)) {
    const key = [o.topic, lengthBand(o.nights), crewBand(o.crewSize), o.tier].join("|");
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const best = [...groups.entries()]
    .map(([key, group]) => analysisRow(key, group, stays))
    .filter((r) => !r.tooFew && r.valuePerPersonYear !== null)
    .toSorted((a, b) => b.valuePerPersonYear! - a.valuePerPersonYear!)[0];
  if (!best) return null;
  const [topic, length, crew, tier] = best.key.split("|") as [Vibe, "short" | "mid" | "long", "2-4" | "5-8" | "9+", HostTier];
  return { topic, length, crew, tier, row: best };
}

/**
 * "Wer bringt das Geld": the guests' service fee vs. the share of host fees; value per guest and per host per year (all their Houses in the
 * period, scaled to a year); the 10 hosts who bring the most.
 */
export function whoBringsMoney(inputs: AdminInputs, period: AnalysisPeriod) {
  const outcomes = outcomesOf(inputs);
  const { from, days } = periodRange(period, inputs.today, outcomes);
  const inPeriod = outcomes.filter((o) => o.startDate >= from && o.startDate <= inputs.today);
  const year = 365 / days;
  const service = inPeriod.reduce((n, o) => n + o.serviceFee, 0);
  const hostFees = inPeriod.reduce((n, o) => n + o.hostFeeShare, 0);
  const total = service + hostFees;
  const guests = new Set(inPeriod.flatMap((o) => o.guestIds)).size;
  const byHost = new Map<string, { hostId: string; tier: HostTier; houses: number; revenue: number }>();
  for (const o of inPeriod) {
    const h = byHost.get(o.hostId) ?? { hostId: o.hostId, tier: o.tier, houses: 0, revenue: 0 };
    byHost.set(o.hostId, { ...h, houses: h.houses + 1, revenue: h.revenue + keptOfOutcome(o) });
  }
  const hosts = [...byHost.values()].map((h) => ({ ...h, valuePerYear: Math.round(h.revenue * year) }));
  return {
    serviceShare: total ? service / total : null,
    hostFeeShare: total ? hostFees / total : null,
    valuePerGuestYear: guests ? Math.round((total * year) / guests) : null,
    valuePerHostYear: hosts.length ? Math.round((total * year) / hosts.length) : null,
    topHosts: hosts.toSorted((a, b) => b.valuePerYear - a.valuePerYear).slice(0, 10),
  };
}

// ── Hosts: the important numbers and the warning cases ──────────────────────────────────────────────────────────────────────────

/** Why a host lands in "Review": an open safety report on their House, slow answers, Houses that don't fill, a report about them. */
export type HostWarning = "safety" | "slowAnswers" | "lowFill" | "reported";

export interface HostOverview extends HostRow {
  /** Mean fill rate of their real Houses, 0–1 */
  fillRate: number;
  /** EUR Simpulo kept from their Houses in the last 12 months (the same outcomes as Analyse) */
  valuePerYear: number;
  /** Their newest House's creation (ISO) – "Neueste" */
  newest: string;
  warnings: HostWarning[];
}

/**
 * Admin › Hosts: every host with a real House, their three numbers (Houses · fill rate · value per year) and their warnings. Live, hosts
 * are let in automatically; "Review" shows only those with a warning.
 */
export function hostOverview(inputs: AdminInputs): HostOverview[] {
  const outcomes = outcomesOf(inputs);
  const from = new Date(Date.parse(`${inputs.today}T00:00:00Z`) - 365 * DAY_MS).toISOString().slice(0, 10);
  const value = new Map<string, number>();
  for (const o of outcomes) if (o.startDate >= from && o.startDate <= inputs.today) value.set(o.hostId, (value.get(o.hostId) ?? 0) + keptOfOutcome(o));
  const openSafety = inputs.admin.tickets.filter((t) => isOpenTicket(t) && t.category === "safety" && t.context.houseId);
  const now = Date.parse(`${inputs.today}T12:00:00Z`);
  return hostRows(inputs).map((row) => {
    const ids = new Set(row.houses.map((h) => h.id));
    const started = row.houses.filter((h) => h.startDate <= inputs.today);
    const fillRate = row.houses.length ? row.houses.reduce((n, h) => n + fillRateOf(h), 0) / row.houses.length : 0;
    const warnings: HostWarning[] = [];
    if (openSafety.some((t) => ids.has(t.context.houseId!))) warnings.push("safety");
    if (answersSlowly(responseRate(inputs, row.user.id, now))) warnings.push("slowAnswers");
    if (started.length > 0 && started.reduce((n, h) => n + fillRateOf(h), 0) / started.length < 0.5) warnings.push("lowFill");
    if (inputs.reports.some((r) => (r.target.kind === "user" && r.target.id === row.user.id) || (r.target.kind === "stay" && ids.has(r.target.id)))) warnings.push("reported");
    return {
      ...row,
      fillRate,
      valuePerYear: Math.round(value.get(row.user.id) ?? 0),
      newest: row.houses.reduce((max, h) => (h.createdAt > max ? h.createdAt : max), ""),
      warnings,
    };
  });
}

// ── Houses: early warning ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Why an upcoming House needs help (config/admin.ts HOUSE_RISK). */
export type RiskReason = { key: "deadline"; days: number; fill: number } | { key: "quiet"; days: number } | { key: "unanswered"; hours: number };

/** How lively a House is – from the history where there is one (the mock), else from its requests. */
function activityOf(inputs: Pick<AdminInputs, "joinRequests" | "history" | "today" | "now">, stay: Stay) {
  const now = inputs.now ?? Date.parse(`${inputs.today}T12:00:00Z`);
  const requests = inputs.joinRequests.filter((r) => r.stayId === stay.id);
  // The real open requests always count (the deadlines' 60-hour step, config/policies.ts DEADLINES) – also beside the mock history.
  const pending = requests.filter((r) => r.status === "pending").map((r) => (now - Date.parse(r.createdAt)) / 3_600_000);
  const realOldest = pending.length ? Math.max(...pending) : null;
  const mock = inputs.history?.houseActivity;
  if (mock) {
    const a = mock[stay.id] ?? {};
    const oldest = Math.max(a.oldestPendingHours ?? -1, realOldest ?? -1);
    return { quietDays: a.quietDays ?? 0, oldestPendingHours: oldest < 0 ? null : oldest };
  }
  const last = requests.reduce((max, r) => (r.createdAt > max ? r.createdAt : max), stay.createdAt);
  return { quietDays: Math.floor((now - Date.parse(last)) / DAY_MS), oldestPendingHours: realOldest };
}

/** Upcoming real Houses where a rule holds, most reasons first, then the soonest. */
export function atRiskHouses(inputs: Pick<AdminInputs, "stays" | "joinRequests" | "history" | "today" | "now">) {
  const now = Date.parse(`${inputs.today}T00:00:00Z`);
  return inputs.stays
    .filter((s) => isLiveReal(s) && s.status === "published" && s.startDate > inputs.today)
    .flatMap((stay) => {
      const fill = fillRateOf(stay);
      const days = Math.ceil((Date.parse(`${stay.startDate}T00:00:00Z`) - now) / DAY_MS);
      const activity = activityOf(inputs, stay);
      const reasons: RiskReason[] = [];
      if (days < HOUSE_RISK.deadlineDays && fill < HOUSE_RISK.minFill) reasons.push({ key: "deadline", days, fill });
      if (fill < 1 && activity.quietDays >= HOUSE_RISK.quietDays) reasons.push({ key: "quiet", days: activity.quietDays });
      if (activity.oldestPendingHours !== null && activity.oldestPendingHours >= HOUSE_RISK.unansweredHours) reasons.push({ key: "unanswered", hours: Math.round(activity.oldestPendingHours) });
      return reasons.length ? [{ stay, reasons }] : [];
    })
    .toSorted((a, b) => b.reasons.length - a.reasons.length || a.stay.startDate.localeCompare(b.stay.startDate));
}

/** One House in Admin › Houses › "Braucht Hilfe": its reasons, the days to its start, the free spots, how urgent, the lever to pull first. */
export interface NeedsHelpRow {
  stay: Stay;
  reasons: RiskReason[];
  daysToStart: number;
  /** Free spots (spotsTotal − spotsFilled) */
  missing: number;
  /** Free spots per day left (missing ÷ days, at least one day): the higher, the more urgent */
  urgency: number;
  lever: HouseLever;
}

/** The lever to pull first for these reasons (config/admin.ts HOUSE_LEVER_RULES). */
export function recommendedLever(reasons: readonly RiskReason[], daysToStart: number, fill: number): HouseLever {
  if (reasons.some((r) => r.key === "unanswered")) return "host";
  if (reasons.some((r) => r.key === "deadline")) return daysToStart <= HOUSE_LEVER_RULES.alternativeDays && fill < HOUSE_LEVER_RULES.alternativeFill ? "alternative" : "visibility";
  return "demand";
}

/**
 * Admin › Houses › "Braucht Hilfe": the Houses at risk (atRiskHouses) as a to-do list, most urgent first – free spots per day left. A House
 * marked "✓ Erledigt" (AdminData.houseDone) stays away for HOUSE_DONE_RECHECK_DAYS; if it hasn't filled further by then, it comes back.
 */
export function needsHelp(inputs: AdminInputs): NeedsHelpRow[] {
  const now = Date.parse(`${inputs.today}T00:00:00Z`);
  return atRiskHouses(inputs)
    .filter(({ stay }) => {
      const done = inputs.admin.houseDone?.[stay.id];
      if (!done) return true;
      const waited = (now - Date.parse(`${done.at}T00:00:00Z`)) / DAY_MS >= HOUSE_DONE_RECHECK_DAYS;
      return waited && stay.spotsFilled <= done.spotsFilled;
    })
    .map(({ stay, reasons }) => {
      const daysToStart = Math.max(0, Math.ceil((Date.parse(`${stay.startDate}T00:00:00Z`) - now) / DAY_MS));
      const missing = Math.max(0, stay.spotsTotal - stay.spotsFilled);
      return { stay, reasons, daysToStart, missing, urgency: missing / Math.max(1, daysToStart), lever: recommendedLever(reasons, daysToStart, fillRateOf(stay)) };
    })
    .toSorted((a, b) => b.urgency - a.urgency || a.daysToStart - b.daysToStart);
}

/** "Braucht Hilfe" now against the month before (the history's snapshot; the real source needs a daily count). */
export function needsHelpChange(inputs: AdminInputs, count: number): Change | null {
  return getChange("needsHelp", count, inputs.history?.snapshots?.month?.needsHelp ?? null);
}

/** "Läuft gut": the real Houses that filled the fastest. */
export function fastestFull(inputs: Pick<AdminInputs, "stays" | "joinRequests" | "history">, count = 5) {
  const mock = inputs.history?.houseActivity;
  return inputs.stays
    .filter((s) => isReal(s) && isFull(s))
    .flatMap((stay) => {
      const days = mock?.[stay.id]?.daysToFull ?? daysToFullOf(stay, inputs.joinRequests);
      return days === null ? [] : [{ stay, days }];
    })
    .toSorted((a, b) => a.days - b.days)
    .slice(0, count);
}

/** "Warteliste informieren": waitlist sign-ups into this House's topic, with no place or one in its hub. */
export function waitlistMatches(inputs: Pick<AdminInputs, "admin">, stay: Stay): number {
  const hub = hubOf(stay).toLowerCase();
  return inputs.admin.waitlist.filter((e) => e.interests.includes(stay.vibe) && (!e.where || e.where.toLowerCase() === hub || e.where.toLowerCase() === stay.city.toLowerCase())).length;
}

/** Vision › Zielgruppen, "Simpulo heute": what Simpulo kept (revenue, before costs) in the last 12 months (this month so far included), EUR. */
export function revenueLast12(inputs: DayInputs): number {
  return moneyTotals(inputs, `${monthBefore(inputs.today, 11)}-01`, inputs.today).revenue;
}

/**
 * Vision › Technik › Anbieter heute: each provider's cost over the last 12 months in % of the revenue in that time (revenueLast12), with its
 * level against PROVIDER_COST (from 5 % "warning" amber, from 10 % "critical" ember – "Selbermachen prüfen"). null = not known (the real
 * source has no costs yet); `example` = mock values.
 */
export function providerCosts(inputs: DayInputs) {
  const costs = inputs.history?.providerCosts ?? null;
  const revenue = revenueLast12(inputs);
  const shareOf = (cost: number | undefined) => (cost === undefined || revenue <= 0 ? null : Math.round((cost / revenue) * 1000) / 10);
  const levelOf = (share: number | null): Status | null => (share === null ? null : share >= PROVIDER_COST.critical ? "critical" : share >= PROVIDER_COST.warning ? "warning" : null);
  const keys = ["firebase", "stripe", "analytics", "maps", "email"] as const;
  return {
    example: costs !== null,
    shares: Object.fromEntries(keys.map((k) => {
      const share = shareOf(costs?.[k]);
      return [k, { share, level: levelOf(share) }];
    })) as Record<(typeof keys)[number], { share: number | null; level: Status | null }>,
  };
}

// ── Finanzierung ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Finanzierung › Bereitschaft: the six points with their live values (thresholds in config/funding.ts READINESS). "moved" is set by hand
 * (required); profit streak from the move; repeat guests from the network; full-House growth as the compound monthly rate over the last six
 * completed months; hubs with enough real Houses and their average fill rate; the contribution per full House over 12 months from the journal
 * (revenue minus payment fees and marketing).
 */
export function fundingReadiness(inputs: AdminInputs) {
  const repeat = algorithmMetrics(inputs).repeatRate;
  const repeatPct = repeat === null ? null : Math.round(repeat * 100);

  const full = fullHousesPerMonth(inputs);
  const completed = full.rows.slice(0, -1).slice(-(READINESS.fullHousesGrowth.months + 1));
  const from = completed[0]?.full ?? 0;
  const to = completed.at(-1)?.full ?? 0;
  const growth = from > 0 && completed.length > 1 ? Math.pow(to / from, 1 / (completed.length - 1)) - 1 : null;

  const byHub = new Map<string, Stay[]>();
  for (const s of inputs.stays.filter(isLiveReal)) byHub.set(hubOf(s), [...(byHub.get(hubOf(s)) ?? []), s]);
  const hubs = [...byHub.entries()]
    .filter(([, list]) => list.length >= READINESS.hubs.minHouses)
    .map(([hub, list]) => ({ hub, fill: list.reduce((n, s) => n + fillRateOf(s), 0) / list.length }))
    .filter((h) => h.fill * 100 >= READINESS.hubs.fillPercent)
    .toSorted((a, b) => b.fill - a.fill);

  let contribution: number | null = null;
  if (inputs.ledger) {
    const fromDate = `${monthBefore(inputs.today, 11)}-01`;
    const year = inputs.ledger.filter((e) => e.date >= fromDate && e.date <= inputs.today);
    const revenue = year.filter((e) => e.kind === "income" || e.kind === "refund").reduce((n, e) => n + e.net * e.fxRate, 0);
    const variable = year.filter((e) => (READINESS.contribution.variableCostCategories as readonly string[]).includes(e.category)).reduce((n, e) => n + e.net * e.fxRate, 0);
    const fullHouses = full.rows.reduce((n, r) => n + r.full, 0);
    contribution = fullHouses > 0 ? Math.round((revenue - variable) / fullHouses) : null;
  }

  const values = {
    repeatRate: { met: repeatPct !== null && repeatPct >= READINESS.repeatRatePercent, value: repeatPct },
    fullHousesGrowth: { met: growth !== null && growth * 100 >= READINESS.fullHousesGrowth.percentPerMonth, value: growth, from, to },
    hubsFill: { met: hubs.length >= READINESS.hubs.min, hubs },
    contribution: { met: contribution !== null && contribution > 0, value: contribution },
  };
  // Every key of the checklist has its value (checked by the type, extra fields allowed).
  const byKey: Record<ReadinessKey, { met: boolean }> = values;
  const items = READINESS_ITEMS.map((item) => ({ ...item, met: byKey[item.key].met }));
  return { items, values, met: items.filter((i) => i.met).length, total: items.length };
}

// ── North star and the numbers around it ─────────────────────────────────────────────────────────────────────────────────────────

/** A House's nights (start to end date). */
const nightsOf = (stay: Pick<Stay, "startDate" | "endDate">) => Math.max(0, Math.round((Date.parse(stay.endDate) - Date.parse(stay.startDate)) / DAY_MS));

/**
 * The last 12 months up to this one (so far), oldest first: profit, full Houses, the north star "Gemeinsame Nächte" (people × nights in full
 * Houses, by start month), the booking volume (everything guests paid, EUR), active users (searched, reserved, requested or stayed – from the
 * requests and the crews here), new guests (their first accepted request), repeat guests in percent, marketing costs (journal, category
 * "Marketing"). From the history where there is one (the mock), else from the records; repeat guests without a history only for this month.
 */
export function monthlySeries(inputs: AdminInputs) {
  const profit = profitPerMonth(inputs);
  const full = fullHousesPerMonth(inputs).rows;
  const series = inputs.history?.series;
  const realFull = inputs.stays.filter((s) => isReal(s) && isFull(s));
  const accepted = inputs.joinRequests.filter((r) => r.status === "accepted");
  const firstStay = new Map<string, string>();
  for (const r of accepted.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))) if (!firstStay.has(r.userId)) firstStay.set(r.userId, monthOf(r.createdAt));
  const repeatNow = algorithmMetrics(inputs).repeatRate;
  return profit.map((p, i) => {
    const month = p.month;
    const fromSeries = (key: keyof NonNullable<MetricsHistory["series"]>) => series?.[key]?.[i] ?? null;
    const sharedNights = fromSeries("sharedNights") ?? realFull.filter((s) => monthOf(s.startDate) === month).reduce((n, s) => n + s.spotsTotal * nightsOf(s), 0);
    const bookingVolume =
      fromSeries("bookingVolume") ??
      Math.round(inputs.payments.filter((x) => x.status === "paid" && x.paidAt && monthOf(x.paidAt) === month).reduce((n, x) => n + toEur(x.total, inputs.stays, x.stayId), 0));
    const activeUsers =
      fromSeries("activeUsers") ??
      new Set([...inputs.joinRequests.filter((r) => monthOf(r.createdAt) === month).map((r) => r.userId), ...accepted.filter((r) => inputs.stays.some((s) => s.id === r.stayId && monthOf(s.startDate) <= month && monthOf(s.endDate) >= month)).map((r) => r.userId)]).size;
    const newGuests = fromSeries("newGuests") ?? [...firstStay.values()].filter((m) => m === month).length;
    const repeatRate = fromSeries("repeatRate") ?? (i === profit.length - 1 && repeatNow !== null ? Math.round(repeatNow * 100) : null);
    const marketing = inputs.ledger ? Math.round(inputs.ledger.filter((e) => e.category === "Marketing" && e.date.startsWith(month)).reduce((n, e) => n + e.net * e.fxRate, 0)) : null;
    return { month, profit: p.profit, full: full[i]?.full ?? 0, sharedNights, bookingVolume, activeUsers, newGuests, repeatRate, marketing };
  });
}

/** The north star in the running period and its change against the same span of the period before (rangeTotals). */
export function northStar(inputs: AdminInputs, period: ComparePeriod) {
  const c = cockpit(inputs, period);
  return { current: c.nights.current, change: c.nights.change, rows: monthlySeries(inputs) };
}

/**
 * The money and growth numbers of the last full month (a running month would look small), each against the month before: booking volume,
 * the revenue run rate (last full month × 12), active users, cost per guest won (marketing ÷ new guests) and what a guest is worth in a year
 * (Analyse) over that cost (target ≥ 3).
 */
export function monthKpis(inputs: AdminInputs) {
  const rows = monthlySeries(inputs);
  const last = rows.at(-2)!;
  const before = rows.at(-3)!;
  const cpg = (r: (typeof rows)[number]) => (r.marketing !== null && r.newGuests > 0 ? Math.round((r.marketing / r.newGuests) * 100) / 100 : null);
  const valuePerGuestYear = whoBringsMoney(inputs, "year").valuePerGuestYear;
  const ratio = (cost: number | null) => (cost && valuePerGuestYear !== null ? Math.round((valuePerGuestYear / cost) * 10) / 10 : null);
  const cost = cpg(last);
  const costBefore = cpg(before);
  return {
    month: last.month,
    monthBefore: before.month,
    bookingVolume: { value: last.bookingVolume, change: getChange("bookingVolume", last.bookingVolume, before.bookingVolume) },
    annualRevenue: { value: last.profit * 12, change: getChange("annualRevenue", last.profit * 12, before.profit * 12) },
    activeUsers: { value: last.activeUsers, change: getChange("activeUsers", last.activeUsers, before.activeUsers) },
    costPerGuest: { value: cost, change: getChange("costPerGuest", cost, costBefore) },
    valueToCost: { value: ratio(cost), valuePerGuestYear, target: OVERVIEW_TARGETS.valueToCost, status: ratio(cost) === null ? null : statusAgainst(ratio(cost), OVERVIEW_TARGETS.valueToCost), change: getChange("valueToCost", ratio(cost), ratio(costBefore)) },
  };
}

/**
 * Vision › Kern, the live numbers: mutual "Mit dir wieder" (both said "again" after the stay – the rating isn't built, so only the mock's
 * example values; `example` says so), repeat guests (algorithmMetrics) and the shared nights of the last full month (monthlySeries).
 */
export function coreMetrics(inputs: AdminInputs) {
  const n = inputs.history?.network;
  const again = n?.againPairs ? n.againMutual! / n.againPairs : null;
  const rows = monthlySeries(inputs);
  const last = rows.at(-2)!;
  const network = algorithmMetrics(inputs);
  return {
    again,
    againExample: again !== null,
    /** Houses whose closing round was done – the closing round isn't built yet: null ("noch nicht gemessen") */
    closingRounds: null as number | null,
    repeatRate: network.repeatRate,
    /** Your people connections: mutual "Lived with" pairs */
    yourPeoplePairs: network.mutualPairs,
    bookings: networkBookings(inputs),
    sharedNights: last.sharedNights,
    month: last.month,
  };
}

/**
 * Bookings through the network: of the accepted guests in real Houses, how many came through an invite (an invite link – hinv-…, src=invite –,
 * the invite sheet – invitedBy –, a friend's request – pairedWith) and how many through Your people (someone they lived with both ways was
 * already in that House). From the mock's history where there is one.
 */
export function networkBookings(inputs: Pick<AdminInputs, "stays" | "joinRequests" | "livedWith" | "history">) {
  const n = inputs.history?.network;
  if (n?.bookings) {
    const via = (n.bookingsViaInvite ?? 0) + (n.bookingsViaPeople ?? 0);
    return { total: n.bookings, viaInvite: n.bookingsViaInvite ?? 0, viaPeople: n.bookingsViaPeople ?? 0, share: via / n.bookings };
  }
  const real = new Map(inputs.stays.filter(isReal).map((s) => [s.id, s]));
  const accepted = inputs.joinRequests.filter((r) => r.status === "accepted" && real.has(r.stayId) && real.get(r.stayId)!.hostId !== r.userId).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
  const confirmed = (a: string, b: string) => inputs.livedWith.some((l) => l.userId === a && l.otherUserId === b && l.confirmedAt);
  const together = (a: string, b: string) => confirmed(a, b) && confirmed(b, a);
  let viaInvite = 0;
  let viaPeople = 0;
  for (const r of accepted) {
    if (r.invitedBy || r.id.startsWith("hinv-") || r.utmSource === "invite" || r.pairedWith) viaInvite++;
    else {
      const before = [real.get(r.stayId)!.hostId, ...accepted.filter((o) => o.stayId === r.stayId && o.createdAt < r.createdAt).map((o) => o.userId)];
      if (before.some((id) => together(id, r.userId))) viaPeople++;
    }
  }
  return { total: accepted.length, viaInvite, viaPeople, share: accepted.length ? (viaInvite + viaPeople) / accepted.length : null };
}

/**
 * Wachstum: the install rate of guests with a booking (paid their share) – the share of them with Simpulo on the home screen, iPhone and
 * Android apart; last full month against the one before (like monthKpis), in percent. null without install records (real source until the
 * data point app.installed is collected).
 */
export function installRates(inputs: AdminInputs) {
  const installs = inputs.history?.installs;
  const months = monthlySeries(inputs).map((r) => r.month);
  const rate = (row?: { booked: number; installed: number }) => (row && row.booked > 0 ? Math.round((row.installed / row.booked) * 1000) / 10 : null);
  const of = (platform: "ios" | "android", metric: "installRateIos" | "installRateAndroid") => {
    const rows = installs?.[platform];
    const last = rows?.at(-2);
    const value = rate(last);
    return { value, booked: last?.booked ?? null, change: getChange(metric, value, rate(rows?.at(-3))) };
  };
  return { month: months.at(-2)!, monthBefore: months.at(-3)!, ios: of("ios", "installRateIos"), android: of("android", "installRateAndroid") };
}

/**
 * Geld: how many months the bank balance lasts at the average costs (journal: costs and fees) of the last 3 full months – against
 * OVERVIEW_TARGETS.runwayMonths; and the same a month earlier (balance minus last month's profit after costs) for the change.
 */
export function runway(inputs: AdminInputs, balance: number | null) {
  if (balance === null || !inputs.ledger) return null;
  const months = [1, 2, 3].map((back) => monthBefore(inputs.today, back));
  const costOf = (month: string) => inputs.ledger!.filter((e) => (e.kind === "cost" || e.kind === "fee") && e.date.startsWith(month)).reduce((n, e) => n + e.net * e.fxRate, 0);
  const avg = months.reduce((n, m) => n + costOf(m), 0) / months.length;
  const value = avg > 0 ? Math.round((balance / avg) * 10) / 10 : null;
  const prevMonths = [2, 3, 4].map((back) => monthBefore(inputs.today, back));
  const prevAvg = prevMonths.reduce((n, m) => n + costOf(m), 0) / prevMonths.length;
  const lastMonth = months[0];
  const lastNet = inputs.ledger.filter((e) => e.date.startsWith(lastMonth)).reduce((n, e) => n + (e.kind === "income" || e.kind === "refund" ? 1 : e.kind === "cost" || e.kind === "fee" ? -1 : 0) * e.net * e.fxRate, 0);
  const prevValue = prevAvg > 0 ? Math.round(((balance - lastNet) / prevAvg) * 10) / 10 : null;
  return { value, avgCosts: Math.round(avg), target: OVERVIEW_TARGETS.runwayMonths, status: statusAgainst(value, OVERVIEW_TARGETS.runwayMonths), change: getChange("runwayMonths", value, prevValue) };
}

/**
 * Analyse › Kohorten: per start month (a guest's first stay), the share who booked again within 3, 6 and 12 months – null where that time
 * hasn't passed yet. From the Houses' outcomes (the same as Analyse).
 */
export function cohortReturns(inputs: AdminInputs, months = 18) {
  const stays = new Map<string, string[]>();
  for (const o of outcomesOf(inputs)) for (const g of o.guestIds) stays.set(g, [...(stays.get(g) ?? []), o.startDate]);
  const addMonths = (iso: string, n: number) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
  };
  const cohorts = new Map<string, { size: number; back: Record<3 | 6 | 12, number> }>();
  for (const dates of stays.values()) {
    const sorted = dates.toSorted();
    const first = sorted[0];
    const c = cohorts.get(monthOf(first)) ?? { size: 0, back: { 3: 0, 6: 0, 12: 0 } };
    c.size++;
    for (const h of [3, 6, 12] as const) if (sorted.some((d) => d > first && d <= addMonths(first, h))) c.back[h]++;
    cohorts.set(monthOf(first), c);
  }
  return Array.from({ length: months }, (_, i) => monthBefore(inputs.today, months - 1 - i)).map((month) => {
    const c = cohorts.get(month);
    const share = (h: 3 | 6 | 12) => (c && c.size > 0 && addMonths(`${month}-01`, h + 1) <= inputs.today ? c.back[h] / c.size : null);
    return { month, size: c?.size ?? 0, r3: share(3), r6: share(6), r12: share(12) };
  });
}

/**
 * Finanzierung › Bewertung & Anteile – a private orientation, ranges only: method A the revenue run rate (last full month × 12) × a multiple by
 * growth per year (config/funding.ts VALUATION.revenueMultiples), method B the profit of the last 12 months (journal: revenue − fees − costs)
 * × 2–4. The drivers: growth per year (the average monthly growth of the last 6 completed months, compounded), repeat guests, margin.
 */
export function valuationRange(inputs: AdminInputs) {
  const rows = profitPerMonth(inputs);
  const completed = rows.slice(0, -1).slice(-7);
  const first = completed[0]?.profit ?? 0;
  const last = completed.at(-1)?.profit ?? 0;
  const monthly = first > 0 && completed.length > 1 ? Math.pow(last / first, 1 / (completed.length - 1)) - 1 : null;
  const growth = monthly === null ? null : Math.round((Math.pow(1 + monthly, 12) - 1) * 100);
  const runRate = last * 12;
  const band = VALUATION.revenueMultiples.find((b) => (growth ?? 0) < b.below) ?? VALUATION.revenueMultiples.at(-1)!;

  let profit: number | null = null;
  let margin: number | null = null;
  if (inputs.ledger) {
    const from = `${monthBefore(inputs.today, 11)}-01`;
    const year = inputs.ledger.filter((e) => e.date >= from && e.date <= inputs.today);
    const sum = (kinds: readonly string[]) => year.filter((e) => kinds.includes(e.kind)).reduce((n, e) => n + e.net * e.fxRate, 0);
    const revenue = sum(["income", "refund"]);
    profit = Math.round(revenue - sum(["fee", "cost"]));
    margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null;
  }
  const repeat = algorithmMetrics(inputs).repeatRate;
  return {
    revenue: { runRate, band, low: runRate * band.low, high: runRate * band.high },
    profit: profit !== null && profit > 0 ? { profit, low: profit * VALUATION.profitMultiple.low, high: profit * VALUATION.profitMultiple.high } : null,
    drivers: { growth, repeat: repeat === null ? null : Math.round(repeat * 100), margin },
  };
}

/**
 * Asking the host before a request (Admin › Wachstum; data points ask.beforeRequest, ask.toRequest, request.note – planned): from the direct
 * chats (guest ↔ host about a House) and the requests. Only counts and times are read, never what was written.
 *   messagesBeforeRequest – of the chats that led to a request: the guest's messages before it, on average
 *   askedToRequest        – the share of those chats whose guest later asked to join that House (percent)
 *   requestsWithNote      – the share of requests (not the host's own invites) that carry a note for the host (percent)
 */
export function askingHostMetrics(inputs: AdminInputs) {
  const direct = (inputs.threads ?? []).filter((t) => t.type === "direct" && t.houseId);
  const pairs = direct.flatMap((t) => {
    const stay = inputs.stays.find((s) => s.id === t.houseId);
    const guest = stay && t.participantIds.find((id) => id !== stay.hostId);
    if (!stay || !guest) return [];
    const request = inputs.joinRequests.find((r) => r.stayId === stay.id && r.userId === guest && r.status !== "invited");
    const before = request ? t.messages.filter((m) => m.senderId === guest && m.createdAt < request.createdAt).length : 0;
    return [{ requested: Boolean(request), before }];
  });
  const led = pairs.filter((p) => p.requested);
  const requests = inputs.joinRequests.filter((r) => r.status !== "invited");
  const share = (part: number, all: number) => (all > 0 ? Math.round((part / all) * 1000) / 10 : null);
  return {
    chats: pairs.length,
    messagesBeforeRequest: led.length > 0 ? Math.round((led.reduce((sum, p) => sum + p.before, 0) / led.length) * 10) / 10 : null,
    askedToRequest: share(led.length, pairs.length),
    requests: requests.length,
    requestsWithNote: share(requests.filter((r) => r.message.trim() !== "").length, requests.length),
  };
}


// ── Wachstum ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Wachstum's period: the last 7, 30 or 90 days, or everything. */
/** Wachstum and the partners' effect use the admin's one period (Tag · Woche · Monat · Quartal · Jahr, periodRanges). */
export type GrowthPeriod = ComparePeriod;
export const GROWTH_PERIODS: readonly GrowthPeriod[] = COMPARE_PERIODS;

/** One row of Wachstum: a channel, a referrer or a House – visits → requests → paid, and Simpulo's part (≈ EUR). */
export interface GrowthRow {
  key: string;
  visits: number;
  requests: number;
  accepted: number;
  paid: number;
  revenue: number;
}

/**
 * The events of the running period up to today (back 0) or of the same span of the period before (back 1) – periodRanges, the same as the
 * overview. TODO(firestore): stats/daily instead of the raw events.
 */
function inWindow(events: readonly GrowthEvent[], period: GrowthPeriod, today: string, back: 0 | 1 = 0): GrowthEvent[] {
  const ranges = periodRanges(today, period);
  const { from, to } = back === 0 ? ranges.current : ranges.previous;
  return events.filter((e) => {
    const day = e.at.slice(0, 10);
    return day >= from && day <= to;
  });
}

/** Visits = house_viewed, requests = request_sent, accepted = request_accepted, paid = payment_completed – grouped by `keyOf`, by revenue. */
export function growthRows(events: readonly GrowthEvent[], keyOf: (e: GrowthEvent) => string | undefined, period: GrowthPeriod, today: string): GrowthRow[] {
  const rows = new Map<string, GrowthRow>();
  for (const e of inWindow(events, period, today)) {
    const key = keyOf(e);
    if (key === undefined) continue;
    const row = rows.get(key) ?? { key, visits: 0, requests: 0, accepted: 0, paid: 0, revenue: 0 };
    if (e.name === "house_viewed") row.visits++;
    else if (e.name === "request_sent") row.requests++;
    else if (e.name === "request_accepted") row.accepted++;
    else if (e.name === "payment_completed") {
      row.paid++;
      row.revenue += convertApprox(e.revenue ?? 0, (e.currency ?? "EUR") as Currency, "EUR");
    }
    rows.set(key, row);
  }
  return [...rows.values()]
    .filter((r) => r.visits + r.requests + r.accepted + r.paid > 0)
    .toSorted((a, b) => b.revenue - a.revenue || b.visits - a.visits || a.key.localeCompare(b.key));
}

/** The funnel on top of Wachstum: visitors · requests · paid in the period, each with its change against the same span of the period before. */
export function growthFunnel(events: readonly GrowthEvent[], period: GrowthPeriod, today: string) {
  const count = (list: readonly GrowthEvent[], name: GrowthEvent["name"]) => list.filter((e) => e.name === name).length;
  const now = inWindow(events, period, today);
  const before = inWindow(events, period, today, 1);
  const pair = (metric: "visitors" | "requests" | "paid", name: GrowthEvent["name"]) => {
    const value = count(now, name);
    return { value, change: getChange(metric, value, count(before, name)) };
  };
  return { visitors: pair("visitors", "house_viewed"), requests: pair("requests", "request_sent"), paid: pair("paid", "payment_completed") };
}

// ─── Launch › Marketing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Filled Houses: real Houses (no examples) whose crew is complete – the plan's ladder 1 → 5 → 50+. */
export function marketingFilledHouses({ stays }: Pick<AdminInputs, "stays">): number {
  return stays.filter((s) => isReal(s) && s.status !== "draft" && s.status !== "draft_unclaimed" && s.status !== "closed" && s.spotsTotal > 0 && s.spotsFilled >= s.spotsTotal).length;
}

export interface FunnelRow {
  /** "all" or the niche */
  key: string;
  contacted: number;
  replied: number;
  demo: number;
  house: number;
  /** Each as a share of the contacted (0–1); null without contacts */
  replyRate: number | null;
  demoRate: number | null;
  houseRate: number | null;
}

const reached = { open: 0, later: 1, replied: 1, demo: 2, house: 3 } as const;

function funnelOf(key: string, contacts: readonly MarketingContact[]): FunnelRow {
  // Written to = a first message is set. "Later" counts as an answer (they replied: not now).
  const written = contacts.filter((c) => c.firstMessageAt !== null);
  const replied = written.filter((c) => reached[c.status] >= 1).length;
  const demo = written.filter((c) => reached[c.status] >= 2).length;
  const house = written.filter((c) => reached[c.status] >= 3).length;
  const rate = (n: number) => (written.length ? n / written.length : null);
  return { key, contacted: written.length, replied, demo, house, replyRate: rate(replied), demoRate: rate(demo), houseRate: rate(house) };
}

/**
 * The marketing funnel – written to → replied → demo seen → House opened, each rate as a share of the contacts written to, for all and per
 * niche; the best niche (House rate, then demo rate, at least 5 written to); how many contacts 50 Houses need at the current House rate;
 * and the number of contacts written to as of `compareDay` (for getChange – statuses have no history yet, so only that number compares).
 */
export function marketingFunnel(contacts: readonly MarketingContact[], compareDay: string) {
  const niches = [...new Set(contacts.map((c) => c.niche))].toSorted();
  const all = funnelOf("all", contacts);
  const perNiche = niches.map((n) => funnelOf(n, contacts.filter((c) => c.niche === n)));
  const ranked = perNiche.filter((r) => r.contacted >= 5).toSorted((a, b) => (b.houseRate ?? 0) - (a.houseRate ?? 0) || (b.demoRate ?? 0) - (a.demoRate ?? 0));
  const best = ranked[0]?.key ?? null;
  const contactsFor = (rate: number | null) => (rate && rate > 0 ? Math.ceil(PROJECTION_HOUSES / rate) : null);
  return {
    all,
    perNiche,
    best,
    /** Contacts needed for PROJECTION_HOUSES Houses at the current House rate (null: no House yet) – and at the assumptions' range */
    projection: { current: contactsFor(all.houseRate), assumed: { from: contactsFor(FUNNEL_ASSUMPTIONS.house.to), to: contactsFor(FUNNEL_ASSUMPTIONS.house.from) } },
    contactedBefore: contacts.filter((c) => c.firstMessageAt !== null && c.firstMessageAt <= compareDay).length,
  };
}

// ── Launch › Marketing › Countdown ──────────────────────────────────────────────────────────────────────────────────────────────

const addDays = (d: string, n: number) => isoDay(dayMs(d) + n * DAY_MS);
/** The Monday of the week a day falls in (calendar weeks Monday to Sunday – the content calendar). */
export const mondayOf = (d: string) => addDays(d, -((new Date(dayMs(d)).getUTCDay() + 6) % 7));

/** The marketing start and the launch date – config/roadmap.ts (through config/marketing.ts), the one source. */
export const strategyDates = () => ({ start: MARKETING_START_DATE, launch: LAUNCH_DATE });

/** The phases with their days (YYYY-MM-DD, both included): week 1 begins on the start day, weeks of 7 days. */
export function strategyPhases(start: string) {
  return LAUNCH_PHASES.map((p) => ({ ...p, from: addDays(start, (p.weeks.from - 1) * 7), to: addDays(start, p.weeks.to * 7 - 1) }));
}

/** The strategy week a day falls in (1 = the first seven days from the start; 0 before it) and the day that week begins. */
export function strategyWeek(start: string, d: string) {
  const n = Math.floor((dayMs(d) - dayMs(start)) / (7 * DAY_MS)) + 1;
  return { n: Math.max(0, n), begins: addDays(start, (n - 1) * 7) };
}

/**
 * Where a strategy number should stand on a day: before the start zero, inside a phase the previous phase's target plus the phase's increase
 * spread evenly over its days (the day itself counted), after the last phase its target. Fractional – rounded where shown.
 */
export function strategyTarget(metric: StrategyMetric, d: string, start: string): number {
  let prev = 0;
  for (const p of strategyPhases(start)) {
    const target = p.targets[metric];
    if (d < p.from) return prev;
    if (d <= p.to) return prev + ((target - prev) * ((dayMs(d) - dayMs(p.from)) / DAY_MS + 1)) / ((dayMs(p.to) - dayMs(p.from)) / DAY_MS + 1);
    prev = target;
  }
  return prev;
}

/** A week's share of a strategy number (the week beginning `begins`): the rounded target at its last day minus at the day before – the weeks add up to the phase. */
export const weekTarget = (metric: StrategyMetric, begins: string, start: string) => Math.round(strategyTarget(metric, addDays(begins, 6), start)) - Math.round(strategyTarget(metric, addDays(begins, -1), start));

export type StrategyStatus = Status | null;
/** Against where it should stand: reached good, at least 60 % warning, below critical; nothing expected yet → no status. */
const againstDue = (value: number, due: number): StrategyStatus => (due <= 0 ? null : value >= due ? "good" : value >= due * 0.6 ? "warning" : "critical");

/**
 * Each strategy number as of a day (end of that day) – from the records: contacts written to (first message), shorts published (content
 * calendar), real Houses open (created by then), hubs with enough of them, confirmed waitlist sign-ups, partners with an active agreement
 * (from its start). Full Houses have no history: only today's value (null for an earlier day).
 */
function strategyValue(metric: StrategyMetric, d: string, today: string, { stays, admin }: Pick<AdminInputs, "stays" | "admin">): number | null {
  const by = (at: string | null | undefined) => Boolean(at) && at!.slice(0, 10) <= d;
  const houses = () => stays.filter((s) => isLiveReal(s) && by(s.createdAt));
  switch (metric) {
    case "contacts":
      return admin.marketingContacts.filter((c) => by(c.firstMessageAt)).length;
    case "shorts":
      return (admin.contentPosts ?? []).filter((p) => p.status === "published" && by(p.date)).length;
    case "housesOpened":
      return houses().length;
    case "hubs":
      return hubsOf(houses());
    case "waitlist":
      return confirmedWaitlist(admin.waitlist).filter((e) => by(e.createdAt)).length;
    case "partners":
      return admin.marketingPartners.filter((p) => p.agreement.status === "active" && by(p.agreement.from ?? p.createdAt)).length;
    case "filled":
      return d >= today ? marketingFilledHouses({ stays }) : null;
  }
}

/** Hubs: cities with at least LAUNCH_CRITERIA.hubMinHouses of these Houses. */
function hubsOf(houses: readonly Stay[]): number {
  const perHub = new Map<string, number>();
  for (const s of houses) perHub.set(hubOf(s), (perHub.get(hubOf(s)) ?? 0) + 1);
  return [...perHub.values()].filter((n) => n >= LAUNCH_CRITERIA.hubMinHouses).length;
}

const RING_CHANGE: Partial<Record<StrategyMetric, ChangeMetric>> = { housesOpened: "mktHousesOpened", hubs: "mktHubs", waitlist: "mktWaitlist", filled: "mktFilledHouses" };

/**
 * The countdown (Admin › Launch › Marketing › Countdown): days to the start and to the launch, the phase and the strategy week (n of 8),
 * the four rings (value, goal = the last phase's target, where it should stand today, status, change against a week ago), this week's numbers
 * against the week's share, and which fallback rule applies (a hint only).
 */
export function launchCountdown(inputs: Pick<AdminInputs, "stays" | "admin" | "today">) {
  const { today } = inputs;
  const { start, launch } = strategyDates();
  const phases = strategyPhases(start);
  const daysToStart = Math.round((dayMs(start) - dayMs(today)) / DAY_MS);
  const daysLeft = Math.round((dayMs(launch) - dayMs(today)) / DAY_MS);
  const state: "before" | "running" | "launched" = today < start ? "before" : today >= launch ? "launched" : "running";
  // The phase today falls in – after the last one's end (and before the launch) still the last one.
  const phase = phases.findLast((p) => p.from <= today) ?? phases[0];
  const week = strategyWeek(start, today);
  const weekNo = Math.min(STRATEGY_WEEKS, week.n);
  const begins = state === "before" ? start : week.n > STRATEGY_WEEKS ? addDays(start, (STRATEGY_WEEKS - 1) * 7) : week.begins;
  const weekAgo = addDays(today, -7);
  const value = (m: StrategyMetric, d: string) => strategyValue(m, d, today, inputs);
  const last = phases[phases.length - 1];
  const rings = STRATEGY_RINGS.map((metric) => {
    const now = value(metric, today) ?? 0;
    const due = Math.round(strategyTarget(metric, today, start));
    // The next phase target above zero – "Ziel {Phase}" next to the ring.
    const next = phases.find((p) => p.to >= today && p.targets[metric] > 0) ?? last;
    const changeMetric = RING_CHANGE[metric];
    return { metric, value: now, goal: last.targets[metric], due, next: { key: next.key, target: next.targets[metric] }, status: againstDue(now, due), change: changeMetric ? getChange(changeMetric, now, value(metric, weekAgo)) : null };
  });
  // Days of this week passed (its first day = 1 of 7) – a week in progress is measured against its share so far.
  const passed = Math.min(7, Math.max(1, (dayMs(today) - dayMs(begins)) / DAY_MS + 1));
  const bars = STRATEGY_WEEK_BARS.map((metric) => {
    const actual = (value(metric, today) ?? 0) - (value(metric, addDays(begins, -1)) ?? 0);
    const target = weekTarget(metric, begins, start);
    return { metric, actual, target, status: againstDue(actual, Math.round((target * passed) / 7)) };
  });
  const houses = value("housesOpened", today) ?? 0;
  const hubs = value("hubs", today) ?? 0;
  const fallback = FALLBACK_RULES.find((r) => houses >= r.houses.from && houses <= r.houses.to && (r.hubs === undefined || hubs >= r.hubs))?.id ?? null;
  return { start, launchDate: launch, daysToStart, daysLeft, state, phase: phase.key as LaunchPhaseKey, phaseNo: phase.no, phases, weekNo, weeks: STRATEGY_WEEKS, begins, ends: addDays(begins, 6), rings, bars, fallback };
}

/** Content › shorts published in a week (Monday–Sunday). */
export const shortsInWeek = (posts: readonly ContentPost[], monday: string) => posts.filter((p) => p.status === "published" && p.date >= monday && p.date <= addDays(monday, 6)).length;

/**
 * The funnel per group of contacts (Pipeline: per motivation) – the same rates as marketingFunnel; `best` = the group that opens Houses most
 * often (House rate, then demo rate, at least 5 written to). Contacts without a value are left out.
 */
export function marketingFunnelBy(contacts: readonly MarketingContact[], key: (c: MarketingContact) => string | undefined, groups: readonly string[]) {
  const rows = groups.map((g) => funnelOf(g, contacts.filter((c) => key(c) === g)));
  const best = rows.filter((r) => r.contacted >= 5).toSorted((a, b) => (b.houseRate ?? 0) - (a.houseRate ?? 0) || (b.demoRate ?? 0) - (a.demoRate ?? 0) || (b.replyRate ?? 0) - (a.replyRate ?? 0))[0]?.key ?? null;
  return { rows, best };
}

/** Where a rate stands against its assumption: under, inside, above. */
export function againstAssumption(rate: number | null, range: { from: number; to: number }): Status | null {
  if (rate === null) return null;
  return rate >= range.from ? "good" : rate >= range.from * 0.6 ? "warning" : "critical";
}

/**
 * The loops, once they can be measured: guest → host (hosts of a real House who were in a crew before they hosted, of all hosts);
 * guests bring guests (accepted requests that came through someone's link or as "with a friend", of all accepted); host recruits host – not
 * in the product yet (null).
 */
export type LoopStatus = "product" | "prepared";
export interface LoopMetric {
  status: LoopStatus;
  /** The main share (0–1) and what it's out of – null while nothing can be measured */
  main: { value: number; of: number } | null;
  /** Further numbers, by key (the words in admin.marketing.loops.extra.<key>) */
  extra: { key: string; value: number }[];
}

/**
 * The three loops (Admin › Marketing › Schleifen):
 *   Gast wird Host    – hosts of real Houses who were accepted into a crew before their first House
 *   Gast bringt Gäste – accepted requests that came through someone's link (ref) or "Request with a friend"; spots for friends redeemed
 *   Host wirbt Host   – hosts brought by another host (User.hostReferredBy), and how many have had their first paid stay; behind HOST_REFERRAL
 */
export function marketingLoops({ stays, joinRequests, users, payments, houseInvites }: Pick<AdminInputs, "stays" | "joinRequests" | "users" | "payments"> & { houseInvites?: readonly HouseInvite[] }): Record<"guestToHost" | "guestBringsGuests" | "hostRecruitsHost", LoopMetric> {
  const hosted = stays.filter((s) => isReal(s) && s.status !== "draft" && s.status !== "draft_unclaimed");
  const firstHosted = new Map<string, string>();
  for (const s of hosted) if (!firstHosted.has(s.hostId) || s.createdAt < firstHosted.get(s.hostId)!) firstHosted.set(s.hostId, s.createdAt);
  const accepted = joinRequests.filter((r) => r.status === "accepted");
  const wasGuestFirst = [...firstHosted].filter(([hostId, at]) => accepted.some((r) => r.userId === hostId && r.createdAt < at)).length;
  const viaLink = accepted.filter((r) => r.refUserId).length;
  const withFriend = accepted.filter((r) => r.withFriend || r.pairedWith).length;
  const broughtIn = accepted.filter((r) => r.refUserId || r.withFriend || r.pairedWith).length;
  const friendSpots = (houseInvites ?? []).filter((i) => i.invitedBy && !i.priority).reduce((n, i) => n + (i.usedByAll?.length ?? (i.usedBy ? 1 : 0)), 0);
  const brought = users.filter((u) => u.hostReferredBy);
  const broughtPaid = brought.filter((u) => firstPaidStayOf(u.id, stays, payments)).length;
  return {
    guestToHost: { status: "product", main: firstHosted.size ? { value: wasGuestFirst / firstHosted.size, of: firstHosted.size } : null, extra: [{ key: "guestFirst", value: wasGuestFirst }] },
    guestBringsGuests: {
      status: "product",
      main: accepted.length ? { value: broughtIn / accepted.length, of: accepted.length } : null,
      extra: [
        { key: "viaLink", value: viaLink },
        { key: "withFriend", value: withFriend },
        { key: "friendSpots", value: friendSpots },
      ],
    },
    hostRecruitsHost: {
      status: HOST_REFERRAL.enabled ? "product" : "prepared",
      main: HOST_REFERRAL.enabled && firstHosted.size ? { value: brought.length / firstHosted.size, of: firstHosted.size } : null,
      extra: HOST_REFERRAL.enabled
        ? [
            { key: "brought", value: brought.length },
            { key: "broughtPaid", value: broughtPaid },
          ]
        : [],
    },
  };
}

// ─── Launch › Marketing › Partner ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A partner's Houses: the ones they host (their account) and the ones linked to them – no examples, no unclaimed drafts. */
export function partnerHouses(stays: readonly Stay[], partner: Pick<MarketingPartner, "hostUserId" | "houseIds">): Stay[] {
  return stays.filter((s) => !s.isExample && s.status !== "draft_unclaimed" && ((partner.hostUserId !== null && s.hostId === partner.hostUserId) || partner.houseIds.includes(s.id)));
}

/** Open Houses of a partner: published, taking requests, a spot free. */
export const partnerOpenHouses = (stays: readonly Stay[], partner: Pick<MarketingPartner, "hostUserId" | "houseIds">) =>
  partnerHouses(stays, partner).filter((s) => s.status === "published" && s.acceptingRequests && s.spotsFilled < s.spotsTotal).length;

/** The next step is due (today or earlier). */
export const partnerStepDue = (partner: Pick<MarketingPartner, "nextStep">, today: string) => Boolean(partner.nextStep?.due && partner.nextStep.due <= today);

/**
 * What a partner brought, in the period: visitors → requests → paid stays → Simpulo's revenue, from the growth events that came through their
 * own link (?ref=<code> → campaign) or through their own share links as a host (ref = their account). Each against the period before
 * (getChange). `openShare`: their agreed share of that revenue – shown only, never paid out from here.
 */
export function partnerEffect(events: readonly GrowthEvent[], partner: MarketingPartner, period: GrowthPeriod, today: string) {
  const mine = (e: GrowthEvent) => e.utmCampaign === partner.refCode || (partner.hostUserId !== null && e.refUserId === partner.hostUserId);
  const sum = (list: readonly GrowthEvent[]) => {
    const own = list.filter(mine);
    const count = (name: GrowthEvent["name"]) => own.filter((e) => e.name === name).length;
    const revenue = own.filter((e) => e.name === "payment_completed").reduce((total, e) => total + convertApprox(e.revenue ?? 0, (e.currency ?? "EUR") as Currency, "EUR"), 0);
    return { visits: count("house_viewed"), requests: count("request_sent"), paid: count("payment_completed"), revenue: Math.round(revenue) };
  };
  const now = sum(inWindow(events, period, today));
  const before = sum(inWindow(events, period, today, 1));
  return {
    ...now,
    change: {
      visits: getChange("partnerVisits", now.visits, before?.visits ?? null),
      requests: getChange("partnerRequests", now.requests, before?.requests ?? null),
      paid: getChange("partnerPaid", now.paid, before?.paid ?? null),
      revenue: getChange("partnerRevenue", now.revenue, before?.revenue ?? null),
    },
    openShare: Math.round((now.revenue * partner.agreement.sharePercent) / 100),
  };
}

// ── Danach (der Bogen nach dem House) – vorbereitet ─────────────────────────────────────────────────────────────────────────────

/**
 * The three numbers after a House (CLAUDE.md "Bogen › Danach"), from the recorded answers (UserSettings.after / .thirty) of Houses that
 * ended by `today`; the host doesn't count as a guest. Prepared – not shown yet. TODO(backend): from the precomputed stats; until people
 * answer, the demo has few rows (the others' demo choices in lib/arc.ts are not records).
 * - connectionRate: of the guests who answered "Who would you live with again?", the share with at least one mutual choice (Ziel 60 %)
 * - intentionReached: of those who answered, Yes = 1, Partly = ½, No = 0
 * - stillInTouch: of those who answered after 30 days, the share "Yes"
 * Values in percent (0–100), null without any answer; `answered` = how many answers each rests on.
 */
export function afterMetrics(inputs: Pick<AdminInputs, "stays" | "users" | "joinRequests" | "today">) {
  const ended = inputs.stays.filter((s) => s.endDate.slice(0, 10) < inputs.today && !s.isExample);
  const byId = new Map(inputs.users.map((u) => [u.id, u]));
  let chose = 0;
  let connected = 0;
  let intentions = 0;
  let intentionScore = 0;
  let touchAnswers = 0;
  let inTouch = 0;
  for (const stay of ended) {
    const guests = inputs.joinRequests.filter((r) => r.stayId === stay.id && r.status === "accepted" && r.userId !== stay.hostId).map((r) => r.userId);
    const crew = new Set([stay.hostId, ...guests]);
    const againOf = (id: string) => byId.get(id)?.settings?.after?.[stay.id]?.again ?? [];
    for (const id of guests) {
      const after = byId.get(id)?.settings?.after?.[stay.id];
      if (after) {
        chose++;
        if (after.again.some((other) => crew.has(other) && againOf(other).includes(id))) connected++;
        if (after.intention) {
          intentions++;
          intentionScore += after.intention === "yes" ? 1 : after.intention === "partly" ? 0.5 : 0;
        }
      }
      const thirty = byId.get(id)?.settings?.thirty?.[stay.id];
      if (thirty?.inTouch !== undefined) {
        touchAnswers++;
        if (thirty.inTouch) inTouch++;
      }
    }
  }
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : null);
  return {
    connectionRate: { value: pct(connected, chose), answered: chose },
    intentionReached: { value: pct(intentionScore, intentions), answered: intentions },
    stillInTouch: { value: pct(inTouch, touchAnswers), answered: touchAnswers },
  };
}
