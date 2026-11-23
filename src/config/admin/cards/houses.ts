import type { CardDef } from "./types";

/** Houses: Alle · Braucht Hilfe · Läuft gut · Gerade voll · 2+ Vormerkungen · Themen · Wartet auf Antwort · Abgesagt. */
export const HOUSES_CARDS: readonly CardDef[] = [
  { topic: "all", icon: "LayoutGrid", tab: "all", main: "all", subs: ["coming", "soon", "cities"] },
  { topic: "atRisk", icon: "AlertTriangle", tab: "atRisk", main: "atRisk", subs: ["within7", "boosted"] },
  { topic: "goingWell", icon: "ThumbsUp", tab: "goingWell", main: "goingWell", subs: ["medianFull", "fastest"] },
  { topic: "full", icon: "CircleCheck", tab: "all", focus: "full", main: "full", subs: ["shareComing", "spots"] },
  { topic: "reserved", icon: "Bookmark", tab: "all", focus: "reserved", main: "reserved", subs: ["withTwo", "hostOnly", "fill"] },
  { topic: "themes", icon: "Shapes", tab: "themes", main: "themes", subs: ["themeTop", "themeLow", "themeGap"] },
  { topic: "unanswered", icon: "MessageSquare", tab: "atRisk", focus: "unanswered", main: "unanswered", subs: ["quiet", "longestHours"] },
  { topic: "cancelled", icon: "CircleX", tab: "all", focus: "cancelled", main: "cancelled", subs: ["byHost", "notFull", "takenDown"] },
];
