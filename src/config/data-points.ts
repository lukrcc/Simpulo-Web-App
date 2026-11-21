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
  { id: "profile.houseVibe", moment: "onboarding", captures: "Vier Fragen mit je drei Antwort-Kacheln, jede überspringbar: Frühaufsteher · dazwischen · Nachteule, ruhig · ausgeglichen · gesellig, aktiv · dazwischen · entspannt, ordentlich · ziemlich ordentlich · locker", purpose: "Wie sie zusammenleben", models: ["crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "profile.communityNeed", moment: "onboarding", captures: "„How much community do you need?“ – wenig · etwas · viel (Edit profile › Vibe, auch im Onboarding)", purpose: "Houses in passender Tiefe höher sortieren (nie ausschließen)", models: ["interestRanking"], legalBasis: "consent", status: "planned" },
  { id: "profile.socials", moment: "onboarding", captures: "Öffentliche Social-Links, die sie eintragen", purpose: "Auf dem Profil gezeigt; Vertrauen", models: [], legalBasis: "consent", status: "collecting" },

  // ── Search ──
  { id: "search.placeMonth", moment: "search", captures: "Auf Explore gesuchter Ort und Monat", purpose: "Wohin und wann Leute wollen", models: ["demandMap", "interestRanking", "placeFit"], legalBasis: "consent", status: "collecting" },
  { id: "search.category", moment: "search", captures: "Gewählte Kategorie und Filter", purpose: "Welche Themen Leute suchen", models: ["interestRanking", "demandMap"], legalBasis: "consent", status: "collecting" },
  { id: "search.saved", moment: "search", captures: "Gespeicherte Suchen (Ort, Monat, Kategorie)", purpose: "Zuerst Bescheid geben, wenn ein House öffnet; Nachfrage ohne Angebot", models: ["demandMap", "placeFit"], legalBasis: "consent", status: "used" },
  { id: "search.inFor", moment: "search", captures: "„I'm in for“: Ort, Monate, Dauer, Kategorien", purpose: "Hosts sehen, wer käme; Nachfrage ohne Angebot", models: ["demandMap", "crewFit", "placeFit"], legalBasis: "consent", status: "collecting" },
  { id: "search.cardClick", moment: "search", captures: "Welche House-Karten geöffnet werden, aus welcher Reihe", purpose: "Welche Vorschläge funktionieren", models: ["interestRanking"], legalBasis: "consent", status: "planned" },
  { id: "search.saveHouse", moment: "search", captures: "Gemerkte Houses (Herz)", purpose: "Interesse vor einer Anfrage", models: ["interestRanking"], legalBasis: "contract", status: "collecting" },

  // ── Create ──
  { id: "create.category", moment: "create", captures: "Kategorie des House (oder eigenes Label)", purpose: "Welche Themen Hosts eröffnen", models: ["demandMap", "interestRanking"], legalBasis: "contract", status: "used" },
  { id: "create.placeMonth", moment: "create", captures: "Ort und Monate des House", purpose: "Angebot je Ort und Monat", models: ["demandMap", "placeFit"], legalBasis: "contract", status: "used" },
  { id: "create.crewPrice", moment: "create", captures: "Crew-Größe, Preis oder Budget pro Person", purpose: "Was bei welcher Größe und welchem Preis voll wird", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.hostFee", moment: "create", captures: "Host-Gebühr pro Gast (Pro Hosts)", purpose: "Pro gegen Share Hosts; Einnahmen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "host.tier", moment: "create", captures: "Host-Stufe: Share, Pro oder Anchor (vorgeschlagen nach Host-Gebühr und Followern, vom Team gesetzt)", purpose: "Welche Hosts Angebot, Umsatz und Reichweite bringen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "host.audienceSize", moment: "create", captures: "Follower über die Links, die ein Host (Bewerber) angibt", purpose: "Anchor-Stufe vorschlagen; Reichweite eines Hosts", models: [], legalBasis: "consent", status: "collecting" },
  { id: "host.taxId", moment: "create", captures: "Steuer-ID des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt (Plattformen melden Verkäufer)", models: [], legalBasis: "contract", status: "planned" },
  { id: "host.address", moment: "create", captures: "Anschrift des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt", models: [], legalBasis: "contract", status: "planned" },
  { id: "host.birthDate", moment: "create", captures: "Geburtsdatum des Hosts (DAC7), bei der Einrichtung der Auszahlungen", purpose: "DAC7-Meldung an das Finanzamt", models: [], legalBasis: "contract", status: "planned" },
  { id: "create.accommodationType", moment: "create", captures: "Art des Ortes: Kategorie und Typ (Villa, Coliving, Surfcamp …, config/accommodation.ts) – in Open a House, „Where will you live?“; „Not sure yet“ speichert keinen", purpose: "Welche Orte voll werden, wo wir bauen", models: ["demandMap", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.placeMode", moment: "create", captures: "Ort gebucht oder gemeinsam gewählt", purpose: "Welcher Weg schneller voll wird", models: [], legalBasis: "contract", status: "collecting" },
  // Raum-Daten beim Eröffnen – optional, über den Ort, keine Personendaten (Raum-Wirkung, These „Der Raum ist fast egal“)
  { id: "create.space.table", moment: "create", captures: "Tischposition (Mitte · Rand · keiner)", purpose: "Ob ein Tisch in der Mitte verbindet", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.seats", moment: "create", captures: "Plätze am größten Tisch", purpose: "Ob alle an einen Tisch passen", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.kitchen", moment: "create", captures: "Küche offen oder getrennt", purpose: "Ob eine offene Küche verbindet", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.paths", moment: "create", captures: "Wege zum Bad über den gemeinsamen Raum (ja/nein)", purpose: "Ob Wege durch die Mitte Begegnung erzeugen", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.retreat", moment: "create", captures: "Rückzugsort vorhanden (ja/nein)", purpose: "Ob Rückzug das Wohlfühlen hält", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.rooms", moment: "create", captures: "Eigene oder geteilte Zimmer", purpose: "Ob eigene oder geteilte Zimmer mehr verbinden", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.outdoor", moment: "create", captures: "Außenfläche (keine · Balkon · Garten · Hof)", purpose: "Ob draußen zusammen sein verbindet", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.area", moment: "create", captures: "Fläche pro Person (m²)", purpose: "Enge gegen Weite", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.daylight", moment: "create", captures: "Tageslicht im gemeinsamen Raum (wenig · mittel · viel)", purpose: "Ob Licht den gemeinsamen Raum nutzt", models: ["spaceEffect"], legalBasis: "none", status: "planned" },
  { id: "create.space.setting", moment: "create", captures: "Lage (Stadt · Rand · Land)", purpose: "Welche Lage verbindet und wo Höfe passen", models: ["spaceEffect", "placeFit"], legalBasis: "none", status: "planned" },
  // Später, mit Sensoren – vorher rechtlich prüfen; nie Kameras, Mikrofone oder Personen-Tracking
  { id: "sensor.roomUse", moment: "inTheHouse", captures: "Anonyme Raumnutzung (Sensor)", purpose: "Welche Räume genutzt werden – Räume messen, nie Menschen", models: ["spaceEffect"], legalBasis: "review", status: "planned" },
  { id: "sensor.noise", moment: "inTheHouse", captures: "Lärmpegel ohne Ton (Sensor)", purpose: "Lautstärke im House, ohne Aufnahme", models: ["spaceEffect"], legalBasis: "review", status: "planned" },
  { id: "create.placeOrigin", moment: "create", captures: "Ort-Herkunft des House: eigener gespeicherter Ort (Fenster, Stay.placeId) oder neuer Ort", purpose: "Ob Hosts aus ihrem Zuhause schneller voll werden und wiederkommen; Fenster pro Ort (Admin › Analyse › Ort-Herkunft)", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "place.saved", moment: "create", captures: "Gespeicherter Ort, in dem der Host wohnt: Art des Ortes, Fotos, Zimmer, freie Plätze, Regeln, Ort (Stadt, Region; Straße nur für den Host), Mietzeitraum von–bis, Monatsmiete + Währung", purpose: "Fenster daraus öffnen (vorausgefüllt), Preis anteilig nach Nächten (lib/price.ts)", models: [], legalBasis: "contract", status: "collecting" },
  { id: "place.allowedToHost", moment: "create", captures: "Bestätigung des Hosts „I'm allowed to host guests here“ (Untervermietung bzw. Gäste vom Vermieter und nach örtlichen Regeln erlaubt) mit Zeitpunkt – Pflicht zum Speichern eines Ortes, von Simpulo nicht geprüft", purpose: "Nachweis der eigenen Erklärung des Hosts", models: [], legalBasis: "contract", status: "collecting" },
  { id: "create.depth", moment: "create", captures: "Soziale Tiefe des House: Easy · Balanced · Deep (config/depth.ts), in Open a House; nach der ersten Buchung fest", purpose: "Passende Gäste finden; welche Tiefe voll wird und wiederkommt (Admin › Analyse › Tiefe)", models: ["interestRanking", "houseChemistry"], legalBasis: "contract", status: "planned" },

  // ── Request ──
  { id: "request.sent", moment: "request", captures: "Anfrage (House, Zeitpunkt, mit Freund)", purpose: "House betreiben; welche Vorschläge zu Anfragen führen", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "ask.beforeRequest", moment: "request", captures: "Nachrichten des Gasts an den Host zu einem House vor seiner Anfrage (nur die Anzahl, kein Inhalt)", purpose: "Ob Fragen vor der Anfrage helfen", models: [], legalBasis: "contract", status: "planned" },
  { id: "ask.toRequest", moment: "request", captures: "Ob ein Direktchat zu einem House später zu einer Anfrage desselben Gasts führt", purpose: "Wie oft Fragen an den Host zu einer Anfrage führen", models: [], legalBasis: "contract", status: "planned" },
  { id: "request.note", moment: "request", captures: "Ob eine Anfrage eine Notiz an den Host hat (nur ja/nein, kein Inhalt)", purpose: "Wie viele Gäste dem Host etwas mitgeben", models: [], legalBasis: "contract", status: "planned" },
  { id: "request.answer", moment: "request", captures: "Antwort des Hosts: angenommen, passt nicht, abgelaufen", purpose: "House betreiben; wen Hosts annehmen", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "request.reserved", moment: "request", captures: "Platz vorgemerkt (Beta, ohne Zahlung)", purpose: "Nachfrage vor dem Launch", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "request.timeToFull", moment: "request", captures: "Zeit von der Eröffnung bis zur vollen Crew", purpose: "Wie schnell Houses voll werden", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "request.payment", moment: "request", captures: "Zahlung (Betrag, Datum – keine Kartendaten)", purpose: "House betreiben; Auszahlungen", models: [], legalBasis: "contract", status: "collecting" },
  { id: "app.installed", moment: "inTheHouse", captures: "Simpulo installiert: Gerät (iPhone · Android), Zeitpunkt, woher (ref/src, z. B. src=qr der Karten im House) – kein Gerätekennzeichen", purpose: "Installationsrate der Gäste mit Buchung (Admin › Wachstum); welche Momente und Karten zur Installation führen", models: [], legalBasis: "contract", status: "planned" },

  // ── In the house ──
  { id: "stay.arrived", moment: "inTheHouse", captures: "Angekommen (Check-in bestätigt)", purpose: "Wer wirklich kam", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.leftEarly", moment: "inTheHouse", captures: "Vor dem Ende abgereist (Datum)", purpose: "Frühe Abreisen als Warnsignal", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.report", moment: "inTheHouse", captures: "Meldungen und „Something went wrong“-Fälle (Kategorie, kein Chat-Inhalt)", purpose: "Sicherheit; ein House, das nicht funktioniert", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  // Der Bogen (config/arc.ts): nur Signale – welche Karte, welcher Schritt, wann. Nie, was jemand geschrieben oder gesagt hat.
  // House Memories (das Album): nur Zahlen und Zustimmungen – nie Bildinhalte, nie Gesichter, keine Standortdaten (beim Hochladen entfernt).
  { id: "memory.uploaded", moment: "inTheHouse", captures: "Fotos/Clips ins Album geladen (Anzahl, Art, House) – ohne Standortdaten", purpose: "Wie lebendig ein House ist; Album", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "memory.crewConsent", moment: "inTheHouse", captures: "„Everyone in this photo is okay with the crew seeing it“ bestätigt (Pflicht beim Hochladen)", purpose: "Nachweis der Zustimmung", models: [], legalBasis: "consent", status: "collecting" },
  { id: "memory.simpuloUse", moment: "inTheHouse", captures: "„Simpulo may use this for Simpulo's own posts“ (optional, Standard aus) – je Datei", purpose: "Marketing nur mit Freigabe (Admin › Marketing › Content)", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "memory.removed", moment: "inTheHouse", captures: "Datei entfernt – von der hochladenden Person oder „Remove me“ (ohne Grund, ohne Person)", purpose: "Ob Zustimmung im Alltag hält", models: [], legalBasis: "contract", status: "collecting" },
  { id: "arc.cardSeen", moment: "inTheHouse", captures: "Simpulo-Karte im House-Chat gesehen (Schritt-Id, House, Zeitpunkt)", purpose: "Welche Schritte ankommen; Zeitpunkte des Bogens", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "arc.actionDone", moment: "inTheHouse", captures: "Aktion eines Bogen-Schritts ausgeführt (Schritt-Id, House, Zeitpunkt) – ohne Inhalt", purpose: "Welche Schritte Crews nutzen; Bogen verbessern", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "arc.stepSkipped", moment: "inTheHouse", captures: "Bogen-Schritt übersprungen oder Tipps stummgeschaltet (Schritt-Id, House)", purpose: "Welche Schritte stören; weniger, bessere Karten", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },

  // ── After the stay (the rating: its own form, a later prompt) ──
  { id: "after.livedWith", moment: "afterTheStay", captures: "„Lived with“ bestätigt, in beide Richtungen", purpose: "Your people; Vertrauen", models: ["crewFit", "houseChemistry", "placeFit"], legalBasis: "contract", status: "used" },
  { id: "after.doItAgain", moment: "afterTheStay", captures: "„Do it again“ gestartet", purpose: "Houses, die es wert sind, wiederholt zu werden", models: ["houseChemistry", "placeFit"], legalBasis: "contract", status: "collecting" },
  { id: "after.rating", moment: "afterTheStay", captures: "Gesamtbewertung (1–5)", purpose: "Qualität des House", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.crewMood", moment: "afterTheStay", captures: "Stimmung in der Crew (1–5)", purpose: "Die soziale Seite des House", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.tidiness", moment: "afterTheStay", captures: "Ordnung (1–5)", purpose: "Zusammenleben; Abgleich mit den Vibe-Reglern", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "after.noise", moment: "afterTheStay", captures: "Lautstärke (1–5)", purpose: "Zusammenleben; Abgleich mit den Vibe-Reglern", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "after.together", moment: "afterTheStay", captures: "Gemeinsame Aktivitäten (wie viel die Crew zusammen gemacht hat)", purpose: "Ob aus einer Crew eine Gruppe wurde", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.again", moment: "afterTheStay", captures: "„Mit wem würdest du wieder wohnen?“ (Personen aus der Crew, privat; sichtbar nur gegenseitig)", purpose: "Gegenseitiges „wieder“ – das stärkste Zeichen für Passung; nie als öffentliche Kennzahl", models: ["crewFit", "houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.mutual", moment: "afterTheStay", captures: "Gegenseitige Wahl (Paar, House) – beide werden Your people", purpose: "Your people; Passung", models: ["crewFit", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.intentionReached", moment: "afterTheStay", captures: "„Did you reach your intention?“ Yes · Partly · No (privat)", purpose: "Ob ein House wirkt – nur als Zahl", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.sentence", moment: "afterTheStay", captures: "Ein freier Satz an den Host (optional; nur der Host liest ihn) – erfasst wird nur, ob es ihn gibt", purpose: "Rückmeldung an den Host – keine Auswertung", models: [], legalBasis: "consent", status: "collecting" },
  { id: "after.tip", moment: "afterTheStay", captures: "Tipp für die nächste Crew geschrieben (ja/nein) und öffentlich freigegeben (ja/nein) – nie der Text", purpose: "Wie oft Gäste etwas weitergeben", models: [], legalBasis: "consent", status: "collecting" },
  { id: "after.nextIdea", moment: "afterTheStay", captures: "„One idea for your next House“ angegeben (ja/nein) – der Text bleibt privat", purpose: "Signal für Interessen-Ranking (wer wieder will)", models: ["interestRanking"], legalBasis: "consent", status: "collecting" },
  { id: "after.doItAgainTogether", moment: "afterTheStay", captures: "„Open the next one together“ geöffnet (nach gegenseitiger Wahl, +7 Tage)", purpose: "Ob aus einer Crew das nächste House wird (Gast wird Host)", models: ["crewFit", "houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.inTouch30", moment: "afterTheStay", captures: "Nach 30 Tagen noch in Kontakt mit jemandem aus der Crew (ja/nein)", purpose: "Ob Verbindungen halten – Kennzahl „noch in Kontakt“", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "after.still30", moment: "afterTheStay", captures: "„What's one thing you still do since the House?“ beantwortet (ja/nein) – der Text bleibt privat", purpose: "Ob ein House nachwirkt – nur als Zahl", models: ["houseChemistry"], legalBasis: "consent", status: "collecting" },
  { id: "after.story", moment: "afterTheStay", captures: "Als Geschichte geteilt (ja/nein) – öffentlich nur mit Zustimmung, Text sichtbar auf den House-Seiten des Hosts", purpose: "Freigegebene Geschichten auf House-Seiten", models: [], legalBasis: "consent", status: "collecting" },
  { id: "arc.closingLed", moment: "inTheHouse", captures: "Pro Host leitet die Abschlussrunde selbst (ja/nein)", purpose: "Wie Pro Hosts den Abschied gestalten", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.nextHouseBetter", moment: "afterTheStay", captures: "„What would make your next House better?“ – optional in der Bewertung; landet als Idee im Support (Kategorie idea)", purpose: "support", models: [], legalBasis: "consent", status: "planned" },
  // Der Ort im Rückblick – optional, mit Einwilligung (Raum-Wirkung)
  { id: "after.space.where", moment: "afterTheStay", captures: "„Wo habt ihr am meisten Zeit zusammen verbracht?“ (Raumwahl)", purpose: "Welcher Raum wirklich verbindet", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  { id: "after.space.feel", moment: "afterTheStay", captures: "„Wie hat sich der Ort angefühlt?“ (Wortkacheln)", purpose: "Wie ein Raum wirkt, in Worten", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  { id: "after.space.wellbeing", moment: "afterTheStay", captures: "Wohlfühlen (1–5)", purpose: "Verbindung ohne Wohlfühlen zu senken", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  { id: "after.space.retreat", moment: "afterTheStay", captures: "„Konnte ich mich zurückziehen?“ (ja/nein)", purpose: "Ob Rückzug gefehlt hat", models: ["spaceEffect"], legalBasis: "consent", status: "planned" },
  // Danach
  { id: "afterwards.moai", moment: "afterwards", captures: "Crew trifft sich wieder (Moai, jährlich)", purpose: "Ob aus einer Crew ein Kreis wird", models: [], legalBasis: "consent", status: "planned" },

  // ── Marketing ──
  { id: "mkt.src", moment: "marketing", captures: "?src= des Links, über den sie kamen (erster Kontakt)", purpose: "Welcher Kanal Leute bringt", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.utm", moment: "marketing", captures: "utm_source / medium / campaign", purpose: "Welche Kampagne Leute bringt", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.video", moment: "marketing", captures: "Serie und Folge im Link (?src=serie-folge)", purpose: "Welche Serie und welches Video funktioniert", models: ["marketingImpact"], legalBasis: "consent", status: "planned" },
  { id: "mkt.referral", moment: "marketing", captures: "Wer den Link geteilt hat (ref) – bei Einladungen der Ersteller des Links (?ref={userId}&src=invite), beim Beitritt an der Mitgliedschaft gespeichert", purpose: "Mundpropaganda; Einladungen", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
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

/** Never collected (Algorithmus › Datenpunkte shows the list): nothing here may ever become a data point. */
export const NEVER_COLLECTED: readonly string[] = ["Gesundheitsdaten", "Gesprochenes", "Gesprächsinhalte", "Sex und Romantik", "Kameras und Mikrofone", "Personen-Tracking im Raum"];
