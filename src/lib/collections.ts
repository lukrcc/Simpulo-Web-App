// Explore collection rows: themed, horizontally scrollable rows between the sections of the "Open Houses" grid.
// Shown in this order, each at most once per page and only with at least MIN_COLLECTION_SIZE Houses. Hidden while a
// filter is active (see ExploreFeed). Titles and sublines live in messages (explore.collections.{id}).
import type { Stay } from "./types";
import { stayNights } from "./utils";

export const MIN_COLLECTION_SIZE = 3;

export interface Collection {
  id: "shortTrips" | "party" | "trainTogether" | "buildTogether" | "meetSomeone";
  /** In URLs: /collections/{slug} and Explore's ?collection={slug} */
  slug: string;
  filter: (stay: Stay) => boolean;
}

export const COLLECTIONS: readonly Collection[] = [
  { id: "shortTrips", slug: "short-trips", filter: (s) => s.vibe === "weekend" || (s.startDate !== "" && stayNights(s) <= 5) },
  { id: "party", slug: "party-houses", filter: (s) => s.vibe === "party" },
  { id: "trainTogether", slug: "train-together", filter: (s) => s.vibe === "fitness" || s.vibe === "surf" || s.vibe === "adventure" },
  { id: "buildTogether", slug: "build-with-others", filter: (s) => s.vibe === "founder" || s.vibe === "business" || s.vibe === "remote-work" },
  { id: "meetSomeone", slug: "meet-someone", filter: (s) => s.vibe === "singles" || s.vibe === "social" },
];

/** The collections worth showing for these Houses (already in feed order), each with its Houses. */
export function collectionsFor(stays: readonly Stay[]): { collection: Collection; stays: Stay[] }[] {
  return COLLECTIONS.map((collection) => ({ collection, stays: stays.filter(collection.filter) })).filter(
    (c) => c.stays.length >= MIN_COLLECTION_SIZE,
  );
}

export function collectionBySlug(slug: string | null | undefined): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
