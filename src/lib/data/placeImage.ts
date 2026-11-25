// A place's picture in the search (CLAUDE.md "Panels einheitlich"): the cover of the most popular House there (the most people in, then the
// most spots) from the data – never an outside source. None: null, and the row shows its pin.
import { isListedStay } from "../launch";
import { stayInPlace } from "../savedSearches";
import type { Stay } from "../types";
import { housePhotos } from "../utils";
import { ALL_PLACES, placeKindOf } from "./places";

export function getPlaceImage(placeId: string, stays: readonly Stay[]): string | null {
  const place = ALL_PLACES.find((p) => p.id === placeId);
  if (!place) return null;
  // A city: only its own Houses (the 50km radius would give Lisbon, Sintra and Ericeira the same picture); a region or country: all in it.
  const name = place.name.toLowerCase();
  const inPlace = (s: Stay) => (placeKindOf(place.id) === "city" ? [s.city, s.location.city, s.location.area].some((n) => n?.toLowerCase() === name) : stayInPlace(s, place));
  const top = stays
    .filter((s) => isListedStay(s) && inPlace(s))
    .toSorted((a, b) => b.spotsFilled - a.spotsFilled || b.spotsTotal - a.spotsTotal || a.id.localeCompare(b.id))[0];
  return top ? (housePhotos(top)[0] ?? null) : null;
}
