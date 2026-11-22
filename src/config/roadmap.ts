// Admin › System › Zeitplan & Vorbereitung – the one source for the schedule: code milestones, the marketing start and the launch, the
// journey, ideas, and the preparation to-dos with their due milestones. config/marketing.ts reads the marketing start and the launch from
// here (never twice). German like every admin text. `uncertain` = still open – drawn dashed. The to-dos' status, note and cost are stored
// through the adapter (AdminData.roadmapTodos); the `status` here is only the start value.

/** A date on the plan; `uncertain` = still open (dashed). */
export interface RoadmapDate {
  date: string;
  uncertain?: boolean;
}

/** The timeline's span (Gantt, Nov 2026 – Jun 2027). */
export const ROADMAP_RANGE = { from: "2026-11-01", to: "2027-06-30" } as const;

/** Marketing starts – its four phases follow in weeks (config/marketing.ts LAUNCH_PHASES). */
export const MARKETING_START: RoadmapDate = { date: "2027-03-01" };
/** The launch, early May 2027. */
export const LAUNCH: RoadmapDate = { date: "2027-05-03" };
/** Leaving Germany, about mid-January. */
export const DEPARTURE: RoadmapDate = { date: "2027-01-15" };

/** Code: milestones with what is done by then; each section runs from the previous one (the first from the timeline's start). */
export const CODE_MILESTONES: readonly { id: string; label: string; title: string; date: string; uncertain?: boolean }[] = [
  { id: "m1", label: "M1", title: "Footer + Dashboard", date: "2026-11-30" },
  { id: "m2", label: "M2", title: "Desktop, iPad, Mobile final", date: "2026-12-20" },
  { id: "m3", label: "M3", title: "Dark Mode, Mehrsprachigkeit, Performance, Umzugsfähigkeit", date: "2027-01-10" },
  { id: "m4", label: "M4", title: "Firebase", date: "2027-02-07" },
  { id: "m5", label: "M5", title: "Stripe Connect (Test)", date: "2027-02-21" },
  { id: "m6", label: "M6", title: "PWA, Puffer, Code fertig", date: "2027-02-28" },
];

/** The journey. */
export const TRAVEL: readonly { id: string; label: string; from: string; to: string; uncertain?: boolean }[] = [
  { id: "de", label: "Deutschland", from: ROADMAP_RANGE.from, to: DEPARTURE.date },
  { id: "bangkok", label: "Bangkok", from: DEPARTURE.date, to: "2027-03-15" },
  { id: "bali", label: "Bali", from: "2027-03-15", to: ROADMAP_RANGE.to, uncertain: true },
];

/** Ideas as markers (dashed). */
export const ROADMAP_IDEAS: readonly { id: string; title: string; date: string; uncertain?: boolean }[] = [
  { id: "baliHouse", title: "Eigenes House in Bali (April)", date: "2027-04-15", uncertain: true },
];

/** When a to-do must be done – a milestone on the timeline ("later": none). */
export type TodoDue = "beforeDeparture" | "beforeLanding" | "beforeStripeLive" | "beforeFirstHouse" | "beforeLaunch" | "later";
export const TODO_DUES: readonly { id: TodoDue; label: string; date: RoadmapDate | null }[] = [
  { id: "beforeDeparture", label: "vor Abreise", date: DEPARTURE },
  { id: "beforeStripeLive", label: "vor Stripe live", date: { date: "2027-02-28", uncertain: true } },
  { id: "beforeLanding", label: "vor öffentlicher Landingpage", date: MARKETING_START },
  // The first Houses come with the phase "Founding Hosts" (week 3 from the marketing start).
  { id: "beforeFirstHouse", label: "vor erstem House", date: { date: "2027-03-15", uncertain: true } },
  { id: "beforeLaunch", label: "vor Launch", date: LAUNCH },
  { id: "later", label: "später", date: null },
];

export type TodoStatus = "open" | "inProgress" | "done" | "later";
export const TODO_STATUSES: readonly TodoStatus[] = ["open", "inProgress", "done", "later"];

export type TodoGroup = "company" | "money" | "brand" | "legal" | "infra";
export const TODO_GROUPS: readonly { id: TodoGroup; label: string }[] = [
  { id: "company", label: "Firma & Steuern" },
  { id: "money", label: "Geld" },
  { id: "brand", label: "Marke & Name" },
  { id: "legal", label: "Recht & Schutz" },
  { id: "infra", label: "Infrastruktur & Sicherheit" },
];

export interface RoadmapTodo {
  id: string;
  title: string;
  /** One line */
  text: string;
  group: TodoGroup;
  due: TodoDue;
  /** Optional, as text ("ca. 30 €/Monat") – null = not known */
  cost: string | null;
  /** A link to where it's done, if there is one */
  link?: string;
  /** Start value; the admin's status is stored over it */
  status: TodoStatus;
}

const todo = (id: string, group: TodoGroup, due: TodoDue, title: string, text: string, extra: Partial<RoadmapTodo> = {}): RoadmapTodo => ({ id, group, due, title, text, cost: null, status: due === "later" ? "later" : "open", ...extra });

