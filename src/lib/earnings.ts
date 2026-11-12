// A host's money: what each hosted House pays out, when, and the history of payouts – Your houses › Payouts. The crew's shares aren't
// income: the host passes them on for the stay. Only a host experience (host fee) is the host's own.
// Per guest the host receives the stay share + 90 % of the host programme (paymentSplit); Simpulo keeps the programme's
// 10 % (the guests' own fee isn't the host's). The payout comes after check-in. Earlier Houses that aren't in the data
// any more (the mock's history of hosts with a host experience) come from the data source (pastEarningsOf).
import { pastEarningsOf, type PastEarning } from "./data";
import { paymentSplit } from "./fees";
import { convertApprox } from "./rates";
import type { Currency, Payment, Stay } from "./types";

export type EarningStatus = "paid" | "scheduled" | "pending";

export interface EarningRow {
  id: string;
  title: string;
  /** The House in the data, when it's still there */
  stay?: Stay;
  startDate: string;
  endDate: string;
  guests: number;
  /** What the guests paid towards the host: shares + host programme */
  gross: number;
  /** The host experience (host fee) the guests paid – 0 without one */
  hostFee: number;
  /** Simpulo's commission on the host programme */
  fee: number;
  /** The crew's shares of the place, passed on for the stay – not income */
  rentPassed: number;
  /** The host's own earnings: the host fee after Simpulo's commission */
  hostEarnings: number;
  payout: number;
  currency: Currency;
  status: EarningStatus;
  /** When it's paid out (after check-in) */
  payoutDate: string;
}

export interface Payout {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  account: string;
  status: "paid" | "scheduled";
}

export interface Earnings {
  rows: EarningRow[];
  payouts: Payout[];
  /** The last 12 months, oldest first: "YYYY-MM" and what was paid out in it */
  months: { month: string; amount: number }[];
  allTime: number;
  thisYear: number;
  /** Houses paid out this year */
  housesThisYear: number;
  /** What the host kept from host fees this year (host fee − Simpulo's 10 %) */
  hostFeesThisYear: number;
  pending: number;
  next: Payout | null;
  currency: Currency;
  /** Had a payout, or one is coming */
  any: boolean;
}

/** The mock's payout account; the real one comes from the payout settings. */
const ACCOUNT = "****1234";
const DAY_MS = 86_400_000;
const dayAfter = (date: string) => new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);

/** Dev menu "Share host": the same Houses as if none had a host fee. */
export interface EarningsOptions {
  withoutHostFees?: boolean;
}

function rowOf(stay: Stay, payments: Payment[], today: string, options: EarningsOptions): EarningRow | null {
  const share = stay.pricePerPerson;
  if (!share || stay.accommodationStatus !== "locked") return null;
  const mine = payments.filter((p) => p.stayId === stay.id && p.userId !== stay.hostId && p.status !== "refunded");
  const paid = mine.filter((p) => p.status === "paid");
  const over = stay.status === "completed" || stay.endDate < today;
  // Past Houses in the mock have no payment records: everyone but the host paid.
  const guests = over && mine.length === 0 ? Math.max(0, stay.spotsFilled - 1) : paid.length;
  if (guests === 0) return null;
  const split = paymentSplit(share, options.withoutHostFees ? 0 : (stay.hostFeePerPerson ?? 0));
  const payoutDate = dayAfter(stay.startDate);
  const status: EarningStatus = payoutDate <= today ? "paid" : stay.allPaidAt || stay.bookingConfirmedAt ? "scheduled" : "pending";
  return {
    id: stay.id,
    title: stay.title,
    stay,
    startDate: stay.startDate,
    endDate: stay.endDate,
    guests,
    gross: guests * (split.share + split.hostFee),
    hostFee: guests * split.hostFee,
    fee: guests * split.commission,
    rentPassed: guests * split.share,
    hostEarnings: guests * (split.hostFee - split.commission),
    payout: guests * split.hostReceives,
    currency: stay.currency,
    status,
    payoutDate,
  };
}

