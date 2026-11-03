// Demand: where and when people want to go – "Where do you want to go next?" on Explore. Individual interests
// (one person, one place, one month) are aggregated into demand spots. Mock now (the store holds them), Firebase later
// behind the same functions; never derived from Houses.

/** World regions – the chips above the demand row (only with more than REGION_CHIPS_FROM spots). */
export const WORLD_REGIONS = ["europe", "southeastAsia", "eastAsia", "southAsia", "middleEast", "northAmerica", "latinAmerica", "africa", "oceania"] as const;
export type WorldRegion = (typeof WORLD_REGIONS)[number];
export const REGION_CHIPS_FROM = 12;

/** The chips and shelves of /destinations. South Asia has no chip of its own and goes with Southeast Asia. */
export const CONTINENTS = ["southeastAsia", "eastAsia", "europe", "americas", "africa", "oceania", "middleEast"] as const;
export type Continent = (typeof CONTINENTS)[number];
export function continentOf(region: WorldRegion): Continent {
  if (region === "northAmerica" || region === "latinAmerica") return "americas";
  return region === "southAsia" ? "southeastAsia" : region;
}

export interface Interest {
  id: string;
  userId: string;
  /** The Destination; name, country and region below are copied from it */
  destinationId: string;
  /** May be told when a House opens there */
  consent: boolean;
  email?: string;
  placeName: string;
  /** Google Places id, once places come from autocomplete */
  placeId?: string;
  country: string;
  /** World region of the country ("" when unknown) */
  region: WorldRegion | "";
  /** YYYY-MM, one or more – or just FLEXIBLE ("anytime") */
  months: string[];
  /** ISO 639-1 code of the person's language */
  language: string;
  /** Tell them when a House opens there */
  notify: boolean;
  /** "Show me to others interested in this place": in avatars and lists. Off = only counted (and anonymous to hosts). */
  visible: boolean;
  createdAt: string;
}

/** The months entry of someone who's flexible about when. */
export const FLEXIBLE = "flexible";

/**
 * Interest in one place, counted: `count` people in all, `months` how many of them want each month (someone with
 * two months counts in both), `anytime` how many are flexible.
 */
export interface DemandSpot {
  destinationId: string;
  placeName: string;
  country: string;
  region: WorldRegion | "";
  count: number;
  months: { month: string; count: number }[];
  anytime: number;
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

const placeKey = (placeName: string) => placeName.trim().toLowerCase();

/** One spot per place; most people first. */
export function aggregateDemand(interests: readonly Interest[]): DemandSpot[] {
  const spots = new Map<string, DemandSpot & { byMonth: Map<string, number> }>();
  for (const interest of interests) {
    const key = interest.destinationId;
    const spot = spots.get(key) ?? { destinationId: interest.destinationId, placeName: interest.placeName, country: interest.country, region: interest.region, count: 0, months: [], anytime: 0, byMonth: new Map() };
    spot.count++;
    if (interest.months.includes(FLEXIBLE)) spot.anytime++;
    for (const month of interest.months) if (month !== FLEXIBLE) spot.byMonth.set(month, (spot.byMonth.get(month) ?? 0) + 1);
    spots.set(key, spot);
  }
  return [...spots.values()]
    .map(({ byMonth, ...spot }) => ({ ...spot, months: [...byMonth].map(([month, count]) => ({ month, count })).toSorted((a, b) => a.month.localeCompare(b.month)) }))
    .toSorted((a, b) => b.count - a.count || a.placeName.localeCompare(b.placeName));
}

/** This user's interest in that place, if any. */
export function interestIn(interests: readonly Interest[], userId: string | null, spot: Pick<DemandSpot, "destinationId">): Interest | undefined {
  return userId ? interests.find((i) => i.userId === userId && i.destinationId === spot.destinationId) : undefined;
}

/** One interest per person, place and month: what someone wanted plus what's new. A date beats "flexible". */
export function mergeMonths(existing: readonly string[], added: readonly string[]): string[] {
  const dated = [...new Set([...existing, ...added])].filter((m) => m !== FLEXIBLE).toSorted();
  return dated.length > 0 ? dated : [FLEXIBLE];
}

/** Whether an interest wants a House starting in that month (or any month). */
export const wantsMonth = (interest: Pick<Interest, "months">, month: string) => interest.months.includes(FLEXIBLE) || interest.months.includes(month);

/** Everyone interested in a place (people who opted out included – count them, never show them). */
export function interestsIn(interests: readonly Interest[], placeName: string): Interest[] {
  return interests.filter((i) => placeKey(i.placeName) === placeKey(placeName));
}

/** The interests a House answers: same city, and its start month wanted (or anytime). */
export function interestsFor(interests: readonly Interest[], stay: { city: string; startDate: string }): Interest[] {
  const month = stay.startDate.slice(0, 7);
  return stay.city.trim() && month ? interestsIn(interests, stay.city).filter((i) => wantsMonth(i, month)) : [];
}

/** "2027-03" → first and last day of that month (YYYY-MM-DD), e.g. for "Host this house". */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
