import type { CardDef } from "./types";

/** Algorithmus: Datenpunkte · Modelle · Thesen · Fluss · Entscheidungen · Datenlücken · Nie erfasst · Nächste These. */
export const DATA_CARDS: readonly CardDef[] = [
  { topic: "points", icon: "ScatterChart", tab: "points", main: "points", subs: ["used", "collecting", "planned"] },
  { topic: "models", icon: "Box", tab: "flow", main: "models", subs: ["idea", "rules", "trained"] },
  { topic: "theses", icon: "Lightbulb", tab: "theses", main: "theses", subs: ["supported", "open", "rejected"] },
  { topic: "flow", icon: "GitBranch", tab: "flow", main: "moments", subs: ["models", "decisions"] },
  { topic: "decisions", icon: "Split", tab: "flow", main: "decisions", subs: ["models", "trained"] },
  { topic: "gaps", icon: "Search", tab: "points", focus: "planned", main: "planned", subs: ["collecting", "used"] },
  { topic: "never", icon: "ShieldOff", tab: "points", focus: "never", main: "never", subs: ["points"] },
  { topic: "nextThesis", icon: "Flag", tab: "theses", main: "nextThesis", subs: ["open", "supported"] },
];