export const ROADMAP_TODOS: readonly RoadmapTodo[] = [
  todo("trade", "company", "beforeDeparture", "Gewerbe anmelden", "Beim Gewerbeamt, bevor die erste Einnahme kommt."),
  todo("elster", "company", "beforeDeparture", "Steuerliche Erfassung (ELSTER)", "Fragebogen zur steuerlichen Erfassung ans Finanzamt."),
  todo("smallBusiness", "company", "beforeStripeLive", "Kleinunternehmer ja/nein", "Mit dem Steuerberater entscheiden."),
  todo("vatId", "company", "beforeStripeLive", "USt-ID beantragen", "Beim Bundeszentralamt für Steuern."),
  todo("tradeName", "company", "beforeDeparture", "Geschäftsbezeichnung „Simpulo“ festlegen", "Name, unter dem das Gewerbe auftritt."),
  todo("llc", "company", "later", "Rechtsform-Frage LLC", "Mit dem Steuerberater klären."),
  todo("qonto", "money", "beforeDeparture", "Qonto Geschäftskonto", "Konto für alle Einnahmen und Ausgaben."),
  todo("reserve", "money", "beforeDeparture", "Rücklagenkonto", "Für die Steuer-Rücklage, getrennt vom Geschäftskonto."),
  todo("wise", "money", "later", "Wise geschäftlich", "Für Zahlungen in anderen Währungen."),
  todo("stripeTest", "money", "beforeDeparture", "Stripe-Konto anlegen (Test)", "Testmodus für Connect und Zahlungen."),
  todo("stripeLive", "money", "beforeStripeLive", "Stripe live", "Konto verifiziert, Live-Schlüssel gesetzt."),
  todo("bookkeeping", "money", "beforeStripeLive", "Buchhaltung und Belege einrichten", "Belege sammeln, Export fürs Buchungsjournal.", { link: "/admin/money/taxes" }),
  todo("trademarkSearch", "brand", "beforeDeparture", "Markenrecherche", "Gibt es „Simpulo“ schon als Marke?"),
  todo("euTrademark", "brand", "beforeLanding", "EU-Marke anmelden", "Beim EUIPO."),
  todo("domains", "brand", "beforeDeparture", "Domains simpulo.de und simpulo.eu", "Sichern und auf simpulo.app weiterleiten."),
  todo("comDomain", "brand", "later", ".com-Domain", "Später prüfen."),
  todo("handles", "brand", "beforeDeparture", "Social-Handles @simpulo sichern", "Instagram, TikTok, YouTube und weitere."),
  todo("address", "legal", "beforeDeparture", "Geschäftsadresse mit Post-Scan", "Ladungsfähige Anschrift fürs Impressum.", { link: "/impressum" }),
  todo("lawyerFirst", "legal", "beforeDeparture", "Anwalt Ersttermin", "Rechtstexte, Plattform-Pflichten, Haftung."),
  todo("legalReviewed", "legal", "beforeLanding", "Rechtstexte und Plattform-Pflichten geprüft", "Entwürfe vom Anwalt freigegeben.", { link: "/admin/platform" }),
  todo("liability", "legal", "beforeFirstHouse", "Betriebshaftpflicht", "Versicherung für den Betrieb der Plattform."),
  todo("dpa", "legal", "beforeLaunch", "Datenschutz-Verträge mit Dienstleistern", "Auftragsverarbeitung mit jedem Dienstleister."),
  todo("ksk", "legal", "beforeFirstHouse", "Künstlersozialkasse prüfen", "Ob Zahlungen an Creator abgabepflichtig sind."),
  todo("partnerTemplates", "legal", "beforeLanding", "Vorlagen Partner- und Creator-Vereinbarung", "Für Marketing › Partner."),
  todo("healthInsurance", "legal", "beforeDeparture", "Langzeit-Auslandskrankenversicherung", "Für die Zeit im Ausland."),
  todo("passwords", "infra", "beforeDeparture", "Passwort-Manager", "Alle Zugänge an einem Ort."),
  todo("twoFactor", "infra", "beforeDeparture", "Zwei-Faktor überall", "Inklusive Wiederherstellungscodes."),
  todo("eId", "infra", "beforeDeparture", "Online-Ausweis mit PIN prüfen", "Für Behörden aus dem Ausland."),
  todo("domainRenewal", "infra", "beforeDeparture", "Domain Auto-Verlängerung und Inhaberschutz", "Damit keine Domain verfällt."),
  todo("email", "infra", "beforeDeparture", "Geschäfts-E-Mail mit Versand-Einrichtung", "Postfach und Absender für die App-Mails."),
  todo("backup", "infra", "beforeDeparture", "Backup Proton Drive + SSD", "Zwei Kopien, eine davon offline."),
  todo("ipad", "infra", "beforeDeparture", "iPad kaufen", "Zum Testen und Arbeiten unterwegs."),
];

/** The launch's fallback rules are in config/marketing.ts (FALLBACK_RULES) – the timeline shows them as a hint at the launch. */
