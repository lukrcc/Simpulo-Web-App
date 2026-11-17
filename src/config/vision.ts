// Admin › Vision ("Wohin geht Simpulo?") – EVERY text of the page, in German (the admin is German, CLAUDE.md "Admin"), in one place to
// edit by hand. English stays only for the product terms (House, Host, Crew, Your people …). Content only from the founders' brief:
// no revenue source, stage or criterion is added here that isn't in it. The numbers (revenue this month, the move, full Houses per hub, the
// current phase) come from lib/admin/metrics.ts – never from here.

export const VISION_TITLE = "Vision";
export const YOU_ARE_HERE = "Du bist hier";
export const NOT_MEASURABLE = "noch nicht messbar";

/** First row: the whole picture and the four phases. */
export const PHASE_TABS = [
  { key: "overview", label: "Gesamtbild" },
  { key: "p1", label: "1 Deutschland" },
  { key: "p2", label: "2 Ausland" },
  { key: "p3", label: "3 Nach der Runde" },
  { key: "p4", label: "4 Immobilien & Ausstieg" },
] as const;
/** Second, smaller row "Bausteine": pages to look things up. */
export const BUILDING_TABS = [
  { key: "core", label: "Kern" },
  { key: "segments", label: "Zielgruppen" },
  { key: "tModel", label: "T-Modell" },
  { key: "continuum", label: "Kontinuum" },
  { key: "roadmap", label: "Roadmap" },
  { key: "hosts", label: "Hosts" },
  { key: "places", label: "Orte & Anreise" },
  { key: "location", label: "Standort" },
  { key: "tech", label: "Technik" },
] as const;
export const BUILDING_LABEL = "Bausteine";
export type VisionTab = (typeof PHASE_TABS)[number]["key"] | (typeof BUILDING_TABS)[number]["key"];
export type PhaseKey = "p1" | "p2" | "p3" | "p4";

/** Ganz oben im Gesamtbild: der Leitsatz. */
export const MOTTO = {
  line: "Simpulo verkauft verdichtete Zeit mit den richtigen Menschen.",
  sub: "Zwei Wochen, die sich anfühlen wie ein Jahr Freundschaft.",
} as const;

// ── Kern: was Simpulo verkauft ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Vision › Kern. Oben der Leitsatz (MOTTO), dann vier Teile, Grafik vor Text: (a) 200 Stunden – Alltag gegen House, (b) drei Säulen mit
 * Live-Zahl (lib/admin/metrics.ts coreMetrics), (c) der Bogen eines House in fünf Phasen und die drei Tiefen, (d) das Netzwerk als Kreise,
 * der Kreislauf und „Einladen“; darunter klein die Regeln.
 */
export const CORE = {
  hours: {
    title: "200 Stunden",
    /** Monate auf der Skala der Grafik (Alltag bis 2 Jahre) */
    scaleMonths: 24,
    everyday: { label: "Alltag", text: "200 Stunden in 1–2 Jahren", fromMonths: 12, toMonths: 24 },
    house: { label: "House", text: "200 Stunden in 2 Wochen", months: 0.5 },
    axis: ["0", "6 Monate", "1 Jahr", "18 Monate", "2 Jahre"],
    source: "Jeffrey Hall, 2018",
  },
  pillars: {
    title: "Drei Säulen",
    items: [
      { key: "matching", title: "Matching", text: "richtige Menschen" },
      { key: "arc", title: "Bogen eines House", text: "Zeit wirkt" },
      { key: "network", title: "Netzwerk", text: "Verbindung bleibt" },
    ],
  },
  live: {
    matching: { label: "Matching-Erfolg", sub: "gegenseitig „Mit dir wieder“", example: "Beispielwert – Bewertung folgt", info: "Anteil der Paare aus einer Crew, die nach dem Aufenthalt beide „Mit dir wieder“ gesagt haben." },
    arc: { label: "Houses mit Abschlussrunde", notMeasured: "noch nicht gemessen", info: "Houses, deren Abschlussrunde abgeschlossen ist – die Abschlussrunde wird noch gebaut." },
    network: {
      label: "Your-people-Verbindungen",
      share: (pct: string) => `${pct} der Buchungen über Your people oder Einladung`,
      info: "Gegenseitig bestätigte „Lived with“-Paare; darunter der Anteil der Buchungen, die über eine Einladung oder über Your people (jemand aus Your people war schon im House) kamen.",
    },
  },
  arc: {
    title: "Bogen eines House",
    /**
     * ⚠ Platzhalter: die Stichworte sollen aus dem Dokument kommen (lag dem Auftrag nicht bei) – bis dahin aus dem, was die App heute
     * schon tut. Je Phase 2–3 Stichworte; hier ersetzen.
     */
    placeholder: "Stichworte vorläufig – aus dem Dokument übernehmen",
    phases: [
      { key: "before", title: "Vorher", points: ["Crew-Chat öffnet", "Ort gemeinsam wählen", "Erwartungen klären"] },
      { key: "arrive", title: "Ankommen", points: ["Erster Abend zusammen", "Hausregeln", "Namen und Geschichten"] },
      { key: "middle", title: "Mittendrin", points: ["Gemeinsamer Tagesrhythmus", "Eigene Projekte", "Kleine Rituale"] },
      { key: "farewell", title: "Abschied", points: ["Letzter Abend", "Rückblick in der Crew"] },
      { key: "after", title: "Danach", points: ["„Lived with“ bestätigen", "Your people", "Do it again"] },
    ],
    depthsTitle: "Drei Tiefen",
    /** Aus config/depth.ts (dort die Bausteine je Stufe); der Hinweis, solange config/platform.ts depthChoiceEnabled aus ist */
    depths: [
      { key: "easy", title: "Easy", text: "Zusammen wohnen, kein Programm" },
      { key: "balanced", title: "Balanced", text: "Ein paar gute Momente" },
      { key: "deep", title: "Deep", text: "Fragen, Absichten, ein echter Abschlussabend" },
    ],
    depthsOff: "zum Launch aus",
    depthsOn: "an",
  },
  network: {
    title: "Netzwerk",
    /** Von außen nach innen: je näher, desto enger */
    circles: [
      { key: "saved", title: "Gemerkt", text: "privat" },
      { key: "livedWith", title: "Lived with", text: "automatisch" },
      { key: "people", title: "Your people", text: "gegenseitig" },
    ],
    crew: { title: "Crew", text: "die Gruppe eines House" },
    loopTitle: "Kreislauf",
    loop: ["House", "Your people", "sehen, wohin du gehst", "buchen dazu", "neues House"],
    inviteTitle: "Einladen",
    invite: ["Share", "Link", "QR", "Your people", "mehrere Plätze"],
    inviteLive: { label: "Buchungen über Einladungen", info: "Gäste, die über einen Einladungslink, die Einladung aus „Invite friends“ oder die Anfrage mit einem Freund gebucht haben." },
  },
  rules: ["Verbindungen nur durch gemeinsames Wohnen", "Keine Follower, kein Feed", "Listen privat, andere sehen nur Zahlen", "Gesprochenes wird nie gespeichert"],
} as const;

