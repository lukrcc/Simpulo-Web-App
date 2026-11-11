// Payouts as a host's dashboard (Your houses › Payouts): the host type, what they earned (host fees after Simpulo's cut – the real income)
// kept apart from the rent they passed on (the crew's shares of the place – not income), the numbers that count up in the head, the bars
// per month, the way to Top Host and a few insights. Every sum in EUR (≈), shown in the viewer's currency. Rules in config/policies.ts.
import { HOST_POLICY } from "@/config/policies";
import type { EarningRow, Earnings } from "./earnings";
import { convertApprox } from "./rates";
import { responseRate } from "./requests";
import type { JoinRequest, Stay } from "./types";

export type HostType = "pro" | "share";
export type Series = "earnings" | "rent";

const DAY_MS = 86_400_000;
const eur = (amount: number, row: EarningRow) => Math.round(convertApprox(amount, row.currency, "EUR"));
const valueOf = (row: EarningRow, series: Series) => eur(series === "earnings" ? row.hostEarnings : row.rentPassed, row);

/** Pro host: at least one House with a host fee (config/policies.ts HOST_POLICY); else a share host. */
export function hostTypeOf(earnings: Earnings, hosted: readonly Stay[], withoutHostFees = false): HostType {
  if (withoutHostFees) return "share";
  return earnings.rows.some((r) => r.hostFee > 0) || hosted.some((s) => (s.hostFeePerPerson ?? 0) > 0) ? "pro" : "share";
}

export interface MonthBar {
  month: string;
  amount: number;
  /** The Houses paid out in it */
  houses: string[];
}

/** Paid out per month in EUR: the last 12 months, or every month since the first payout ("All time"), oldest first. */
export function monthlySeries(earnings: Earnings, today: string, series: Series, range: "year" | "all"): MonthBar[] {
  const paid = earnings.rows.filter((r) => r.status === "paid");
  const first = paid.map((r) => r.payoutDate.slice(0, 7)).toSorted()[0];
  const end = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  const count = range === "all" && first ? Math.max(12, (end.getUTCFullYear() - Number(first.slice(0, 4))) * 12 + end.getUTCMonth() - (Number(first.slice(5, 7)) - 1) + 1) : 12;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(end);
    d.setUTCMonth(d.getUTCMonth() - (count - 1 - i));
    const month = d.toISOString().slice(0, 7);
    const rows = paid.filter((r) => r.payoutDate.startsWith(month) && valueOf(r, series) > 0);
    return { month, amount: rows.reduce((sum, r) => sum + valueOf(r, series), 0), houses: rows.map((r) => r.title) };
  });
}

export interface HostStats {
  type: HostType;
  /** Pro: host fees after Simpulo's cut, paid out this year / last year (EUR) */
  earningsThisYear: number;
  earningsLastYear: number;
  /** Guests who paid a host fee this year, and the earnings per guest */
  feeGuestsThisYear: number;
  perGuest: number;
  /** Booked, not yet paid out: host fees still to come (EUR) */
  comingUp: number;
  /** Rent passed on this year (EUR) – not income */
  rentThisYear: number;
  /** Share of spots filled over the hosted Houses, 0–1 */
  fillRate: number;
  /** Best House of the year (most earnings, a share host's: most rent), with its House when it's in the data */
  best: { row: EarningRow; amount: number } | null;
  /** People who joined two or more of the host's Houses */
  repeatGuests: number;
  /** Share host: Houses hosted, people brought together, how many were full (0–1) */
  houses: number;
  people: number;
  fullShare: number;
  /** Top Host: full Houses this year (of HOST_POLICY.topHostFullHouses), the answer rate, and whether both are met */
  fullThisYear: number;
  topHost: boolean;
  /** Days from opening until the crew was complete, on average – null without data */
  daysToFill: number | null;
  /** The best-filled past House, for "Do it again" */
  againStay: Stay | null;
}

const isOver = (s: Stay, today: string) => s.status === "completed" || s.endDate < today;

