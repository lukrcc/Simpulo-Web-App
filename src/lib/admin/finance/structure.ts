// Admin › Finanzierung › Firmenstruktur: every text of the tab as data (German, admin only) – Gruppe · Höfe · Franchise · Phasen. The
// diagrams (boxes and lines) are drawn by the BlockMap like the flows in Algorithmus; this file only says what is in them.
// Strategic orientation, no financial or legal advice (the page says so).

export type StructureView = "motors" | "group" | "farms" | "franchise" | "phases";

export interface StructureBox {
  id: string;
  title: string;
  /** The box's first line */
  subtitle?: string;
  /** Short facts as capsules */
  tags?: readonly string[];
}

export const STRUCTURE = {
  tab: "Firmenstruktur",
  views: [
    { key: "motors", label: "Zwei Motoren" },
    { key: "group", label: "Gruppe" },
    { key: "farms", label: "Höfe" },
    { key: "franchise", label: "Franchise" },
    { key: "phases", label: "Phasen" },
  ] as const satisfies readonly { key: StructureView; label: string }[],

  /** 0 Zwei Motoren: growth (Tech) and return (Places), how they feed each other, who invests where, own or decide, the engine's numbers. */
  motors: {
    growth: { eyebrow: "WACHSTUMS-MOTOR", title: "Simpulo (Tech)", parts: ["Marktplatz", "Infrastruktur", "Marke"], text: "wächst, investiert zurück" },
    return: { eyebrow: "RENDITE-MOTOR", title: "Simpulo Places", parts: ["Anteile an Orten nach Simpulo-Muster"], text: "stabile Mieten, planbare Ausschüttungen" },
    fills: "füllt die Orte",
    flowsBack: "Rendite fließt zurück, finanziert Wachstum ohne Anteile abzugeben",
    investors: [
      { who: "Wachstums-Investoren", what: "Anteile an Tech" },
      { who: "Rendite-Investoren", what: "Places / Fonds" },
    ],
    product: "Fertiges Produkt: Muster + Betrieb + Gäste. Investoren bringen nur Kapital.",
    compare: {
      title: "Besitzen oder bestimmen",
      ways: ["Alles selbst besitzen", "Bestimmen und betreiben, Besitz teilen"],
      rows: [
        { label: "Kapital", values: ["sehr viel – jedes Haus kauft oder baut Simpulo selbst", "wenig – Partner, Fonds und Places bringen das Kapital"] },
        { label: "Risiko", values: ["hoch – Leerstand und Kredite liegen bei Simpulo", "geteilt – das Immobilienrisiko tragen die Besitzer"] },
        { label: "Kontrolle über das Erlebnis", values: ["voll", "voll – Muster, Betrieb und Gäste kommen von Simpulo"] },
        { label: "Bewertung", values: ["wie ein Immobilienunternehmen", "wie eine Plattform – Tech bleibt leicht"] },
      ],
      recommended: 1,
      recommendation: "Empfehlung",
    },
    numbers: {
      title: "Rendite-Motor in Zahlen",
      prepared: "vorbereitet",
      running: "Places in Betrieb",
      occupancy: "Ø Auslastung",
      payout: "Ausschüttung je Jahr",
      backflow: "Rückfluss an Tech",
      none: "noch keine Places",
      release: "Freigabe heute: {met} von {of} Monaten über {percent} %",
      gate: "Ausschüttungen erst nach Freigabe (12 Monate über 80 %).",
    },
    note: "Strategische Einordnung, keine Finanz- oder Rechtsberatung. Beteiligungen für Anleger sind reguliert.",
  },

  /** 1 Gruppe */
  group: {
    columns: [
      { key: "group", label: "Gruppe", boxes: [{ id: "group", title: "SIMPULO GRUPPE" }] },
      {
        key: "companies",
        label: "Gesellschaften",
        boxes: [
          { id: "tech", title: "SIMPULO (Tech)", subtitle: "Plattform, Marke, Matching, Betrieb", tags: ["Kurs auf Wachstum", "Investoren für Wachstum"] },
          { id: "places", title: "SIMPULO PLACES", subtitle: "Anteile an Höfen (z. B. 10–30 % pro Hof)", tags: ["stabile Rendite", "Partner und Fonds tragen den Rest"] },
        ],
      },
    ],
    links: [
      { from: "group", to: "tech" },
      { from: "group", to: "places" },
    ],
    back: "Rendite fließt zurück, finanziert Wachstum ohne Anteile.",
    backFrom: "SIMPULO PLACES → SIMPULO GRUPPE",
    why: {
      title: "Warum getrennt",
      reasons: ["Mischbewertung (Konglomerat-Abschlag)", "Kapital frisst Anteile", "Schulden", "Langsamkeit"],
      examplesTitle: "Vorbilder",
      examples: ["Marriott (Gebäude 1993 abgespalten)", "Disney (Parks + Geschichten)"],
    },
    lifetime: {
      title: "Lebensdauer",
      items: [
        { label: "Rohbau", value: "50–100 J" },
        { label: "Innenausbau", value: "10–15 J" },
        { label: "Technik", value: "5–10 J" },
        { label: "Plattform", value: "ständig" },
        { label: "Bedürfnis", value: "zeitlos" },
      ],
    },
  },

  /** 2 Höfe */
  farms: {
    columns: [
      { key: "simpulo", label: "Simpulo", boxes: [{ id: "simpulo", title: "SIMPULO (börsenfähig)", tags: ["Marke", "Plattform", "Matching", "Bogen", "Entwurf", "Betrieb"] }] },
      { key: "earns", label: "Verdient an", boxes: [{ id: "earns", title: "verdient an", tags: ["Buchungen", "Betriebsgebühr", "Lizenz"] }] },
      {
        key: "owners",
        label: "Wer die Höfe trägt",
        boxes: [
          { id: "fund", title: "HOF-FONDS", subtitle: "Investoren, die stabile Mieten wollen, besitzen die Gebäude" },
          { id: "partner", title: "PARTNER", subtitle: "Bauträger, Gemeinden, Landbesitzer bauen nach Simpulo-Muster" },
          { id: "coop", title: "GENOSSENSCHAFT", subtitle: "Bewohner besitzen ihr Dorf" },
        ],
      },
    ],
    links: [
      { from: "simpulo", to: "earns" },
      { from: "earns", to: "fund" },
      { from: "earns", to: "partner" },
      { from: "earns", to: "coop" },
    ],
    compare: {
      title: "Zwei Wege",
      ways: ["Simpulo besitzt", "Simpulo entwirft und betreibt"],
      /** Only the examples are given in the brief; the other cells stay open until they are decided. */
      rows: [
        { label: "Kapital", values: [null, null] },
        { label: "100 Höfe", values: [null, null] },
        { label: "Bewertung", values: [null, null] },
        { label: "Risiko", values: [null, null] },
        { label: "Beispiele", values: ["WeWork, Selina", "Marriott, Hilton"] },
      ] as readonly { label: string; values: readonly (string | null)[] }[],
      open: "noch offen",
      recommendation: "Empfehlung: Weg 2 – Simpulo entwirft und betreibt.",
      recommended: 1,
    },
  },

  /** 3 Franchise */
  franchise: {
    columns: [
      { key: "decides", label: "Simpulo bestimmt", boxes: [{ id: "decides", title: "SIMPULO BESTIMMT", tags: ["Design (Muster)", "Bogen", "Matching", "Marke", "Daten", "Standards"] }] },
      { key: "fills", label: "Füllt", boxes: [{ id: "fills", title: "Simpulo füllt die Höfe", subtitle: "über den Marktplatz" }] },
      {
        key: "ways",
        label: "Drei Wege",
        boxes: [
          { id: "franchise", title: "FRANCHISE", subtitle: "Partner besitzt und betreibt, zahlt Gebühr" },
          { id: "operating", title: "BETRIEBSVERTRAG", subtitle: "Eigentümer besitzt, Simpulo betreibt, Betriebsgebühr" },
          { id: "own", title: "EIGENE ANTEILE", subtitle: "Simpulo Places, Rendite" },
        ],
      },
    ],
    links: [
      { from: "decides", to: "fills" },
      { from: "fills", to: "franchise" },
      { from: "fills", to: "operating" },
      { from: "fills", to: "own" },
    ],
    controlTitle: "Kontrolle",
    control: [
      { title: "Design-Handbuch" },
      { title: "Abnahme vor Eröffnung" },
      { title: "Messen statt Kontrolleure", text: "Verbindungsrate, Bewertung, Wiederkehr" },
      { title: "Marke entziehen" },
    ] as readonly { title: string; text?: string }[],
    sentence: "Andere bauen und besitzen, Simpulo bestimmt und füllt.",
    note: "Erste Höfe per Betriebsvertrag oder eigene Anteile, Franchise erst mit erprobtem Handbuch. Vertragsform mit Anwalt klären.",
  },

  /** 4 Phasen */
  phases: {
    steps: [
      { when: "Jetzt", what: ["keine Immobilien", "Daten sammeln"] },
      { when: "Danach", what: ["gepachtete Häuser als Test", "Simpulo betreibt"] },
      { when: "Nach der Runde", what: ["erste Höfe mit Partnern", "Places hält kleinen Anteil"] },
      { when: "Mit Beweis", what: ["Anteile wachsen", "Franchise"] },
      { when: "Börse", what: ["ab Stufe „sehr erfolgreich“ (100 Mio.–1 Mrd. € Umsatz/Jahr)", "nur mit leichtem Modell"] },
    ],
    /** Before which step the release rule stands (index) */
    gateBefore: 2,
    gate: "12 Monate über 80 % Auslastung vor dem ersten Bau.",
  },

  note: "Strategische Einordnung, keine Finanz- oder Rechtsberatung.",
} as const;
