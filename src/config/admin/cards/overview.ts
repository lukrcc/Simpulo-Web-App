import type { CardDef } from "./types";

/** Übersicht: one card per page, each leads to that page's overview – nothing twice, no topics of its own. */
export const OVERVIEW_CARDS: readonly CardDef[] = [
  { topic: "money", icon: "Wallet", tab: "", href: "/admin/money", main: "revenue", subs: ["profit", "bookingVolume"] },
  { topic: "growth", icon: "TrendingUp", tab: "", href: "/admin/growth", main: "visitors", subs: ["requests", "bookings"] },
  { topic: "analysis", icon: "Tags", tab: "", href: "/admin/topics", main: "connection", subs: ["repeat", "sweetSpot"] },
  { topic: "houses", icon: "Home", tab: "", href: "/admin/houses", main: "openHouses", subs: ["needsHelp", "fullNow"] },
  { topic: "hosts", icon: "Users", tab: "", href: "/admin/hosts", main: "activeHosts", subs: ["newHosts", "applicationsOpen"] },
  { topic: "marketing", icon: "Megaphone", tab: "", href: "/admin/marketing", main: "pipeline", subs: ["replyRate", "waitlist"] },
  { topic: "funding", icon: "Landmark", tab: "", href: "/admin/funding", main: "marketCap", subs: ["readiness"] },
  { topic: "launch", icon: "CalendarRange", tab: "", href: "/admin/zeitplan", main: "launch", subs: ["criteria", "nextMilestone"] },
];
