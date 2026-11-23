import type { CardDef } from "./types";

/** System: Phase · Tools · Launch-Checkliste · Werte · Log (→ Log) – fewer than eight, so the cards are larger. */
export const SYSTEM_CARDS: readonly CardDef[] = [
  { topic: "phase", icon: "Rocket", tab: "settings", main: "phase", subs: ["allowed"] },
  { topic: "tools", icon: "Wrench", tab: "tools", main: "tools", subs: ["toolsAll", "toolGroups"] },
  { topic: "launch", icon: "ListChecks", tab: "prepare", focus: "launch", main: "criteria", subs: ["realHouses", "waitlistConfirmed"] },
  { topic: "values", icon: "SlidersHorizontal", tab: "settings", focus: "values", main: "values", subs: ["hideCategory", "removeAll"] },
  { topic: "log", icon: "ScrollText", tab: "", href: "/admin/log", main: "log", subs: ["today"] },
];
