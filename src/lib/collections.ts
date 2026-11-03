// The shelves in Open Houses: Short trips, and the theme shelves once there are enough Houses for them
// (src/config/explore.ts). No House shows in two shelves or again in a shelf after the grid above it, and a shelf never
// shows the same photo twice. Each collection also has its own page. Titles and sublines live in messages (explore.collections.{id}).
import { MAX_THEME_SHELVES, SHELF_MAX_ITEMS, SHORT_TRIPS_MIN, THEME_SHELF_MIN_ITEMS, THEME_SHELVES_MIN_TOTAL } from "@/config/explore";
import type { Stay } from "./types";
import { housePhotos, stayNights } from "./utils";

/** From this many Houses a collection's own page is indexed. */
export const MIN_COLLECTION_SIZE = 3;

export interface Collection {
  id: "shortTrips" | "party" | "trainTogether" | "buildTogether" | "meetSomeone";
  /** In URLs: /collections/{slug} and Explore's ?collection={slug} */
  slug: string;
  filter: (stay: Stay) => boolean;
}

export const COLLECTIONS: readonly Collection[] = [
  { id: "shortTrips", slug: "short-trips", filter: (s) => s.startDate !== "" && stayNights(s) <= 5 },
  { id: "party", slug: "party-houses", filter: (s) => s.vibe === "party" },
  { id: "trainTogether", slug: "train-together", filter: (s) => s.vibe === "fitness" || s.vibe === "surf" || s.vibe === "adventure" },
  { id: "buildTogether", slug: "build-with-others", filter: (s) => s.vibe === "founder" || s.vibe === "business" || s.vibe === "remote-work" },
  { id: "meetSomeone", slug: "meet-someone", filter: (s) => s.vibe === "singles" || s.vibe === "social" },
];

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
export type ShelfSlot = { after: number } & ({ kind: "interests" } | ({ kind: "collection" } & Shelf));

/**
 * The shelves for the list, in order: one after every `perSlot` Houses (3 full rows) – Short trips, Where do you want to go
 * next, then the theme shelves. A list too short for them still gets them at its end, Where next above all. `stays`: all
 * Houses in the shelves' order. `grid`: the list. Fixed per position, so loading more never moves a shelf above.
 */
export function planShelves(stays: readonly Stay[], grid: readonly Stay[], perSlot: number, total: number): ShelfSlot[] {
  const [short, ...themes] = COLLECTIONS;
  const slots: ShelfSlot[] = [];
  const used = new Set<string>();
  const seenAbove = (after: number) => new Set(grid.slice(0, after).map((s) => s.id));
  const place = () => Math.min((slots.length + 1) * perSlot, grid.length);

  const shortStays = stays.filter(short.filter);
  if (shortStays.length >= SHORT_TRIPS_MIN) {
    const after = place();
    const seen = seenAbove(after);
    const fresh = shortStays.filter((s) => !seen.has(s.id));
    // May overlap with the grid when there wouldn't be enough otherwise.
    const shelf = shelfOf(fresh.length >= SHORT_TRIPS_MIN ? fresh : shortStays);
    shelf.forEach((s) => used.add(s.id));
    slots.push({ after, kind: "collection", collection: short, stays: shelf });
  }
  slots.push({ after: place(), kind: "interests" });

  if (total < THEME_SHELVES_MIN_TOTAL) return slots;
  let themed = 0;
  for (const collection of themes) {
    if (themed === MAX_THEME_SHELVES) break;
    const after = (slots.length + 1) * perSlot;
    if (after > grid.length) break;
    const seen = seenAbove(after);
    const own = stays.filter((s) => collection.filter(s) && !used.has(s.id) && !seen.has(s.id));
    if (own.length < THEME_SHELF_MIN_ITEMS) continue;
    const shelf = shelfOf(own);
    shelf.forEach((s) => used.add(s.id));
    slots.push({ after, kind: "collection", collection, stays: shelf });
    themed++;
  }
  return slots;
}

export function collectionBySlug(slug: string | null | undefined): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
