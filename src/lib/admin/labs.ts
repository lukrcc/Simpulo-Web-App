// Admin › Wachstum › Labore (/admin/labore): every text and value of the page as data (German, admin only). The components only render it.
// The labs are Simpulo's fields of growth – from the marketplace (the foundation) over crew, arc and space (the core) and places, trust,
// life phases (extended) to community (the top); impact runs through all of them as a band. Positions on the map and the market sizes are
// estimates, never measurements ("Einschätzung", "keine Marktstudie").
import type { Moment } from "@/config/data-points";

export type LabLevel = "foundation" | "core" | "extended" | "top" | "band";
export type LabId = "marketplace" | "crew" | "arc" | "space" | "places" | "trust" | "phases" | "community" | "impact";
export type TestValue = "yes" | "no" | "open";
/** Where a lab stands: an idea, running (being tried), confirmed (the test holds), dropped. */
export type LabStatus = "idea" | "running" | "confirmed" | "dropped";
export const LAB_STATUSES: readonly LabStatus[] = ["idea", "running", "confirmed", "dropped"];

export interface Lab {
  id: LabId;
  number: number;
  name: string;
  level: LabLevel;
  question: string;
  data: string;
  internal: string;
  external: string;
  physical: string;
  /** "Ab wann" – only where the brief names it */
  from: string | null;
  /** Upper bound per year (theoretical) */
  ceiling: string;
  /** The five questions of the lab test, each yes / no / open – all start open */
  test: Record<TestKey, TestValue>;
  /**
   * Annahme (nicht aus der Vorgabe): which moments of config/data-points.ts feed this lab – derived from its "Daten" field, for the lines of
   * the tab Fluss. Change here when the real assignment is decided.
   */
  moments: readonly Moment[];
  /** Where the lab stands – "idea" for all until a decision says otherwise (no lab has been started or tested yet). */
  status: LabStatus;
  /** The next step – a short proposal for every lab (never "noch offen") */
  next: string;
  /** The same step in two or three words – one line on the lab's card */
  nextShort: string;
}

export type TestKey = "uniqueData" | "strengthensCore" | "littleCapital" | "littlePersonalData" | "payingBuyer";
export const TEST_KEYS: readonly TestKey[] = ["uniqueData", "strengthensCore", "littleCapital", "littlePersonalData", "payingBuyer"];
const OPEN_TEST: Record<TestKey, TestValue> = { uniqueData: "open", strengthensCore: "open", littleCapital: "open", littlePersonalData: "open", payingBuyer: "open" };

