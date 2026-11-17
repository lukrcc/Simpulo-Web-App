// Texts in German – shown only in the admin (CLAUDE.md "Admin").
// What Simpulo learns from its data: five models, each with what it delivers, where that goes, how success is measured and how far it is.
// Its inputs are not listed here: they are the data points that name it (config/data-points.ts inputsOf) – one source.

export const MODEL_IDS = ["interestRanking", "crewFit", "houseChemistry", "demandMap", "marketingImpact", "spaceEffect", "placeFit"] as const;
export type ModelId = (typeof MODEL_IDS)[number];

/** idea – described only · rules – hand-written rules on the data · trained – learned from outcomes */
export type ModelStage = "idea" | "rules" | "trained";

export interface Model {
  id: ModelId;
  name: string;
  /** What it delivers */
  output: string;
  /** Where the result is used */
  feeds: string;
  /** How we know it works */
  measure: string;
  stage: ModelStage;
  /** The decisions it feeds, short (Algorithmus › Fluss, from `feeds`; the same label from two models is one decision) */
  decisions: readonly string[];
}

export const MODELS: readonly Model[] = [
  {
    id: "interestRanking",
    name: "Interessen-Ranking",
    output: "Die Themen jeder Person in Reihenfolge – 1., 2., 3. …",
    feeds: "Entdecken (Reihen auf Explore) und „For your next trip“",
    measure: "Klick- und Anfragequote der Vorschläge",
    stage: "rules",
    decisions: ["Explore-Reihen"],
  },
  {
    id: "crewFit",
    name: "Crew-Passung",
    output: "Ein Passungswert zwischen zwei Personen",
    feeds: "Vorschläge an Hosts und in „Fill your House“",
    measure: "Gegenseitige „Your people“ nach einem House",
    stage: "rules",
    decisions: ["Vorschläge an Hosts"],
  },
  {
    id: "houseChemistry",
    name: "House-Chemie",
    output: "Das soziale Gefüge eines House, aus der Bewertung nach dem Aufenthalt",
    feeds: "Qualitätssignale und „Do it again“",
    measure: "Anteil gegenseitiger „wieder mit dir“, frühe Abreisen, Meldungen",
    stage: "idea",
    decisions: ["Do it again"],
  },
  {
    id: "demandMap",
    name: "Nachfrage-Karte",
    output: "Nachfrage ohne Angebot, je Ort und Thema",
    feeds: "Wo Houses eröffnen sollten – später Simpulo Houses",
    measure: "Anteil eröffneter Houses, die dort voll werden, wo die Karte hinzeigte",
    stage: "rules",
    decisions: ["Wo Houses eröffnen"],
  },
  {
    id: "marketingImpact",
    name: "Marketing-Wirkung",
    output: "Von der Quelle bis zur Anmeldung, je Kanal, Serie und Video",
    feeds: "Von welcher Serie und welchem Video es mehr braucht",
    measure: "Anmeldungen je Quelle und je Video",
    stage: "idea",
    decisions: ["Welche Videos"],
  },
  {
    id: "spaceEffect",
    name: "Raum-Wirkung",
    output: "Wie Raum-Daten auf Verbindungsrate und Wohlfühlen wirken",
    feeds: "Einrichtungs-Hinweise für Hosts und die Stellschrauben des Hofs (Menschen pro Mitte, Tischform, Wege, Rückzug, Küche)",
    measure: "noch offen",
    stage: "idea",
    decisions: ["Einrichtungs-Hinweise für Hosts", "Hof-Stellschrauben"],
  },
  {
    id: "placeFit",
    name: "Ort-Eignung",
    output: "Kandidaten für Pacht-Tests und Höfe – aus Nachfrage, ganzjährig, Wiederkehr, Verbindungsrate und Lücke",
    feeds: "Wo Pacht-Tests und Höfe hinkommen",
    measure: "noch offen",
    stage: "idea",
    decisions: ["Pacht-Test-Orte"],
  },
];
