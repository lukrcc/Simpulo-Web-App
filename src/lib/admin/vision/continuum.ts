// Admin › Vision › Kontinuum, the forms of living together (on top of the block's zoom): Simpulo – Zusammenleben auf Zeit – and its forms
// from a day to a village; coliving is one of them, not Simpulo itself. German, admin only; the diagram is the BlockMap.
export const CONTINUUM_FORMS = {
  title: "Formen",
  root: { id: "simpulo", title: "SIMPULO", subtitle: "Zusammenleben auf Zeit" },
  rootLabel: "Simpulo",
  formsLabel: "Formen",
  forms: [
    { id: "day", title: "Day House", subtitle: "ohne Übernachtung" },
    { id: "weekend", title: "Wochenende", subtitle: "Ferienhaus" },
    { id: "weeks", title: "1–4 Wochen", subtitle: "Wohnung, Villa" },
    { id: "hof", title: "Hof / Dorf", subtitle: "dauerhaft" },
  ],
  sentence: "Coliving ist eine Form innerhalb von Simpulo, nicht Simpulo selbst.",
  positioning: {
    title: "Positionierung",
    text: "Coliving vermietet Räume und hofft auf Gemeinschaft. Simpulo erzeugt Gemeinschaft und nutzt dafür Räume.",
    categoryLabel: "Kategorie",
    category: "Zusammenleben auf Zeit",
  },
} as const;
