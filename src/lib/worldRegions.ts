// World regions: where a country lies, for grouping places and the host's map.

export const WORLD_REGIONS = ["europe", "southeastAsia", "eastAsia", "southAsia", "middleEast", "northAmerica", "latinAmerica", "africa", "oceania"] as const;
export type WorldRegion = (typeof WORLD_REGIONS)[number];

/** The map's world view: South Asia goes with Southeast Asia, the two Americas are one. */
export const CONTINENTS = ["southeastAsia", "eastAsia", "europe", "americas", "africa", "oceania", "middleEast"] as const;
export type Continent = (typeof CONTINENTS)[number];
export function continentOf(region: WorldRegion): Continent {
  if (region === "northAmerica" || region === "latinAmerica") return "americas";
  return region === "southAsia" ? "southeastAsia" : region;
}

const COUNTRY_REGIONS: Record<string, WorldRegion> = {
  portugal: "europe", spain: "europe", france: "europe", germany: "europe", italy: "europe", greece: "europe",
  croatia: "europe", netherlands: "europe", austria: "europe", switzerland: "europe", norway: "europe",
  "united kingdom": "europe", ireland: "europe", denmark: "europe", poland: "europe", czechia: "europe", belgium: "europe", georgia: "europe",
  india: "southAsia", "sri lanka": "southAsia", nepal: "southAsia", indonesia: "southeastAsia", thailand: "southeastAsia", vietnam: "southeastAsia", philippines: "southeastAsia", malaysia: "southeastAsia",
  japan: "eastAsia", "south korea": "eastAsia", taiwan: "eastAsia", china: "eastAsia",
  "united arab emirates": "middleEast", jordan: "middleEast", egypt: "middleEast", türkiye: "middleEast", turkey: "middleEast", morocco: "africa",
  "united states": "northAmerica", canada: "northAmerica",
  mexico: "latinAmerica", brazil: "latinAmerica", argentina: "latinAmerica", colombia: "latinAmerica", "costa rica": "latinAmerica",
  "south africa": "africa", kenya: "africa", tanzania: "africa",
  australia: "oceania", "new zealand": "oceania",
};

export function worldRegionOf(country: string): WorldRegion | "" {
  return COUNTRY_REGIONS[country.trim().toLowerCase()] ?? "";
}