// ── Sources: status and measure ─────────────────────────────────────────────────────────────────────────────────────────────────

export const SOURCE_STATUSES = ["live", "prepared", "idea"] as const;
/** live – earning now · prepared – the product has the groundwork · idea – not built */
export type SourceStatus = (typeof SOURCE_STATUSES)[number];
export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = { live: "live", prepared: "vorbereitet", idea: "Idee" };
/** The legend: "2 live · 13 Ideen" */
export const sourceCount = (count: number, status: SourceStatus) => `${count} ${status === "idea" && count !== 1 ? "Ideen" : SOURCE_STATUS_LABEL[status]}`;

/** The two sources Simpulo earns from today – their revenue this month is measured (lib/admin/metrics.ts revenueBySource). */
export type RevenueMeasure = "serviceFee" | "hostFeeShare";

export interface Source {
  name: string;
  status: SourceStatus;
  /** Live sources only */
  measure?: RevenueMeasure;
}

const live = (name: string, measure: RevenueMeasure): Source => ({ name, status: "live", measure });
/** Everything not live is an idea until the brief says otherwise. */
const idea = (name: string): Source => ({ name, status: "idea" });

// ── T-Model ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const T_MODEL = {
  breadth: {
    title: "Breite – dieselbe Mechanik für mehr Menschen",
    fields: [
      { title: "Themen", text: "Fitness, Surf, Founder, Creator" },
      { title: "Zielgruppen", text: "Studierende, Familien, Firmen" },
      { title: "Orte", text: "Hubs nach Nachfrage" },
      { title: "Dauer", text: "1 Tag bis 10 Monate" },
      { title: "Formate", text: "Wohnen, Events, Offsites, Mitgliedschaft" },
    ],
  },
  depth: {
    title: "Tiefe – mehr von der Kette",
    /** From the top; `active`: Simpulo does this step today */
    steps: [
      { title: "Entdecken", text: "Explore, Suche", active: true },
      { title: "Matching", text: "Algorithmus", active: true },
      { title: "Buchen & zahlen", text: "Stripe, Anzahlung", active: true },
      { title: "Unterkunft", text: "extern, später eigene", active: false },
      { title: "Leben im House", text: "Hauskasse, Services", active: false },
      { title: "Gebäude", text: "Simpulo Houses", active: false },
      { title: "Kapital", text: "Simpulo-Fonds", active: false },
    ],
    active: "aktiv",
  },
  /** The arrow from breadth to depth step 6 (1-based) */
  arrow: { toStep: 6, text: "Daten zeigen, wo wir bauen" },
  matrix: {
    phases: ["Pre-Launch", "Launch", "Wachstum", "Skalierung", "Voll"],
    rows: [
      { title: "Houses", cells: ["10 Show-Houses", "20–30", "~100", "~500", "1.000+"] },
      { title: "Themen", cells: ["Fitness, Founder, Creator", "gleich", "+ Remote work, Surf, Wellness, Social", "+ Studierende, Familien, Offsites", "alle, ~50"] },
      { title: "Orte", cells: ["Bali, Lissabon", "Bali, Lissabon", "8–10 Hubs", "30+ Länder", "weltweit"] },
      { title: "Unterkunft", cells: ["Warteliste", "extern gebucht", "Partner-Houses", "Simpulo Houses", "Flagships"] },
      { title: "Umsatz", cells: ["keiner", "Servicegebühr, Anteil an der Host-Gebühr", "+ Partner, Host-Abo", "+ Mitgliedschaft, B2B, Services", "+ Lizenzen, Fonds"] },
    ],
  },
} as const;

/**
 * Which matrix phase Simpulo is in (lib/admin/metrics.ts visionPhase): pre-launch while the platform phase is pre-launch, then by real
 * Houses against the "Houses" row – from 100 Growth, from 500 Scale, from 1,000 Full, else Launch.
 */
export const MATRIX_HOUSES_FROM = { growth: 100, scale: 500, full: 1000 } as const;

// ── Phases (Gesamtbild and the phase tabs) ──────────────────────────────────────────────────────────────────────────────────────

/** The lanes of the whole picture, top to bottom. */
export const LANES = [
  { key: "segments", label: "Zielgruppen" },
  { key: "revenue", label: "Einnahmen" },
  { key: "places", label: "Orte" },
  { key: "hosts", label: "Hosts" },
  { key: "structure", label: "Struktur" },
] as const;
export type LaneKey = (typeof LANES)[number]["key"];
export const UNLOCK_LANE_LABEL = "Freigabe";

/**
 * A lane's entry. `segment` / `category` / `measure` link it to the details shown in the phase tab (Zielgruppen numbers, the kind of place,
 * this month's revenue) – no new content, only what is already in this file and config/accommodation.ts.
 */
export interface LaneItem {
  label: string;
  segment?: string;
  category?: string;
  measure?: RevenueMeasure;
}

export interface Phase {
  key: PhaseKey;
  number: number;
  title: string;
  /** The goal ("Kern beweisen"); null where the brief names none */
  goal: string | null;
  /** Items in lanes after the first phase are additions ("+") – except where marked `plus: false` */
  lanes: Record<LaneKey, { plus: boolean; items: readonly LaneItem[] }>;
  /** What opens the next phase (the diamond after this one); null = the last */
  unlock: { label: string; measure: "move" | null } | null;
  /** Numbers that count in this phase (Phase 1 only so far) */
  metrics: readonly ("fullHouses" | "profit" | "repeat")[];
  /** The steps of breadth (H) and depth (V) that fall into this phase (BREADTH_DEPTH) */
  takt: readonly string[];
}

export const PHASE_NOW: PhaseKey = "p1";

