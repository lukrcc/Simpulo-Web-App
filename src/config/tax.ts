// Geld › Steuern – every rate, account and setting in ONE place (CLAUDE.md "Admin › Geld › Steuern"). Orientation, no tax advice: every
// value here is a PLACEHOLDER until the tax advisor sets it – ⚠ mit Steuerberater klären. Nothing in the code decides a tax question;
// lib/admin/journal.ts and lib/admin/ledger.ts only apply what stands here.

/** Shown on every tax view and in every export: these are placeholders. */
export const TAX_PLACEHOLDER_NOTE = "mit Steuerberater klären";

/** Admin › Money: the share of profit set aside for taxes, before "left in the company". ⚠ Platzhalter – mit Steuerberater klären. */
export const TAX_RESERVE_PERCENT = 30;

/**
 * The tax reserve split (Geld › Steuern › Überblick): income tax and trade tax as a share of the profit after costs; VAT is not a rate here –
 * it is the VAT owed from the journal (output tax − input tax, lib/admin/ledger.ts). ⚠ Platzhalter – mit Steuerberater klären.
 */
export const TAX_RESERVE_RATES = {
  incomeTaxPercent: 25,
  tradeTaxPercent: 14,
} as const;

/**
 * Tax deadlines (Geld › Steuern › Fristen, and the Posteingang from `showInTodayDays` days before). Recurring dates as rules, the advisor's
 * appointments as dates. ⚠ Platzhalter – mit Steuerberater klären (monthly or quarterly VAT returns, an extension of the deadline).
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

// ── The booking journal (Geld › Steuern › Buchungsjournal, lib/admin/journal.ts) ────────────────────────────────────────────────────

/** The kinds of line: the guest's service fee, Simpulo's share of a host fee, a refund of those, Stripe's fee on a payment. */
export const JOURNAL_KINDS = ["serviceFee", "hostFeeShare", "refund", "stripeFee"] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

/**
 * VAT on the journal's lines. `enabled: false` = no VAT shown or reserved (every line 0 %). The amounts are gross; with VAT on, the tax is
 * the part contained in it. ⚠ Platzhalter – mit Steuerberater klären (place of supply, reverse charge, small-business rule).
 */
export const JOURNAL_VAT = {
  enabled: false,
  /** Percent per kind (the refund takes the rate of what it refunds) */
  rates: { serviceFee: 19, hostFeeShare: 19, refund: 19, stripeFee: 0 } satisfies Record<JournalKind, number>,
} as const;

/** Stripe's fee per payment, to estimate it until Stripe's own numbers come in. ⚠ Platzhalter – mit dem Stripe-Vertrag abgleichen. */
export const STRIPE_FEE = { percent: 1.5, fixedEur: 0.25 } as const;

/** "Für Steuern zurücklegen": this share of the profit before taxes (+ the VAT contained, when on). ⚠ Platzhalter – mit Steuerberater klären. */
export const JOURNAL_RESERVE_PERCENT = TAX_RESERVE_PERCENT;

/** The account the reserve goes to (shown as a hint, nothing is moved). null = not set yet. ⚠ Platzhalter – eintragen. */
export const RESERVE_ACCOUNT: { name: string; iban: string | null } | null = null;

/**
 * The DATEV-compatible CSV (Buchungsstapel, EXTF): the consultant and client numbers and an account per kind (Konto / Gegenkonto, SKR …).
 * null = empty in the export – the tax advisor fills them in. ⚠ Platzhalter – mit Steuerberater klären (Kontenrahmen, BU-Schlüssel).
 */
export const DATEV = {
  consultantNumber: null as number | null,
  clientNumber: null as number | null,
  /** Sachkontenlänge */
  accountLength: 4,
  accounts: {
    serviceFee: { account: null, contra: null },
    hostFeeShare: { account: null, contra: null },
    refund: { account: null, contra: null },
    stripeFee: { account: null, contra: null },
  } satisfies Record<JournalKind, { account: number | null; contra: number | null }>,
} as const;
