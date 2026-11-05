// The shelves in Open Houses: by a House's state (Starting soon, Last spot, Just opened, Short trips), and the theme shelves once
// there are enough Houses for them (src/config/explore.ts). No House shows in two shelves or again in a shelf after the grid above it, and a shelf never
// shows the same photo twice. Each collection also has its own page. Titles and sublines live in messages (explore.collections.{id}).
import { JUST_OPENED_DAYS, MAX_THEME_SHELVES, SHELF_MAX_ITEMS, STARTING_SOON_DAYS, STATE_SHELF_MIN, THEME_SHELF_MIN_ITEMS, THEME_SHELVES_MIN_TOTAL } from "@/config/explore";
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

/**
 * The shelves for the list: one after every `perSlot` Houses (3 full rows). They take turns – Starting soon, Last spot, Just opened, Short
 * trips – and one without enough Houses of its own leaves its turn to the next. From THEME_SHELVES_MIN_TOTAL Houses on: Short trips, then
 * once each theme. A list too short for any still gets the first one at its end. A shelf leaves out what's in the grid above it and in the
 * rows just below it, and whatever an earlier shelf has. `stays`: all Houses in the shelves' order. `grid`: the list. Fixed per position,
 * so loading more never changes a shelf above.
 */
export function planShelves(stays: readonly Stay[], grid: readonly Stay[], perSlot: number, total: number): ShelfSlot[] {
  const themed = total >= THEME_SHELVES_MIN_TOTAL;
  const short = STATE_COLLECTIONS[STATE_COLLECTIONS.length - 1];
  const turns = themed ? [short, ...THEME_COLLECTIONS.slice(0, MAX_THEME_SHELVES)] : STATE_COLLECTIONS;
  const slots: ShelfSlot[] = [];
  const used = new Set<string>();
  let passed = 0;
  for (let turn = 0; passed < turns.length; turn++) {
    if (themed && turn === turns.length) break;
    const next = (slots.length + 1) * perSlot;
    if (next > grid.length && slots.length > 0) break;
    const after = Math.min(next, grid.length);
    const collection = turns[turn % turns.length];
    const seen = new Set(grid.slice(0, after + perSlot).map((s) => s.id));
    const own = stays.filter((s) => collection.filter(s) && !used.has(s.id) && !seen.has(s.id));
    const min = themed && collection !== short ? THEME_SHELF_MIN_ITEMS : STATE_SHELF_MIN;
    if (own.length < min) {
      passed++;
      continue;
    }
    passed = 0;
    const shelf = shelfOf(own);
    shelf.forEach((s) => used.add(s.id));
    slots.push({ after, collection, stays: shelf });
  }
  return slots;
}

export function collectionBySlug(slug: string | null | undefined): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