export const PHASES: readonly Phase[] = [
  {
    key: "p1",
    number: 1,
    title: "Deutschland",
    goal: "Kern beweisen",
    lanes: {
      segments: { plus: false, items: [{ label: "Kern", segment: "core" }, { label: "Kurztrips", segment: "short" }, { label: "Lokal", segment: "local" }] },
      revenue: { plus: false, items: [{ label: "Servicegebühr", measure: "serviceFee" }, { label: "Anteil Host-Fee", measure: "hostFeeShare" }] },
      places: { plus: false, items: [{ label: "Klassisch", category: "classic" }, { label: "Coliving", category: "liveWork" }, { label: "Ganz gemietet", category: "buyout" }, { label: "Programm-Orte", category: "program" }] },
      hosts: { plus: false, items: [{ label: "Share" }, { label: "Pro" }, { label: "1–2 Anchor (Creator-Collab-House)" }] },
      structure: { plus: false, items: [{ label: "Einzelunternehmen" }] },
    },
    unlock: { label: "5.000 € × 6 Monate", measure: "move" },
    metrics: ["fullHouses", "profit", "repeat"],
    takt: ["H1", "H2", "V1"],
  },
  {
    key: "p2",
    number: 2,
    title: "Ausland",
    goal: "Breite zünden",
    lanes: {
      segments: { plus: true, items: [{ label: "Lebensumbrüche", segment: "transitions" }, { label: "50+", segment: "older" }, { label: "Studierende", segment: "students" }] },
      revenue: { plus: true, items: [{ label: "Host-Abo" }, { label: "Hervorhebung" }, { label: "Mitgliedschaft" }, { label: "B2B" }, { label: "Partner" }, { label: "Brand-Houses" }, { label: "Curated by" }] },
      places: { plus: true, items: [{ label: "Natur", category: "nature" }, { label: "Regional", category: "regional" }, { label: "Wasser", category: "water" }, { label: "gemeinsame Anreise" }] },
      hosts: { plus: true, items: [{ label: "Host-Kreis" }] },
      structure: { plus: false, items: [{ label: "Firma im Ausland" }] },
    },
    unlock: { label: "Zahlen überzeugen Investoren", measure: null },
    metrics: [],
    takt: ["H3", "H4", "H5", "V2"],
  },
  {
    key: "p3",
    number: 3,
    title: "Nach der Runde",
    goal: "In die Tiefe",
    lanes: {
      segments: { plus: true, items: [{ label: "Familien", segment: "families" }, { label: "B2B groß", segment: "b2b" }] },
      revenue: { plus: true, items: [{ label: "Partnerhäuser" }, { label: "Verwaltung" }, { label: "Lizenz" }] },
      places: { plus: true, items: [{ label: "Simpulo Houses" }, { label: "Flaggschiffe" }] },
      hosts: { plus: true, items: [{ label: "Lizenz-Betreiber" }] },
      structure: { plus: false, items: [{ label: "Delaware-Holding über der Betriebsfirma" }] },
    },
    unlock: { label: "12 Monate 80 % Auslastung", measure: null },
    metrics: [],
    takt: ["H6", "V3", "V4", "V5", "V6"],
  },
  {
    key: "p4",
    number: 4,
    title: "Immobilien & Ausstieg",
    goal: null,
    lanes: {
      segments: { plus: false, items: [{ label: "alle Gruppen" }] },
      revenue: { plus: true, items: [{ label: "Fonds-Gebühren" }, { label: "Mieten" }, { label: "Wertsteigerung" }] },
      places: { plus: true, items: [{ label: "Simpulo-Dorf" }] },
      hosts: { plus: false, items: [] },
      structure: { plus: false, items: [{ label: "Fonds und Haus-Gesellschaften" }] },
    },
    unlock: null,
    metrics: [],
    takt: [],
  },
];

export const PHASE_TEXT = {
  phase: (n: number) => `Phase ${n}`,
  goal: "Ziel",
  unlock: "Freigabe",
  unlockNext: (n: number) => `öffnet Phase ${n}`,
  metrics: "Was in dieser Phase zählt",
  metricLabel: { fullHouses: "Volle Houses pro Monat", profit: "Gewinn diesen Monat", repeat: "Wiederkehrer" },
  ofTarget: (target: string) => `von ${target}`,
  lanes: "Bahnen",
  takt: "Takt",
  taktNote: "Breite (H) führt, Tiefe (V) folgt – jeder Schritt beginnt, wenn seine Zahlen erreicht sind, nicht nach Datum.",
  none: "–",
  open: (title: string) => `${title} öffnen`,
  segmentDetail: (users: string, revenue: string) => `${users} · ${revenue}`,
  monthsInRow: (streak: number, of: number) => `${streak} von ${of} Monaten`,
  thisMonth: (value: string, target: string) => `${value} diesen Monat von ${target}`,
  overviewNumbers: {
    market: { label: "Gesamtmarkt", value: "10–25 Mrd. € pro Jahr" },
    leader: { label: "Kategorie-Führer (5–10 %)", value: "0,5–2,5 Mrd. €" },
    today: { label: "Simpulo heute", sub: "Umsatz der letzten 12 Monate" },
  },
} as const;

// ── Phase 4: Immobilien & Ausstieg ──────────────────────────────────────────────────────────────────────────────────────────────

export const PHASE4 = {
  separation: {
    title: "Trennung",
    platform: "Plattform – Tech-Bewertung",
    realEstate: "Immobilien – Fonds und Haus-Gesellschaften",
    sentence: "Immobilien in eigenen Gesellschaften, damit die Plattform nicht mit ins Risiko geht.",
  },
  village: {
    title: "Simpulo-Dorf",
    steps: [
      { title: "Cluster", text: "Partner-Houses in einer Gegend" },
      { title: "Gepachtet", text: "Feriendorf, Resort" },
      { title: "Eigenes Dorf", text: "erst nach 12 Monaten Vollauslastung" },
    ],
    candidatesTitle: "Kandidaten",
    /** `strength` / `weakness`: not in the brief yet – shown as "noch offen" until written here */
    candidates: [
      { name: "Portugal", note: "Madeira, Algarve", strength: null, weakness: null },
      { name: "Kanaren", note: null, strength: null, weakness: null },
      { name: "Süditalien", note: "verlassene Dörfer", strength: null, weakness: null },
      { name: "Kreta", note: null, strength: null, weakness: null },
      { name: "Zypern", note: null, strength: null, weakness: null },
      { name: "Andalusien", note: null, strength: null, weakness: null },
      { name: "Bali", note: "nur PT PMA mit HGB oder Pacht, nie Nominee", strength: null, weakness: null },
    ] as readonly { name: string; note: string | null; strength: string | null; weakness: string | null }[],
    strength: "Stärke",
    weakness: "Schwäche",
  },
  exit: {
    title: "Ausstieg",
    options: ["Börsengang", "Privat bleiben", "Verkauf"],
    criteria: ["Geld für Gründer", "Kontrolle", "Druck", "Voraussetzung"],
    /** By option, then criterion – not in the brief yet: "noch offen" until written here */
    values: {
      Börsengang: { "Geld für Gründer": null, Kontrolle: null, Druck: null, Voraussetzung: null },
      "Privat bleiben": { "Geld für Gründer": null, Kontrolle: null, Druck: null, Voraussetzung: null },
      Verkauf: { "Geld für Gründer": null, Kontrolle: null, Druck: null, Voraussetzung: null },
    } as Record<string, Record<string, string | null>>,
    sentence: "Die Weiche stellt die Finanzierung: Wagniskapital bedeutet meist Ausstieg in 7–10 Jahren. Kernfrage: Kontrolle oder maximale Größe?",
  },
  open: "noch offen",
} as const;

