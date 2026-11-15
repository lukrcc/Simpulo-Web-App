// Every data point Simpulo collects – the one list (descriptions in German: only the admin shows them). Tracking (lib/analytics.ts, later the backend) records only what stands here; a new data
// point is entered here first, or it isn't collected (CLAUDE.md "Daten und Modelle"). Admin › Data & Algorithm shows it.
//
// Never: special categories (religion, sexual orientation, health, political views, ethnicity) and never the content of chat messages.
// Support ("Help & feedback") is read by the team to help – its free text is never used by a model, for matching or for ranking.
// Legal basis only `contract` (needed to run a House) or `consent` (asked for, can be withdrawn).
import type { ModelId } from "./models";

export const MOMENTS = ["onboarding", "search", "create", "request", "inTheHouse", "afterTheStay", "marketing", "support"] as const;
export type Moment = (typeof MOMENTS)[number];

export const DATA_POINT_STATUSES = ["planned", "collecting", "used"] as const;
/** planned – not collected yet · collecting – stored, no model reads it yet · used – a model reads it */
export type DataPointStatus = (typeof DATA_POINT_STATUSES)[number];

export type LegalBasis = "consent" | "contract";

export interface DataPoint {
  id: string;
  moment: Moment;
  /** What is recorded */
  captures: string;
  /** Why */
  purpose: string;
  /** The models that read it (config/models.ts); empty = none yet */
  models: readonly ModelId[];
  legalBasis: LegalBasis;
  status: DataPointStatus;
}

