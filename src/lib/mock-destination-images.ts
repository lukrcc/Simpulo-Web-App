import { APP_MODE } from "./appMode";
import { CURATED_DESTINATIONS } from "./data/destinations";
import type { Destination } from "./data/destinationTypes";
import { continentOf, worldRegionOf, type Continent } from "./interests";
import { stays } from "./mock";
import { placeCoverPath } from "./mock-images";
import { PLACE_PHOTOS } from "./mock-place-photos";

/**
 * ⚠ DEV ONLY – so the pages can be judged with their cards: a destination without a picture of its own borrows a mock photo of a city,
 * landscape or building (PLACE_PHOTOS: no people, food or sport), each photo once. Its own city's first, then its country's, then its
 * part of the world; nothing from there: no photo, the fallback card. Marked "fallback-dev"; never in demo or production.
 */
function withDevImages(destinations: readonly Destination[]): readonly Destination[] {
  const photos = new Map<string, { city: string; country: string; continent: Continent | null }>();
  for (const s of stays) {
    for (const photo of s.photos ?? []) {
      if (!PLACE_PHOTOS.has(photo) || photos.has(photo)) continue;
      const region = worldRegionOf(s.location.country);
      photos.set(photo, { city: s.location.city, country: s.location.country, continent: region ? continentOf(region) : null });
    }
  }
  const used = new Set(destinations.flatMap((d) => (d.coverImage ? [d.coverImage] : [])));
  const chosen = new Map<string, string>();
  const tiers: ((d: Destination, photo: { city: string; country: string; continent: Continent | null }) => boolean)[] = [
    (d, p) => p.city === d.name,
    (d, p) => p.country === d.country,
    (d, p) => p.continent === continentOf(d.region),
  ];
  // Every place's own city goes first, so a neighbour's wider search can't take its photo.
  for (const d of destinations) {
    const cover = placeCoverPath(d.name);
    if (!d.coverImage && PLACE_PHOTOS.has(cover) && !used.has(cover)) {
      used.add(cover);
      chosen.set(d.id, cover);
    }
  }
  for (const fits of tiers) {
    for (const d of destinations) {
      if (d.coverImage || chosen.has(d.id)) continue;
      const hit = [...photos].find(([photo, about]) => !used.has(photo) && fits(d, about));
      if (!hit) continue;
      used.add(hit[0]);
      chosen.set(d.id, hit[0]);
    }
  }
  return destinations.map((d) => {
    const photo = chosen.get(d.id);
    return photo ? { ...d, coverImage: photo, imageSource: "fallback-dev" } : d;
  });
}

/** The curated list as the mock shows it. */
export const MOCK_CURATED_DESTINATIONS: readonly Destination[] = APP_MODE === "dev" ? withDevImages(CURATED_DESTINATIONS) : CURATED_DESTINATIONS;
