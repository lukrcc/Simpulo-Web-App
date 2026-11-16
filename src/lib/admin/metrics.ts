// Every number of the admin dashboard (/admin) – computed here, never in the UI. Pure functions over the app data and the admin collections;
// the targets and weights come from config/admin.ts. With a backend the same functions run on the server (or as scheduled aggregates).
import { PROVIDER_COST, ANALYSIS_MIN_HOUSES, ANCHOR_TARGET, CHANGE_RULES, OVERVIEW_TARGETS, WARNING_SHARE, fullHousesTarget, feeModelPerFullHouse, type ChangeMetric, type ComparePeriod, HOUSE_RISK, HOST_TIER_RULES, HOST_TIERS, LAUNCH_CRITERIA, MOVE_TARGET, PROFIT_TARGET_PER_MONTH, STATUS_RULES, STREAK_MONTHS, TAX_RESERVE_PERCENT, TOPIC_WEIGHTS, type StatusMetric } from "@/config/admin";
import { FEE_MODEL } from "@/config/policies";
import { convert, isCurrency } from "@/lib/currency";
import { VIBES } from "@/lib/catalog";
import type { HypothesisStatus } from "@/config/hypotheses";
import { ACCOMMODATION_CATEGORIES, accommodationOf, type AccommodationCategoryId } from "@/config/accommodation";
import { MATRIX_HOUSES_FROM, type DepthUnlockMeasure, type RevenueMeasure } from "@/config/vision";
import type { ModelId } from "@/config/models";
import type { AdminData, HouseOutcome, LedgerEntry, MetricsHistory, OverviewSnapshot } from "@/lib/data";
import { READINESS, READINESS_ITEMS, VALUATION, type ReadinessKey } from "@/config/funding";
import { answersSlowly, responseRate } from "@/lib/requests";
import { TICKET_CATEGORIES, type Report, type HostApplication, type HostTier, type User, type JoinRequest, type LivedWith, type Payment, type PlatformPhase, type Stay, type SupportTicket, type TicketCategory, type Vibe } from "@/lib/types";

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
  /** The bookkeeping journal (lib/admin/ledger.ts); null without one */
  ledger: readonly LedgerEntry[] | null;
  phase: PlatformPhase;
  /** YYYY-MM-DD */
  today: string;
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

/** The day compared with (YYYY-MM-DD): a week back, the same day last month (the 31st → the month's last day), the same day last year. */
export function compareDate(today: string, period: ComparePeriod): string {
  const [y, m, d] = today.split("-").map(Number);
  if (period === "week") return new Date(Date.UTC(y, m - 1, d) - 7 * DAY_MS).toISOString().slice(0, 10);
  const [ty, tm] = period === "month" ? [y, m - 2] : [y - 1, m - 1];
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ty, tm, Math.min(d, last))).toISOString().slice(0, 10);
}

/**
 * The overview's numbers on the day compared with: from the history's snapshots where there are some (the mock), else profit and full Houses
 * from the records – that month up to that day –, the shares unknown (they need stored snapshots).
 */
export function previousOverview(inputs: Pick<AdminInputs, "stays" | "payments" | "history" | "today">, period: ComparePeriod): OverviewSnapshot {
  const snap = inputs.history?.snapshots?.[period];
  if (snap) return snap;
  const date = compareDate(inputs.today, period);
  const month = monthOf(date);
  const inMonthUpTo = (iso: string) => monthOf(iso) === month && iso.slice(0, 10) <= date;
  const profit = inputs.payments.filter((p) => p.status === "paid" && p.paidAt && inMonthUpTo(p.paidAt)).reduce((n, p) => n + keptOf(p), 0);
  const fullHouses = inputs.stays.filter((s) => isReal(s) && isFull(s) && inMonthUpTo(s.startDate)).length;
  const sharedNights = inputs.stays.filter((s) => isReal(s) && isFull(s) && inMonthUpTo(s.startDate)).reduce((n, s) => n + s.spotsTotal * nightsOf(s), 0);
  return { profit: Math.round(profit), fullHouses, reservedShare: null, repeatRate: null, sharedNights };
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
    waitlist: admin.waitlist.length,
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
    waitlist: progress(admin.waitlist.length, LAUNCH_CRITERIA.waitlist),
  };
}

/** "YYYY-MM", `back` months before today's. */
function monthBefore(today: string, back: number): string {
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - back, 1)).toISOString().slice(0, 7);
}

/**
 * Full real Houses per month, the last 12 up to this one (so far), against the dynamic target (fullHousesTarget) – from the history where there is one (the
 * mock), else counted from the Houses by their start month. `streak`: completed months in a row at or above the target, at most
 * STREAK_MONTHS back.
 */
