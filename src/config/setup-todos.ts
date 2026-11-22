// Admin › Zeitplan › To-dos, source „Vorbereitung“: what has to be set up before departure, Stripe live, the landing page, the first House
// and the launch (company, money, brand, law, infrastructure). German like every admin text. When each is due comes from config/roadmap.ts
// (TODO_DUES); the status here is only the start value – the admin's is stored over it (AdminData.roadmapTodos).
import type { TodoDue, TodoStatus } from "./roadmap";

export type SetupGroup = "company" | "money" | "brand" | "legal" | "infra";
export const SETUP_GROUPS: readonly { id: SetupGroup; label: string }[] = [
  { id: "company", label: "Firma & Steuern" },
  { id: "money", label: "Geld" },
  { id: "brand", label: "Marke & Name" },
  { id: "legal", label: "Recht & Schutz" },
  { id: "infra", label: "Infrastruktur & Sicherheit" },
];

export interface SetupTodo {
  id: string;
  title: string;
  /** One line */
  text: string;
  group: SetupGroup;
  due: TodoDue;
  /** Optional, as text ("ca. 30 €/Monat") – null = not known */
  cost: string | null;
  /** A link to where it's done, if there is one */
  link?: string;
  /** Start value; the admin's status is stored over it */
  status: TodoStatus;
}

const todo = (id: string, group: SetupGroup, due: TodoDue, title: string, text: string, extra: Partial<SetupTodo> = {}): SetupTodo => ({ id, group, due, title, text, cost: null, status: due === "later" ? "later" : "open", ...extra });

export const SETUP_TODOS: readonly SetupTodo[] = [
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