export const LABS: readonly Lab[] = [
  { id: "marketplace", number: 0, name: "Marktplatz", level: "foundation", question: "Wann wird ein House schnell voll?", data: "Preise, Orte, Themen, Anfragen, Vormerkungen", internal: "Preisvorschlag, Vorhersage, Frühwarnung, Explore-Reihenfolge", external: "Werkzeuge für Gruppenreisen", physical: "–", from: "ab dem ersten House", ceiling: "10–25 Mrd. €", test: OPEN_TEST, moments: ["search", "create", "request"], status: "running", next: "Frühwarnung an den ersten 50 Houses prüfen", nextShort: "Frühwarnung prüfen" },
  { id: "crew", number: 1, name: "Crew", level: "core", question: "Wer passt zusammen?", data: "–", internal: "Crew Engine, Houses aus Nachfrage", external: "Matching als Dienst (Unis, Coliving, Firmen, Senioren-WGs)", physical: "–", from: null, ceiling: "1–5 Mrd. €", test: OPEN_TEST, moments: ["onboarding", "request", "afterTheStay"], status: "idea", next: "Verbindungsrate je Crew-Mischung auswerten", nextShort: "Mischung auswerten" },
  { id: "arc", number: 2, name: "Bogen", level: "core", question: "Wie entsteht Verbindung?", data: "–", internal: "Bogen passt sich an", external: "Protokoll für Verbindung (Offsites, Einarbeitung, Konferenzen, Retreats, Klassen 18+)", physical: "Fragenkarten, Welcome-Box, Album", from: null, ceiling: "0,5–3 Mrd. €", test: OPEN_TEST, moments: ["inTheHouse", "afterTheStay"], status: "idea", next: "„Absicht erreicht“ nach 10 Houses auswerten", nextShort: "Absicht auswerten" },
  { id: "space", number: 3, name: "Raum", level: "core", question: "Welcher Raum verbindet?", data: "–", internal: "Hinweise für Hosts", external: "Musterbuch, Entwurfssoftware 2D/3D, Planung gegen Beteiligung", physical: "Tisch, Möbel, Simpulo-Räume, Hof", from: null, ceiling: "2–20 Mrd. €", test: OPEN_TEST, moments: ["create", "inTheHouse"], status: "idea", next: "Raum-Angaben von 20 Houses sammeln", nextShort: "Raum erfassen" },
  { id: "places", number: 4, name: "Orte", level: "extended", question: "Wo wollen Menschen zusammen sein?", data: "–", internal: "Landkarte der Nachfrage, Partnerhäuser", external: "Daten-Berichte für Regionen, leere Dörfer", physical: "Certified Places, Bus/Van, Boot", from: null, ceiling: "0,3–2 Mrd. €", test: OPEN_TEST, moments: ["search", "create"], status: "idea", next: "Nachfrage je Stadt mit der Warteliste abgleichen", nextShort: "Nachfrage abgleichen" },
  { id: "trust", number: 5, name: "Vertrauen", level: "extended", question: "Wem kann man vertrauen?", data: "–", internal: "Frühwarnung, Sicherheit", external: "Ruf als Mitbewohner als Dienst", physical: "–", from: null, ceiling: "0,2–1 Mrd. €", test: OPEN_TEST, moments: ["request", "afterTheStay", "support"], status: "idea", next: "Meldegründe der ersten 3 Monate sichten", nextShort: "Meldegründe sichten" },
  { id: "phases", number: 6, name: "Lebensphasen", level: "extended", question: "Wer braucht Menschen in einem Übergang?", data: "–", internal: "Houses für Neu in der Stadt, Ausland, Sprache, Ruhestand, Longevity", external: "Programme für Arbeitgeber, Unis, Sprachschulen", physical: "–", from: null, ceiling: "1–10 Mrd. €", test: OPEN_TEST, moments: ["onboarding", "search"], status: "idea", next: "Ein House „Neu in der Stadt“ testen", nextShort: "Test-House planen" },
  { id: "community", number: 7, name: "Gemeinschaft", level: "top", question: "Wie wird aus einer Crew ein Zuhause?", data: "–", internal: "Werkzeuge für Langzeit-Crews", external: "Genossenschaft, Betrieb", physical: "Festival, Stadthof, Dorf", from: null, ceiling: "5–50 Mrd. €", test: OPEN_TEST, moments: ["afterTheStay"], status: "idea", next: "Crews mit 2+ gemeinsamen Houses befragen", nextShort: "Crews befragen" },
  { id: "impact", number: 8, name: "Wirkung", level: "band", question: "Was bewirkt Simpulo?", data: "Verbindungsrate", internal: "–", external: "State of Connection, Forschung mit Universitäten", physical: "Album", from: null, ceiling: "unter 0,1 Mrd. € direkt", test: OPEN_TEST, moments: ["afterTheStay"], status: "idea", next: "30-Tage-Frage „noch in Kontakt“ auswerten", nextShort: "Kontakt auswerten" },
];

export const labOf = (id: LabId) => LABS.find((l) => l.id === id)!;

export const LABS_TEXT = {
  tabs: { pyramid: "Pyramide", map: "Karte", labs: "Labore", flow: "Fluss", potential: "Potenzial" },
  level: { foundation: "Fundament", core: "Kern", extended: "Erweitert", top: "Spitze", band: "Band" },
  fields: { level: "Ebene", question: "Frage", data: "Daten", internal: "Intern", external: "Extern", physical: "Physisch", from: "Ab wann", ceiling: "Obergrenze/Jahr", test: "Labor-Test" },
  test: { uniqueData: "einzigartige Daten?", strengthensCore: "stärkt den Kern?", littleCapital: "wenig Kapital?", littlePersonalData: "wenig persönliche Daten?", payingBuyer: "zahlender Käufer?" },
  testValue: { yes: "ja", no: "nein", open: "offen" },
  status: { idea: "Idee", running: "läuft", confirmed: "bestätigt", dropped: "verworfen" } satisfies Record<LabStatus, string>,
  pick: "Wähle links ein Labor.",
  /** Tab Pyramide */
  pyramid: {
    levels: [
      { level: "top", label: "SPITZE", labs: ["community"], line: "Zusammenleben nach Wahl, Wahlfamilien", role: "das Ziel", star: true },
      { level: "extended", label: "ERWEITERT", labs: ["places", "trust", "phases"], line: null, role: "sichern und öffnen das Wachstum", star: false },
      { level: "core", label: "KERN", labs: ["crew", "arc", "space"], line: null, role: "machen jedes House besonders", star: false },
      { level: "foundation", label: "FUNDAMENT", labs: ["marketplace"], line: "Houses füllen, Geld, Daten", role: "trägt alles", star: false },
    ] as const,
    band: "WIRKUNG: der Beweis auf jeder Stufe",
    sentence: "Gemeinschaft ist das Wofür, Marktplatz das Womit.",
    open: (name: string) => `${name} öffnen`,
  },
  /** Tab Karte */
  map: {
    x: "Nähe und Sicherheit",
    xFrom: "weit weg",
    xTo: "nah",
    y: "Potenzial",
    note: "Einschätzung",
    orderTitle: "Reihenfolge Bauen",
    order: [["crew", "arc"], ["trust", "places"], ["phases"], ["community", "space"]] as readonly (readonly LabId[])[],
    throughout: "Wirkung durchgehend",
  },
  /** Tab Fluss */
  flow: {
    data: "Daten",
    labs: "Labore",
    products: "Produkte",
    productKinds: { internal: "Intern", external: "Extern", physical: "Physisch" },
    treeTitle: "Physische Produkte",
    trunk: "Marktplatz (Stamm, digital)",
    sentence: "Je kleiner, desto früher. Je größer, desto mehr Beweis vorher.",
    assumption: "Linien Daten → Labore: Annahme aus dem Feld „Daten“ je Labor.",
  },
  /** Tab Potenzial */
  potential: {
    cols: { rank: "Rang", lab: "Labor", market: "Markt dahinter", earn: "Wie Simpulo verdient", ceiling: "Obergrenze/Jahr" },
    note: "Theoretische Obergrenzen, Schätzung, keine Marktstudie.",
  },
} as const;

