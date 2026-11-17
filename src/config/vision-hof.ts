// Admin › Vision › "Der Hof" – the end picture in the column WOHIN (CLAUDE.md "Admin › Vision"). Every text of the block and its parts, in
// German, as data (the components only render it): short points, tables, a cycle, a ladder – no running text. Next to config/vision.ts
// (the Vision contents live in config/, so this follows that pattern instead of lib/admin/vision/).

/** One part of "Der Hof" (a–k): a card on the zoom ?block=hof, its own zoom ?block=hof.<id>. Only the fields it needs. */
export interface HofPart {
  id: HofPartId;
  /** a–k */
  letter: string;
  title: string;
  /** Short points (capsules) */
  points?: readonly string[];
  /** Named groups of points ("sinnvoll", "rote Linien") */
  groups?: readonly { title: string; points: readonly string[] }[];
  /** A table: head and rows */
  table?: { head: readonly string[]; rows: readonly (readonly string[])[]; status?: string };
  /** A cycle: the steps in order, the last one leading back to `back` */
  cycle?: { steps: readonly string[]; back: string };
  /** One sentence that sums it up */
  sentence?: string;
  /** Set apart (the null hypothesis) */
  highlight?: string;
  /** A small note (data, advice) */
  note?: string;
  /** Where the topic continues in the admin – a reference, never a copy */
  links?: readonly { label: string; href: string | null }[];
}

export type HofPartId = "muster" | "regeln" | "beweis" | "orte" | "produkte" | "smart" | "eigentum" | "franchise" | "positionierung" | "longevity" | "boerse";