export function hostStatsFor(data: { stays: readonly Stay[]; joinRequests: readonly JoinRequest[] }, earnings: Earnings, userId: string, today: string, withoutHostFees = false): HostStats {
  const hosted = data.stays.filter((s) => s.hostId === userId && s.status !== "draft" && s.status !== "closed" && s.status !== "draft_unclaimed");
  const year = today.slice(0, 4);
  const lastYear = String(Number(year) - 1);
  const paid = earnings.rows.filter((r) => r.status === "paid");
  const inYear = (y: string) => paid.filter((r) => r.payoutDate.startsWith(y));
  const sum = (rows: EarningRow[], series: Series) => rows.reduce((total, r) => total + valueOf(r, series), 0);
  const feeRows = inYear(year).filter((r) => r.hostEarnings > 0);
  const feeGuests = feeRows.reduce((n, r) => n + r.guests, 0);
  const earningsThisYear = sum(feeRows, "earnings");
  const type = hostTypeOf(earnings, hosted, withoutHostFees);
  const series: Series = type === "pro" ? "earnings" : "rent";
  const best = inYear(year)
    .map((row) => ({ row, amount: valueOf(row, series) }))
    .toSorted((a, b) => b.amount - a.amount)[0];

  // Repeat guests: anyone accepted into two or more of this host's Houses.
  const hostedIds = new Set(hosted.map((s) => s.id));
  const joins = new Map<string, number>();
  for (const r of data.joinRequests) if (r.status === "accepted" && hostedIds.has(r.stayId) && r.userId !== userId) joins.set(r.userId, (joins.get(r.userId) ?? 0) + 1);

  const filled = hosted.reduce((n, s) => n + s.spotsFilled, 0);
  const total = hosted.reduce((n, s) => n + s.spotsTotal, 0);
  const full = hosted.filter((s) => s.spotsFilled >= s.spotsTotal);
  // Past Houses from before the data (the payout history) ran full: they count towards the year's full Houses.
  const historyFull = earnings.rows.filter((r) => !r.stay && r.startDate.startsWith(year)).length;
  const fullThisYear = full.filter((s) => s.startDate.startsWith(year)).length + historyFull;
  const rate = responseRate(data, userId, Date.parse(`${today}T12:00:00Z`));
  const filledAt = hosted.filter((s) => s.lockedAt && s.spotsFilled >= s.spotsTotal).map((s) => (Date.parse(s.lockedAt!) - Date.parse(s.createdAt)) / DAY_MS);
  const againStay = hosted.filter((s) => isOver(s, today)).toSorted((a, b) => b.spotsFilled / b.spotsTotal - a.spotsFilled / a.spotsTotal || b.endDate.localeCompare(a.endDate))[0] ?? null;

  return {
    type,
    earningsThisYear,
    earningsLastYear: sum(inYear(lastYear).filter((r) => r.hostEarnings > 0), "earnings"),
    feeGuestsThisYear: feeGuests,
    perGuest: feeGuests > 0 ? Math.round(earningsThisYear / feeGuests) : 0,
    comingUp: earnings.rows.filter((r) => r.status !== "paid").reduce((n, r) => n + valueOf(r, "earnings"), 0),
    rentThisYear: sum(inYear(year), "rent"),
    fillRate: total > 0 ? filled / total : 0,
    best: best && best.amount > 0 ? best : null,
    repeatGuests: [...joins.values()].filter((n) => n >= 2).length,
    houses: hosted.length + earnings.rows.filter((r) => !r.stay).length,
    people: hosted.reduce((n, s) => n + Math.max(0, s.spotsFilled - 1), 0) + earnings.rows.filter((r) => !r.stay).reduce((n, r) => n + r.guests, 0),
    fullShare: hosted.length > 0 ? full.length / hosted.length : 0,
    fullThisYear,
    topHost: fullThisYear >= HOST_POLICY.topHostFullHouses && rate >= HOST_POLICY.topHostResponseRate,
    daysToFill: filledAt.length > 0 ? Math.max(1, Math.round(filledAt.reduce((a, b) => a + b, 0) / filledAt.length)) : null,
    againStay,
  };
}

/** The year's change against the last, in whole percent – null without a last year. */
export function trendPercent(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}