// ── Breadth & Depth ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DepthUnlockMeasure = "fullHousesInOneHub" | null;

export const BREADTH_DEPTH = {
  breadthTitle: "Breite",
  depthTitle: "Tiefe",
  breadth: [
    { key: "H1", title: "Kern-Nische" },
    { key: "H2", title: "Neue Themen" },
    { key: "H3", title: "Dauer strecken" },
    { key: "H4", title: "Neue Orte" },
    { key: "H5", title: "B2B-Offsites" },
    { key: "H6", title: "Services im House" },
  ],
  /** `unlock`: the diamond before the step – its criterion, and what measures it (null: not measurable yet) */
  depth: [
    { key: "V1", title: "Marktplatz", unlock: null },
    { key: "V2", title: "Partner-Orte", unlock: { criterion: "20+ volle Houses pro Monat in einem Hub", measure: "fullHousesInOneHub", target: 20 } },
    { key: "V3", title: "Simpulo Houses", unlock: { criterion: "Partner sehen messbar höhere Auslastung", measure: null, target: null } },
    { key: "V4", title: "Eigene Mietverträge", unlock: { criterion: "12 Monate Auslastungsdaten zeigen 80 %+", measure: null, target: null } },
    { key: "V5", title: "Flagships", unlock: { criterion: "Mehrere Hubs profitabel, Investoren für Kapital", measure: null, target: null } },
    { key: "V6", title: "Lizenzen weltweit", unlock: { criterion: "Standard bewiesen und dokumentiert", measure: null, target: null } },
  ] as const satisfies readonly { key: string; title: string; unlock: { criterion: string; measure: DepthUnlockMeasure; target: number | null } | null }[],
  closing: "Breite führt, Tiefe folgt – jeder Schritt beginnt, wenn seine Zahlen erreicht sind, nicht nach Datum.",
  progress: (value: number, target: number) => `${value} von ${target}`,
} as const;

// ── Continuum ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const CONTINUUM = {
  groups: [
    { title: "Plattform (Tech)", sources: [live("Servicegebühr", "serviceFee"), live("Anteil an der Host-Gebühr", "hostFeeShare"), idea("Partner-Provisionen"), idea("Host-Abo"), idea("Hervorgehobene Platzierung"), idea("Mitgliedschaft"), idea("B2B-Offsites")] },
    { title: "Marke & Betrieb", sources: [idea("Provision für Partner-Houses"), idea("Verwaltungsgebühr"), idea("Services im House"), idea("Lizenzgebühren")] },
    { title: "Immobilien", sources: [idea("Mietmarge"), idea("Miete aus eigenen Houses"), idea("Wertsteigerung"), idea("Fondsgebühren")] },
  ] as const satisfies readonly { title: string; sources: readonly Source[] }[],
  arrows: { right: "Kapital und Risiko steigen →", left: "← Bewertung pro Euro Umsatz steigt" },
} as const;

// ── Roadmap ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const ROADMAP = {
  /** 1-based: the stage Simpulo is on */
  current: 1,
  revenueLabel: "Neue Einnahme",
  stages: [
    { title: "Marktplatz", text: "Houses füllen, Nachfrage beweisen", revenue: "Servicegebühr, Anteil an der Host-Gebühr" },
    { title: "Netzwerk", text: "Your people, Wiederkehrer, Matching", revenue: "Host-Abo, hervorgehobene Platzierung" },
    { title: "Partner-Houses", text: "erstes Simpulo-Branding in Partner-Orten", revenue: "Provision, Verwaltungsgebühr" },
    { title: "Flagship", text: "erstes eigenes House, aus Daten entworfen", revenue: "Miete, Services" },
    { title: "Mitgliedschaft", text: "Zugang zu allen Simpulo Houses", revenue: "wiederkehrendes Abo" },
    { title: "Immobilien-Plattform", text: "Simpulo-Fonds finanziert weitere Houses", revenue: "Fondsgebühren, eigener Anteil" },
  ],
  partnerTitle: "Partner-Ökosystem",
  fromStage: (stage: number) => `ab Stufe ${stage}`,
  /** `from`: the roadmap stage (1-based) the area starts with */
  partners: [
    { title: "Vor der Reise", text: "Versicherung, eSIM, Flüge, Visum", from: 2 },
    { title: "Vor Ort", text: "Surfschule, Yoga, Gym, Coworking", from: 2 },
    { title: "Geld", text: "Hauskasse, Währung, Ratenzahlung", from: 2 },
    { title: "Im House", text: "Reinigung, Koch, Wäsche", from: 3 },
    { title: "Marken", text: "Sponsoren, Creator-Deals", from: 3 },
    { title: "Bau & Einrichtung", text: "Möbel, Design, Smart Home", from: 4 },
    { title: "Kapital", text: "Banken, Fonds, Investoren", from: 6 },
  ],
} as const;

// ── Hosts ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The phases the host formats and the host circle are tied to; "launch" is where Simpulo is now (Path: Germany). */
export type HostPhase = "launch" | "abroad";
export const HOST_PHASE_LABEL: Record<HostPhase, string> = { launch: "Launch", abroad: "Ausland" };
export const HOST_PHASE_NOW: HostPhase = "launch";

export const HOSTS = {
  tiersTitle: "Host-Stufen",
  /** From the base up; `tier` links to the admin's host tiers (their count from lib/admin/metrics.ts hostMix) */
  tiers: [
    { tier: "share", title: "Share Host", role: "Angebot", lookFor: [] as string[] },
    { tier: "pro", title: "Pro Host", role: "Kernumsatz", lookFor: [] as string[] },
    { tier: "anchor", title: "Anchor Creator", role: "Reichweite, Marke", lookFor: [] as string[] },
  ],
  lookForLabel: "Was sie suchen",
  /** Shown while a tier's `lookFor` is empty – the brief names the heading, not its content yet */
  lookForEmpty: "noch nicht geschrieben",
  hosts: (count: number) => `${count} ${count === 1 ? "Host" : "Hosts"}`,
  gapTitle: "Die Lücke",
  gap: {
    left: { title: "Creator-Website", text: "3 Premium-Retreats im Jahr, mit dem Creator" },
    right: { title: "Simpulo", text: "die Community lebt das ganze Jahr zusammen, in vielen Städten, ohne die Zeit des Creators" },
    sentence: "Deine Retreats bleiben deine. Simpulo ist, wo deine Community dazwischen zusammenlebt.",
  },
  formatsTitle: "Formate",
  formats: [
    { title: "Creator-Collab-House", phase: "launch" },
    { title: "Fan-House", phase: "launch" },
    { title: "Brand-House", phase: "abroad" },
    { title: "Kuratiert von", phase: "abroad" },
  ] as const satisfies readonly { title: string; phase: HostPhase }[],
  circleTitle: "Host-Kreis",
  circle: [
    { title: "Kleine Version", text: "„Notify me“ + eigener Link", phase: "launch" },
    { title: "Voller Kreis", text: "als Host-Abo", phase: "abroad" },
  ] as const satisfies readonly { title: string; text: string; phase: HostPhase }[],
} as const;

