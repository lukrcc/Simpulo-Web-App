// The bookkeeping journal – the ONE source for every financial number of Geld › Steuern and every export (CSV, Excel, JSON, the PDF report,
// receipts as ZIP, DATEV/Xero later, the DAC7 preparation). Pure functions over the journal (lib/data getLedger: mock example data now, built
// from Stripe and the bank later), the receipts attached by hand and today's date. Orientation, no tax advice: the rates are placeholders
// (config/admin.ts TAX_RESERVE_RATES), set with the tax advisor. New export formats only as adapters in lib/admin/exporters/.
import { INVESTMENT_CATEGORIES } from "@/config/admin";
import { TAX_DEADLINES, TAX_RESERVE_RATES } from "@/config/tax";
import type { HostTaxData, LedgerEntry } from "@/lib/data";

export type { LedgerEntry, LedgerKind } from "@/lib/data";

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;

// ── Periods ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type PeriodKind = "month" | "quarter" | "year";
export const PERIOD_KINDS: readonly PeriodKind[] = ["month", "quarter", "year"];

export interface Period {
  kind: PeriodKind;
  /** "2026-10" · "2026-Q4" · "2026" */
  key: string;
  /** YYYY-MM-DD, both included */
  from: string;
  to: string;
  year: number;
  /** month 1–12, quarter 1–4 (year: 0) */
  index: number;
}

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

/** The period of `kind` holding `today`, moved by `offset` (−1 = the one before). */
export function periodAt(kind: PeriodKind, today: string, offset = 0): Period {
  const [y, m] = today.split("-").map(Number);
  if (kind === "year") {
    const year = y + offset;
    return { kind, key: String(year), from: iso(year, 1, 1), to: iso(year, 12, 31), year, index: 0 };
  }
  if (kind === "quarter") {
    const q = Math.floor((m - 1) / 3) + offset;
    const year = y + Math.floor(q / 4);
    const index = (((q % 4) + 4) % 4) + 1;
    return { kind, key: `${year}-Q${index}`, from: iso(year, index * 3 - 2, 1), to: iso(year, index * 3 + 1, 0), year, index };
  }
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  const year = d.getUTCFullYear();
  const index = d.getUTCMonth() + 1;
  return { kind, key: `${year}-${String(index).padStart(2, "0")}`, from: iso(year, index, 1), to: iso(year, index + 1, 0), year, index };
}

/** The period before, of the same kind. */
export const previousPeriod = (p: Period) => periodAt(p.kind, p.from, -1);

/** The lines in a period. */
export const inPeriod = (entries: readonly LedgerEntry[], p: Pick<Period, "from" | "to">) => entries.filter((e) => e.date >= p.from && e.date <= p.to);

// ── Amounts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A line's amount in EUR (its currency × the rate). */
export const eurOf = (e: LedgerEntry, field: "net" | "tax" | "gross") => round2(e[field] * e.fxRate);

/** The journal with the receipts attached by hand (Geld › Steuern › Kosten). */
export function withReceipts(entries: readonly LedgerEntry[], receipts: Readonly<Record<string, string>>): LedgerEntry[] {
  return entries.map((e) => (receipts[e.receiptNo] && !e.receipt ? { ...e, receipt: receipts[e.receiptNo] } : e));
}

/** Lines that need a receipt: costs and fees. */
export const needsReceipt = (e: LedgerEntry) => e.kind === "cost" || e.kind === "fee";

/**
 * A period's numbers in EUR: revenue (income + refunds, net), fees (Stripe), costs (net), profit after both, passed on to hosts, VAT
 * collected (output), VAT paid (input) and what is owed (output − input), missing receipts.
 */
export function ledgerSummary(entries: readonly LedgerEntry[]) {
  const sum = (kinds: readonly LedgerEntry["kind"][], field: "net" | "tax" | "gross") => round2(entries.filter((e) => kinds.includes(e.kind)).reduce((n, e) => n + eurOf(e, field), 0));
  const revenue = sum(["income", "refund"], "net");
  const fees = sum(["fee"], "net");
  const costs = sum(["cost"], "net");
  const vatOut = sum(["income", "refund"], "tax");
  const vatIn = sum(["cost", "fee"], "tax");
  return {
    revenue,
    fees,
    costs,
    /** Fees and costs together (the "Kosten" number) */
    allCosts: round2(fees + costs),
    profit: round2(revenue - fees - costs),
    payouts: sum(["payout"], "net"),
    vatOut,
    vatIn,
    vatPayable: round2(vatOut - vatIn),
    missingReceipts: entries.filter((e) => needsReceipt(e) && !e.receipt).length,
  };
}
export type LedgerSummary = ReturnType<typeof ledgerSummary>;

/**
 * The tax reserve split: income tax and trade tax at the placeholder rates of the profit (never below 0), VAT what is owed. ⚠ Orientierung –
 * die Sätze legt der Steuerberater fest.
 */
export function taxReserve(s: LedgerSummary) {
  const base = Math.max(0, s.profit);
  const incomeTax = round2((base * TAX_RESERVE_RATES.incomeTaxPercent) / 100);
  const tradeTax = round2((base * TAX_RESERVE_RATES.tradeTaxPercent) / 100);
  const vat = Math.max(0, s.vatPayable);
  return { incomeTax, tradeTax, vat, total: round2(incomeTax + tradeTax + vat), rates: TAX_RESERVE_RATES };
}

