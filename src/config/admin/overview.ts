// Admin › Übersicht: the order of its 20 tiles (4 rows × 5, left → right) – one place, easy to change (CLAUDE.md "Übersicht mit Kapseln").
// Each tile belongs to a group capsule (config/admin-tiles.ts "overview": Heute blue · Richtung orange · Geld green · Nachfrage teal ·
// Qualität lilac) – its colour and where a click leads. R1 Heute (Aufgaben, Braucht Hilfe) | Richtung (Pipeline, Launch, Market Cap),
// R2 Geld, R3 Nachfrage, R4 Qualität. Structure only, no words.

export type OverviewGroup = "today" | "direction" | "money" | "demand" | "quality";

export interface OverviewRow {
  key: string;
  tiles: readonly { key: string; group: OverviewGroup }[];
}

const row = (key: string, group: OverviewGroup, tiles: readonly string[]) => ({ key, tiles: tiles.map((tile) => ({ key: tile, group })) });

export const OVERVIEW_ROWS: readonly OverviewRow[] = [
  {
    key: "act",
    tiles: [
      { key: "inbox", group: "today" },
      { key: "needsHelp", group: "today" },
      { key: "pipeline", group: "direction" },
      { key: "launch", group: "direction" },
      { key: "marketCap", group: "direction" },
    ],
  },
  row("money", "money", ["bookingVolume", "revenue", "profit", "bookings", "perBooking"]),
  row("demand", "demand", ["visitors", "requests", "bestChannel", "waitlist", "webApp"]),
  row("quality", "quality", ["openHouses", "fullHouses", "nights", "connection", "repeat"]),
];

/** The groups' capsules in order (after Überblick). */
export const OVERVIEW_GROUPS: readonly OverviewGroup[] = ["today", "direction", "money", "demand", "quality"];

/** Each group's side-list area (the tile's AreaColor – its hover and focus ring) and its full page ("Ganze Seite: … →"). */
export const OVERVIEW_GROUP_AREA = { today: "today", direction: "plan", money: "numbers", demand: "numbers", quality: "platform" } as const;
export const OVERVIEW_GROUP_PAGE: Readonly<Record<OverviewGroup, string>> = {
  today: "/admin/aufgaben",
  direction: "/admin/marketing",
  money: "/admin/money?tab=history",
  demand: "/admin/growth?tab=origin",
  quality: "/admin/topics?tab=value",
};
