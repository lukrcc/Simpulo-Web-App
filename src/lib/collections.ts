// The shelves in Open Houses take turns without end: by a House's state (Starting soon, Last spot, Just opened, Short trips), then the theme
// shelves once there are enough Houses for them (src/config/explore.ts). No House shows in two shelves or in a shelf after the grid loaded
// before it, and a shelf never shows the same photo twice. Each collection also has its own page. Titles and sublines live in messages (explore.collections.{id}).
import { JUST_OPENED_DAYS, SHELF_CLEAR_ROWS_BELOW, SHELF_EARLY_COUNT, SHELF_EVERY_EARLY, SHELF_EVERY_LATE, SHELF_MAX_ITEMS, STARTING_SOON_DAYS, STATE_SHELF_MIN, THEME_SHELF_MIN_ITEMS, THEME_SHELVES_MIN_TOTAL } from "@/config/explore";
import type { Stay } from "./types";
import { housePhotos, openSpots, stayNights } from "./utils";

/** From this many Houses a collection's own page is indexed. */
export const MIN_COLLECTION_SIZE = 3;

export interface Collection {
  id: "startingSoon" | "lastSpot" | "justOpened" | "shortTrips" | "party" | "trainTogether" | "buildTogether" | "meetSomeone";
  /** In URLs: /collections/{slug} and Explore's ?collection={slug} */
  slug: string;
  filter: (stay: Stay) => boolean;
}

const DAY_MS = 86_400_000;
const todayIso = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY_MS);

/** A House's state right now: the shelves that take turns in the list. */
const STATE_COLLECTIONS: readonly Collection[] = [
  { id: "startingSoon", slug: "starting-soon", filter: (s) => s.startDate >= todayIso() && daysBetween(todayIso(), s.startDate) <= STARTING_SOON_DAYS && openSpots(s) > 0 },
  { id: "lastSpot", slug: "last-spot", filter: (s) => openSpots(s) === 1 },
  { id: "justOpened", slug: "just-opened", filter: (s) => daysBetween(s.createdAt, todayIso()) <= JUST_OPENED_DAYS && s.spotsFilled <= 1 && openSpots(s) > 0 },
  { id: "shortTrips", slug: "short-trips", filter: (s) => s.startDate !== "" && stayNights(s) <= 5 },
];

const THEME_COLLECTIONS: readonly Collection[] = [
  { id: "party", slug: "party-houses", filter: (s) => s.vibe === "party" },
  { id: "trainTogether", slug: "train-together", filter: (s) => s.vibe === "fitness" || s.vibe === "surf-water" || s.vibe === "adventure" },
  { id: "buildTogether", slug: "build-with-others", filter: (s) => s.vibe === "founder" || s.vibe === "remote-work" },
  { id: "meetSomeone", slug: "meet-someone", filter: (s) => s.vibe === "social" },
];

export const COLLECTIONS: readonly Collection[] = [...STATE_COLLECTIONS, ...THEME_COLLECTIONS];

export interface Shelf {
  collection: Collection;
  stays: Stay[];
}

/** Houses in their order without any whose cover is already there, cut to a shelf's length. */
function shelfOf(stays: readonly Stay[]): Stay[] {
  const covers = new Set<string>();
  return stays
    .filter((stay) => {
      const cover = housePhotos(stay)[0] ?? stay.id;
      if (covers.has(cover)) return false;
      covers.add(cover);
      return true;
    })
    .slice(0, SHELF_MAX_ITEMS);
}

/** Where a shelf goes into the list: after this many Houses. */
export type ShelfSlot = { after: number } & Shelf;

/** How many Houses are loaded once the list has reached `after`: "Show 24 more" pages on from full rows. */
function loadedAt(after: number, cols: number, pageSize: number): number {
  const fullRows = (n: number) => Math.ceil(n / cols) * cols;
  let loaded = fullRows(pageSize);
  while (loaded < after) loaded = fullRows(loaded + pageSize);
  return loaded;
}

/**
 * The shelves for the list down to `loaded` Houses. The turns go round for as long as there are Houses for them: at each place the next one
 * in the fixed order with enough Houses of its own, the others keep their turn order but are passed over. A shelf only has Houses that
 * `seenHouseIds` doesn't: the grid loaded by then, the rows just below it, and every shelf before it. Those only grow, so once a whole round
 * finds nothing the list has no more shelves. The same pages always give the same shelves: loading more never changes one above.
 * `stays`: all Houses in the shelves' order. `grid`: the list.
 */
export function planShelves({ stays, grid, cols, total, loaded, pageSize }: { stays: readonly Stay[]; grid: readonly Stay[]; cols: number; total: number; loaded: number; pageSize: number }): ShelfSlot[] {
  const themed = total >= THEME_SHELVES_MIN_TOTAL;
  const turns = themed ? COLLECTIONS : STATE_COLLECTIONS;
  const slots: ShelfSlot[] = [];
  const seenHouseIds = new Set<string>();
  let shown = 0;
  let turn = 0;
  let rows = 0;
  for (;;) {
    rows += slots.length < SHELF_EARLY_COUNT ? SHELF_EVERY_EARLY : SHELF_EVERY_LATE;
    const after = rows * cols;
    if (after > Math.min(loaded, grid.length)) return slots;
    const reach = Math.max(loadedAt(after, cols, pageSize), after + SHELF_CLEAR_ROWS_BELOW * cols);
    for (; shown < reach && shown < grid.length; shown++) seenHouseIds.add(grid[shown].id);
    let placed = false;
    for (let tries = 0; tries < turns.length && !placed; tries++) {
      const collection = turns[turn % turns.length];
      turn++;
      const shelf = shelfOf(stays.filter((s) => collection.filter(s) && !seenHouseIds.has(s.id)));
      if (shelf.length < (THEME_COLLECTIONS.includes(collection) ? THEME_SHELF_MIN_ITEMS : STATE_SHELF_MIN)) continue;
      shelf.forEach((s) => seenHouseIds.add(s.id));
      slots.push({ after, collection, stays: shelf });
      placed = true;
    }
    if (!placed) return slots;
  }
}

export function collectionBySlug(slug: string | null | undefined): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
