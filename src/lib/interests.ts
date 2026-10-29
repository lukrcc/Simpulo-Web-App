// Demand: where and when people want to go – "Where do you want to go next?" on Explore. Individual interests
// (one person, one place, one month) are aggregated into demand spots. Mock now (the store holds them), Firebase later
// behind the same functions; never derived from Houses.
import { CURRENT_USER_ID, users } from "./mock";

/** World regions – the chips above the demand row (only with more than REGION_CHIPS_FROM spots). */
export const WORLD_REGIONS = ["europe", "southeastAsia", "eastAsia", "middleEast", "northAmerica", "latinAmerica", "africa", "oceania"] as const;
export type WorldRegion = (typeof WORLD_REGIONS)[number];
export const REGION_CHIPS_FROM = 12;

export interface Interest {
  id: string;
  userId: string;
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
  indonesia: "southeastAsia", thailand: "southeastAsia", vietnam: "southeastAsia", philippines: "southeastAsia", malaysia: "southeastAsia",
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
    const key = placeKey(interest.placeName);
    const spot = spots.get(key) ?? { placeName: interest.placeName, country: interest.country, region: interest.region, count: 0, months: [], anytime: 0, byMonth: new Map() };
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
export function interestIn(interests: readonly Interest[], userId: string | null, spot: Pick<DemandSpot, "placeName">): Interest | undefined {
  return userId ? interests.find((i) => i.userId === userId && placeKey(i.placeName) === placeKey(spot.placeName)) : undefined;
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

/**
 * ⚠ MOCK DATA – placeholder demand for the mock app only, NOT real interest: each spot expands into that many
 * interests from mock users (never the default mock user, so "I'm interested" starts off). About 70 % of them are
 * visible to others. Replace with the real interests source.
 */
const MOCK_SPOTS: ReadonlyArray<[placeName: string, country: string, month: string, count: number]> = [
  ["Lisbon", "Portugal", "2027-03", 14],
  ["Canggu", "Indonesia", "2027-02", 11],
  ["Mexico City", "Mexico", "2027-04", 9],
  ["Chiang Mai", "Thailand", "2027-01", 7],
  ["Tarifa", "Spain", "2027-05", 6],
  ["Cape Town", "South Africa", "2027-02", 5],
  ["Tbilisi", "Georgia", "2027-06", 4],
  ["Madeira", "Portugal", "2027-04", 4],
];

/** "2027-02" → "2027-03" */
function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
}

/** Mock people with a face, in data order – who the mock interests belong to. */
const MOCK_PEOPLE = users.filter((u) => u.id !== CURRENT_USER_ID && u.photos.length > 0).map((u) => u.id);

/** Mock spread per spot: most want its month, some also the next one, every fifth person is flexible; ~70 % visible. */
export const MOCK_INTERESTS: readonly Interest[] = MOCK_SPOTS.flatMap(([placeName, country, month, count], s) =>
  Array.from({ length: count }, (_, i) => ({
    id: `mock-interest-${s + 1}-${i + 1}`,
    // A different person for every interest of a spot (count < people), spread over the list per spot.
    userId: MOCK_PEOPLE[(s * 11 + i) % MOCK_PEOPLE.length],
    placeName,
    country,
    region: worldRegionOf(country),
    months: i % 5 === 4 ? [FLEXIBLE] : i % 3 === 1 ? [month, nextMonth(month)] : [month],
    language: "en",
    notify: true,
    visible: (s * 7 + i) % 10 < 7,
    createdAt: `2026-10-${String(1 + ((s * 3 + i) % 27)).padStart(2, "0")}T12:00:00Z`,
  })),
);
