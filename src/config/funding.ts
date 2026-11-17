// Admin › Finanzierung ("Wann und wofür holen wir Geld?") – every text, threshold and share of the tab, in German (the admin is German), to
// edit by hand. Theses for orientation, no financial advice. Content only from the founders' brief: where it names no reason or proof, the
// field says "noch offen" – fill it in here. A valuation appears ONLY in the subtab "Bewertung & Anteile" – a private orientation for the
// founder (greyed until the move is set, no export, no PDF); nowhere else in the admin.
// The live values come from lib/admin/metrics.ts fundingReadiness – never from here.

export const FUNDING_TITLE = "Finanzierung";
export const FUNDING_NOTE = "Thesen zur Orientierung, keine Finanzberatung. Vor dem Umzug keine Investoren und keine Bewertung.";
export const OPEN = "noch offen";
export const YOU_ARE_HERE = "Du bist hier";

export type FundingTab = "readiness" | "thesis" | "rounds" | "documents" | "valuation" | "structure";
export const FUNDING_TABS: readonly { key: FundingTab; label: string }[] = [
  { key: "readiness", label: "Bereitschaft" },
  { key: "thesis", label: "These" },
  { key: "rounds", label: "Runden" },
  { key: "documents", label: "Unterlagen" },
  { key: "valuation", label: "Bewertung & Anteile" },
  { key: "structure", label: "Firmenstruktur" },
];

// ── Bereitschaft ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type ReadinessKey = "moved" | "profitStreak" | "repeatRate" | "fullHousesGrowth" | "hubsFill" | "contribution";

/** The thresholds behind the checklist (lib/admin/metrics.ts fundingReadiness reads them). */
export const READINESS = {
  /** € profit a month, so many months in a row (the move target) */
  profit: { perMonth: 5000, months: 6 },
  /** Repeat guests, percent */
  repeatRatePercent: 25,
  /** Full Houses grow at least this much a month (compound), over this many completed months */
  fullHousesGrowth: { percentPerMonth: 10, months: 6 },
  /** Hubs: at least `min` cities with `minHouses` real Houses and an average fill rate of `fillPercent` */
  hubs: { min: 2, max: 3, minHouses: 5, fillPercent: 70 },
  /** Contribution margin per full House over the last 12 months: revenue minus these variable costs (journal categories), above 0 */
  contribution: { variableCostCategories: ["Zahlungsgebühren", "Marketing"] },
} as const;

/** The checklist, in this order; `required`: the one point without which nothing else counts. */
export const READINESS_ITEMS: readonly { key: ReadinessKey; label: string; required?: true }[] = [
  { key: "moved", label: "Umzug erledigt, Firma im Ausland", required: true },
  { key: "profitStreak", label: "5.000 € Gewinn 6 Monate in Folge" },
  { key: "repeatRate", label: "Wiederkehrer ≥ 25 %" },
  { key: "fullHousesGrowth", label: "Volle Houses wachsen ≥ 10 % pro Monat über 6 Monate" },
  { key: "hubsFill", label: "2–3 Hubs mit Füllrate ≥ 70 %" },
  { key: "contribution", label: "Deckungsbeitrag pro House positiv" },
];

export const READINESS_TEXT = {
  ready: "Bereit: {met} von {total}",
  moveFirst: "Erst umziehen, dann Werte schaffen.",
  required: "Pflicht",
  manual: "von Hand",
  movedSwitch: "Umzug erledigt",
  met: "erfüllt",
  notMet: "offen",
  /** What each live value says */
  value: {
    moved: { yes: "erledigt", no: "noch nicht" },
    profitStreak: "{streak} von {months} Monaten · diesen Monat {current}",
    repeatRate: "{value} von 25 %",
    fullHousesGrowth: "{value} pro Monat (von {from} auf {to} volle Houses)",
    hubsFill: "{count} Hubs: {hubs}",
    hubsNone: "noch kein Hub mit 5 Houses und 70 % Füllrate",
    contribution: "{value} pro vollem House (12 Monate, nach Zahlungsgebühren und Marketing)",
    none: "noch nicht messbar",
  },
};

// ── These ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "Wohin das erste Geld fließt": the shares must add up to 100 (the tab shows a warning otherwise). `reason` null = noch offen. */
export const ALLOCATION: readonly { key: string; label: string; percent: number; reason: string | null }[] = [
  { key: "hosts", label: "Hosts und Hubs", percent: 35, reason: null },
  { key: "marketing", label: "Marketing-Maschine", percent: 25, reason: null },
  { key: "product", label: "Produkt und Matching", percent: 25, reason: null },
  { key: "trust", label: "Vertrauen und Support", percent: 10, reason: null },
  { key: "legal", label: "Recht und Verwaltung", percent: 5, reason: null },
  { key: "realEstate", label: "Immobilien", percent: 0, reason: "eigener Fonds später" },
];