/** Revenue (net, EUR) by the customer's country and type – private / business –, largest first, with each country's share. */
export function revenueByCountry(entries: readonly LedgerEntry[]) {
  const rows = new Map<string, { country: string; private: number; business: number }>();
  for (const e of entries) {
    if (e.kind !== "income" && e.kind !== "refund") continue;
    const row = rows.get(e.country) ?? { country: e.country, private: 0, business: 0 };
    row[e.customerType === "business" ? "business" : "private"] += eurOf(e, "net");
    rows.set(e.country, row);
  }
  const list = [...rows.values()].map((r) => ({ ...r, private: round2(r.private), business: round2(r.business), total: round2(r.private + r.business) }));
  const total = round2(list.reduce((n, r) => n + r.total, 0));
  return {
    rows: list.map((r) => ({ ...r, share: total ? r.total / total : 0 })).toSorted((a, b) => b.total - a.total),
    total: { private: round2(list.reduce((n, r) => n + r.private, 0)), business: round2(list.reduce((n, r) => n + r.business, 0)), total },
  };
}

/** Costs and fees with their receipts, newest first. */
export const costRows = (entries: readonly LedgerEntry[]) => entries.filter(needsReceipt).toSorted((a, b) => b.date.localeCompare(a.date) || b.receiptNo.localeCompare(a.receiptNo));

/** Investments since the start (INVESTMENT_CATEGORIES: software, brand, legal): per category and in all (net, EUR) – for the valuation when moving. */
export function investments(entries: readonly LedgerEntry[]) {
  const rows = entries.filter((e) => e.kind === "cost" && (INVESTMENT_CATEGORIES as readonly string[]).includes(e.category)).toSorted((a, b) => a.date.localeCompare(b.date));
  const byCategory = INVESTMENT_CATEGORIES.map((category) => ({ category, total: round2(rows.filter((e) => e.category === category).reduce((n, e) => n + eurOf(e, "net"), 0)) }));
  return { rows, byCategory, total: round2(byCategory.reduce((n, c) => n + c.total, 0)), since: rows[0]?.date ?? null };
}

// ── DAC7 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const DAC7_FIELDS = ["taxId", "address", "birthDate"] as const;
export type Dac7Field = (typeof DAC7_FIELDS)[number];

/**
 * DAC7 for a year: per host the money passed on to them (payouts, EUR) and the number of payouts, whether their tax data is complete (tax id,
 * address, date of birth) and what is missing; hosts with a payout that year only.
 */
export function dac7(entries: readonly LedgerEntry[], year: number, hosts: readonly { id: string; name: string }[], taxData: Readonly<Record<string, HostTaxData>>) {
  const payouts = entries.filter((e) => e.kind === "payout" && e.partyId && e.date.startsWith(String(year)));
  const rows = [...new Set(payouts.map((e) => e.partyId!))]
    .map((id) => {
      const own = payouts.filter((e) => e.partyId === id);
      const data = taxData[id] ?? {};
      const missing = DAC7_FIELDS.filter((f) => !data[f]);
      return { id, name: hosts.find((h) => h.id === id)?.name ?? id, amount: round2(own.reduce((n, e) => n + eurOf(e, "net"), 0)), count: own.length, data, missing, complete: missing.length === 0 };
    })
    .toSorted((a, b) => Number(a.complete) - Number(b.complete) || b.amount - a.amount);
  return { year, rows, complete: rows.filter((r) => r.complete).length, incomplete: rows.filter((r) => !r.complete).length };
}

// ── Deadlines ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DeadlineKind = "vatReturn" | "incomeTaxPrepayment" | "tradeTaxPrepayment" | "dac7" | "advisor";
export interface TaxDeadline {
  id: string;
  kind: DeadlineKind;
  /** YYYY-MM-DD */
  date: string;
  /** What it is about: the month of a VAT return (YYYY-MM), the year of DAC7, the quarter of a prepayment ("2026-Q4"), an appointment's topic */
  about: string;
}

/** The tax deadlines from today (included) over the next `days` days, soonest first (config/admin.ts TAX_DEADLINES). */
export function taxDeadlines(today: string, days: number): TaxDeadline[] {
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
  const [y0, m0] = today.split("-").map(Number);
  const out: TaxDeadline[] = [];
  for (let i = 0; i <= Math.ceil(days / 28) + 1; i++) {
    const d = new Date(Date.UTC(y0, m0 - 1 + i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const before = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    out.push({ id: `vat-${y}-${m}`, kind: "vatReturn", date: iso(y, m, TAX_DEADLINES.vatReturn.day), about: before });
    if ((TAX_DEADLINES.incomeTaxPrepayment.months as readonly number[]).includes(m)) out.push({ id: `est-${y}-${m}`, kind: "incomeTaxPrepayment", date: iso(y, m, TAX_DEADLINES.incomeTaxPrepayment.day), about: `${y}-Q${Math.ceil(m / 3)}` });
    if ((TAX_DEADLINES.tradeTaxPrepayment.months as readonly number[]).includes(m)) out.push({ id: `gewst-${y}-${m}`, kind: "tradeTaxPrepayment", date: iso(y, m, TAX_DEADLINES.tradeTaxPrepayment.day), about: `${y}-Q${Math.ceil(m / 3)}` });
    if (m === TAX_DEADLINES.dac7.month) out.push({ id: `dac7-${y}`, kind: "dac7", date: iso(y, m, TAX_DEADLINES.dac7.day), about: String(y - 1) });
  }
  for (const a of TAX_DEADLINES.advisor) out.push({ id: `advisor-${a.date}`, kind: "advisor", date: a.date, about: a.topic });
  return out.filter((d) => d.date >= today && d.date <= end).toSorted((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Days from today until a date (0 = today). */
export const daysUntil = (today: string, date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