// ── Places ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Vision › Places: the kinds of place by phase – the categories themselves live in config/accommodation.ts. */
export const PLACES = {
  /** The phase Simpulo is in */
  now: "launch",
  crew: (min: number, max: number) => `Crew ${min}–${max}`,
  price: (level: string) => `Preis ${level}`,
  dayOnly: "nur tagsüber – keine Übernachtung",
  houses: (count: number) => `${count} ${count === 1 ? "House" : "Houses"}`,
  /** "Getting there" (config/travel.ts): how the crew travels – not a place to live */
  travelTitle: "Anreise",
  travelMode: (mode: string) => `Modus: ${mode}`,
  travelNote: "Simpulo verkauft keine Flüge – Rechtsfrage offen (Pauschalreise, verbundene Reiseleistungen).",
} as const;

// ── Zielgruppen (segments) ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The phases the segments open in; "launch" is now (ocean focus). Colours by phase in components/admin/AdminVision.tsx. */
export type SegmentPhase = "launch" | "early" | "afterLaunch" | "growth" | "scale" | "abroad";
export const SEGMENT_PHASE_NOW: SegmentPhase = "launch";

export interface Segment {
  key: string;
  name: string;
  /** In brackets after the name */
  examples: string;
  age: string;
  motive: string;
  frequency: string;
  valuePerStay: string;
  phase: SegmentPhase;
  phaseLabel: string;
  /** Users per year in millions, and what they count ("Personen", "Offsites"; empty = people) */
  users: { min: number; max: number; unit: string };
  /** As given ("1,3–2,5 Mio.") */
  staysPerMonth: string;
  /** As given ("ganzjährig, Winter stärker in Bali") */
  season: string;
  /**
   * The season as months (1–12) for the season strip – read from `season` (an interpretation, change it here): `months` filled, `strong`
   * fuller.
   */
  months: readonly number[];
  strong?: readonly number[];
  /** EUR Simpulo keeps per stay, and what it counts ("pro Person"; empty = per stay) */
  simpuloPerStay: { amount: number; unit: string };
  /** Theoretical revenue per year, in billions EUR */
  revenue: { min: number; max: number };
}

const ALL_YEAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Vision › Zielgruppen: eight groups and how big they could be – rough assumptions, no market study; change them here. */
export const SEGMENTS: readonly Segment[] = [
  { key: "core", name: "Kern", examples: "Nomaden, Creator, Founder, Fitness", age: "20–45", motive: "Wachstum, Zugehörigkeit", frequency: "mittel", valuePerStay: "hoch", phase: "launch", phaseLabel: "Launch", users: { min: 10, max: 20, unit: "" }, staysPerMonth: "1,3–2,5 Mio.", season: "ganzjährig, Winter stärker in Bali", months: ALL_YEAR, strong: [11, 12, 1, 2], simpuloPerStay: { amount: 120, unit: "" }, revenue: { min: 2, max: 4 } },
  { key: "short", name: "Kurztrips und Erlebnis", examples: "Festivals, Ski, Städtetrips", age: "18–40", motive: "Spaß, Erlebnis", frequency: "hoch", valuePerStay: "niedrig", phase: "early", phaseLabel: "früh", users: { min: 30, max: 60, unit: "" }, staysPerMonth: "6–12 Mio.", season: "Sommer, Festivals, Ski im Winter", months: [12, 1, 2, 3, 6, 7, 8], strong: [7, 8], simpuloPerStay: { amount: 30, unit: "" }, revenue: { min: 2, max: 5 } },
  { key: "students", name: "Studierende", examples: "Erasmus, neue Stadt", age: "18–26", motive: "Anschluss finden", frequency: "einmalig bis mittel", valuePerStay: "niedrig", phase: "scale", phaseLabel: "Skalierung", users: { min: 5, max: 10, unit: "" }, staysPerMonth: "0,4–0,8 Mio.", season: "Semesterstart", months: [2, 3, 9, 10], simpuloPerStay: { amount: 60, unit: "" }, revenue: { min: 0.3, max: 0.6 } },
  { key: "transitions", name: "Lebensumbrüche", examples: "neu in der Stadt, Sabbatical, Neustart", age: "alle", motive: "Zugehörigkeit", frequency: "selten", valuePerStay: "hoch", phase: "growth", phaseLabel: "Wachstum", users: { min: 5, max: 10, unit: "" }, staysPerMonth: "0,4–0,8 Mio.", season: "ganzjährig", months: ALL_YEAR, simpuloPerStay: { amount: 100, unit: "" }, revenue: { min: 0.5, max: 1 } },
  { key: "families", name: "Familien", examples: "Familien-Houses, Alleinerziehende", age: "30–50 mit Kindern", motive: "Gemeinschaft, Entlastung", frequency: "selten", valuePerStay: "hoch", phase: "scale", phaseLabel: "Skalierung", users: { min: 15, max: 40, unit: "Personen" }, staysPerMonth: "1,3–3,3 Mio.", season: "Schulferien", months: [4, 7, 8, 10, 12], strong: [7, 8], simpuloPerStay: { amount: 50, unit: "pro Person" }, revenue: { min: 0.75, max: 2 } },
  { key: "older", name: "50+ und Ältere", examples: "Überwintern, Hobbys, Gesellschaft", age: "50–80", motive: "Zugehörigkeit, gegen Einsamkeit", frequency: "mittel, lang", valuePerStay: "hoch", phase: "growth", phaseLabel: "Wachstum", users: { min: 10, max: 20, unit: "" }, staysPerMonth: "0,8–1,7 Mio.", season: "Herbst bis Frühling", months: [10, 11, 12, 1, 2, 3, 4], simpuloPerStay: { amount: 250, unit: "" }, revenue: { min: 2.5, max: 5 } },
  { key: "local", name: "Lokal ohne Reise", examples: "Day Houses", age: "alle", motive: "Leute treffen", frequency: "sehr hoch", valuePerStay: "niedrig", phase: "afterLaunch", phaseLabel: "kurz nach Launch", users: { min: 50, max: 100, unit: "" }, staysPerMonth: "25–50 Mio.", season: "ganzjährig, Wochenenden", months: ALL_YEAR, simpuloPerStay: { amount: 5, unit: "" }, revenue: { min: 1.5, max: 3 } },
  { key: "b2b", name: "B2B", examples: "Firmen, Unis, Austausch", age: "–", motive: "Teams, Programme", frequency: "regelmäßig", valuePerStay: "sehr hoch", phase: "abroad", phaseLabel: "Ausland", users: { min: 1, max: 2, unit: "Offsites" }, staysPerMonth: "80.000–170.000 Offsites", season: "Frühjahr und Herbst", months: [3, 4, 5, 9, 10, 11], simpuloPerStay: { amount: 1000, unit: "pro Offsite" }, revenue: { min: 1, max: 2 } },
];

