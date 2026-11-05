import { CURATED_DESTINATIONS } from "./data/destinations";
import { MORE_CITIES } from "./data/moreCities";
import { VIBES } from "./catalog";
import { CURRENT_USER_ID, users } from "./mock";
import type { SavedSearch } from "./savedSearches";

const placeOf = (id: string) => {
  const { name, country, lat, lng } = [...CURATED_DESTINATIONS, ...MORE_CITIES].find((d) => d.id === id)!;
  return { id, name, country, lat, lng };
};

/**
 * ⚠ MOCK DATA – placeholder searches for the mock app only, NOT real demand: each spot expands into that many searches from mock
 * users (never the default mock user). Replace with the real source.
 */
const MOCK_SPOTS: ReadonlyArray<readonly [placeId: string, month: string, count: number]> = [
  ["lisbon", "2027-03", 14],
  ["canggu", "2027-02", 11],
  ["mexico-city", "2027-04", 9],
  ["chiang-mai", "2027-01", 7],
  ["tarifa", "2027-05", 6],
  ["ericeira", "2027-04", 6],
  ["cape-town", "2027-02", 5],
  ["tbilisi", "2027-06", 4],
  ["funchal-madeira", "2027-04", 4],
  ["krabi", "2027-03", 4],
  ["palma-mallorca", "2027-05", 3],
  ["bergen", "2027-06", 4],
];

const MOCK_PEOPLE = users.filter((u) => u.id !== CURRENT_USER_ID && u.photos.length > 0).map((u) => u.id);

/** "2027-02" → "2027-03" */
function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
}

/** Most search the spot's month, every third the next one, every fifth any month; every fourth also names a category. */
function searchesOf(spots: ReadonlyArray<readonly [string, string, number]>, prefix: string): SavedSearch[] {
  return spots.flatMap(([placeId, month, count], s) =>
    Array.from({ length: count }, (_, i): SavedSearch => ({
      id: `${prefix}-${s + 1}-${i + 1}`,
      place: placeOf(placeId),
      month: i % 5 === 4 ? null : i % 3 === 1 ? nextMonth(month) : month,
      category: i % 4 === 3 ? VIBES[(s + i) % VIBES.length].key : null,
      // A different person for every search of a spot, spread over the list per spot.
      userId: MOCK_PEOPLE[(s * 11 + i) % MOCK_PEOPLE.length],
      consent: true,
      createdAt: `2026-10-${String(1 + ((s * 3 + i) % 27)).padStart(2, "0")}T12:00:00Z`,
      notifiedAt: null,
    })),
  );
}

export const MOCK_SEARCHES: readonly SavedSearch[] = searchesOf(MOCK_SPOTS, "mock-search");

/** The Full data state: about 60 of the 100 curated places have searches, 3–20 each, their months spread over the year. */
const FULL_PLACES = 60;
const FULL_MONTHS = ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06", "2027-07", "2027-08", "2027-09", "2027-10"];
const others = CURATED_DESTINATIONS.filter((d) => !MOCK_SPOTS.some(([id]) => id === d.id));
const curatedSpots = MOCK_SPOTS.filter(([id]) => CURATED_DESTINATIONS.some((d) => d.id === id)).length;
const moreSpots = Array.from({ length: FULL_PLACES - curatedSpots }, (_, n): [string, string, number] => {
  // Evenly through the list, so every continent gets its share.
  const place = others[Math.floor((n * others.length) / (FULL_PLACES - curatedSpots))];
  return [place.id, FULL_MONTHS[(n * 5) % FULL_MONTHS.length], 3 + ((n * 7) % 18)];
});

export const MOCK_SEARCHES_FULL: readonly SavedSearch[] = [...MOCK_SEARCHES, ...searchesOf(moreSpots, "mock-search-full")];
