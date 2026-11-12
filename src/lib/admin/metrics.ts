// Every number of the admin dashboard (/admin) – computed here, never in the UI. Pure functions over the app data and the admin collections;
// the targets and weights come from config/admin.ts. With a backend the same functions run on the server (or as scheduled aggregates).
import { LAUNCH_CRITERIA, MOVE_TARGET, PROFIT_TARGET_PER_MONTH, STATUS_RULES, STREAK_MONTHS, TOPIC_WEIGHTS, type StatusMetric } from "@/config/admin";
import { FEE_MODEL } from "@/config/policies";
import { VIBES } from "@/lib/catalog";
import type { AdminData, MetricsHistory } from "@/lib/data";
import { getVisibleHouses } from "@/lib/data/visibleHouses";
import type { JoinRequest, LivedWith, Payment, PlatformPhase, Stay, Vibe } from "@/lib/types";

export interface AdminInputs {
  stays: readonly Stay[];
  joinRequests: readonly JoinRequest[];
  livedWith: readonly LivedWith[];
  payments: readonly Payment[];
  admin: AdminData;
  /** The months and weekly trends behind the Cockpit (mock); null = computed from the records alone */
  history: MetricsHistory | null;
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
 * Full real Houses per month, the last 12 up to this one (so far), against the move target – from the history where there is one (the
 * mock), else counted from the Houses by their start month. `streak`: completed months in a row at or above the target, at most
 * STREAK_MONTHS back.
 */
export function fullHousesPerMonth({ stays, history, today }: Pick<AdminInputs, "stays" | "history" | "today">) {
  const full = stays.filter((s) => isReal(s) && isFull(s));
  const rows = Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i;
    const month = monthBefore(today, back);
    const fromHistory = history?.fullHousesPerMonth.find((h) => h.monthsAgo === back)?.full;
    return { month, full: fromHistory ?? full.filter((s) => monthOf(s.startDate) === month).length };
  });
  const current = rows.at(-1)!.full;
  const target = MOVE_TARGET.fullHousesPerMonth;
  let streak = 0;
  for (const row of rows.slice(0, -1).toReversed().slice(0, STREAK_MONTHS)) {
    if (row.full < target) break;
    streak++;
  }
  return { rows, current, target, streak, streakOf: STREAK_MONTHS, status: getStatus("fullHousesPerMonth", current), progress: progress(current, target) };
}

// ── Houses ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface HouseRow {
  stay: Stay;
  kind: HouseKind;
  hub: string;
  fillRate: number;
  reservations: number;
}

/** Every House that isn't a draft: real ones first, then founding, then examples; fullest first within. */
export function houseRows({ stays }: Pick<AdminInputs, "stays">): HouseRow[] {
  const order: Record<HouseKind, number> = { real: 0, founding: 1, example: 2 };
  return stays
    .filter((s) => s.status !== "draft" && s.status !== "draft_unclaimed")
    .map((stay) => ({ stay, kind: kindOf(stay), hub: hubOf(stay), fillRate: fillRateOf(stay), reservations: reservationsOf(stay) }))
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
export function algorithmMetrics({ stays, joinRequests, livedWith }: Pick<AdminInputs, "stays" | "joinRequests" | "livedWith">) {
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

// ── Cockpit ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type CockpitKey = "realHouses" | "examplesLeft" | "openApplications" | "waitlist" | "reservedShare" | "bestSource" | "mutualShare" | "repeatRate" | "daysToFull" | "profit" | "perHouse" | "revenueTotal";

export interface CockpitNumber {
  key: CockpitKey;
  /** The number (null = none yet) */
  value: number | null;
  /** How it reads: "count" · "percent" (value 0–100) · "days" · "eur" · "text" (then `text`) */
  format: "count" | "percent" | "days" | "eur" | "text";
  text?: string;
  /** null = no target, no status colour */
  status: Status | null;
  /** The last 8 weeks, the last one now */
  spark: number[];
  /** Change against the week before (null = no history) */
  delta: number | null;
}

type Trend = keyof MetricsHistory["weekly"];

/** The last 8 weeks of a number: today's value shaped by the history's weekly trend; without history only today. */
function weeksOf(value: number | null, trend: Trend, history: MetricsHistory | null, decimals = 0): number[] {
  if (value === null) return [];
  if (!history) return [value];
  const f = 10 ** decimals;
  return history.weekly[trend].map((factor) => Math.round(value * factor * f) / f);
}

function cockpitNumber(key: CockpitKey, value: number | null, format: CockpitNumber["format"], trend: Trend, history: MetricsHistory | null, status: Status | null, text?: string): CockpitNumber {
  const spark = weeksOf(value, trend, history);
  return { key, value, format, text, status, spark, delta: spark.length >= 2 ? spark.at(-1)! - spark.at(-2)! : null };
}

/** The Cockpit: the move target on top, then Supply · Demand · Quality · Money with three numbers each, the launch criteria, the top topics. */
export function cockpit(inputs: AdminInputs) {
  const { history } = inputs;
  const o = overview(inputs);
  const launch = launchProgress(inputs);
  const a = algorithmMetrics(inputs);
  const w = waitlistMetrics(inputs);
  const m = money(inputs);
  const examplesLeft = getVisibleHouses(inputs.stays, inputs.phase).filter((s) => s.isExample).length;
  const best = w.bySource.find((s) => s.key !== "direct") ?? w.bySource[0] ?? null;
  const pct = (ratio: number | null) => (ratio === null ? null : Math.round(ratio * 100));
  const reserved = pct(o.reservedShare);
  const mutual = pct(a.mutualShare);
  const repeat = pct(a.repeatRate);

  return {
    move: fullHousesPerMonth(inputs),
    groups: {
      supply: [
        cockpitNumber("realHouses", o.realHouses, "count", "rising", history, getStatus("realHouses", o.realHouses)),
        cockpitNumber("examplesLeft", examplesLeft, "count", "falling", history, null),
        cockpitNumber("openApplications", o.openApplications, "count", "steady", history, getStatus("openApplications", o.openApplications)),
      ],
      demand: [
        cockpitNumber("waitlist", o.waitlist, "count", "rising", history, getStatus("waitlist", o.waitlist)),
        cockpitNumber("reservedShare", reserved, "percent", "steady", history, getStatus("reservedShare", reserved)),
        cockpitNumber("bestSource", best?.count ?? null, "text", "rising", history, null, best?.key),
      ],
      quality: [
        cockpitNumber("mutualShare", mutual, "percent", "steady", history, getStatus("mutualShare", mutual)),
        cockpitNumber("repeatRate", repeat, "percent", "rising", history, getStatus("repeatRate", repeat)),
        cockpitNumber("daysToFull", a.medianDaysToFull, "days", "falling", history, getStatus("daysToFull", a.medianDaysToFull)),
      ],
      money: [
        cockpitNumber("profit", m.profitThisMonth, "eur", "rising", history, m.status),
        cockpitNumber("perHouse", m.perHouse, "eur", "steady", history, null),
        cockpitNumber("revenueTotal", m.total, "eur", "rising", history, null),
      ],
    },
    launch: [
      { key: "houses", progress: launch.houses, status: getStatus("realHouses", launch.houses.value) },
      { key: "hubs", progress: launch.hubs, status: getStatus("hubs", launch.hubs.value) },
      { key: "reservedShare", progress: launch.reservedShare, status: getStatus("reservedShare", launch.reservedShare.value) },
      { key: "waitlist", progress: launch.waitlist, status: getStatus("waitlist", launch.waitlist.value) },
    ],
    topics: topicScores(inputs).slice(0, 5),
  };
}
