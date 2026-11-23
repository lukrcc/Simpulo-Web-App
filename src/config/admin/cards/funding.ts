import type { CardDef } from "./types";

/** Finanzierung: Bereitschaft · Bewertung · Runden · Unterlagen · These · Firmenstruktur · Deckungsbeitrag · Verwendung. */
export const FUNDING_CARDS: readonly CardDef[] = [
  { topic: "readiness", icon: "CircleCheck", tab: "readiness", main: "ready", subs: ["repeat", "growth", "hubs"] },
  { topic: "valuation", icon: "Gem", tab: "valuation", main: "valuation", subs: ["spanLow", "spanHigh"] },
  { topic: "rounds", icon: "Layers", tab: "rounds", main: "round", subs: ["next"] },
  { topic: "documents", icon: "FolderOpen", tab: "documents", main: "documents", subs: ["docsInProgress", "docsMissing"] },
  { topic: "thesis", icon: "Lightbulb", tab: "thesis", main: "allocation", subs: ["biggestShare", "allocated"] },
  { topic: "structure", icon: "Building2", tab: "structure", focus: "motors", main: "structure", subs: ["motors"] },
  { topic: "contribution", icon: "PiggyBank", tab: "readiness", focus: "contribution", main: "contribution", subs: ["repeat"] },
  { topic: "allocation", icon: "PieChart", tab: "thesis", main: "allocationCount", subs: ["allocation.1", "allocation.2", "allocation.3"] },
];