export const THESIS_TEXT = {
  title: "Wohin das erste Geld fließt",
  rules: ["Geld beschleunigt den bewiesenen Kreislauf, es finanziert keine Experimente.", "Eine Runde reicht 18–24 Monate."],
  sumWarning: "Die Anteile ergeben {sum} % statt 100 % – in config/funding.ts anpassen.",
  reasonOpen: "Begründung noch offen",
};

// ── Runden ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type RoundKey = "bootstrap" | "preSeed" | "seed" | "seriesA";

/** The ladder, bottom first. `proof` / `use` null = noch offen. `dilutes`: a round that sells shares (the calculator). */
export const ROUNDS: readonly { key: RoundKey; label: string; amount: string | null; optional?: true; proof: string | null; use: string | null; dilutes: boolean }[] = [
  { key: "bootstrap", label: "Ohne Investoren", amount: null, proof: null, use: null, dilutes: false },
  { key: "preSeed", label: "Pre-Seed", amount: "0,5–1,5 Mio. €", optional: true, proof: null, use: null, dilutes: true },
  { key: "seed", label: "Seed", amount: "1,5–4 Mio. €", proof: null, use: null, dilutes: true },
  { key: "seriesA", label: "Serie A", amount: "8–20 Mio. €", proof: null, use: null, dilutes: true },
];
/** Where Simpulo stands (the one ocean focus) */
export const ROUND_NOW: RoundKey = "bootstrap";

export const ROUNDS_TEXT = {
  proof: "Was vorher bewiesen sein sollte",
  use: "Wofür",
  optional: "optional",
  calculator: "Anteils-Rechner",
  calculatorNote: "Abgabe pro Runde; zeigt den Gründer-Anteil nach jeder Runde.",
  defaultDilutionPercent: 20,
  dilution: "Abgabe {round} in %",
  withPreSeed: "Mit Pre-Seed",
  founders: "Gründer",
  investors: "Investoren",
  start: "Heute",
  after: "nach {round}",
  question: "Kernfrage: Kontrolle oder maximale Größe?",
  investorsTitle: "Investoren",
  later: "nach dem Umzug",
  investorColumns: ["Name", "Fonds", "Stufe", "Letzter Kontakt", "Notiz"],
};

// ── Unterlagen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DocStatus = "missing" | "inProgress" | "done";
export const DOC_STATUSES: readonly { key: DocStatus; label: string }[] = [
  { key: "missing", label: "fehlt" },
  { key: "inProgress", label: "in Arbeit" },
  { key: "done", label: "fertig" },
];

/** The checklist for a later data room; the status lives in the admin data (AdminData.fundingDocs), default "fehlt". */
export const DOCUMENTS: readonly { key: string; label: string; source?: string }[] = [
  { key: "kpiReport", label: "Kennzahlen-Bericht", source: "aus Analyse" },
  { key: "cohorts", label: "Kohorten der Wiederkehrer" },
  { key: "perHouse", label: "Zahlen pro House" },
  { key: "structure", label: "Firmenstruktur" },
  { key: "ipTransfer", label: "Übertragung von Marke, Domain, Software in die Firma" },
  { key: "contracts", label: "Verträge mit Hosts und Partnern" },
  { key: "deck", label: "Pitch-Deck" },
];

export const DOCUMENTS_TEXT = {
  title: "Datenraum",
  done: "{done} von {total} fertig",
  status: "Status",
  kpiPdf: "Kennzahlen als PDF",
  kpiPdfNote: "Die wichtigsten Zahlen der letzten 12 Monate, aus denselben Quellen wie Übersicht und Analyse.",
  downloaded: "Kennzahlen als PDF heruntergeladen",
};

// ── Bewertung & Anteile ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A private orientation only: ranges, never a single number; greyed until "Umzug erledigt" is set; no export, no PDF. The multiples are
 * rough rules of thumb from the brief; the live values (run rate, growth, repeat guests, margin) from lib/admin/metrics.ts valuationRange.
 */
