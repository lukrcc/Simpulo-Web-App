// The booking journal (Geld › Steuern › Buchungsjournal): one line per money event on Simpulo's side, built from the payments in the data
// (mock: the store's seeded payments – later Stripe's charges, refunds and fees). Pure: payments, Houses and today in, lines and sums out.
// Every rate, account and setting comes from config/tax.ts (placeholders – mit Steuerberater klären); nothing here decides a tax question.
import { FEE_MODEL } from "@/config/policies";
import { DATEV, JOURNAL_RESERVE_PERCENT, JOURNAL_VAT, STRIPE_FEE, type JournalKind } from "@/config/tax";
import { convert, isCurrency } from "@/lib/currency";
import type { Payment, Stay } from "@/lib/types";
import { periodAt, type Period as LedgerPeriod } from "./ledger";

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;

/** offen: the House isn't fully paid yet (the money waits) · ausgezahlt: everyone paid, the host's part went out · erstattet: refunded */
export type JournalStatus = "open" | "paidOut" | "refunded";

export interface JournalLine {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  kind: JournalKind;
  stayId: string;
  house: string;
  paymentId: string;
  /** EUR, gross (negative: a refund or a fee) */
  gross: number;
  /** Percent from config/tax.ts (0 while VAT is off) */
  taxRate: number;
  /** The VAT contained in `gross` */
  tax: number;
  net: number;
  status: JournalStatus;
  /** "SIM-2026-0042" – the receipt Simpulo issues for it */
  receiptNo: string;
  /** The original amount and currency of the payment it belongs to (for the receipt) */
  original: { amount: number; currency: string };
}

// ── Periods: week · month · quarter · year ──────────────────────────────────────────────────────────────────────────────────────

