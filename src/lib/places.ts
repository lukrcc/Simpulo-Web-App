// Place search for "Add a place". Today a local list; later Google Places Autocomplete – it returns predictions of
// the same shape (placeId, name, country), so the dialog doesn't change. Nothing typed is ever saved as a place.
import { worldRegionOf, type WorldRegion } from "./interests";

export interface Place {
  /** Local id now ("local:lisbon"); a Google place_id later */
  placeId: string;
  name: string;
  country: string;
  region: WorldRegion | "";
}

const CITIES: ReadonlyArray<[name: string, country: string]> = [
  ["Lisbon", "Portugal"], ["Porto", "Portugal"], ["Ericeira", "Portugal"], ["Madeira", "Portugal"],
  ["Barcelona", "Spain"], ["Madrid", "Spain"], ["Tarifa", "Spain"], ["Valencia", "Spain"], ["Ibiza", "Spain"], ["Seville", "Spain"],
  ["Berlin", "Germany"], ["Munich", "Germany"], ["Paris", "France"], ["Amsterdam", "Netherlands"], ["Vienna", "Austria"],
  ["Innsbruck", "Austria"], ["Chamonix", "France"], ["Rome", "Italy"], ["Milan", "Italy"], ["Sicily", "Italy"],
  ["Athens", "Greece"], ["Split", "Croatia"], ["Prague", "Czechia"], ["Copenhagen", "Denmark"], ["Edinburgh", "United Kingdom"],
  ["London", "United Kingdom"], ["Tbilisi", "Georgia"], ["Istanbul", "Türkiye"],
  ["Canggu", "Indonesia"], ["Ubud", "Indonesia"], ["Uluwatu", "Indonesia"], ["Bangkok", "Thailand"], ["Chiang Mai", "Thailand"],
  ["Phuket", "Thailand"], ["Koh Phangan", "Thailand"], ["Da Nang", "Vietnam"], ["Hoi An", "Vietnam"], ["Siargao", "Philippines"],
  ["Tokyo", "Japan"], ["Kyoto", "Japan"], ["Seoul", "South Korea"], ["Taipei", "Taiwan"],
  ["Dubai", "United Arab Emirates"], ["Marrakech", "Morocco"], ["Dahab", "Egypt"],
  ["New York", "United States"], ["Los Angeles", "United States"], ["Miami", "United States"], ["Austin", "United States"],
  ["Mexico City", "Mexico"], ["Tulum", "Mexico"], ["Oaxaca", "Mexico"], ["Medellín", "Colombia"], ["Buenos Aires", "Argentina"],
  ["Rio de Janeiro", "Brazil"], ["Florianópolis", "Brazil"], ["Santa Teresa", "Costa Rica"],
  ["Cape Town", "South Africa"], ["Nairobi", "Kenya"], ["Zanzibar", "Tanzania"],
  ["Sydney", "Australia"], ["Melbourne", "Australia"], ["Byron Bay", "Australia"], ["Queenstown", "New Zealand"],
];

const slug = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

export const PLACES: readonly Place[] = CITIES.map(([name, country]) => ({ placeId: `local:${slug(name)}`, name, country, region: worldRegionOf(country) }));

/** Accents and case don't matter: "medellin" finds Medellín. */
const fold = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Suggestions for what's typed: names starting with it first, then names or countries containing it. */
export function searchPlaces(query: string, limit = 6): Place[] {
  const q = fold(query.trim());
  if (!q) return [];
  const starts = PLACES.filter((p) => fold(p.name).startsWith(q));
  const contains = PLACES.filter((p) => !starts.includes(p) && (fold(p.name).includes(q) || fold(p.country).includes(q)));
  return [...starts, ...contains].slice(0, limit);
}

/** The place of a name (for demand spots and popular chips) – undefined if it isn't in the list. */
export function placeByName(name: string): Place | undefined {
  const n = fold(name);
  return PLACES.find((p) => fold(p.name) === n);
}
