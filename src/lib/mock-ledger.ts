// ⚠ MOCK: Simpulo's bookkeeping journal for Admin › Geld › Steuern – twelve months (Dec 2025 to 12 Nov 2026), fixed (seeded), so the numbers
// are the same every time. Realistic: the guests' service fees month by month in line with the profit history (lib/mock-admin.ts), a few
// refunds, Stripe's fees (≈ 12 % of revenue, as in Vision › Technik), the money passed on to hosts, and the costs of a small company –
// infrastructure, subscriptions, the tax advisor, ads, and the one-offs that build the company (brand, legal, software). Some receipts are
// missing on purpose. VAT rates as an example only (EU private customers at their country's rate, EU businesses reverse charge, outside the
// EU none) – orientation, no tax advice.
import type { BankBalance, HostTaxData, LedgerEntry, TaxQuestion } from "./data/adapter";
import { stays as mockStays } from "./mock";

const MONTHS = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"] as const;
/** What Simpulo kept per month (net), the same climb as MOCK_METRICS_HISTORY.profitPerMonth; November so far (to the 12th). */
const REVENUE = [1200, 1500, 1800, 2100, 2600, 3200, 3700, 2500, 3900, 4300, 4700, 4400];
const LAST_DAY = "2026-11-12";

/** mulberry32 – a small seeded random */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, weighted: readonly (readonly [T, number])[]): T {
  const total = weighted.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [value, w] of weighted) {
    r -= w;
    if (r <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

/** Where guests come from (weights) */
const COUNTRIES: readonly (readonly [string, number])[] = [
  ["DE", 34],
  ["GB", 9],
  ["NL", 8],
  ["US", 8],
  ["FR", 6],
  ["PT", 6],
  ["AT", 5],
  ["ES", 5],
  ["IT", 4],
  ["CH", 4],
  ["PL", 3],
  ["SE", 3],
  ["AU", 2],
];
/** Example VAT rates of EU countries (private customers); outside the EU none */
const EU_VAT: Record<string, number> = { DE: 19, AT: 20, NL: 21, FR: 20, PT: 23, ES: 21, IT: 22, PL: 23, SE: 25 };

const round2 = (n: number) => Math.round(n * 100) / 100;
const daysIn = (month: string) => (month === "2026-11" ? 12 : new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());
const dateIn = (month: string, day: number) => `${month}-${String(Math.min(day, daysIn(month))).padStart(2, "0")}`;
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** A cost: vendor, category, the vendor's country and its VAT (0 = reverse charge or none), amount in its currency */
interface CostDef {
  vendor: string;
  category: string;
  country: string;
  taxRate: number;
  currency?: "EUR" | "USD";
  net: (month: number, rand: () => number) => number | null;
}

const USD_EUR = 0.92;
const COSTS: readonly CostDef[] = [
  // Running every month
  { vendor: "Google Cloud (Firebase)", category: "Infrastruktur", country: "IE", taxRate: 0, net: (_, r) => round2(150 + r() * 60) },
  { vendor: "Google Workspace", category: "Abos", country: "IE", taxRate: 0, net: () => 13.6 },
  { vendor: "Figma", category: "Abos", country: "US", taxRate: 0, currency: "USD", net: () => 15 },
  { vendor: "Resend (E-Mail)", category: "Abos", country: "US", taxRate: 0, currency: "USD", net: () => 20 },
  { vendor: "Mapbox (Karten)", category: "Infrastruktur", country: "US", taxRate: 0, currency: "USD", net: () => 65 },
  { vendor: "Qonto Kontoführung", category: "Bank", country: "FR", taxRate: 0, net: () => 11 },
  // Ads from the summer on
  { vendor: "Meta Ads", category: "Marketing", country: "IE", taxRate: 0, net: (m, r) => (m >= 6 ? round2(900 + r() * 600) : null) },
  // The tax advisor every quarter
  { vendor: "Steuerberatung Quartal", category: "Steuerberatung", country: "DE", taxRate: 19, net: (m) => ([0, 3, 6, 9].includes(m) ? 450 : null) },
];

/** One-offs that build the company (month index into MONTHS) */
const ONE_OFFS: readonly { month: number; day: number; vendor: string; category: string; country: string; taxRate: number; net: number }[] = [
  { month: 0, day: 8, vendor: "Markenanmeldung DPMA", category: "Marke", country: "DE", taxRate: 0, net: 290 },
  { month: 1, day: 20, vendor: "Logo und Wortmarke (Design)", category: "Marke", country: "DE", taxRate: 19, net: 1200 },
  { month: 2, day: 14, vendor: "AGB und Datenschutz (Rechtsanwalt)", category: "Recht", country: "DE", taxRate: 19, net: 1800 },
  { month: 3, day: 3, vendor: "Unionsmarke EUIPO", category: "Marke", country: "ES", taxRate: 0, net: 850 },
  { month: 4, day: 22, vendor: "Entwicklung Sprint 1 (Freelancer)", category: "Software", country: "DE", taxRate: 19, net: 3200 },
  { month: 6, day: 18, vendor: "Entwicklung Sprint 2 (Freelancer)", category: "Software", country: "DE", taxRate: 19, net: 2800 },
  { month: 8, day: 5, vendor: "Domain simpulo.app (3 Jahre)", category: "Marke", country: "US", taxRate: 0, net: 96 },
  { month: 9, day: 24, vendor: "Rechtsprüfung Pauschalreise (Rechtsanwalt)", category: "Recht", country: "DE", taxRate: 19, net: 950 },
  { month: 10, day: 16, vendor: "Entwicklung Sprint 3 (Freelancer)", category: "Software", country: "DE", taxRate: 19, net: 2400 },
];

/** Receipts not there yet (vendor · month index) – Geld › Steuern shows them in amber */
const MISSING = new Set(["Meta Ads·10", "Figma·11", "Google Cloud (Firebase)·11", "Resend (E-Mail)·10", "Rechtsprüfung Pauschalreise (Rechtsanwalt)·9", "Steuerberatung Quartal·9"]);

let cache: LedgerEntry[] | null = null;

export function mockLedger(): LedgerEntry[] {
  if (cache) return cache;
  const rand = seeded(7_2026);
  const hosts = [...new Set(mockStays.filter((s) => !s.isExample).map((s) => s.hostId))];
  const counters: Record<string, number> = {};
  const nextNo = (prefix: string, date: string) => {
    const key = `${prefix}-${date.slice(0, 4)}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return `${key}-${String(counters[key]).padStart(4, "0")}`;
  };
  const ref = (prefix: string) => `${prefix}_${Math.floor(rand() * 36 ** 8).toString(36).padStart(8, "0")}`;
  const out: LedgerEntry[] = [];

  MONTHS.forEach((month, m) => {
    const days = daysIn(month);
    const day = () => 1 + Math.floor(rand() * days);

    // Income: guests' service fees (most) and Simpulo's share of host fees, to this month's revenue.
    let left = REVENUE[m];
    const income: LedgerEntry[] = [];
    while (left > 0) {
      const hostShare = rand() < 0.08;
      const net = round2(Math.min(left, hostShare ? 20 + rand() * 60 : 18 + rand() * 40));
      left = round2(left - net);
      const business = rand() < 0.1;
      const country = pick(rand, COUNTRIES);
      const taxRate = country === "DE" ? 19 : business ? 0 : (EU_VAT[country] ?? 0);
      const date = dateIn(month, day());
      income.push({
        date,
        receiptNo: "",
        kind: "income",
        net,
        taxRate,
        tax: round2((net * taxRate) / 100),
        gross: round2(net * (1 + taxRate / 100)),
        currency: "EUR",
        fxRate: 1,
        category: hostShare ? "Anteil Host-Fee" : "Servicegebühr",
        country,
        customerType: business ? "business" : "private",
        description: hostShare ? "Anteil an der Host-Fee (10 %)" : business ? "Servicegebühr · Firmen-Offsite" : "Servicegebühr Gast",
        stripeRef: ref("ch"),
        partyId: null,
        receipt: null,
      });
    }
    // A few refunds: a fee given back (negative).
    const refunds = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < refunds; i++) {
      const original = income[Math.floor(rand() * income.length)];
      income.push({ ...original, date: dateIn(month, day()), kind: "refund", net: -original.net, tax: -original.tax, gross: -original.gross, description: "Erstattung Servicegebühr", stripeRef: ref("re") });
    }
    out.push(...income);

    // Stripe's fees for the month: on the whole amount guests pay, ≈ 12 % of what Simpulo keeps.
    const feeNet = round2(REVENUE[m] * (0.11 + rand() * 0.02));
    const feeDate = month === "2026-11" ? LAST_DAY : dateIn(month, days);
    out.push({ date: feeDate, receiptNo: "", kind: "fee", net: feeNet, taxRate: 0, tax: 0, gross: feeNet, currency: "EUR", fxRate: 1, category: "Zahlungsgebühren", country: "IE", customerType: null, description: "Stripe-Gebühren", stripeRef: ref("in"), partyId: null, receipt: `stripe-gebuehren-${month}.pdf` });

    // Money passed on to hosts (not Simpulo's income – DAC7 counts it per host).
    const payouts = 4 + Math.floor(rand() * 6) + Math.floor(m / 3);
    for (let i = 0; i < payouts; i++) {
      const host = hosts[Math.floor(rand() * hosts.length)];
      const amount = round2(600 + rand() * 2900);
      out.push({ date: dateIn(month, day()), receiptNo: "", kind: "payout", net: amount, taxRate: 0, tax: 0, gross: amount, currency: "EUR", fxRate: 1, category: "Weiterleitung an Hosts", country: "DE", customerType: null, description: "Auszahlung an Host", stripeRef: ref("po"), partyId: host, receipt: null });
    }

    // Costs: running ones (on the 1st–5th), then the one-offs.
    for (const c of COSTS) {
      const net = c.net(m, rand);
      if (net === null) continue;
      const fx = c.currency === "USD" ? USD_EUR : 1;
      const date = dateIn(month, 1 + Math.floor(rand() * 5));
      out.push(costEntry(c.vendor, c.category, c.country, c.taxRate, net, c.currency ?? "EUR", fx, date, MISSING.has(`${c.vendor}·${m}`)));
    }
    for (const o of ONE_OFFS.filter((o) => o.month === m)) {
      out.push(costEntry(o.vendor, o.category, o.country, o.taxRate, o.net, "EUR", 1, dateIn(month, o.day), MISSING.has(`${o.vendor}·${m}`)));
    }
  });

  // Receipt numbers in date order, per kind and year: E (Einnahme) · S (Storno/Erstattung) · G (Gebühr) · A (Auszahlung) · K (Kosten).
  const prefix = { income: "E", refund: "S", fee: "G", payout: "A", cost: "K" } as const;
  cache = out
    .filter((e) => e.date <= LAST_DAY)
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ ...e, receiptNo: nextNo(prefix[e.kind], e.date) }));
  return cache;
}

function costEntry(vendor: string, category: string, country: string, taxRate: number, net: number, currency: string, fxRate: number, date: string, missing: boolean): LedgerEntry {
  const tax = round2((net * taxRate) / 100);
  return {
    date,
    receiptNo: "",
    kind: "cost",
    net,
    taxRate,
    tax,
    gross: round2(net + tax),
    currency,
    fxRate,
    category,
    country,
    customerType: null,
    description: taxRate === 0 && country !== "DE" ? `${vendor} (Reverse Charge)` : vendor,
    stripeRef: null,
    partyId: null,
    receipt: missing ? null : `${slug(vendor)}-${date}.pdf`,
  };
}

/** ⚠ MOCK: the Qonto business account */
export const MOCK_BANK_BALANCE: BankBalance = { account: "Qonto ••1234", balance: 21_350, at: LAST_DAY };

/**
 * ⚠ MOCK: hosts' tax data for DAC7 – about two in three complete, the others missing one field (by id, fixed). Fictitious values.
 */
export function mockHostTaxData(): Record<string, HostTaxData> {
  const hosts = [...new Set(mockStays.filter((s) => !s.isExample).map((s) => s.hostId))];
  return Object.fromEntries(
    hosts.map((id, i) => {
      const full: HostTaxData = { taxId: `${String(10 + (i % 89)).padStart(2, "0")} ${String(100 + i * 7).slice(-3)} ${String(400 + i * 13).slice(-3)} ${String(700 + i * 11).slice(-3)}`, address: `Beispielstraße ${i + 1}, 10115 Berlin`, birthDate: `19${85 + (i % 14)}-0${1 + (i % 9)}-1${i % 10}` };
      const gap = i % 3 === 2 ? (["taxId", "birthDate", "address"] as const)[i % 9 === 2 ? 0 : i % 9 === 5 ? 1 : 2] : null;
      if (gap) delete full[gap];
      return [id, full];
    }),
  );
}

/** ⚠ MOCK: the first questions for the tax advisor (Geld › Steuern), all open. */
export const MOCK_TAX_QUESTIONS: TaxQuestion[] = [
  { id: "tq-1", text: "Stripe-Connect-Art und Geldfluss", status: "open", note: "" },
  { id: "tq-2", text: "Umsatzsteuer auf Gebühren von Gästen aus verschiedenen Ländern", status: "open", note: "" },
  { id: "tq-3", text: "DAC7 selbst oder über Stripe", status: "open", note: "" },
];