export const SEGMENTS_TEXT = {
  graphTitle: "Theoretischer Umsatz pro Jahr",
  tableTitle: "Zielgruppen",
  seasonTitle: "Saison – welche Gruppen welche Monate füllen",
  monthLabels: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  seasonLegend: "voll: stärker · hell: unterwegs",
  col: {
    group: "Gruppe",
    age: "Alter",
    motive: "Motiv",
    frequency: "Häufigkeit",
    valuePerStay: "Wert pro Aufenthalt",
    phase: "Phase",
    users: "Nutzer pro Jahr",
    staysPerMonth: "Aufenthalte pro Monat",
    season: "Saison",
    simpuloPerStay: "Simpulo pro Aufenthalt",
    revenue: "Theoretischer Umsatz pro Jahr",
  },
  /** The sum row – as given, rounded */
  total: { label: "Summe", users: "ca. 130–260 Mio. Nutzer pro Jahr", staysPerMonth: "ca. 35–70 Mio. Aufenthalte pro Monat", revenue: "ca. 10–25 Mrd. € pro Jahr" },
  legend: "Phase",
  rangeHint: "dunkel: untere Annahme · hell: Spanne bis zur oberen",
  millions: "Mio.",
  billions: "Mrd. €",
  note: "Theoretische Obergrenze aus groben Annahmen, keine Marktstudie.",
} as const;


// ── Technik ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type TechSection = "layers" | "build" | "interfaces" | "providers";
/** "Selbst" · "selbst auf eingekauften Werkzeugen" · "einkaufen" – the table's glyph (● ◐ ○, ink). */
export type BuildKind = "own" | "mixed" | "buy";
export type TechProvider = "firebase" | "stripe" | "analytics" | "maps" | "email";

/**
 * Vision › Technik: what Simpulo builds on, what it is itself, what to build or buy, the interfaces to come and today's providers. Content only
 * from the founders' brief. The providers' costs (in % of revenue) come from lib/admin/metrics.ts providerCosts – never from here; the
 * thresholds (5 % amber, 10 % ember "Selbermachen prüfen") from config/admin.ts PROVIDER_COST.
 */
export const TECH = {
  sections: [
    { key: "layers", label: "Ebenen" },
    { key: "build", label: "Selbst oder einkaufen" },
    { key: "interfaces", label: "Schnittstellen" },
    { key: "providers", label: "Anbieter heute" },
  ] as const satisfies readonly { key: TechSection; label: string }[],
  /** Two stacks side by side, each listed from the bottom up. */
  foundation: {
    title: "Worauf wir aufbauen",
    layers: [
      { title: "Cloud", text: "Google Cloud/Firebase" },
      { title: "Plattformen", text: "bewusst Web-App, keine App-Store-Gebühren" },
      { title: "APIs", text: "Stripe, Karten, KI" },
      { title: "Browser und Social", text: "Safari, Chrome, In-App-Browser" },
      { title: "Adressen", text: "Domain" },
    ],
  },
  own: {
    title: "Was Simpulo selbst ist",
    layers: [
      { n: 1, title: "Fundament", text: "Partnerhäuser → Simpulo Houses → Fonds", note: "meister Umsatz, meistes Risiko, zuletzt" },
      { n: 2, title: "Türsteher", text: "Vertrauen, Prüfung, Garantie", note: "unverzichtbar" },
      { n: 3, title: "Nervensystem", text: "Matching, Zahlungen, Chat, APIs", note: null },
      { n: 4, title: "Schaufenster", text: "Explore, House-Seiten, KI-Suche", note: null },
      { n: 5, title: "Adressbuch", text: "Your people, Ruf, Host-Links", note: "Schutzwall" },
    ],
  },
  build: {
    columns: { block: "Baustein", advice: "Empfehlung", rethink: "Ab wann überdenken" },
    kindLabel: { own: "selbst", mixed: "selbst auf eingekauften Werkzeugen", buy: "einkaufen" } as Record<BuildKind, string>,
    rows: [
      { block: "Matching und Algorithmus", kind: "own", advice: "immer selbst", rethink: null },
      { block: "Your people, Ruf, Vertrauensregeln", kind: "own", advice: "immer selbst", rethink: null },
      { block: "House-Erlebnis, Explore, Host-Werkzeuge", kind: "own", advice: "immer selbst", rethink: null },
      { block: "Daten und Auswertung", kind: "mixed", advice: "selbst auf eingekauften Werkzeugen", rethink: null },
      { block: "Server, Cloud", kind: "buy", advice: "einkaufen", rethink: "fast nie" },
      { block: "Firebase", kind: "buy", advice: "einkaufen", rethink: "bei großer Last Umzug auf eigenes Backend in Google Cloud" },
      { block: "Zahlungen", kind: "buy", advice: "einkaufen (Stripe)", rethink: "eigene Steuerungsschicht über mehreren Anbietern bei großem Volumen; Abwicklung selbst praktisch nie" },
      { block: "Identitätsprüfung", kind: "buy", advice: "einkaufen", rethink: "nie" },
      { block: "E-Mail, Push, SMS", kind: "buy", advice: "einkaufen", rethink: "nie" },
      { block: "Karten, Übersetzung, KI-Modelle", kind: "buy", advice: "einkaufen", rethink: "KI: eigene Anpassungen, nie eigenes Grundmodell" },
      { block: "Chat", kind: "buy", advice: "einkaufen oder Firebase", rethink: "eventuell selbst, wenn zentral" },
      { block: "Support, Analytics", kind: "buy", advice: "einkaufen", rethink: "selten" },
    ] as const satisfies readonly { block: string; kind: BuildKind; advice: string; rethink: string | null }[],
    conditionsTitle: "Bedingungen fürs Selbermachen",
    conditions: ["Kosten", "Grenzen", "Abhängigkeit"],
    sentence: "Adapter machen jeden Anbieter austauschbar.",
  },
  /** A time line, in this order (the phase as given). */
  interfaces: {
    items: [
      { title: "Einbettung „Join on Simpulo“ für Hosts", when: "kurz nach Launch" },
      { title: "KI-Assistenten über MCP", when: "sobald es Nutzer gibt" },
      { title: "Partner-Schnittstelle für Verfügbarkeit", when: "Stufe 2–3" },
      { title: "B2B-Schnittstelle", when: "Ausland" },
      { title: "Lizenz-Plattform", when: "Stufe 6" },
    ],
    note: "Nur gezielt und mit Vertrag.",
  },
  providers: {
    columns: { name: "Anbieter", purpose: "Zweck", adapter: "Adapter", cost: "Kosten in % vom Umsatz" },
    yes: "ja",
    no: "nein",
    checkOwn: "Selbermachen prüfen",
    /** The purpose as the brief names it (Ebenen, Selbst oder einkaufen); `adapter`: whether the code reaches it only through one swap point. */
    items: [
      { key: "firebase", name: "Firebase", purpose: "Server, Cloud", adapter: true },
      { key: "stripe", name: "Stripe", purpose: "Zahlungen", adapter: true },
      { key: "analytics", name: "Analytics", purpose: "Support, Analytics", adapter: true },
      { key: "maps", name: "Karten", purpose: "Karten", adapter: true },
      { key: "email", name: "E-Mail", purpose: "E-Mail, Push, SMS", adapter: true },
    ] as const satisfies readonly { key: TechProvider; name: string; purpose: string; adapter: boolean }[],
    exampleNote: "Beispielwerte",
  },
} as const;


