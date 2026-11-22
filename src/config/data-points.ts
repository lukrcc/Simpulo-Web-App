// Every data point Simpulo collects – the one list (descriptions in German: only the admin shows them). Tracking (lib/analytics.ts, later the backend) records only what stands here; a new data
// point is entered here first, or it isn't collected (CLAUDE.md "Daten und Modelle"). Admin › Data & Algorithm shows it.
//
// Never: special categories (religion, sexual orientation, health, political views, ethnicity) and never the content of chat messages.
// Support ("Help & feedback") is read by the team to help – its free text is never used by a model, for matching or for ranking.
// Legal basis only `contract` (needed to run a House) or `consent` (asked for, can be withdrawn).
import type { ModelId } from "./models";

export const MOMENTS = ["onboarding", "search", "create", "request", "inTheHouse", "afterTheStay", "afterwards", "marketing", "support"] as const;
export type Moment = (typeof MOMENTS)[number];

export const DATA_POINT_STATUSES = ["planned", "collecting", "used"] as const;
/** planned – not collected yet · collecting – stored, no model reads it yet · used – a model reads it */
export type DataPointStatus = (typeof DATA_POINT_STATUSES)[number];

/** contract (needed to run a House) · consent (asked for, can be withdrawn) · none (no personal data – about a place, not a person) ·
 *  review (to be checked before it is collected: sensors) */
export type LegalBasis = "consent" | "contract" | "none" | "review";

