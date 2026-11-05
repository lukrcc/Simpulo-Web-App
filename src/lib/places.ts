// Cities and countries for Edit profile and Open a House's suggestions. A local list; later Google Places Autocomplete, same shape.
import { worldRegionOf, type WorldRegion } from "./worldRegions";

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

/** Countries for "Country" in Edit profile (mock list – later Google Places, like the cities). */
export const COUNTRIES: readonly string[] = [
  ...new Set([
    ...CITIES.map(([, country]) => country),
    "Belgium", "Canada", "Chile", "China", "Estonia", "Finland", "Hungary", "Iceland", "India", "Ireland", "Israel", "Latvia",
    "Lithuania", "Luxembourg", "Malaysia", "Norway", "Peru", "Poland", "Romania", "Singapore", "Slovenia", "Sri Lanka",
    "Sweden", "Switzerland", "Ukraine", "Uruguay",
  ]),
].toSorted((a, b) => a.localeCompare(b));