export const DATA_POINTS: readonly DataPoint[] = [
  // ── Onboarding ──
  { id: "profile.age", moment: "onboarding", captures: "Geburtsdatum (nur als Alter gezeigt)", purpose: "18+-Prüfung; Crews im ähnlichen Alter", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.base", moment: "onboarding", captures: "Land und Stadt, in der die Person lebt", purpose: "Woher Leute kommen; Houses in der Nähe", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "profile.languages", moment: "onboarding", captures: "Gesprochene Sprachen", purpose: "Eine Crew, die miteinander reden kann", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.interests", moment: "onboarding", captures: "Kategorien, die sie mögen (Fitness, Founder …)", purpose: "Erste Schätzung, was wir zeigen", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.houseVibe", moment: "onboarding", captures: "Vier Regler: Frühaufsteher ↔ Nachteule, ruhig ↔ gesellig, aktiv ↔ entspannt, ordentlich ↔ locker", purpose: "Wie sie zusammenleben", models: ["crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "profile.socials", moment: "onboarding", captures: "Öffentliche Social-Links, die sie eintragen", purpose: "Auf dem Profil gezeigt; Vertrauen", models: [], legalBasis: "consent", status: "collecting" },

  // ── Search ──
  { id: "search.placeMonth", moment: "search", captures: "Auf Explore gesuchter Ort und Monat", purpose: "Wohin und wann Leute wollen", models: ["demandMap", "interestRanking"], legalBasis: "consent", status: "collecting" },
  { id: "search.category", moment: "search", captures: "Gewählte Kategorie und Filter", purpose: "Welche Themen Leute suchen", models: ["interestRanking", "demandMap"], legalBasis: "consent", status: "collecting" },
  { id: "search.saved", moment: "search", captures: "Gespeicherte Suchen (Ort, Monat, Kategorie)", purpose: "Zuerst Bescheid geben, wenn ein House öffnet; Nachfrage ohne Angebot", models: ["demandMap"], legalBasis: "consent", status: "used" },
  { id: "search.inFor", moment: "search", captures: "„I'm in for“: Ort, Monate, Dauer, Kategorien", purpose: "Hosts sehen, wer käme; Nachfrage ohne Angebot", models: ["demandMap", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "search.cardClick", moment: "search", captures: "Welche House-Karten geöffnet werden, aus welcher Reihe", purpose: "Welche Vorschläge funktionieren", models: ["interestRanking"], legalBasis: "consent", status: "planned" },
  { id: "search.saveHouse", moment: "search", captures: "Gemerkte Houses (Herz)", purpose: "Interesse vor einer Anfrage", models: ["interestRanking"], legalBasis: "contract", status: "collecting" },

  // ── Create ──
  { id: "create.category", moment: "create", captures: "Kategorie des House (oder eigenes Label)", purpose: "Welche Themen Hosts eröffnen", models: ["demandMap", "interestRanking"], legalBasis: "contract", status: "used" },
  { id: "create.placeMonth", moment: "create", captures: "Ort und Monate des House", purpose: "Angebot je Ort und Monat", models: ["demandMap"], legalBasis: "contract", status: "used" },
  { id: "create.crewPrice", moment: "create", captures: "Crew-Größe, Preis oder Budget pro Person", purpose: "Was bei welcher Größe und welchem Preis voll wird", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.hostFee", moment: "create", captures: "Host-Gebühr pro Gast (Pro Hosts)", purpose: "Pro gegen Share Hosts; Einnahmen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "host.tier", moment: "create", captures: "Host-Stufe: Share, Pro oder Anchor (vorgeschlagen nach Host-Gebühr und Followern, vom Team gesetzt)", purpose: "Welche Hosts Angebot, Umsatz und Reichweite bringen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "host.audienceSize", moment: "create", captures: "Follower über die Links, die ein Host (Bewerber) angibt", purpose: "Anchor-Stufe vorschlagen; Reichweite eines Hosts", models: [], legalBasis: "consent", status: "collecting" },
  { id: "host.taxId", moment: "create", captures: "Steuer-ID des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt (Plattformen melden Verkäufer)", models: [], legalBasis: "contract", status: "planned" },
  { id: "host.address", moment: "create", captures: "Anschrift des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt", models: [], legalBasis: "contract", status: "planned" },
  { id: "host.birthDate", moment: "create", captures: "Geburtsdatum des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt", models: [], legalBasis: "contract", status: "planned" },
  { id: "create.accommodationType", moment: "create", captures: "Art des Ortes: Kategorie und Typ (Villa, Coliving, Surfcamp …, config/accommodation.ts) – in Open a House, „Where will you live?“; „Not sure yet“ speichert keinen", purpose: "Welche Orte voll werden, wo wir bauen", models: ["demandMap", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.placeMode", moment: "create", captures: "Ort gebucht oder gemeinsam gewählt", purpose: "Welcher Weg schneller voll wird", models: [], legalBasis: "contract", status: "collecting" },

  // ── Request ──
  { id: "request.sent", moment: "request", captures: "Anfrage (House, Zeitpunkt, mit Freund)", purpose: "House betreiben; welche Vorschläge zu Anfragen führen", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "request.answer", moment: "request", captures: "Antwort des Hosts: angenommen, passt nicht, abgelaufen", purpose: "House betreiben; wen Hosts annehmen", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "request.reserved", moment: "request", captures: "Platz vorgemerkt (Beta, ohne Zahlung)", purpose: "Nachfrage vor dem Launch", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "request.timeToFull", moment: "request", captures: "Zeit von der Eröffnung bis zur vollen Crew", purpose: "Wie schnell Houses voll werden", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "request.payment", moment: "request", captures: "Zahlung (Betrag, Datum – keine Kartendaten)", purpose: "House betreiben; Auszahlungen", models: [], legalBasis: "contract", status: "collecting" },

  // ── In the house ──
  { id: "stay.arrived", moment: "inTheHouse", captures: "Angekommen (Check-in bestätigt)", purpose: "Wer wirklich kam", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.leftEarly", moment: "inTheHouse", captures: "Vor dem Ende abgereist (Datum)", purpose: "Frühe Abreisen als Warnsignal", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.report", moment: "inTheHouse", captures: "Meldungen und „Something went wrong“-Fälle (Kategorie, kein Chat-Inhalt)", purpose: "Sicherheit; ein House, das nicht funktioniert", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },

  // ── After the stay (the rating: its own form, a later prompt) ──
  { id: "after.livedWith", moment: "afterTheStay", captures: "„Lived with“ bestätigt, in beide Richtungen", purpose: "Your people; Vertrauen", models: ["crewFit", "houseChemistry"], legalBasis: "contract", status: "used" },
  { id: "after.doItAgain", moment: "afterTheStay", captures: "„Do it again“ gestartet", purpose: "Houses, die es wert sind, wiederholt zu werden", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.rating", moment: "afterTheStay", captures: "Gesamtbewertung (1–5)", purpose: "Qualität des House", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.crewMood", moment: "afterTheStay", captures: "Stimmung in der Crew (1–5)", purpose: "Die soziale Seite des House", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.tidiness", moment: "afterTheStay", captures: "Ordnung (zu chaotisch · passt · sehr ordentlich)", purpose: "Zusammenleben; Abgleich mit den Vibe-Reglern", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "planned" },
  { id: "after.noise", moment: "afterTheStay", captures: "Lautstärke (zu laut · passt · zu ruhig)", purpose: "Zusammenleben; Abgleich mit den Vibe-Reglern", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "planned" },
  { id: "after.together", moment: "afterTheStay", captures: "Gemeinsame Aktivitäten (wie viel die Crew zusammen gemacht hat)", purpose: "Ob aus einer Crew eine Gruppe wurde", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.again", moment: "afterTheStay", captures: "„Mit wem würdest du wieder wohnen?“ (Personen aus der Crew, privat)", purpose: "Gegenseitiges „wieder“ – das stärkste Zeichen für Passung", models: ["crewFit", "houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.sentence", moment: "afterTheStay", captures: "Ein freier Satz (optional)", purpose: "Vom Team gelesen – keine automatische Auswertung", models: [], legalBasis: "consent", status: "planned" },
  { id: "after.nextHouseBetter", moment: "afterTheStay", captures: "„What would make your next House better?“ – optional in der Bewertung; landet als Idee im Support (Kategorie idea)", purpose: "support", models: [], legalBasis: "consent", status: "planned" },

  // ── Marketing ──
  { id: "mkt.src", moment: "marketing", captures: "?src= des Links, über den sie kamen (erster Kontakt)", purpose: "Welcher Kanal Leute bringt", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.utm", moment: "marketing", captures: "utm_source / medium / campaign", purpose: "Welche Kampagne Leute bringt", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.video", moment: "marketing", captures: "Serie und Folge im Link (?src=serie-folge)", purpose: "Welche Serie und welches Video funktioniert", models: ["marketingImpact"], legalBasis: "consent", status: "planned" },
  { id: "mkt.referral", moment: "marketing", captures: "Wer den Link geteilt hat (ref)", purpose: "Mundpropaganda; Einladungen", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.waitlist", moment: "marketing", captures: "Anmeldung zur Warteliste (E-Mail, Interessen, wo, wann, will hosten)", purpose: "Nachfrage vor dem Launch; Bescheid geben, wenn es losgeht", models: ["demandMap", "marketingImpact"], legalBasis: "consent", status: "used" },
  { id: "mkt.install", moment: "marketing", captures: "App installiert (Homescreen)", purpose: "Wer erreichbar bleibt", models: [], legalBasis: "consent", status: "collecting" },

  // ── Support ("Help & feedback" → Admin › Support): purpose "support" only, never a model ──
  { id: "support.category", moment: "support", captures: "Worum es geht: Frage, etwas ist kaputt, Idee, Sicherheit", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.message", moment: "support", captures: "Ihre Nachricht (Freitext)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.email", moment: "support", captures: "E-Mail für die Antwort (eingeloggt vorausgefüllt)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.context", moment: "support", captures: "Seite, House, Gerät, Bildschirmbreite und Phase zum Zeitpunkt (vor dem Senden gezeigt)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.screenshot", moment: "support", captures: "Ein Screenshot, falls hinzugefügt", purpose: "support", models: [], legalBasis: "consent", status: "collecting" },
];

/** The data points a model reads – derived from DATA_POINTS, never listed twice. */
export const inputsOf = (model: ModelId) => DATA_POINTS.filter((d) => d.models.includes(model));
