// The one list of place images: per city (its place id = slug) one fitting landscape photo from public/destinations/<slug>.jpg – curated by
// hand, checked in, listed by scripts/sync-destination-images.ts (destination-images.generated.ts). A place without an entry has no image;
// nothing falls back to a House's photo or an image URL from anywhere else.
import { CURATED_IMAGE_SLUGS } from "@/lib/data/destination-images.generated";

export const PLACE_IMAGES: Readonly<Record<string, string>> = Object.fromEntries(CURATED_IMAGE_SLUGS.map((slug) => [slug, `/destinations/${slug}.jpg`]));

/** The curated photo of a place, or null. */
export const placeImageOf = (placeId: string): string | null => PLACE_IMAGES[placeId] ?? null;
