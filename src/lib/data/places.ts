// Every place the search knows: cities (the curated list and more), regions and countries. A stand-in for the Places API later.
import type { SearchPlace } from "../savedSearches";
import { WORLD_REGIONS, worldRegionOf, type WorldRegion } from "../worldRegions";
import { CURATED_DESTINATIONS } from "./destinations";
import { foldPlace, slugOf, type DestinationCandidate } from "./destinationTypes";
import { MORE_CITIES } from "./moreCities";

const CITIES: readonly DestinationCandidate[] = [...CURATED_DESTINATIONS, ...MORE_CITIES.filter((c) => !CURATED_DESTINATIONS.some((d) => d.id === c.id))];

/** Regions inside a country: a centre and how far they reach. */
const AREAS: ReadonlyArray<readonly [name: string, country: string, lat: number, lng: number, radiusKm: number]> = [
  ["Bali", "Indonesia", -8.4, 115.19, 90], ["Algarve", "Portugal", 37.1, -8.2, 90], ["Madeira", "Portugal", 32.75, -16.95, 60], ["Azores", "Portugal", 37.8, -25.5, 350],
  ["Andalusia", "Spain", 37.4, -4.6, 220], ["Canary Islands", "Spain", 28.3, -15.9, 270], ["Mallorca", "Spain", 39.6, 2.95, 70], ["Sicily", "Italy", 37.5, 14.1, 150],
  ["Tuscany", "Italy", 43.4, 11.1, 110], ["Dolomites", "Italy", 46.5, 11.9, 70], ["Crete", "Greece", 35.2, 24.9, 140], ["Provence", "France", 43.8, 5.5, 110],
  ["Bavaria", "Germany", 48.8, 11.5, 180], ["Tyrol", "Austria", 47.2, 11.4, 90], ["Scottish Highlands", "United Kingdom", 57.3, -4.9, 130],
  ["California", "United States", 36.8, -119.5, 600], ["Hawaii", "United States", 20.5, -157, 400], ["Yucatán", "Mexico", 20.5, -88.7, 250], ["Patagonia", "Argentina", -45, -71, 800], ["Kerala", "India", 10.3, 76.5, 220],
];

const WORLD_NAMES: Record<WorldRegion, string> = {
  europe: "Europe", southeastAsia: "Southeast Asia", eastAsia: "East Asia", southAsia: "South Asia", middleEast: "Middle East", northAmerica: "North America", latinAmerica: "Latin America", africa: "Africa", oceania: "Oceania",
};

const placeOfCity = ({ id, name, country, lat, lng }: DestinationCandidate): SearchPlace => ({ id, name, country, lat, lng });
const centre = (cities: readonly DestinationCandidate[]) => ({ lat: cities.reduce((n, c) => n + c.lat, 0) / cities.length, lng: cities.reduce((n, c) => n + c.lng, 0) / cities.length });

const countries = [...new Set(CITIES.map((c) => c.countryCode))].map((code): SearchPlace => {
  const own = CITIES.filter((c) => c.countryCode === code);
  return { id: `country:${code}`, name: own[0].country, country: own[0].country, ...centre(own) };
});
const areas = AREAS.map(([name, country, lat, lng]): SearchPlace => ({ id: `area:${slugOf(name)}`, name, country, lat, lng }));
const worldRegions = WORLD_REGIONS.map((region): SearchPlace => ({ id: `world:${region}`, name: WORLD_NAMES[region], country: "", ...centre(CITIES.filter((c) => c.region === region)) }));

/** Cities first, so a city and the region of the same name read in that order. */
export const ALL_PLACES: readonly SearchPlace[] = [...CITIES.map(placeOfCity), ...areas, ...countries, ...worldRegions];

const byId = new Map(ALL_PLACES.map((place) => [place.id, place]));
/** The place of an id in a URL. Unknown (an old link): none. */
export const placeById = (id: string | null) => (id ? byId.get(id) ?? null : null);

export type PlaceKind = "city" | "area" | "country" | "world";
export function placeKindOf(id: string): PlaceKind {
  if (id.startsWith("country:")) return "country";
  if (id.startsWith("area:")) return "area";
  return id.startsWith("world:") ? "world" : "city";
}

const radii = new Map(AREAS.map(([name, , , , radiusKm]) => [`area:${slugOf(name)}`, radiusKm]));
export const areaRadiusKm = (id: string) => radii.get(id);

const cityPoints = new Map(CITIES.map((c) => [foldPlace(c.name.split(",")[0]), { lat: c.lat, lng: c.lng }]));
export const cityPoint = (name: string) => cityPoints.get(foldPlace(name.trim()));

/** A city's place id by its name ("Lisbon" → its id), for a link to Explore filtered on it; null when the search doesn't know it. */
const cityIds = new Map(CITIES.map((c) => [foldPlace(c.name.split(",")[0]), c.id]));
export const cityPlaceIdOf = (name: string) => cityIds.get(foldPlace(name.trim())) ?? null;

/** The photo of a curated city, for the search's list. */
const covers = new Map(CURATED_DESTINATIONS.flatMap((d) => (d.coverImage ? [[d.id, d.coverImage] as const] : [])));
export const coverOf = (placeId: string) => covers.get(placeId);

const countryRegions = new Map(CITIES.flatMap((c) => (c.region ? [[foldPlace(c.country), c.region] as const] : [])));
export const regionOfCountry = (country: string): WorldRegion | "" => countryRegions.get(foldPlace(country)) ?? worldRegionOf(country);