export function fullHousesPerMonth(inputs: Pick<AdminInputs, "stays" | "history" | "today" | "payments">) {
  const { stays, history, today } = inputs;
  const full = stays.filter((s) => isReal(s) && isFull(s));
  const rows = Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i;
    const month = monthBefore(today, back);
    const fromHistory = history?.fullHousesPerMonth.find((h) => h.monthsAgo === back)?.full;
    return { month, full: fromHistory ?? full.filter((s) => monthOf(s.startDate) === month).length };
  });
  const current = rows.at(-1)!.full;
  // The target is dynamic: €5,000 over what one full House brings this month (fullHousesTarget; without full Houses the fee model).
  const profit = profitPerMonth(inputs).at(-1)!.profit;
  const target = fullHousesTarget(current > 0 ? Math.round(profit / current) : null);
  let streak = 0;
  for (const row of rows.slice(0, -1).toReversed().slice(0, STREAK_MONTHS)) {
    if (row.full < target) break;
    streak++;
  }
  return { rows, current, target, streak, streakOf: STREAK_MONTHS, status: statusAgainst(current, target), progress: progress(current, target) };
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
export function waitlistMetrics({ admin, today }: Pick<AdminInputs, "admin" | "today">) {
  const end = Date.parse(today) + DAY_MS;
  const weeks = Array.from({ length: 12 }, (_, i) => end - (11 - i) * 7 * DAY_MS);
  const overTime = weeks.map((weekEnd) => ({ week: new Date(weekEnd - DAY_MS).toISOString().slice(0, 10), total: admin.waitlist.filter((e) => Date.parse(e.createdAt) < weekEnd).length }));
  const bySource = countBy(admin.waitlist.map((e) => e.source ?? "direct"));
  const byInterest = countBy(admin.waitlist.flatMap((e) => e.interests));
  return {
    total: admin.waitlist.length,
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

/**
 * Profit this month (against PROFIT_TARGET_PER_MONTH), per full House this month, and in all – from the history (mock), else from the paid
 * payments. TODO(backend): in EUR at the day's rate; the fallback adds the Houses' own currencies as they are.
 */
export function money(inputs: Pick<AdminInputs, "stays" | "payments" | "history" | "today">) {
  const paid = inputs.payments.filter((p) => p.status === "paid" && p.paidAt);
  const perMonth = (back: number) =>
    inputs.history?.profitPerMonth.find((h) => h.monthsAgo === back)?.profit ?? paid.filter((p) => monthOf(p.paidAt!) === monthBefore(inputs.today, back)).reduce((n, p) => n + keptOf(p), 0);
  const thisMonth = Math.round(perMonth(0));
  const total = Math.round(inputs.history ? inputs.history.profitPerMonth.reduce((n, h) => n + h.profit, 0) : paid.reduce((n, p) => n + keptOf(p), 0));
  const fullThisMonth = fullHousesPerMonth({ ...inputs, history: inputs.history }).current;
  return {
    profitThisMonth: thisMonth,
    target: PROFIT_TARGET_PER_MONTH,
    status: getStatus("profitPerMonth", thisMonth),
    perHouse: fullThisMonth > 0 ? Math.round(thisMonth / fullThisMonth) : null,
    total,
  };
}

/** What Simpulo kept per month, the last 12 up to this one (so far), against the target – from the history, else from the paid payments. */
export function profitPerMonth(inputs: Pick<AdminInputs, "payments" | "history" | "today">) {
  const paid = inputs.payments.filter((p) => p.status === "paid" && p.paidAt);
  return Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i;
    const month = monthBefore(inputs.today, back);
    const profit = inputs.history?.profitPerMonth.find((h) => h.monthsAgo === back)?.profit ?? paid.filter((p) => monthOf(p.paidAt!) === month).reduce((n, p) => n + keptOf(p), 0);
    return { month, profit: Math.round(profit), status: getStatus("profitPerMonth", profit) };
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
 * The overview (Übersicht): the move – profit this month with its change and the streak; ONE number per area – Angebot full Houses this
 * month · Nachfrage Houses with 2+ reservations · Qualität repeat guests · Geld revenue per full House –, each with its target, status and
 * change against the same day of the period before (`period`, COMPARE_PERIODS). Targets: full Houses dynamic (fullHousesTarget: €5,000 over
 * what a full House brings), reservations 60 %, repeat guests 25 %, per full House the fee model. "Braucht dich" comes from the tasks
 * (lib/admin/tasks.ts needsYou). Every other number lives in its tab.
 */
export function cockpit(inputs: AdminInputs, period: ComparePeriod) {
  const o = overview(inputs);
  const a = algorithmMetrics(inputs);
  const m = money(inputs);
  const full = fullHousesPerMonth(inputs);
  const pct = (ratio: number | null) => (ratio === null ? null : Math.round(ratio * 100));
  const reserved = pct(o.reservedShare);
  const repeat = pct(a.repeatRate);
  const prev = previousOverview(inputs, period);
  const prevPerHouse = prev.profit !== null && prev.fullHouses ? Math.round(prev.profit / prev.fullHouses) : null;
  const move = moveProgress(inputs);

  const fullTarget = full.target;
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
    compareDate: compareDate(inputs.today, period),
    move: { ...move, change: getChange("profit", move.current, prev.profit) },
    areas: [
      { key: "supply", href: "/admin/houses", number: number("fullHouses", full.current, "count", fullTarget, prev.fullHouses, "fullHouses") },
      { key: "demand", href: "/admin/growth", number: number("reservedShare", reserved, "percent", OVERVIEW_TARGETS.reservedShare, prev.reservedShare, "reservedShare") },
      { key: "quality", href: "/admin/data", number: number("repeatRate", repeat, "percent", OVERVIEW_TARGETS.repeatRate, prev.repeatRate, "repeatRate") },
      { key: "money", href: "/admin/money", number: number("perHouse", m.perHouse, "eur", perHouseTarget, prevPerHouse, "perHouse") },
    ] as const,
  };
}

/** One capsule in "Braucht dich", in order of urgency (lib/admin/tasks.ts needsYou). */
export type NeedsYou =
  | { key: "safety" | "money" | "deadline" | "atRisk" | "applications" | "hostWarning" | "tickets"; count: number }
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
export function companyBalance(inputs: Pick<AdminInputs, "payments" | "history" | "today" | "admin">) {
  const year = inputs.today.slice(0, 4);
  const profit = profitPerMonth(inputs)
    .filter((r) => r.month.startsWith(year))
    .reduce((n, r) => n + r.profit, 0);
  const taxReserve = Math.round((profit * TAX_RESERVE_PERCENT) / 100);
  const withdrawals = inputs.admin.withdrawals.filter((w) => w.date.startsWith(year)).reduce((n, w) => n + w.amount, 0);
  return { year, profit, taxReserve, taxPercent: TAX_RESERVE_PERCENT, withdrawals, left: profit - taxReserve - withdrawals };
}

// ── The move and the vision (Cockpit's stage, Admin › Vision) ─────────────────────────────────────────────────────────────────────

/** Completed months in a row (this month left out) at or above the target, at most MOVE_TARGET.months back. */
function streakAt(values: readonly number[], target: number): number {
  let streak = 0;
  for (const value of values.slice(0, -1).toReversed().slice(0, MOVE_TARGET.months)) {
    if (value < target) break;
    streak++;
  }
  return streak;
}

/** The move: profit this month against €5,000, the last 12 months, and the completed months in a row at it (of six). */
export function moveProgress(inputs: Pick<AdminInputs, "payments" | "history" | "today">) {
  const rows = profitPerMonth(inputs);
  const current = rows.at(-1)!.profit;
  const target = MOVE_TARGET.profitPerMonth;
  const streak = streakAt(
    rows.map((r) => r.profit),
    target,
  );
  return { rows, current, target, streak, streakOf: MOVE_TARGET.months, reached: streak >= MOVE_TARGET.months, status: getStatus("profitPerMonth", current), progress: progress(current, target) };
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
export type AnalysisDimension = "topic" | "length" | "crew" | "category" | "hub" | "tier" | "depth";
/** "depth" (Tiefe) only while the depth choice is on (config/platform.ts) – analysisDimensions(depthOn). */
export const ANALYSIS_DIMENSIONS: readonly AnalysisDimension[] = ["topic", "length", "crew", "category", "hub", "tier", "depth"];
export const analysisDimensions = (depthOn: boolean) => ANALYSIS_DIMENSIONS.filter((d) => depthOn || d !== "depth");
/** kurz ≤ 5 nights · mittel 1–3 weeks (6–27) · lang 4+ weeks (28+) */
export const lengthBand = (nights: number) => (nights <= 5 ? "short" : nights < 28 ? "mid" : "long");
/** 2–4 · 5–8 · 9+ (host included) */
export const crewBand = (size: number) => (size <= 4 ? "2-4" : size <= 8 ? "5-8" : "9+");

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
        serviceFee: Math.round(paid.reduce((n, p) => n + toEur(p.fee, stays, s.id), 0)),
        hostFeeShare: Math.round(paid.reduce((n, p) => n + toEur(((p.hostFee ?? 0) * FEE_MODEL.hostFeeCommissionPercent) / 100, stays, s.id), 0)),
        daysToFull: daysToFullOf(s, joinRequests),
        fillRate: fillRateOf(s),
        depth: s.depth ?? "balanced",
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
  if (dimension === "hub") return o.hub;
  return o.tier;
}

/**
 * Admin › Analyse: per angle (topic, length, crew size, kind of place, hub, host tier) the Houses that started in the period – revenue per
 * person and per House, days to full, fill rate, repeat guests (12 months), value per person per year. Most valuable first.
 */
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
function activityOf(inputs: Pick<AdminInputs, "joinRequests" | "history" | "today">, stay: Stay) {
  const now = Date.parse(`${inputs.today}T12:00:00Z`);
  const mock = inputs.history?.houseActivity;
  if (mock) {
    const a = mock[stay.id] ?? {};
    return { quietDays: a.quietDays ?? 0, oldestPendingHours: a.oldestPendingHours ?? null };
  }
  const requests = inputs.joinRequests.filter((r) => r.stayId === stay.id);
  const last = requests.reduce((max, r) => (r.createdAt > max ? r.createdAt : max), stay.createdAt);
  const pending = requests.filter((r) => r.status === "pending").map((r) => (now - Date.parse(r.createdAt)) / 3_600_000);
  return { quietDays: Math.floor((now - Date.parse(last)) / DAY_MS), oldestPendingHours: pending.length ? Math.max(...pending) : null };
}

/** Upcoming real Houses where a rule holds, most reasons first, then the soonest. */
export function atRiskHouses(inputs: Pick<AdminInputs, "stays" | "joinRequests" | "history" | "today">) {
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
      if (activity.oldestPendingHours !== null && activity.oldestPendingHours > HOUSE_RISK.unansweredHours) reasons.push({ key: "unanswered", hours: Math.round(activity.oldestPendingHours) });
      return reasons.length ? [{ stay, reasons }] : [];
    })
    .toSorted((a, b) => b.reasons.length - a.reasons.length || a.stay.startDate.localeCompare(b.stay.startDate));
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

/** Vision › Zielgruppen, "Simpulo heute": what Simpulo kept in the last 12 months (this month so far included), EUR. */
export function revenueLast12(inputs: Pick<AdminInputs, "payments" | "history" | "today">): number {
  return profitPerMonth(inputs).reduce((n, r) => n + r.profit, 0);
}

/**
 * Vision › Technik › Anbieter heute: each provider's cost over the last 12 months in % of the revenue in that time (revenueLast12), with its
 * level against PROVIDER_COST (from 5 % "warning" amber, from 10 % "critical" ember – "Selbermachen prüfen"). null = not known (the real
 * source has no costs yet); `example` = mock values.
 */
export function providerCosts(inputs: Pick<AdminInputs, "payments" | "history" | "today">) {
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
  const move = moveProgress(inputs);
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
    moved: { met: inputs.admin.fundingMoved },
    profitStreak: { met: move.streak >= READINESS.profit.months, streak: move.streak, current: move.current },
    repeatRate: { met: repeatPct !== null && repeatPct >= READINESS.repeatRatePercent, value: repeatPct },
    fullHousesGrowth: { met: growth !== null && growth * 100 >= READINESS.fullHousesGrowth.percentPerMonth, value: growth, from, to },
    hubsFill: { met: hubs.length >= READINESS.hubs.min, hubs },
    contribution: { met: contribution !== null && contribution > 0, value: contribution },
  };
  // Every key of the checklist has its value (checked by the type, extra fields allowed).
  const byKey: Record<ReadinessKey, { met: boolean }> = values;
  const items = READINESS_ITEMS.map((item) => ({ ...item, met: byKey[item.key].met }));
  return { items, values, met: items.filter((i) => i.met).length, total: items.length, moved: values.moved.met };
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
    const fromSeries = (key: keyof NonNullable<MetricsHistory["series"]>) => series?.[key][i] ?? null;
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

/** The north star this month (so far) and its change against the same day of the period before (OverviewSnapshot.sharedNights). */
export function northStar(inputs: AdminInputs, period: ComparePeriod) {
  const rows = monthlySeries(inputs);
  const current = rows.at(-1)!.sharedNights;
  const previous = previousOverview(inputs, period).sharedNights ?? null;
  return { current, change: getChange("sharedNights", current, previous), rows };
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
