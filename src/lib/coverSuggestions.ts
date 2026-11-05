// Open a House, "Pick a cover": photos that fit the theme and the place, from what the data source has. The one way in, so a stock provider
// (Pexels) can take over later with the same shape. Never someone's profile photo: only Houses' own theme photos.
import type { Stay, Vibe } from "./types";

export const COVER_SUGGESTIONS = 6;

export interface CoverQuery {
  vibe: Vibe | "";
  city: string;
  region: string;
}

export type CoverProvider = (query: CoverQuery) => string[];

/** Same city and theme first, then the theme, then the country. One photo per House, its second if it has one: the first is often the people. */
export function coversFromHouses(stays: readonly Pick<Stay, "photos" | "vibe" | "city" | "region">[], { vibe, city, region }: CoverQuery): string[] {
  const country = region.split(",").at(-1)?.trim();
  const score = (stay: Pick<Stay, "vibe" | "city" | "region">) => Number(stay.vibe === vibe) * 2 + Number(Boolean(city) && stay.city === city) * 2 + Number(Boolean(country) && stay.region.endsWith(country ?? ""));
  const photos = stays
    .filter((stay) => (stay.photos?.length ?? 0) > 0 && score(stay) > 0)
    .toSorted((a, b) => score(b) - score(a))
    .map((stay) => stay.photos?.[1] ?? stay.photos?.[0] ?? "");
  return [...new Set(photos)].slice(0, COVER_SUGGESTIONS);
}