export const VALUATION = {
  note: "Nur Orientierung für mich, keine Bewertung im rechtlichen Sinn, keine Finanzberatung. Nicht weitergeben.",
  beforeMove: "Vor dem Umzug: keine Bewertung nach außen.",
  /** Method A: the revenue run rate × a multiple by growth per year (percent) – the first band whose `below` holds the growth */
  revenueMultiples: [
    { below: 30, low: 1, high: 3, label: "Wachstum < 30 %/Jahr" },
    { below: 100, low: 3, high: 6, label: "Wachstum 30–100 %/Jahr" },
    { below: Infinity, low: 6, high: 10, label: "Wachstum > 100 %/Jahr" },
  ],
  /** Method B: the profit of the last 12 months × this (a small company) */
  profitMultiple: { low: 2, high: 4 },
  text: {
    rangeTitle: "Bewertungs-Spanne",
    methodA: "Methode A · Umsatz × Multiple",
    methodADetail: "Jahresumsatz hochgerechnet {revenue} × {low}–{high} ({band})",
    methodB: "Methode B · Gewinn × Multiple",
    methodBDetail: "Jahresgewinn {profit} × {low}–{high} (kleine Firma)",
    noProfit: "kein Jahresgewinn – Methode B entfällt",
    low: "niedrig",
    high: "hoch",
    driversTitle: "Treiber",
    drivers: { growth: "Wachstum pro Jahr", repeat: "Wiederkehrer", margin: "Gewinnmarge" },
    driversInfo: {
      growth: "Durchschnittliches Monatswachstum des Umsatzes der letzten 6 abgeschlossenen Monate, aufs Jahr gerechnet.",
      repeat: "Anteil der Gäste, die ein weiteres House gebucht haben.",
      margin: "Gewinn nach Kosten und Gebühren geteilt durch den Umsatz, letzte 12 Monate.",
    },
    driversSentence: "Diese drei Zahlen bewegen die Bewertung am meisten.",
    compareTitle: "Privat und Börse",
    compareColumns: { topic: "", private: "Privat (Startup)", public: "Börse" },
    compareNote: "Einzelunternehmen hat keine Anteile. Anteile gibt es ab der Firma im Ausland.",
    capTitle: "Anteils-Rechner (Cap Table)",
    capNote: "Eingaben werden nicht gespeichert – nur Rechner.",
    round: "Runde {n}",
    preMoney: "Pre-Money (Mio. €)",
    amount: "Betrag (Mio. €)",
    pool: "Mitarbeiter-Pool (%)",
    start: "Start",
    postMoney: "Post-Money",
    investors: "Investoren",
    poolShort: "Pool",
    founders: "Gründer",
    founderValue: "Wert Gründer-Anteil",
    glossaryTitle: "Begriffe",
  },
  /** ⚠ Texts written for the brief's three rows (its template wasn't attached) – check and replace. */
  privateVsPublic: [
    { topic: "Preis", private: "Wird in jeder Runde zwischen Gründern und Investoren verhandelt.", public: "Entsteht jeden Tag aus Angebot und Nachfrage an der Börse." },
    { topic: "Wert der Firma", private: "Post-Money der letzten Runde – ein Verhandlungsergebnis, kein Marktpreis.", public: "Marktkapitalisierung: Aktienkurs × Anzahl der Aktien." },
    { topic: "Verkaufen", private: "Nur mit Käufer und meist mit Zustimmung der anderen, selten vor einem Exit.", public: "Jederzeit über die Börse, zum Tageskurs." },
  ],
  /** The calculator's example (EUR): round 1 filled in, rounds 2 and 3 empty */
  example: { preMoney: 8_000_000, amount: 2_000_000 },
  /** ⚠ Short texts written for the brief's list (its template wasn't attached) – check and replace. */
  glossary: [
    { term: "Pre-Money", text: "Der Wert der Firma vor einer Finanzierungsrunde, also ohne das neue Geld." },
    { term: "Post-Money", text: "Pre-Money plus das neue Geld der Runde. Der Anteil der Investoren ist Betrag ÷ Post-Money." },
    { term: "Verwässerung", text: "Wenn neue Anteile ausgegeben werden, sinkt der prozentuale Anteil der bisherigen Eigentümer – ihr Stück wird kleiner, der Kuchen größer." },
    { term: "Cap Table", text: "Die Tabelle, wem wie viel der Firma gehört – Gründer, Investoren, Mitarbeiter-Pool – vor und nach jeder Runde." },
    { term: "Mitarbeiter-Pool (ESOP)", text: "Ein Anteil der Firma, der für Mitarbeiter reserviert ist. Er wird meist vor einer Runde angelegt und verwässert die bisherigen Eigentümer." },
    { term: "Vesting", text: "Anteile gehören einem erst nach und nach, meist über vier Jahre mit einem Jahr Wartezeit. Wer früher geht, behält nur den erdienten Teil." },
    { term: "Liquidationspräferenz", text: "Bei einem Verkauf bekommen Investoren ihr Geld (oder ein Vielfaches) zuerst zurück, bevor der Rest nach Anteilen verteilt wird." },
    { term: "Wandeldarlehen / SAFE", text: "Geld jetzt, Anteile später: Das Darlehen oder der SAFE wandelt sich in der nächsten Runde in Anteile, oft mit Rabatt oder Obergrenze." },
    { term: "Umsatz-Multiple", text: "Bewertung geteilt durch den Jahresumsatz. Je schneller und verlässlicher das Wachstum, desto höher das Multiple." },
    { term: "Marktkapitalisierung", text: "Der Börsenwert einer Firma: Aktienkurs mal Anzahl der Aktien. Gibt es nur bei börsennotierten Firmen." },
  ],
};
