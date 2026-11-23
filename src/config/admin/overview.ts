// Admin › Übersicht: the order of its 20 tiles (4 rows × 5, left → right) and each tile's title colour – one place, easy to change
// (CLAUDE.md "Übersicht"). The colour is the row's (not the target page's); a click still leads to the tile's capsule (config/admin-tiles.ts).
// R1 Handeln & Richtung (Aufgaben, Braucht Hilfe blue | Pipeline, Launch, Market Cap orange – a slightly wider gap between the two groups),
// R2 Geld and R3 Nachfrage green, R4 Qualität lilac. Structure only, no words.

export type OverviewGroup = "today" | "numbers" | "platform" | "plan";

export interface OverviewRow {
  key: string;
  tiles: readonly { key: string; group: OverviewGroup }[];
  /** A wider gap after this many tiles (two groups in one row) */
  gapAfter?: number;
}

const row = (key: string, group: OverviewGroup, tiles: readonly string[]) => ({ key, tiles: tiles.map((tile) => ({ key: tile, group })) });

export const OVERVIEW_ROWS: readonly OverviewRow[] = [
  {
    key: "act",
    tiles: [
      { key: "inbox", group: "today" },
      { key: "needsHelp", group: "today" },
      { key: "pipeline", group: "plan" },
      { key: "launch", group: "plan" },
      { key: "marketCap", group: "plan" },
    ],
    gapAfter: 2,
  },
  row("money", "numbers", ["bookingVolume", "revenue", "profit", "bookings", "perBooking"]),
  row("demand", "numbers", ["visitors", "requests", "bestChannel", "waitlist", "webApp"]),
  row("quality", "platform", ["openHouses", "fullHouses", "nights", "connection", "repeat"]),
];
