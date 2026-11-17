// Admin › Vision › Longevity (WARUM): living longer and better – what Simpulo adds to it, what it offers, where it stops, and the sources
// to check before using any of it outside. German, admin only; the diagram is the BlockMap (factors → the goal).
export const LONGEVITY = {
  block: { title: "Longevity", subtitle: "Die soziale Säule", summary: "Simpulo ist die soziale Säule von Longevity." },
  factorsLabel: "Was Simpulo beiträgt",
  goalLabel: "Ziel",
  goal: { id: "goal", title: "LÄNGER UND BESSER LEBEN" },
  factors: [
    { id: "belonging", title: "Zugehörigkeit", subtitle: "gegen Einsamkeit" },
    { id: "connection", title: "Verbindung", subtitle: "Crew, Netzwerk" },
    { id: "meaning", title: "Sinn", subtitle: "gemeinsame Projekte" },
    { id: "transitions", title: "Übergänge", subtitle: "Umzug, Ruhestand" },
    { id: "habits", title: "Bewegung, Essen, Schlaf", subtitle: "gemeinsam" },
  ],
  productsTitle: "Produkte",
  products: ["Longevity-Houses", "Moai-Kreise", "50+", "Partner", "Hof als gebaute Blue Zone"],
  limitsTitle: "Grenzen",
  limits: ["keine Heilversprechen", "keine Gesundheitsdaten", "keine Klinik"],
  sourcesTitle: "Quellen",
  sources: ["Holt-Lunstad 2010", "Harvard Study of Adult Development", "Blue Zones", "US Surgeon General 2023"],
  sourcesNote: "vor Nutzung nach außen prüfen",
  sentence: "Simpulo ist die soziale Säule von Longevity.",
} as const;