/** Tab Karte: the labs as points – x "Nähe und Sicherheit" (0 weit weg → 1 nah), y "Potenzial" (0–1). An estimate, not measured. */
export const LAB_MAP: Record<LabId, { x: number; y: number }> = {
  marketplace: { x: 0.9, y: 0.8 },
  crew: { x: 0.85, y: 0.25 },
  arc: { x: 0.78, y: 0.18 },
  trust: { x: 0.55, y: 0.17 },
  places: { x: 0.48, y: 0.24 },
  phases: { x: 0.5, y: 0.5 },
  space: { x: 0.16, y: 0.84 },
  community: { x: 0.08, y: 0.95 },
  impact: { x: 0.92, y: 0.05 },
};

/** Tab Fluss, below it: the tree of physical products – the marketplace as the digital trunk, the branches by lab. */
export const PHYSICAL_TREE: readonly { lab: LabId; items: readonly string[]; note?: string }[] = [
  { lab: "arc", items: ["Karten", "Box", "Album"] },
  { lab: "space", items: ["Tisch", "Möbel", "Räume"] },
  { lab: "places", items: ["Certified Places", "Bus", "Boot"] },
  { lab: "community", items: ["Festival", "Stadthof", "Dorf"] },
  { lab: "impact", items: ["Album"], note: "Erinnerung" },
];

/** Tab Potenzial: by rank; the foundation (marketplace) on top, set apart. `from`/`to` in bn € for the log bar (null: below the axis). */
export const POTENTIAL: readonly { rank: number | null; lab: LabId; name?: string; market: string; earn: string; ceiling: string; from: number; to: number }[] = [
  { rank: null, lab: "marketplace", market: "–", earn: "–", ceiling: "10–25 Mrd. €", from: 10, to: 25 },
  { rank: 1, lab: "community", market: "Wohnen, die größte Ausgabe der meisten Menschen", earn: "kleiner Anteil an Miete und Kosten von Langzeit-Gemeinschaften", ceiling: "5–50 Mrd. €", from: 5, to: 50 },
  { rank: 2, lab: "space", market: "Bau von Wohnformen für Gemeinschaft: Coliving, Studenten-, Senioren-Wohnen", earn: "Entwurfs-Lizenzen, Beteiligung, Buchungen in neuen Gebäuden", ceiling: "2–20 Mrd. €", from: 2, to: 20 },
  { rank: 3, lab: "phases", market: "Umzug von Mitarbeitern, Studium im Ausland, Wohnen im Alter", earn: "Programme und Houses für Übergänge, bezahlt von Arbeitgebern, Unis, Bewohnern", ceiling: "1–10 Mrd. €", from: 1, to: 10 },
  { rank: 4, lab: "crew", name: "Crew (nach außen)", market: "Matching für Wohnheime, Coliving, Teams", earn: "Gebühr pro Zuordnung oder Abo", ceiling: "1–5 Mrd. €", from: 1, to: 5 },
  { rank: 5, lab: "arc", market: "Firmen-Offsites, Einarbeitung, Teamentwicklung", earn: "Lizenz für Abläufe, Schulung, Zertifizierung", ceiling: "0,5–3 Mrd. €", from: 0.5, to: 3 },
  { rank: 6, lab: "places", market: "Tourismus-Marketing, Standortanalyse", earn: "Daten-Berichte, Partnerschaften mit Regionen und Gemeinden", ceiling: "0,3–2 Mrd. €", from: 0.3, to: 2 },
  { rank: 7, lab: "trust", market: "Sicherheit und Identität im Teilen und Wohnen", earn: "Vertrauens-Dienst für andere Plattformen und Vermieter", ceiling: "0,2–1 Mrd. €", from: 0.2, to: 1 },
  { rank: 8, lab: "impact", market: "Forschung, Stiftungen", earn: "Fördergelder, Partnerschaften", ceiling: "unter 0,1 Mrd. € direkt, großer indirekter Wert für Marke und Vertrauen", from: 0.02, to: 0.1 },
];
