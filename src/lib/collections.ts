// The collections: by a House's state (Starting soon, Last spot, Just opened, Short trips) and by theme. Explore shows at most one of them, by
// state, under the Spotlight (topStateShelf); a shelf never shows the same photo twice. Each collection also has its own page. Titles and sublines live in messages (explore.collections.{id}).
import { JUST_OPENED_DAYS, SHELF_MAX_ITEMS, STARTING_SOON_DAYS, TOP_SHELF_MIN } from "@/config/explore";
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

/** Explore's one shelf by state, under the Spotlight: Just opened, else Starting soon, else Short trips – the first with at least TOP_SHELF_MIN
 *  Houses that `exclude` (the shelf above it) doesn't have. */
export function topStateShelf(stays: readonly Stay[], exclude: ReadonlySet<string> = new Set()): Shelf | null {
  for (const id of ["justOpened", "startingSoon", "shortTrips"] as const) {
    const collection = STATE_COLLECTIONS.find((c) => c.id === id)!;
    const shelf = shelfOf(stays.filter((s) => collection.filter(s) && !exclude.has(s.id)));
    if (shelf.length >= TOP_SHELF_MIN) return { collection, stays: shelf };
  }
  return null;
}

export function collectionBySlug(slug: string | null | undefined): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
