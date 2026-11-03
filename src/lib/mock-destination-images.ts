import { APP_MODE } from "./appMode";
import { CURATED_DESTINATIONS } from "./data/destinations";
import type { Destination } from "./data/destinationTypes";
import { stays } from "./mock";

/**
 * ⚠ DEV ONLY – so the pages can be judged with all their cards: a destination without a picture of its own borrows a mock House's
 * photo, its own city's or country's if there is one, each photo once. Marked "fallback-dev"; never in demo or production.
 */
function withDevImages(destinations: readonly Destination[]): readonly Destination[] {
  const photosOf = (match: (country: string, city: string) => boolean) => stays.filter((s) => match(s.location.country, s.location.city)).flatMap((s) => (s.photos ?? []).slice(1));
  const anywhere = photosOf(() => true);
  const used = new Set(destinations.flatMap((d) => (d.coverImage ? [d.coverImage] : [])));
  return destinations.map((d, i) => {
    if (d.coverImage) return d;
    const near = [...photosOf((_, city) => city === d.name), ...photosOf((country) => country === d.country)];
    const start = (i * 37) % Math.max(1, anywhere.length);
    const photo = near.find((p) => !used.has(p)) ?? [...anywhere.slice(start), ...anywhere.slice(0, start)].find((p) => !used.has(p));
    if (!photo) return d;
    used.add(photo);
    return { ...d, coverImage: photo, imageSource: "fallback-dev" };
  });
}

/** The curated list as the mock shows it. */
export const MOCK_CURATED_DESTINATIONS: readonly Destination[] = APP_MODE === "dev" ? withDevImages(CURATED_DESTINATIONS) : CURATED_DESTINATIONS;