export const HOF = {
  id: "hof",
  title: "Der Hof",
  sentence: "Der Ort, an dem alles zusammenkommt.",
  subtitle: "Die Mission in gebauter Form",
  /** The patterns' legend (components/admin/vision/PatternScales.tsx) */
  legend: { shared: "gemeinsam", private: "privat", guest: "Eingang / Gäste" },
  scales: [
    { key: "wohnung", label: "Wohnung", people: "3–5" },
    { key: "haus", label: "Haus", people: "6–10" },
    { key: "hof", label: "Hof", people: "8–12" },
    { key: "stadthof", label: "Stadthof", people: "20–40" },
    { key: "dorf", label: "Dorf", people: "80–200" },
  ],
  /** Hof milestones in the timeline of the phases: small marks */
  milestones: [
    { phase: "p2", label: "Pacht-Test" },
    { phase: "p3", label: "Erste Höfe" },
  ],
  timelineLane: "Der Hof",
  parts: [
    {
      id: "muster",
      letter: "a",
      title: "Muster in fünf Größen",
      points: ["Wohnung 3–5", "Haus 6–10", "Hof 8–12", "Stadthof 20–40", "Dorf 80–200"],
      sentence: "Die Form ist das Bild, das Muster ist das Produkt.",
    },
    {
      id: "regeln",
      letter: "b",
      title: "Fünf Regeln (These)",
      table: {
        head: ["Regel", "Gegenthese", "Test"],
        rows: [
          ["1 Mitte", "Tisch reicht, egal wo", "Tisch Mitte vs. Rand"],
          ["2 Rand", "geteilte Zimmer verbinden mehr", "eigenes vs. geteiltes Zimmer"],
          ["3 Wege durch die Mitte", "erzwungene Begegnung nervt", "Verbindung UND Wohlfühlen"],
          ["4 Schwelle", "bei kurzen Aufenthalten egal", "kaum messbar, ggf. streichen"],
          ["5 Rückzug", "ohne Rückzug mehr Verbindung", "mit vs. ohne Rückzugsort"],
        ],
        status: "offen",
      },
      highlight: "Nullhypothese: Der Raum ist fast egal.",
      links: [{ label: "Algorithmus › Thesen", href: "/admin/data" }],
    },
    {
      id: "beweis",
      letter: "c",
      title: "Von Daten zum Entwurf",
      cycle: { steps: ["Annahme", "Messen", "Lernen", "Entwerfen", "Bauen"], back: "Messen" },
      table: {
        head: ["Stellschraube", "heute Annahme", "später aus Daten"],
        rows: [
          ["Menschen pro Mitte", "8–12", "aus Daten"],
          ["Tischform", "lang", "aus Daten"],
          ["Wege", "alle durch die Mitte", "aus Daten"],
          ["Rückzug", "einer", "aus Daten"],
          ["Küche", "offen", "aus Daten"],
        ],
      },
      note: "Raum-Daten neutral und breit erfassen. Belastbar ab mehreren hundert Houses.",
      links: [{ label: "Algorithmus › Thesen", href: "/admin/data" }],
    },
    {
      id: "orte",
      letter: "d",
      title: "Wo gebaut wird",
      points: ["Nachfrage", "ganzjährig", "Wiederkehr", "Verbindungsrate", "Lücke", "Recht und Boden", "Nachbarn"],
      highlight: "Erst testen ohne Bauen: 12 Monate über 80 % Auslastung.",
    },
    {
      id: "produkte",
      letter: "e",
      title: "Physische Produkte",
      table: {
        head: ["Stufe", "Produkt", "Kapital", "Wann"],
        rows: [
          ["1 Klein", "Fragenkarten, Welcome-Box, gedrucktes Album", "wenig", "nach Launch"],
          ["2 Möbel", "Simpulo-Tisch, Raum-Set", "mittel", "nach Umzug"],
          ["3 Räume", "Simpulo-Räume, Certified Places", "mittel", "nach Umzug"],
          ["4 Bewegung", "Bus/Van, Boot-House", "hoch", "viel später"],
          ["5 Treffen", "Festival, Markttag", "mittel", "nach der Runde"],
          ["6 Gebäude", "Stadthof, Dorf", "sehr hoch", "nach Beweis"],
        ],
      },
      sentence: "Je kleiner, desto früher. Je größer, desto mehr Beweis vorher.",
      links: [{ label: "Labore", href: "/admin/labore" }],
    },
    {
      id: "smart",
      letter: "f",
      title: "Smart House",
      groups: [
        { title: "sinnvoll", points: ["Schloss", "Haus-Bildschirm", "Lichtszenen für Bogen-Momente", "Lärmpegel ohne Ton", "Sicherheit", "Energie fair teilen", "anonyme Raumnutzung"] },
        { title: "rote Linien", points: ["keine Kameras innen", "keine Mikrofone", "keine Personen verfolgen", "nie heimlich", "nie Pflicht"] },
        { title: "Phasen", points: ["Launch: nichts", "nach Launch: Schloss + Lärm", "nach Umzug: Bildschirm + Licht", "Hof: ganzes Betriebssystem"] },
      ],
      highlight: "Verbinden, nicht selbst bauen",
      sentence: "Simpulo misst Räume, nie Menschen.",
      links: [{ label: "Labore", href: "/admin/labore" }],
    },
    {
      id: "eigentum",
      letter: "g",
      title: "Eigentum & Rendite",
      groups: [
        { title: "Getrennt", points: ["Simpulo: Tech, Wachstum", "Simpulo Places: Anteile 10–30 % je Hof-Gesellschaft", "Rendite fließt zurück"] },
        { title: "Lebensdauer", points: ["Rohbau 50–100 J", "Innenausbau 10–15 J", "Technik 5–10 J", "Plattform ständig", "Bedürfnis zeitlos"] },
        { title: "Phasen", points: ["jetzt: keine Immobilien", "nach Umzug: Pacht als Test", "nach Runde: erste Höfe mit Partnern", "mit Beweis: Anteile wachsen"] },
      ],
      links: [{ label: "Finanzierung", href: "/admin/funding" }],
    },
    {
      id: "franchise",
      letter: "h",
      title: "Simpulo bestimmt, andere bauen",
      groups: [
        { title: "Simpulo bestimmt", points: ["Design", "Bogen", "Matching", "Marke", "Daten", "füllt die Höfe"] },
        { title: "Drei Wege", points: ["Franchise", "Betriebsvertrag", "eigene Anteile"] },
        { title: "Kontrolle", points: ["Design-Handbuch", "Abnahme vor Eröffnung", "Messen (Verbindungsrate, Wiederkehr)", "Marke entziehen"] },
      ],
      highlight: "Erste Höfe per Betriebsvertrag oder eigene Anteile, Franchise erst mit erprobtem Handbuch.",
    },
    {
      id: "positionierung",
      letter: "i",
      title: "Kein Coliving",
      highlight: "Coliving vermietet Räume und hofft auf Gemeinschaft. Simpulo erzeugt Gemeinschaft und nutzt dafür Räume.",
      points: ["Kategorie: Zusammenleben auf Zeit", "Vorbild: Tulou (Fujian)", "nicht Apple Park"],
    },
    {
      id: "longevity",
      letter: "j",
      title: "Soziale Säule von Longevity",
      groups: [
        { title: "Bausteine", points: ["Themen-Houses (Bewegung, Essen, Schlaf mit Crew)", "Moai-Kreise (jährlich wieder)", "50+ und Übergänge", "Partner (Kliniken, Retreats)", "Hof als gebaute Blue Zone"] },
        { title: "Grenzen", points: ["keine Heilversprechen", "keine Gesundheitsdaten", "keine Klinik"] },
      ],
      links: [{ label: "Vision › Zielgruppen", href: "?block=segments" }],
    },
    {
      id: "boerse",
      letter: "k",
      title: "Weg zur Börse",
      points: ["nur mit leichtem Modell", "andere besitzen, Simpulo bestimmt und füllt", "realistisch ab „sehr erfolgreich“", "100 Mio.–1 Mrd. € Umsatz/Jahr"],
      note: "Strategische Einordnung, keine Finanzberatung.",
      links: [{ label: "Finanzierung", href: "/admin/funding" }],
    },
  ] as const satisfies readonly HofPart[],
  text: {
    parts: "Bausteine",
    status: "Status",
    continues: "Weiter in",
    lab: "Lab (noch kein Admin-Tab)",
  },
} as const;
