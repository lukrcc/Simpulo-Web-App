// What Simpulo learns from its data: five models, each with what it delivers, where that goes, how success is measured and how far it is.
// Its inputs are not listed here: they are the data points that name it (config/data-points.ts inputsOf) – one source.

export const MODEL_IDS = ["interestRanking", "crewFit", "houseChemistry", "demandMap", "marketingImpact"] as const;
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
}

export const MODELS: readonly Model[] = [
  {
    id: "interestRanking",
    name: "Interest ranking",
    output: "Each person's topics in order – 1st, 2nd, 3rd …",
    feeds: "Discovery (Explore rows) and For your next trip",
    measure: "Click and request rate of the suggestions",
    stage: "rules",
  },
  {
    id: "crewFit",
    name: "Crew fit",
    output: "A matching score between two people",
    feeds: "Suggestions to hosts and in Fill your House",
    measure: "Mutual \"Your people\" after a House",
    stage: "rules",
  },
  {
    id: "houseChemistry",
    name: "House chemistry",
    output: "The social fabric of a House, from the rating after the stay",
    feeds: "Quality signals and Do it again",
    measure: "Share of mutual \"with you again\", early departures, reports",
    stage: "idea",
  },
  {
    id: "demandMap",
    name: "Demand map",
    output: "Demand without supply, per place and topic",
    feeds: "Where Houses should open – later Simpulo Houses",
    measure: "Share of opened Houses that fill where the map pointed",
    stage: "rules",
  },
  {
    id: "marketingImpact",
    name: "Marketing impact",
    output: "From source to sign-up, per channel, series and video",
    feeds: "Which series and which video to make more of",
    measure: "Sign-ups per source and per video",
    stage: "idea",
  },
];
