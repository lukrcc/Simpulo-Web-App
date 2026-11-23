// Admin › Labore › Raum: "Simpulo-Architektur" (German, admin only) – the sentence, the five rules (the same as Vision › Der Hof › Fünf Regeln),
// the climate zones, the digital pattern book, the tools; and the data plan: which data points (config/data-points.ts – names and status come
// from there) feed demand, space and effect, and the method as a chain. Theses to test, no proof yet.

export const ARCHITECTURE = {
  sentence: "Gefühl + Wissen = Form",
  sentenceNote: "Was Menschen an einem Ort fühlen, und was wir aus den Daten wissen, wird zu einer Form, die man bauen kann.",
  rulesTitle: "Die fünf Regeln (These)",
  /** The five rules – one line each; tested as theses in Admin › Algorithmus */
  rules: [
    { no: 1, title: "Mitte", text: "Ein gemeinsamer Ort, an dem sich alle sehen – Tisch, Feuer, Hof." },
    { no: 2, title: "Rand", text: "Die eigenen Zimmer liegen am Rand, mit Blick zur Mitte." },
    { no: 3, title: "Wege durch die Mitte", text: "Wer zur Tür oder zum Bad geht, kommt an der Mitte vorbei." },
    { no: 4, title: "Schwelle", text: "Ein Übergang zwischen eigen und gemeinsam – Nische, Bank, Vorraum." },
    { no: 5, title: "Rückzug", text: "Jeder findet einen ruhigen Ort für sich." },
  ],
  rulesLink: "Thesen im Algorithmus →",
  climateTitle: "Klimazonen",
  climateHead: ["Zone", "Die Mitte ist …", "Typisch"],
  climate: [
    { zone: "Nordisch", middle: "der warme Raum um Ofen und Feuer", typical: "Holz, kleine Fenster, Sauna" },
    { zone: "Mitteleuropa", middle: "die große Küche mit dem Tisch", typical: "Stube, Vierseithof, Scheune" },
    { zone: "Mittelmeer", middle: "der schattige Innenhof", typical: "Patio, Brunnen, dicke Mauern" },
    { zone: "Tropen", middle: "die offene, überdachte Veranda", typical: "Querlüftung, weites Dach, leichte Wände" },
    { zone: "Wüste", middle: "der kühle, umschlossene Hof", typical: "Riad, Lehm, Windturm" },
  ],
  patternBookTitle: "Digitales Musterbuch",
  patternBook:
    "Jede Regel wird ein Muster mit Stellschrauben: Mitte, Ring, Wege, Schwellen und Rückzug – in fünf Größen von der Wohnung bis zum Dorf und je Klimazone angepasst. Aus den Daten der Houses wird ein Entwurf, den Partner bauen; jeder gebaute Ort misst wieder mit.",
  toolsTitle: "Werkzeuge",
  tools: [
    { when: "jetzt", name: "Blender", use: "Skizzen und Varianten in 3D" },
    { when: "später", name: "Rhino / Grasshopper", use: "Muster mit Stellschrauben (parametrisch)" },
    { when: "später", name: "Revit / ArchiCAD", use: "Baupläne für Partner (BIM)" },
    { when: "später", name: "Twinmotion / VR", use: "Räume begehen, bevor sie gebaut sind" },
  ],
  /** The data plan: three columns, each a list of data point ids (config/data-points.ts) */
  planColumns: [
    {
      key: "demand",
      title: "Nachfrage",
      text: "Wo und wann Menschen zusammen sein wollen",
      ids: ["search.placeMonth", "search.saved", "search.inFor", "create.placeMonth", "create.accommodationType", "request.reserved", "waitlist.signup"],
    },
    {
      key: "space",
      title: "Raum",
      text: "Wie der Ort gebaut ist",
      ids: [
        "create.space.floors",
        "create.space.ceiling",
        "create.space.courtyard",
        "create.space.roomCount",
        "create.space.layout",
        "create.space.middle",
        "create.space.material",
        "create.space.noise",
        "create.space.bedrooms",
        "create.space.bathrooms",
        "create.space.shared",
        "create.space.table",
        "create.space.seats",
        "create.space.kitchen",
        "create.space.paths",
        "create.space.retreat",
        "create.space.rooms",
        "create.space.outdoor",
        "create.space.area",
        "create.space.daylight",
        "create.space.setting",
        "sensor.roomUse",
        "sensor.noise",
      ],
    },
    {
      key: "effect",
      title: "Wirkung",
      text: "Was der Raum mit der Crew macht",
      ids: ["after.space.where", "after.space.feel", "after.space.wellbeing", "after.space.retreat", "after.again", "after.mutual", "after.noise", "after.intentionReached", "after.doItAgain"],
    },
  ],
  status: { used: "aktiv", collecting: "vorbereitet", planned: "geplant" },
  methodTitle: "Methode",
  method: ["Vergleiche", "Thesen", "Tests", "Musterbuch", "Entwurf", "Bau", "messen"],
  views: { label: "Raum", overview: "Überblick", architecture: "Architektur", plan: "Datenplan" },
} as const;

export type ArchitectureView = keyof typeof ARCHITECTURE.views & ("overview" | "architecture" | "plan");