// ── Standort ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type LocationSection = "why" | "candidates" | "window";
export type LocationCriterion = "tax" | "living" | "hubs" | "investors" | "eu";

/**
 * Vision › Standort: why not Germany for good, the candidates and the time window for the move. Content only from the founders' brief. The
 * scores (1–5) are placeholders – "meine Einschätzung eintragen" –, the weights can be changed; the total is the weighted average. The live
 * numbers (profit this month, months in a row) come from lib/admin/metrics.ts; the chosen country is saved through the adapter
 * (AdminData.location).
 */
export const LOCATION = {
  note: "Orientierung, keine Steuerberatung. Regeln ändern sich, alles mit dem Steuerberater prüfen.",
  sections: [
    { key: "why", label: "Warum nicht dauerhaft Deutschland" },
    { key: "candidates", label: "Kandidaten" },
    { key: "window", label: "Zeitfenster" },
  ] as const satisfies readonly { key: LocationSection; label: string }[],
  why: {
    againstTitle: "Auf Dauer passt es nicht",
    against: [
      "Die typischen deutschen Vorteile (Industrie, B2B Mittelstand, regulierte Branchen, große Teams vor Ort, Förderung) nutzt Simpulo kaum.",
      "Hohe Steuern ohne passenden Gegenwert für ein ortsunabhängiges Geschäft (bis ca. 45 % Einkommensteuer, mit GmbH für Geld zum Leben rund 48 %).",
      "Je länger du bleibst, desto teurer der Wegzug.",
      "Das Produkt findet in den Hubs statt, nicht in Deutschland.",
      "Persönliches Ziel: Leben im Ausland.",
    ],
    forTitle: "Für den Start richtig",
    for: ["Einzelunternehmen schnell und günstig", "Rechtssicherheit beim Testen", "Job trägt bis Simpulo trägt"],
    path: ["Deutschland starten", "Umzug bei 5.000 €/Monat", "Ausland wachsen"],
  },
  candidates: {
    columns: { country: "Land", tax: "Steuern (grob)", strengths: "Stärken", weaknesses: "Schwächen" },
    rows: [
      { key: "uae", country: "VAE/Dubai", tax: "keine Einkommensteuer, 9 % Körperschaftsteuer über Freibetrag, Free Zones teils 0 %", strengths: "niedrige Steuern, Flüge in die Hubs", weaknesses: "hohe Lebenskosten, Präsenz nötig, deutsche 10-Jahres-Regel" },
      { key: "ch", country: "Schweiz", tax: "moderat je Kanton", strengths: "Investoren, Rechtssicherheit, Lebensqualität", weaknesses: "sehr teuer, nicht EU" },
      { key: "cy", country: "Zypern", tax: "ca. 12,5–15 % Firma, Sonderstatus für Zuzügler", strengths: "EU, Englisch, mild", weaknesses: "klein, Ruf" },
      { key: "pt", country: "Portugal", tax: "Sonderregel 20 % für bestimmte Einkünfte, 10 Jahre", strengths: "EU, Nomaden-Szene, möglicher Hub", weaknesses: "Regeln oft geändert, Bürokratie" },
      { key: "es", country: "Spanien", tax: "Sonderregel 24 % bis Grenze, 6 Jahre", strengths: "EU, Málaga, Kanaren", weaknesses: "komplexe Steuern danach" },
      { key: "ge", country: "Georgien", tax: "Kleinunternehmer 1 % vom Umsatz bis Grenze", strengths: "sehr günstig, einfach", weaknesses: "nicht EU, für Investoren weniger vertraut" },
    ],
    scoreTitle: "Bewertung",
    scoreNote: "Platzhalter – meine Einschätzung eintragen (config/vision.ts LOCATION.scores)",
    criteria: [
      { key: "tax", label: "Steuern" },
      { key: "living", label: "Lebenskosten" },
      { key: "hubs", label: "Nähe zu den Hubs" },
      { key: "investors", label: "Investoren-Tauglichkeit" },
      { key: "eu", label: "EU-Zugang" },
    ] as const satisfies readonly { key: LocationCriterion; label: string }[],
    /** Each criterion's weight (any positive number; the total is the weighted average 1–5) */
    weights: { tax: 1, living: 1, hubs: 1, investors: 1, eu: 1 } as Record<LocationCriterion, number>,
    total: "Gesamt",
  },
  /** ⚠ Platzhalter (1 = schlecht, 5 = gut) – derived roughly from the table above; enter your own judgement. */
  scores: {
    uae: { tax: 5, living: 1, hubs: 4, investors: 3, eu: 1 },
    ch: { tax: 3, living: 1, hubs: 2, investors: 5, eu: 2 },
    cy: { tax: 4, living: 3, hubs: 2, investors: 2, eu: 5 },
    pt: { tax: 3, living: 4, hubs: 4, investors: 3, eu: 5 },
    es: { tax: 3, living: 4, hubs: 3, investors: 3, eu: 5 },
    ge: { tax: 5, living: 5, hubs: 2, investors: 1, eu: 1 },
  } as Record<string, Record<LocationCriterion, number>>,
  window: {
    chartTitle: "Einkommen vs. Wert beim Umzug",
    income: "Einkommen",
    value: "Wert – und damit Steuer beim Umzug",
    window: "Fenster",
    time: "Zeit",
    profit: "Gewinn diesen Monat",
    streak: "Monate in Folge bei 5.000 €",
    status: "Status",
    statusLabel: { open: "Fenster offen", soon: "bald", notYet: "noch nicht" },
    /** open: the move target reached (6 months in a row); soon: at least one month or this month at 5.000 €; else not yet */
    rule: "Offen ab 6 Monaten in Folge bei 5.000 €, bald ab dem ersten Monat dort.",
    questionsLink: "Fragen an den Steuerberater →",
  },
  decision: {
    title: "Entscheidung",
    country: "Gewähltes Land",
    open: "Noch offen",
    reason: "Begründung",
    reasonPlaceholder: "Warum dieses Land …",
    save: "Speichern",
    saved: "Entscheidung gespeichert",
  },
} as const;