function pastRow(entry: PastEarning, options: EarningsOptions): EarningRow {
  const split = paymentSplit(entry.share, options.withoutHostFees ? 0 : entry.hostFee);
  return {
    id: entry.id,
    title: entry.title,
    startDate: entry.startDate,
    endDate: entry.endDate,
    guests: entry.guests,
    gross: entry.guests * (split.share + split.hostFee),
    hostFee: entry.guests * split.hostFee,
    fee: entry.guests * split.commission,
    rentPassed: entry.guests * split.share,
    hostEarnings: entry.guests * (split.hostFee - split.commission),
    payout: entry.guests * split.hostReceives,
    currency: entry.currency,
    status: "paid",
    payoutDate: dayAfter(entry.startDate),
  };
}

export function earningsFor(data: { stays: readonly Stay[]; payments: readonly Payment[] }, userId: string | null, today: string, options: EarningsOptions = {}): Earnings {
  const hosted = userId ? data.stays.filter((s) => s.hostId === userId && s.status !== "draft" && s.status !== "closed") : [];
  const rows = [...hosted.flatMap((s) => rowOf(s, [...data.payments], today, options) ?? []), ...(userId ? pastEarningsOf(userId).map((e) => pastRow(e, options)) : [])].toSorted((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );
  const payouts: Payout[] = rows
    .filter((r) => r.status !== "pending")
    .map((r) => ({ id: `po-${r.id}`, date: r.payoutDate, amount: r.payout, currency: r.currency, account: ACCOUNT, status: r.status === "paid" ? ("paid" as const) : ("scheduled" as const) }))
    .toSorted((a, b) => b.date.localeCompare(a.date));
  const paid = rows.filter((r) => r.status === "paid");
  // Houses are paid out in their own currencies: every sum is in EUR (≈), shown in the viewer's currency.
  const eur = (r: EarningRow) => Math.round(convertApprox(r.payout, r.currency, "EUR"));
  const year = today.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    const month = d.toISOString().slice(0, 7);
    return { month, amount: paid.filter((r) => r.payoutDate.startsWith(month)).reduce((sum, r) => sum + eur(r), 0) };
  });
  const upcoming = rows.filter((r) => r.status !== "paid").toSorted((a, b) => a.payoutDate.localeCompare(b.payoutDate));
  // In EUR like every sum here (a House in IDR would otherwise show its rupiah with a € sign).
  // "Next payout": the sum of everything still to be paid out, with the next date – ONE number everywhere (Payouts' strip, Your houses' footer);
  // there is no second "coming up" figure.
  const next = upcoming[0] ? { id: `po-${upcoming[0].id}`, date: upcoming[0].payoutDate, amount: upcoming.reduce((sum, r) => sum + eur(r), 0), currency: "EUR" as Currency, account: ACCOUNT, status: "scheduled" as const } : null;
  return {
    rows,
    payouts,
    months,
    allTime: paid.reduce((sum, r) => sum + eur(r), 0),
    thisYear: paid.filter((r) => r.payoutDate.startsWith(year)).reduce((sum, r) => sum + eur(r), 0),
    housesThisYear: paid.filter((r) => r.payoutDate.startsWith(year)).length,
    hostFeesThisYear: paid.filter((r) => r.payoutDate.startsWith(year)).reduce((sum, r) => sum + Math.round(convertApprox(r.hostFee - r.fee, r.currency, "EUR")), 0),
    pending: upcoming.reduce((sum, r) => sum + eur(r), 0),
    next,
    /** The sums' currency: always EUR (rows and payouts keep their own) */
    currency: "EUR",
    any: rows.length > 0,
  };
}

/** The table as CSV, for the tax return: one line per House. */
export function earningsCsv(earnings: Earnings): string {
  const head = ["House", "Start", "End", "Guests", "Host fee", "Simpulo fee", "Your earnings", "Rent passed on", "Payout", "Currency", "Status", "Payout date"];
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [head, ...earnings.rows.map((r) => [r.title, r.startDate, r.endDate, r.guests, r.hostFee, r.fee, r.hostEarnings, r.rentPassed, r.payout, r.currency, r.status, r.payoutDate])].map((line) => line.map(cell).join(",")).join("\n");
}