export interface DataPoint {
  id: string;
  /** A short name for the map's tile (≈ 18 characters, Admin › Algorithmus › Datenpunkte); the long one (captures) in the tooltip */
  short: string;
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
  { id: "profile.age", short: "Alter", moment: "onboarding", captures: "Geburtsdatum (nur als Alter gezeigt)", purpose: "18+-Prüfung; Crews im ähnlichen Alter", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.base", short: "Wohnort", moment: "onboarding", captures: "Land und Stadt, in der die Person lebt", purpose: "Woher Leute kommen; Houses in der Nähe", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "profile.languages", short: "Sprachen", moment: "onboarding", captures: "Gesprochene Sprachen", purpose: "Eine Crew, die miteinander reden kann", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.interests", short: "Interessen", moment: "onboarding", captures: "Kategorien, die sie mögen (Fitness, Founder …)", purpose: "Erste Schätzung, was wir zeigen", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.houseVibe", short: "House-Vibe", moment: "onboarding", captures: "Vier Fragen mit je drei Antwort-Kacheln, jede überspringbar: Frühaufsteher · dazwischen · Nachteule, ruhig · ausgeglichen · gesellig, aktiv · dazwischen · entspannt, ordentlich · ziemlich ordentlich · locker", purpose: "Wie sie zusammenleben", models: ["crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "profile.communityNeed", short: "Wie gesellig", moment: "onboarding", captures: "„How much community do you need?“ – wenig · etwas · viel (Edit profile › Vibe, auch im Onboarding)", purpose: "Houses in passender Tiefe höher sortieren (nie ausschließen)", models: ["interestRanking"], legalBasis: "consent", status: "planned" },
  // Agreements (config/consent.ts, lib/consent.ts): what someone agreed to, with version and time – the proof, nothing else reads it.
  { id: "consent.terms", short: "Terms", moment: "onboarding", captures: "Zustimmung zu den Terms: Version und Zeitpunkt (bei der Registrierung und nach jeder neuen Version)", purpose: "Nachweis, welchen Bedingungen jemand wann zugestimmt hat", models: [], legalBasis: "contract", status: "collecting" },
  { id: "consent.age", short: "18+ bestätigt", moment: "onboarding", captures: "Häkchen „I'm 18 or older“ mit Zeitpunkt", purpose: "Nachweis der Altersbestätigung", models: [], legalBasis: "contract", status: "collecting" },
  { id: "consent.guestCode", short: "Kodex Gast", moment: "request", captures: "Zustimmung zum Verhaltenskodex vor der ersten Anfrage: Version und Zeitpunkt", purpose: "Nachweis, dass die Regeln fürs Zusammenleben bekannt sind (Grundlage für Moderation)", models: [], legalBasis: "contract", status: "collecting" },
  { id: "consent.hostCode", short: "Kodex Host", moment: "create", captures: "Zustimmung zur Host-Fassung des Verhaltenskodex vor dem ersten eröffneten House: Version und Zeitpunkt", purpose: "Nachweis der Host-Pflichten (Grundlage für Moderation)", models: [], legalBasis: "contract", status: "collecting" },
  // Onboarding (config/onboarding.ts, lib/onboarding.ts): only how far someone got – which steps were done or skipped, never what was typed.
  { id: "onboarding.guest", short: "Gast-Einstieg", moment: "onboarding", captures: "Gast-Onboarding begonnen · abgeschlossen, übersprungene Schritte (nur Zustand)", purpose: "Wo Leute im Onboarding aufhören", models: [], legalBasis: "contract", status: "collecting" },
  { id: "onboarding.host", short: "Host-Einstieg", moment: "onboarding", captures: "Host-Onboarding begonnen · abgeschlossen, welche Schritte (Ort, Auszahlung, erstes House) erledigt oder übersprungen", purpose: "Wie schnell neue Hosts ihr erstes House eröffnen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "onboarding.pushAsk", short: "Push-Frage", moment: "request", captures: "Nach der ersten Anfrage: Push-Frage gezeigt und Antwort (an · nicht jetzt)", purpose: "Ob der gute Moment für die Frage wirkt", models: [], legalBasis: "contract", status: "collecting" },
  { id: "profile.socials", short: "Social-Links", moment: "onboarding", captures: "Öffentliche Social-Links, die sie eintragen", purpose: "Auf dem Profil gezeigt; Vertrauen", models: [], legalBasis: "consent", status: "collecting" },

  // ── Search ──
  { id: "search.placeMonth", short: "Ort, Monat", moment: "search", captures: "Auf Explore gesuchter Ort und Monat", purpose: "Wohin und wann Leute wollen", models: ["demandMap", "interestRanking", "placeFit"], legalBasis: "consent", status: "collecting" },
  { id: "search.category", short: "Filter", moment: "search", captures: "Gewählte Kategorie und Filter", purpose: "Welche Themen Leute suchen", models: ["interestRanking", "demandMap"], legalBasis: "consent", status: "collecting" },
  { id: "search.saved", short: "Suche gemerkt", moment: "search", captures: "Gespeicherte Suchen (Ort, Monat, Kategorie)", purpose: "Zuerst Bescheid geben, wenn ein House öffnet; Nachfrage ohne Angebot", models: ["demandMap", "placeFit"], legalBasis: "consent", status: "used" },
  { id: "search.inFor", short: "I'm in for", moment: "search", captures: "„I'm in for“: Ort, Monate, Dauer, Kategorien", purpose: "Hosts sehen, wer käme; Nachfrage ohne Angebot", models: ["demandMap", "crewFit", "placeFit"], legalBasis: "consent", status: "collecting" },
  { id: "search.cardClick", short: "Karten-Klicks", moment: "search", captures: "Welche House-Karten geöffnet werden, aus welcher Reihe", purpose: "Welche Vorschläge funktionieren", models: ["interestRanking"], legalBasis: "consent", status: "planned" },
  { id: "search.saveHouse", short: "Gemerkt", moment: "search", captures: "Gemerkte Houses (Herz)", purpose: "Interesse vor einer Anfrage", models: ["interestRanking"], legalBasis: "contract", status: "collecting" },

  // ── Create ──
  { id: "create.category", short: "Kategorie", moment: "create", captures: "Kategorie des House (oder eigenes Label)", purpose: "Welche Themen Hosts eröffnen", models: ["demandMap", "interestRanking"], legalBasis: "contract", status: "used" },
  { id: "create.placeMonth", short: "Ort, Monate", moment: "create", captures: "Ort und Monate des House", purpose: "Angebot je Ort und Monat", models: ["demandMap", "placeFit"], legalBasis: "contract", status: "used" },
  { id: "create.crewPrice", short: "Crew und Preis", moment: "create", captures: "Crew-Größe, Preis oder Budget pro Person", purpose: "Was bei welcher Größe und welchem Preis voll wird", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.hostFee", short: "Host-Gebühr", moment: "create", captures: "Host-Gebühr pro Gast (Pro Hosts)", purpose: "Pro gegen Share Hosts; Einnahmen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "host.tier", short: "Host-Stufe", moment: "create", captures: "Host-Stufe: Share, Pro oder Anchor (vorgeschlagen nach Host-Gebühr und Followern, vom Team gesetzt)", purpose: "Welche Hosts Angebot, Umsatz und Reichweite bringen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "host.audienceSize", short: "Follower", moment: "create", captures: "Follower über die Links, die ein Host (Bewerber) angibt", purpose: "Anchor-Stufe vorschlagen; Reichweite eines Hosts", models: [], legalBasis: "consent", status: "collecting" },
  { id: "host.taxId", short: "Steuer-ID", moment: "create", captures: "Steuer-ID des Hosts (DAC7) – Settings › Payments & payouts, erst ab der Schwelle (HOST_TAX_INFO), nur Admin sieht sie; hinter Schalter, aus", purpose: "DAC7-Meldung an das Finanzamt (Plattformen melden Verkäufer)", models: [], legalBasis: "review", status: "planned" },
  { id: "host.address", short: "Host-Anschrift", moment: "create", captures: "Anschrift des Hosts (DAC7) – wie die Steuer-ID", purpose: "DAC7-Meldung an das Finanzamt", models: [], legalBasis: "review", status: "planned" },
  { id: "host.business", short: "Gewerblich?", moment: "create", captures: "Privat oder gewerblich; gewerblich Firmenname, Anschrift, Registernummer (Settings › Payments & payouts)", purpose: "Gäste sehen, mit wem sie buchen („Hosted by a business“)", models: [], legalBasis: "review", status: "collecting" },
  { id: "host.birthDate", short: "Geburtsdatum", moment: "create", captures: "Geburtsdatum des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt", models: [], legalBasis: "contract", status: "planned" },
  { id: "create.accommodationType", short: "Art des Ortes", moment: "create", captures: "Art des Ortes: Kategorie und Typ (Villa, Coliving, Surfcamp …, config/accommodation.ts) – in Open a House, „Where will you live?“; „Not sure yet“ speichert keinen", purpose: "Welche Orte voll werden, wo wir bauen", models: ["demandMap", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.placeMode", short: "Ort gebucht?", moment: "create", captures: "Ort gebucht oder gemeinsam gewählt", purpose: "Welcher Weg schneller voll wird", models: [], legalBasis: "contract", status: "collecting" },
  // Raum-Daten beim Eröffnen – optional, über den Ort, keine Personendaten (Raum-Wirkung, These „Der Raum ist fast egal“)
  // "About the space" (Open a House, optional step after "Where and when?"; config/space.ts) – keine Personendaten. Öffentlich auf der
  // House-Seite nur Schlafzimmer, Bäder, eigene/geteilte Zimmer, Außenfläche, Küche; der Rest nur intern.
  { id: "create.space.bedrooms", short: "Schlafzimmer", moment: "create", captures: "Schlafzimmer (Zahl)", purpose: "Wie viel Rückzug je Person; auf der House-Seite gezeigt", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.bathrooms", short: "Bäder", moment: "create", captures: "Bäder (Zahl)", purpose: "Engpässe im Alltag; auf der House-Seite gezeigt", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.shared", short: "Gem. Räume", moment: "create", captures: "Gemeinsame Räume: großer Küchentisch, Wohnzimmer, Arbeitsplatz, Pool/Garten (mehrere)", purpose: "Welche gemeinsamen Räume verbinden", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.table", short: "Tischposition", moment: "create", captures: "Tischposition (Mitte · Rand · keiner)", purpose: "Ob ein Tisch in der Mitte verbindet", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.seats", short: "Tischplätze", moment: "create", captures: "Plätze am größten Tisch", purpose: "Ob alle an einen Tisch passen", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.kitchen", short: "Küche offen", moment: "create", captures: "Küche offen oder getrennt", purpose: "Ob eine offene Küche verbindet", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.paths", short: "Wege zum Bad", moment: "create", captures: "Wege zum Bad über den gemeinsamen Raum (ja/nein)", purpose: "Ob Wege durch die Mitte Begegnung erzeugen", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.retreat", short: "Rückzugsort", moment: "create", captures: "Rückzugsort vorhanden (ja/nein)", purpose: "Ob Rückzug das Wohlfühlen hält", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.rooms", short: "Eigene Zimmer", moment: "create", captures: "Eigene oder geteilte Zimmer", purpose: "Ob eigene oder geteilte Zimmer mehr verbinden", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.outdoor", short: "Außenfläche", moment: "create", captures: "Außenfläche (keine · Balkon · Garten · Hof)", purpose: "Ob draußen zusammen sein verbindet", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.area", short: "Fläche p. P.", moment: "create", captures: "Fläche ungefähr (m²) – pro Person gerechnet mit der Crew-Größe", purpose: "Enge gegen Weite", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.daylight", short: "Tageslicht", moment: "create", captures: "Tageslicht im gemeinsamen Raum (wenig · mittel · viel)", purpose: "Ob Licht den gemeinsamen Raum nutzt", models: ["spaceEffect"], legalBasis: "none", status: "collecting" },
  { id: "create.space.setting", short: "Lage", moment: "create", captures: "Lage (Stadt · Rand · Land)", purpose: "Welche Lage verbindet und wo Höfe passen", models: ["spaceEffect", "placeFit"], legalBasis: "none", status: "collecting" },
  // Später, mit Sensoren – vorher rechtlich prüfen; nie Kameras, Mikrofone oder Personen-Tracking
  { id: "sensor.roomUse", short: "Raumnutzung", moment: "inTheHouse", captures: "Anonyme Raumnutzung (Sensor)", purpose: "Welche Räume genutzt werden – Räume messen, nie Menschen", models: ["spaceEffect"], legalBasis: "review", status: "planned" },
  { id: "sensor.noise", short: "Lärmpegel", moment: "inTheHouse", captures: "Lärmpegel ohne Ton (Sensor)", purpose: "Lautstärke im House, ohne Aufnahme", models: ["spaceEffect"], legalBasis: "review", status: "planned" },
  { id: "create.placeOrigin", short: "Ort-Herkunft", moment: "create", captures: "Ort-Herkunft des House: eigener gespeicherter Ort (Fenster, Stay.placeId) oder neuer Ort", purpose: "Ob Hosts aus ihrem Zuhause schneller voll werden und wiederkommen; Fenster pro Ort (Admin › Analyse › Ort-Herkunft)", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "place.saved", short: "Eigener Ort", moment: "create", captures: "Gespeicherter Ort, in dem der Host wohnt: Art des Ortes, Fotos, Zimmer, freie Plätze, Raum-Daten („About the space“), Regeln, Ort (Stadt, Region; Straße nur für den Host), Mietzeitraum von–bis, Monatsmiete + Währung", purpose: "Fenster daraus öffnen (vorausgefüllt), Preis anteilig nach Nächten (lib/price.ts)", models: [], legalBasis: "contract", status: "collecting" },
  { id: "place.allowedToHost", short: "Hosten erlaubt", moment: "create", captures: "Bestätigung des Hosts „I'm allowed to host guests here“ (Untervermietung bzw. Gäste vom Vermieter und nach örtlichen Regeln erlaubt) mit Zeitpunkt – Pflicht zum Speichern eines Ortes, von Simpulo nicht geprüft", purpose: "Nachweis der eigenen Erklärung des Hosts", models: [], legalBasis: "contract", status: "collecting" },
  { id: "create.depth", short: "Soziale Tiefe", moment: "create", captures: "Soziale Tiefe des House: Easy · Balanced · Deep (config/depth.ts), in Open a House; nach der ersten Buchung fest", purpose: "Passende Gäste finden; welche Tiefe voll wird und wiederkommt (Admin › Analyse › Tiefe)", models: ["interestRanking", "houseChemistry"], legalBasis: "contract", status: "planned" },

  // ── Request ──
  { id: "request.sent", short: "Anfrage", moment: "request", captures: "Anfrage (House, Zeitpunkt, mit Freund)", purpose: "House betreiben; welche Vorschläge zu Anfragen führen", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "ask.beforeRequest", short: "Fragen vorher", moment: "request", captures: "Nachrichten des Gasts an den Host zu einem House vor seiner Anfrage (nur die Anzahl, kein Inhalt)", purpose: "Ob Fragen vor der Anfrage helfen", models: [], legalBasis: "contract", status: "planned" },
  { id: "ask.toRequest", short: "Aus Frage", moment: "request", captures: "Ob ein Direktchat zu einem House später zu einer Anfrage desselben Gasts führt", purpose: "Wie oft Fragen an den Host zu einer Anfrage führen", models: [], legalBasis: "contract", status: "planned" },
  { id: "request.note", short: "Notiz ja/nein", moment: "request", captures: "Ob eine Anfrage eine Notiz an den Host hat (nur ja/nein, kein Inhalt)", purpose: "Wie viele Gäste dem Host etwas mitgeben", models: [], legalBasis: "contract", status: "planned" },
  { id: "request.answer", short: "Host-Antwort", moment: "request", captures: "Antwort des Hosts: angenommen, passt nicht, abgelaufen", purpose: "House betreiben; wen Hosts annehmen", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "request.reserved", short: "Vorgemerkt", moment: "request", captures: "Platz vorgemerkt (Beta, ohne Zahlung)", purpose: "Nachfrage vor dem Launch", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "request.timeToFull", short: "Zeit bis voll", moment: "request", captures: "Zeit von der Eröffnung bis zur vollen Crew", purpose: "Wie schnell Houses voll werden", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "request.payment", short: "Zahlung", moment: "request", captures: "Zahlung (Betrag, Datum – keine Kartendaten)", purpose: "House betreiben; Auszahlungen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "app.installed", short: "App installiert", moment: "inTheHouse", captures: "Simpulo installiert: Gerät (iPhone · Android), Zeitpunkt, woher (ref/src, z. B. src=qr der Karten im House) – kein Gerätekennzeichen", purpose: "Installationsrate der Gäste mit Buchung (Admin › Wachstum); welche Momente und Karten zur Installation führen", models: [], legalBasis: "contract", status: "planned" },

  // ── In the house ──
  { id: "stay.arrived", short: "Angekommen", moment: "inTheHouse", captures: "Angekommen (Check-in bestätigt)", purpose: "Wer wirklich kam", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.leftEarly", short: "Früh abgereist", moment: "inTheHouse", captures: "Vor dem Ende abgereist (Datum)", purpose: "Frühe Abreisen als Warnsignal", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.report", short: "Meldungen", moment: "inTheHouse", captures: "Meldungen und „Something went wrong“-Fälle (Kategorie, kein Chat-Inhalt)", purpose: "Sicherheit; ein House, das nicht funktioniert", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  // Der Bogen (config/arc.ts): nur Signale – welche Karte, welcher Schritt, wann. Nie, was jemand geschrieben oder gesagt hat.
  // House Memories (das Album): nur Zahlen und Zustimmungen – nie Bildinhalte, nie Gesichter, keine Standortdaten (beim Hochladen entfernt).
  { id: "memory.uploaded", short: "Album-Uploads", moment: "inTheHouse", captures: "Fotos/Clips ins Album geladen (Anzahl, Art, House) – ohne Standortdaten", purpose: "Wie lebendig ein House ist; Album", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "memory.crewConsent", short: "Foto-Okay", moment: "inTheHouse", captures: "„Everyone in this photo is okay with the crew seeing it“ bestätigt (Pflicht beim Hochladen)", purpose: "Nachweis der Zustimmung", models: [], legalBasis: "consent", status: "collecting" },
  { id: "memory.simpuloUse", short: "Für Simpulo", moment: "inTheHouse", captures: "„Simpulo may use this for Simpulo's own posts“ (optional, Standard aus) – je Datei", purpose: "Marketing nur mit Freigabe (Admin › Marketing › Content)", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "memory.removed", short: "Datei entfernt", moment: "inTheHouse", captures: "Datei entfernt – von der hochladenden Person oder „Remove me“ (ohne Grund, ohne Person)", purpose: "Ob Zustimmung im Alltag hält", models: [], legalBasis: "contract", status: "collecting" },
  { id: "arc.cardSeen", short: "Karte gesehen", moment: "inTheHouse", captures: "Simpulo-Karte im House-Chat gesehen (Schritt-Id, House, Zeitpunkt)", purpose: "Welche Schritte ankommen; Zeitpunkte des Bogens", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "arc.actionDone", short: "Bogen-Aktion", moment: "inTheHouse", captures: "Aktion eines Bogen-Schritts ausgeführt (Schritt-Id, House, Zeitpunkt) – ohne Inhalt", purpose: "Welche Schritte Crews nutzen; Bogen verbessern", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "arc.stepSkipped", short: "Übersprungen", moment: "inTheHouse", captures: "Bogen-Schritt übersprungen oder Tipps stummgeschaltet (Schritt-Id, House)", purpose: "Welche Schritte stören; weniger, bessere Karten", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },

  // ── After the stay (the rating: its own form, a later prompt) ──
  { id: "after.livedWith", short: "Lived with", moment: "afterTheStay", captures: "„Lived with“ bestätigt, in beide Richtungen", purpose: "Your people; Vertrauen", models: ["crewFit", "houseChemistry", "placeFit"], legalBasis: "contract", status: "used" },
  { id: "after.doItAgain", short: "Do it again", moment: "afterTheStay", captures: "„Do it again“ gestartet", purpose: "Houses, die es wert sind, wiederholt zu werden", models: ["houseChemistry", "placeFit"], legalBasis: "contract", status: "collecting" },
  { id: "after.rating", short: "Bewertung", moment: "afterTheStay", captures: "Gesamtbewertung (1–5)", purpose: "Qualität des House", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.crewMood", short: "Stimmung", moment: "afterTheStay", captures: "Stimmung in der Crew (1–5)", purpose: "Die soziale Seite des House", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.tidiness", short: "Ordnung", moment: "afterTheStay", captures: "Ordnung (1–5)", purpose: "Zusammenleben; Abgleich mit den Vibe-Reglern", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "after.noise", short: "Lautstärke", moment: "afterTheStay", captures: "Lautstärke (1–5)", purpose: "Zusammenleben; Abgleich mit den Vibe-Reglern", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "after.together", short: "Zusammen", moment: "afterTheStay", captures: "Gemeinsame Aktivitäten (wie viel die Crew zusammen gemacht hat)", purpose: "Ob aus einer Crew eine Gruppe wurde", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.again", short: "Mit dir wieder", moment: "afterTheStay", captures: "„Mit wem würdest du wieder wohnen?“ (Personen aus der Crew, privat; sichtbar nur gegenseitig)", purpose: "Gegenseitiges „wieder“ – das stärkste Zeichen für Passung; nie als öffentliche Kennzahl", models: ["crewFit", "houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.mutual", short: "Gegenseitig", moment: "afterTheStay", captures: "Gegenseitige Wahl (Paar, House) – beide werden Your people", purpose: "Your people; Passung", models: ["crewFit", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.intentionReached", short: "Absicht erreicht", moment: "afterTheStay", captures: "„Did you reach your intention?“ Yes · Partly · No (privat)", purpose: "Ob ein House wirkt – nur als Zahl", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.sentence", short: "Satz an Host", moment: "afterTheStay", captures: "Ein freier Satz an den Host (optional; nur der Host liest ihn) – erfasst wird nur, ob es ihn gibt", purpose: "Rückmeldung an den Host – keine Auswertung", models: [], legalBasis: "consent", status: "collecting" },
  { id: "after.tip", short: "Tipp für Crew", moment: "afterTheStay", captures: "Tipp für die nächste Crew geschrieben (ja/nein) und öffentlich freigegeben (ja/nein) – nie der Text", purpose: "Wie oft Gäste etwas weitergeben", models: [], legalBasis: "consent", status: "collecting" },
  { id: "after.nextIdea", short: "Nächste Idee", moment: "afterTheStay", captures: "„One idea for your next House“ angegeben (ja/nein) – der Text bleibt privat", purpose: "Signal für Interessen-Ranking (wer wieder will)", models: ["interestRanking"], legalBasis: "consent", status: "collecting" },
  { id: "after.doItAgainTogether", short: "Neu zusammen", moment: "afterTheStay", captures: "„Open the next one together“ geöffnet (nach gegenseitiger Wahl, +7 Tage)", purpose: "Ob aus einer Crew das nächste House wird (Gast wird Host)", models: ["crewFit", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.inTouch30", short: "Kontakt 30 T.", moment: "afterTheStay", captures: "Nach 30 Tagen noch in Kontakt mit jemandem aus der Crew (ja/nein)", purpose: "Ob Verbindungen halten – Kennzahl „noch in Kontakt“", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "after.still30", short: "Bleibt 30 T.", moment: "afterTheStay", captures: "„What's one thing you still do since the House?“ beantwortet (ja/nein) – der Text bleibt privat", purpose: "Ob ein House nachwirkt – nur als Zahl", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.story", short: "Geschichte", moment: "afterTheStay", captures: "Als Geschichte geteilt (ja/nein) – öffentlich nur mit Zustimmung, Text sichtbar auf den House-Seiten des Hosts", purpose: "Freigegebene Geschichten auf House-Seiten", models: [], legalBasis: "consent", status: "collecting" },
  { id: "arc.closingLed", short: "Abschluss", moment: "inTheHouse", captures: "Pro Host leitet die Abschlussrunde selbst (ja/nein)", purpose: "Wie Pro Hosts den Abschied gestalten", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.nextHouseBetter", short: "Verbesserung", moment: "afterTheStay", captures: "„What would make your next House better?“ – optional in der Bewertung; landet als Idee im Support (Kategorie idea)", purpose: "support", models: [], legalBasis: "consent", status: "planned" },
  // Der Ort im Rückblick – optional, mit Einwilligung (Raum-Wirkung)
  { id: "after.space.where", short: "Ort der Crew", moment: "afterTheStay", captures: "„Wo habt ihr am meisten Zeit zusammen verbracht?“ (Raumwahl)", purpose: "Welcher Raum wirklich verbindet", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  { id: "after.space.feel", short: "Ortsgefühl", moment: "afterTheStay", captures: "„Wie hat sich der Ort angefühlt?“ (Wortkacheln)", purpose: "Wie ein Raum wirkt, in Worten", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  { id: "after.space.wellbeing", short: "Wohlfühlen", moment: "afterTheStay", captures: "Wohlfühlen (1–5)", purpose: "Verbindung ohne Wohlfühlen zu senken", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  { id: "after.space.retreat", short: "Rückzug?", moment: "afterTheStay", captures: "„Konnte ich mich zurückziehen?“ (ja/nein)", purpose: "Ob Rückzug gefehlt hat", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  // Danach
  { id: "afterwards.moai", short: "Moai-Treffen", moment: "afterwards", captures: "Crew trifft sich wieder (Moai, jährlich)", purpose: "Ob aus einer Crew ein Kreis wird", models: [], legalBasis: "consent", status: "planned" },

  // ── Marketing ──
  // Vor dem Launch: Warteliste (Double-Opt-in) und Host-Bewerbung.
  { id: "waitlist.signup", short: "Warteliste", moment: "marketing", captures: "Warteliste: E-Mail, optional Ort, Thema, Monat; Häkchen „Email me when Houses open here“ (Pflicht)", purpose: "Launch-Mail; Nachfrage-Karte vor dem Launch", models: ["demandMap"], legalBasis: "consent", status: "collecting" },
  { id: "waitlist.confirmed", short: "Opt-in bestätigt", moment: "marketing", captures: "Bestätigungslink geklickt (Double-Opt-in) bzw. abgemeldet – mit Zeitpunkt", purpose: "Nachweis der Einwilligung; Launch-Kriterium zählt nur Bestätigte", models: [], legalBasis: "consent", status: "collecting" },
  { id: "host.application", short: "Bewerbung", moment: "marketing", captures: "Host-Bewerbung: Name, E-Mail, Link, Reichweite (optional), Thema, Ort, Zeitraum, ein Satz – und die Entscheidung", purpose: "Founding Hosts auswählen", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "mkt.src", short: "Quelle (src)", moment: "marketing", captures: "?src= des Links, über den sie kamen – der Kanal, über den geteilt wurde (copy · whatsapp · messages · story · native · invite · qr · hostkit · hostref); nur im Arbeitsspeicher der Seite, gespeichert an Anfrage, Zahlung, Konto", purpose: "Welcher Kanal Leute bringt (Admin › Wachstum › Kanäle)", models: ["marketingImpact"], legalBasis: "contract", status: "collecting" },
  { id: "mkt.utm", short: "UTM", moment: "marketing", captures: "utm_source / medium / campaign", purpose: "Welche Kampagne Leute bringt", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.video", short: "Serie und Folge", moment: "marketing", captures: "Serie und Folge im Link (?src=serie-folge)", purpose: "Welche Serie und welches Video funktioniert", models: ["marketingImpact"], legalBasis: "consent", status: "planned" },
  { id: "mkt.referral", short: "Empfehler", moment: "marketing", captures: "Wer den Link geteilt hat (?ref={userId}) – jeder Teilen-Link und jede Einladung (Ersteller des Links), beim Beitritt an der Mitgliedschaft gespeichert", purpose: "Mundpropaganda; Einladungen (Admin › Wachstum › Empfehler)", models: ["marketingImpact"], legalBasis: "contract", status: "collecting" },
  { id: "mkt.hostReferral", short: "Host wirbt Host", moment: "marketing", captures: "Host wirbt Host: welcher Host einen neuen Host gebracht hat (Bewerbung referredBy → Konto hostReferredBy), eine Ebene; hinter Schalter, aus", purpose: "Anteil für den werbenden Host nach dem ersten bezahlten Stay (Höhe offen)", models: ["marketingImpact"], legalBasis: "contract", status: "planned" },
  { id: "people.nearby", short: "Nearby", moment: "afterwards", captures: "Schalter „Nearby“ (Einwilligung, aus): Your people sehen, wenn man in derselben Stadt ist oder dorthin reist – nur aus Houses, kein Standort", purpose: "Your people treffen sich wieder", models: [], legalBasis: "consent", status: "collecting" },
  { id: "people.inForMatch", short: "In-for-Treffer", moment: "afterwards", captures: "„I'm in for“-Übereinstimmungen zwischen Your people (Ort, Monat, Thema)", purpose: "„Plan it together“ – das nächste House mit den eigenen Leuten", models: ["crewFit"], legalBasis: "contract", status: "collecting" },
  { id: "host.program", short: "Programm", moment: "create", captures: "Tagesplan eines Pro Hosts (Tag, Zeit, Titel, Ort, kurze Beschreibung) und seine eigenen Bogen-Momente (Auftakt, Höhepunkt, Abschluss)", purpose: "Die Crew sieht das Programm; eigene Momente ersetzen Simpulos Karte", models: [], legalBasis: "contract", status: "collecting" },
  { id: "after.programme", short: "Programmnote", moment: "afterTheStay", captures: "Bewertung des Programms 1–5 und ein Satz dazu (nur Gäste eines Pro-House)", purpose: "Rückmeldung an den Host – Durchschnitt erst ab 3, Sätze ohne Namen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "settings.messages", short: "Wer schreibt", moment: "afterwards", captures: "„Who can message me“: Crew only · Your people · Everyone after a request", purpose: "Wer einen Direktchat beginnen darf", models: [], legalBasis: "contract", status: "collecting" },
  { id: "settings.notifications", short: "Hinweise", moment: "afterwards", captures: "Benachrichtigungen je Gruppe (E-Mail · Push · In-App) und Ruhezeiten", purpose: "Was einen wann erreicht", models: [], legalBasis: "contract", status: "collecting" },
  { id: "mkt.waitlist", short: "Liste (Mkt.)", moment: "marketing", captures: "Anmeldung zur Warteliste (E-Mail, Interessen, wo, wann, will hosten)", purpose: "Nachfrage vor dem Launch; Bescheid geben, wenn es losgeht", models: ["demandMap", "marketingImpact"], legalBasis: "consent", status: "used" },
  { id: "mkt.install", short: "Homescreen", moment: "marketing", captures: "App installiert (Homescreen)", purpose: "Wer erreichbar bleibt", models: [], legalBasis: "consent", status: "collecting" },

  // ── Support ("Help & feedback" → Admin › Support): purpose "support" only, never a model ──
  { id: "support.category", short: "Support-Art", moment: "support", captures: "Worum es geht: Frage, etwas ist kaputt, Idee, Sicherheit", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.message", short: "Support-Text", moment: "support", captures: "Ihre Nachricht (Freitext)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "moderation.contentReport", short: "Inhalt gemeldet", moment: "support", captures: "Öffentliches Formular /report-content: Link, Grund, Erklärung, E-Mail (auch ohne Konto)", purpose: "Hinweise auf rechtswidrige Inhalte bearbeiten, Bestätigung und Ergebnis an den Meldenden", models: [], legalBasis: "review", status: "collecting" },
  { id: "moderation.notice", short: "Begründung", moment: "support", captures: "Begründung eines Eingriffs: was, wann, Grund, Regel", purpose: "Die betroffene Person erfährt, warum – und kann widersprechen", models: [], legalBasis: "review", status: "collecting" },
  { id: "moderation.appeal", short: "Widerspruch", moment: "support", captures: "Widerspruch (Freitext) und Entscheidung", purpose: "Zweite Prüfung durch einen Menschen", models: [], legalBasis: "review", status: "collecting" },
  { id: "support.email", short: "Support-E-Mail", moment: "support", captures: "E-Mail für die Antwort (eingeloggt vorausgefüllt)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.context", short: "Kontext", moment: "support", captures: "Seite, House, Gerät, Bildschirmbreite und Phase zum Zeitpunkt (vor dem Senden gezeigt)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.screenshot", short: "Screenshot", moment: "support", captures: "Ein Screenshot, falls hinzugefügt", purpose: "support", models: [], legalBasis: "consent", status: "collecting" },
];

/** The data points a model reads – derived from DATA_POINTS, never listed twice. */
export const inputsOf = (model: ModelId) => DATA_POINTS.filter((d) => d.models.includes(model));

/** Never collected (Algorithmus › Datenpunkte shows the list): nothing here may ever become a data point. */
export const NEVER_COLLECTED: readonly string[] = ["Gesundheitsdaten", "Gesprochenes", "Gesprächsinhalte", "Sex und Romantik", "Kameras und Mikrofone", "Personen-Tracking im Raum"];