// ── Bausteinkarte (Vision-Kopf, Karte, Zoom, Zeitleiste) ───────────────────────────────────────────────────────────────────────────

/**
 * Vision als Bausteinkarte: zwei Ansichten (Karte · Zeitleiste), die Karte in drei Spalten Warum · Wie · Wohin. Jeder Baustein: Titel, ein
 * Untertitel (höchstens 5 Wörter, aus den Inhalten dieser Datei abgeleitet), eine Zusammenfassung für die Zoom-Ansicht (höchstens 12 Wörter)
 * und wohin er führt – eine Zoom-Ansicht (?block=<id>) oder ein anderer Admin-Tab (`external`). Reihenfolge fest, wie hier.
 */
export const VISION_VIEWS = [
  { key: "map", label: "Karte" },
  { key: "timeline", label: "Zeitleiste" },
] as const;
export type VisionView = (typeof VISION_VIEWS)[number]["key"];

export const BLOCK_MAP_TEXT = {
  crumb: "Vision",
  back: "← Karte",
  backTimeline: "← Zeitleiste",
  status: (phase: number, streak: number, of: number, target: string) => `Phase ${phase} · ${streak}/${of} Monate bei ${target}`,
  phaseOf: (n: number, total: number) => `${n} von ${total}`,
  groups: (n: number) => `${n} Gruppen`,
  hosts: (all: number, pro: number) => `${all} · davon ${pro} Pro`,
  kinds: (n: number) => `${n} Arten`,
  providers: (n: number) => `${n} Anbieter`,
  models: (n: number) => `${n} Modelle`,
  sources: (n: number) => `${n} Quellen`,
  stages: (n: number) => `${n} Stufen`,
  ready: (met: number, total: number) => `${met} von ${total} bereit`,
  open: "offen",
  again: (value: string) => `${value} „Mit dir wieder“`,
  more: (n: number) => `+${n}`,
  count: (n: number) => `${n}`,
} as const;

export type BlockId = "hof" | "longevity" | "core" | "segments" | "hosts" | "places" | "tech" | "algorithm" | "phases" | "tModel" | "continuum" | "roadmap" | "location" | "funding";
export interface BlockDef {
  id: BlockId;
  title: string;
  /** höchstens 5 Wörter */
  subtitle: string;
  /** höchstens 12 Wörter – die Zeile oben in der Zoom-Ansicht */
  summary: string;
  /** Sprung in einen anderen Admin-Tab statt Zoom */
  external?: string;
  /** Das Endbild: volle Spaltenbreite, mit Vorschau-Grafik */
  feature?: boolean;
}

export const BLOCK_MAP: readonly { key: "why" | "how" | "where"; label: string; blocks: readonly BlockDef[] }[] = [
  {
    key: "why",
    label: "Warum",
    blocks: [
      { id: "core", title: "Kern", subtitle: "Zeit wirkt", summary: "Simpulo verkauft verdichtete Zeit mit den richtigen Menschen." },
      { id: "segments", title: "Zielgruppen", subtitle: "8 Gruppen", summary: "Acht Gruppen, theoretische Obergrenze aus groben Annahmen, keine Marktstudie." },
      // Texts from lib/admin/vision/longevity.ts (LONGEVITY.block) – the same words here for the map.
      { id: "longevity", title: "Longevity", subtitle: "Die soziale Säule", summary: "Simpulo ist die soziale Säule von Longevity." },
    ],
  },
  {
    key: "how",
    label: "Wie",
    blocks: [
      { id: "hosts", title: "Hosts", subtitle: "Share · Pro · Anchor", summary: "Drei Host-Stufen: Angebot, Kernumsatz, Reichweite und Marke." },
      { id: "places", title: "Orte & Anreise", subtitle: "Wohnen und gemeinsame Anreise", summary: "Arten des Ortes nach Phase, dazu gemeinsame Anreise." },
      { id: "tech", title: "Technik", subtitle: "Ebenen · Anbieter", summary: "Was Simpulo selbst ist, was es einkauft, was es kostet." },
      { id: "algorithm", title: "Algorithmus", subtitle: "Daten → Modell → Ergebnis", summary: "Fünf Modelle lernen aus den Daten.", external: "/admin/data" },
    ],
  },
  {
    key: "where",
    label: "Wohin",
    blocks: [
      // The end picture, on top and set apart (config/vision-hof.ts holds its contents).
      { id: "hof", title: "Der Hof", subtitle: "Die Mission in gebauter Form", summary: "Der Ort, an dem alles zusammenkommt.", feature: true },
      { id: "phases", title: "Phasen", subtitle: "Deutschland bis Immobilien", summary: "Vier Phasen, jede mit Ziel und Freigabe." },
      { id: "tModel", title: "T-Modell", subtitle: "Breite führt, Tiefe folgt", summary: "Breite: dieselbe Mechanik für mehr Menschen. Tiefe: Stufe für Stufe." },
      { id: "continuum", title: "Kontinuum", subtitle: "Plattform · Marke · Immobilien", summary: "Einnahmequellen von Plattform über Marke bis Immobilien." },
      { id: "roadmap", title: "Roadmap", subtitle: "Marktplatz bis Immobilien", summary: "Sechs Stufen, jede bringt eine neue Einnahme." },
      { id: "location", title: "Standort", subtitle: "Kandidaten · Zeitfenster", summary: "Warum nicht dauerhaft Deutschland, Kandidaten und das Zeitfenster." },
      { id: "funding", title: "Finanzierung", subtitle: "Wann und wofür Geld", summary: "Bereitschaft, These, Runden, Unterlagen.", external: "/admin/funding" },
    ],
  },
];

/** Zeitleiste: die Bahnen als Zeilen (dieselben wie LANES) und die Freigabe. */
export const TIMELINE_TEXT = {
  expand: "aufklappen",
  collapse: "zuklappen",
  openPhase: (title: string) => `${title} öffnen`,
} as const;
