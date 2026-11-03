import { FLEXIBLE, type Interest } from "./interests";
import { CURATED_DESTINATIONS } from "./data/destinations";
import type { DestinationCandidate } from "./data/destinationTypes";
import { MORE_CITIES } from "./data/moreCities";
import { CURRENT_USER_ID, users } from "./mock";

const placeOf = (id: string): DestinationCandidate => [...CURATED_DESTINATIONS, ...MORE_CITIES].find((d) => d.id === id)!;

/**
 * ⚠ MOCK DATA – placeholder demand for the mock app only, NOT real interest: each spot expands into that many
 * interests from mock users (never the default mock user, so "I'm interested" starts off). About 70 % of them are
 * visible to others. Replace with the real interests source.
 */
const MOCK_SPOTS: ReadonlyArray<[destinationId: string, month: string, count: number]> = [
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
  // Picked in "Somewhere else?": not curated, waiting for approval (/dev/destinations).
  ["bergen", "2027-06", 4],
];

/** "2027-02" → "2027-03" */
function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
}

/** Mock people with a face, in data order – who the mock interests belong to. */
const MOCK_PEOPLE = users.filter((u) => u.id !== CURRENT_USER_ID && u.photos.length > 0).map((u) => u.id);

/** Mock spread per spot: most want its month, some also the next one, every fifth person is flexible; ~70 % visible. */
function interestsOf(spots: ReadonlyArray<readonly [destinationId: string, month: string, count: number]>, prefix: string): Interest[] {
  return spots.flatMap(([destinationId, month, count], s) =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix}-${s + 1}-${i + 1}`,
      // A different person for every interest of a spot (count < people), spread over the list per spot.
      userId: MOCK_PEOPLE[(s * 11 + i) % MOCK_PEOPLE.length],
      destinationId,
      placeName: placeOf(destinationId).name,
      country: placeOf(destinationId).country,
      region: placeOf(destinationId).region,
      consent: true,
      months: i % 5 === 4 ? [FLEXIBLE] : i % 3 === 1 ? [month, nextMonth(month)] : [month],
      language: "en",
      notify: true,
      visible: (s * 7 + i) % 10 < 7,
      createdAt: `2026-10-${String(1 + ((s * 3 + i) % 27)).padStart(2, "0")}T12:00:00Z`,
    })),
  );
}

export const MOCK_INTERESTS: readonly Interest[] = interestsOf(MOCK_SPOTS, "mock-interest");

/** The Full data state: about 60 of the 100 curated places have people, 3–20 each, their months spread over the year. */
const FULL_PLACES = 60;
const FULL_MONTHS = ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06", "2027-07", "2027-08", "2027-09", "2027-10"];
const others = CURATED_DESTINATIONS.filter((d) => !MOCK_SPOTS.some(([id]) => id === d.id));
const curatedSpots = MOCK_SPOTS.filter(([id]) => CURATED_DESTINATIONS.some((d) => d.id === id)).length;
const moreSpots = Array.from({ length: FULL_PLACES - curatedSpots }, (_, n): [string, string, number] => {
  // Evenly through the list, so every continent gets its share.
  const place = others[Math.floor((n * others.length) / (FULL_PLACES - curatedSpots))];
  return [place.id, FULL_MONTHS[(n * 5) % FULL_MONTHS.length], 3 + ((n * 7) % 18)];
});

export const MOCK_INTERESTS_FULL: readonly Interest[] = [...MOCK_INTERESTS, ...interestsOf(moreSpots, "mock-interest-full")];