export type JournalPeriodKind = "week" | "month" | "quarter" | "year";
export const JOURNAL_PERIODS: readonly JournalPeriodKind[] = ["week", "month", "quarter", "year"];
export interface JournalPeriod {
  kind: JournalPeriodKind;
  key: string;
  from: string;
  to: string;
  year: number;
  /** ISO week, month 1–12, quarter 1–4, 0 for a year */
  index: number;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The ISO week (Monday–Sunday) holding `day`, and its number. */
function isoWeek(day: string): { from: string; to: string; year: number; week: number } {
  const ms = Date.parse(`${day}T00:00:00Z`);
  const dow = (new Date(ms).getUTCDay() + 6) % 7;
  const monday = ms - dow * DAY_MS;
  const thursday = monday + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const firstMonday = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY_MS;
  return { from: isoDay(monday), to: isoDay(monday + 6 * DAY_MS), year, week: Math.round((monday - firstMonday) / (7 * DAY_MS)) + 1 };
}

/** The period of `kind` holding `today`, moved by `offset`. */
export function journalPeriod(kind: JournalPeriodKind, today: string, offset = 0): JournalPeriod {
  if (kind === "week") {
    const w = isoWeek(isoDay(Date.parse(`${today}T00:00:00Z`) + offset * 7 * DAY_MS));
    return { kind, key: `${w.year}-W${String(w.week).padStart(2, "0")}`, from: w.from, to: w.to, year: w.year, index: w.week };
  }
  const p: LedgerPeriod = periodAt(kind, today, offset);
  return { kind, key: p.key, from: p.from, to: p.to, year: p.year, index: p.index };
}

export const linesIn = (lines: readonly JournalLine[], p: Pick<JournalPeriod, "from" | "to">) => lines.filter((l) => l.date >= p.from && l.date <= p.to);

// ── The lines ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const toEur = (amount: number, currency: string) => (isCurrency(currency) ? convert(amount, currency, "EUR") : amount);

/** VAT contained in a gross amount at the configured rate (0 while off). */
function split(kind: JournalKind, gross: number) {
  const taxRate = JOURNAL_VAT.enabled ? JOURNAL_VAT.rates[kind] : 0;
  // `|| 0`: no "−0,00 €" for a negative amount at 0 %.
  const tax = round2((gross * taxRate) / (100 + taxRate)) || 0;
  return { taxRate, tax, net: round2(gross - tax) };
}

/**
 * The journal from the payments: per paid payment the guest's service fee, Simpulo's share of a host fee (FEE_MODEL.hostFeeCommissionPercent)
 * and Stripe's fee (estimated, config/tax.ts STRIPE_FEE); a full refund adds the refund of Simpulo's part (a spot passed to the waitlist keeps
 * the service fee – no refund line). Oldest first, receipt numbers in that order.
 */
export function journalLines(payments: readonly Payment[], stays: readonly Stay[]): JournalLine[] {
  const out: Omit<JournalLine, "receiptNo">[] = [];
  for (const p of payments) {
    if ((p.status !== "paid" && p.status !== "refunded") || !p.paidAt) continue;
    const stay = stays.find((s) => s.id === p.stayId);
    if (!stay) continue;
    const date = p.paidAt.slice(0, 10);
    const fullRefund = p.status === "refunded" && (p.refundedAmount === undefined || p.refundedAmount >= p.total);
    const status: JournalStatus = fullRefund ? "refunded" : stay.allPaidAt ? "paidOut" : "open";
    const base = { stayId: stay.id, house: stay.title, paymentId: p.id, status, original: { amount: p.total, currency: stay.currency } };
    const fee = round2(toEur(p.fee, stay.currency));
    const share = round2(toEur(((p.hostFee ?? 0) * FEE_MODEL.hostFeeCommissionPercent) / 100, stay.currency));
    const stripe = -round2((toEur(p.total, stay.currency) * STRIPE_FEE.percent) / 100 + STRIPE_FEE.fixedEur);
    if (fee) out.push({ ...base, id: `${p.id}-fee`, date, kind: "serviceFee", gross: fee, ...split("serviceFee", fee) });
    if (share) out.push({ ...base, id: `${p.id}-hostfee`, date, kind: "hostFeeShare", gross: share, ...split("hostFeeShare", share) });
    out.push({ ...base, id: `${p.id}-stripe`, date, kind: "stripeFee", gross: stripe, ...split("stripeFee", stripe) });
    if (fullRefund && fee + share > 0) {
      // TODO(stripe): the refund's own date – the payment record has none yet, so the refund carries the payment's day.
      out.push({ ...base, id: `${p.id}-refund`, date, kind: "refund", gross: -round2(fee + share), ...split("refund", -round2(fee + share)) });
    }
  }
  const sorted = out.toSorted((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const seq = new Map<string, number>();
  return sorted.map((l) => {
    const year = l.date.slice(0, 4);
    const n = (seq.get(year) ?? 0) + 1;
    seq.set(year, n);
    return { ...l, receiptNo: `SIM-${year}-${String(n).padStart(4, "0")}` };
  });
}

// ── Sums ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A period's numbers (EUR): income (service fees + host-fee shares, gross), refunds, Stripe's fees, the profit before taxes (all lines net)
 * and the VAT contained in income and refunds (only while VAT is on).
 */
export function journalSummary(lines: readonly JournalLine[]) {
  const sum = (kinds: readonly JournalKind[], f: "gross" | "net" | "tax") => round2(lines.filter((l) => kinds.includes(l.kind)).reduce((n, l) => n + l[f], 0));
  const income = sum(["serviceFee", "hostFeeShare"], "gross");
  const refunds = sum(["refund"], "gross");
  const fees = sum(["stripeFee"], "gross");
  const profit = round2(lines.reduce((n, l) => n + l.net, 0));
  const vat = JOURNAL_VAT.enabled ? sum(["serviceFee", "hostFeeShare", "refund"], "tax") : null;
  return { income, refunds, fees, profit, vat, count: lines.length };
}
export type JournalSummary = ReturnType<typeof journalSummary>;

/** "Für Steuern zurücklegen": JOURNAL_RESERVE_PERCENT of the profit before taxes (never below 0), plus the VAT contained while VAT is on. */
export function journalReserve(s: JournalSummary) {
  const base = round2((Math.max(0, s.profit) * JOURNAL_RESERVE_PERCENT) / 100);
  const vat = Math.max(0, s.vat ?? 0);
  return { percent: JOURNAL_RESERVE_PERCENT, fromProfit: base, vat, total: round2(base + vat) };
}

/** The year of `year` in months and quarters – the summary table. */
export function yearBreakdown(lines: readonly JournalLine[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const p = journalPeriod("month", `${year}-${String(i + 1).padStart(2, "0")}-15`);
    return { period: p, summary: journalSummary(linesIn(lines, p)) };
  });
  const quarters = [1, 2, 3, 4].map((q) => {
    const p = journalPeriod("quarter", `${year}-${String(q * 3 - 1).padStart(2, "0")}-15`);
    return { period: p, summary: journalSummary(linesIn(lines, p)) };
  });
  return { months, quarters, year: { period: journalPeriod("year", `${year}-06-15`), summary: journalSummary(lines.filter((l) => l.date.startsWith(String(year)))) } };
}

// ── DATEV-compatible CSV (Buchungsstapel, EXTF) ─────────────────────────────────────────────────────────────────────────────────

const DATEV_COLUMNS = ["Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "WKZ Umsatz", "Kurs", "Basis-Umsatz", "WKZ Basis-Umsatz", "Konto", "Gegenkonto (ohne BU-Schlüssel)", "BU-Schlüssel", "Belegdatum", "Belegfeld 1", "Belegfeld 2", "Skonto", "Buchungstext"];
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const dec = (n: number) => Math.abs(n).toFixed(2).replace(".", ",");
const compact = (iso: string) => iso.replace(/-/g, "");

/**
 * The period's lines in DATEV's Buchungsstapel layout: the EXTF head line (format 700, category 21), the column names, one booking per line –
 * amount without sign + S/H (income H, refunds and fees S), EUR, the accounts from config/tax.ts DATEV (empty until the tax advisor sets them),
 * Belegdatum DDMM, Belegfeld 1 = receipt number, Buchungstext. Semicolons, decimal comma; `created` is the export's time (YYYYMMDDHHMMSS).
 */
export function datevCsv(lines: readonly JournalLine[], p: JournalPeriod, created: string, kindLabel: (k: JournalKind) => string): string {
  const head = [q("EXTF"), 700, 21, q("Buchungsstapel"), 13, `${created}000`, "", q(""), q(""), q(""), DATEV.consultantNumber ?? "", DATEV.clientNumber ?? "", `${p.year}0101`, DATEV.accountLength, compact(p.from), compact(p.to), q(`Simpulo ${p.key}`), "", 1, 0, 0, q("EUR")].join(";");
  const rows = lines.map((l) => {
    const acc = DATEV.accounts[l.kind];
    return [dec(l.gross), q(l.gross >= 0 ? "H" : "S"), q("EUR"), "", "", "", acc.account ?? "", acc.contra ?? "", "", `${l.date.slice(8, 10)}${l.date.slice(5, 7)}`, q(l.receiptNo), q(l.paymentId.slice(0, 12)), "", q(`${kindLabel(l.kind)} ${l.house}`.slice(0, 60))].join(";");
  });
  return [head, DATEV_COLUMNS.map(q).join(";"), ...rows].join("\r\n");
}
