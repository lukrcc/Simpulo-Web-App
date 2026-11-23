import type { CardDef } from "./types";

/** Hosts: Alle · Stufen · Founding · Prüfen · Bewerbungen · Vorbereitet · Wiederkehrend · Aktiv / inaktiv. */
export const HOSTS_CARDS: readonly CardDef[] = [
  { topic: "all", icon: "Users", tab: "all", main: "all", subs: ["activeCount", "newMonth", "value"] },
  { topic: "tiers", icon: "Layers", tab: "all", focus: "tiers", main: "tiers", subs: ["share", "pro", "anchor"] },
  { topic: "founding", icon: "Award", tab: "all", focus: "founding", main: "founding", subs: ["foundingFree", "fill"] },
  { topic: "review", icon: "SearchCheck", tab: "review", main: "review", subs: ["warned", "anchorPending"] },
  { topic: "applications", icon: "FileText", tab: "applications", main: "applications", subs: ["oldestDays", "accepted"] },
  { topic: "prepared", icon: "ClipboardList", tab: "prepared", main: "prepared", subs: ["claimed", "preparedCities"] },
  { topic: "recurring", icon: "Repeat", tab: "all", focus: "recurring", main: "recurring", subs: ["recurringCount", "avgGap"] },
  { topic: "active", icon: "Activity", tab: "all", focus: "inactive", main: "active", subs: ["activeCount", "dormant"] },
];
