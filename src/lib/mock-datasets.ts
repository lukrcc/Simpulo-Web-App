// The mock's data states (Dev menu "Data"): deterministic sets of the mock data, so every stage of the app can be seen with
// the same Houses every time. Lives in the data layer: a real backend simply returns what exists, and the UI reacts to the
// counts, never to the state's name. Theme shelves: lower their thresholds in src/config/explore.ts to see them.
import type { AppData, DataState } from "./data/adapter";
import { joinRequests, stays, threads, users, type JoinRequest, type Stay } from "./mock";

const published = stays.filter((s) => s.status === "published");

/** Launch: Bangkok and Lisbon, the first Houses that open. */
const LAUNCH_HOUSES: readonly (readonly [baseId: string, city: "Bangkok" | "Lisbon"])[] = [
  ["s6", "Bangkok"],
  ["s3", "Lisbon"],
  ["x2", "Bangkok"],
  ["s21", "Lisbon"],
  ["s22", "Bangkok"],
  ["x6", "Lisbon"],
  ["s26", "Bangkok"],
  ["s20", "Lisbon"],
  ["s16", "Bangkok"],
  ["x19", "Lisbon"],
  ["s27", "Lisbon"],
  ["x47", "Lisbon"],
];
/** Three more rounds of Houses from the list, so there are 15: they lead with another photo. */
const LAUNCH_SECOND_ROUND = ["s6", "s22", "s21"];
const LAUNCH_SIZE = 15;
const PRELAUNCH_SIZE = 3;
/** Crew stands, in turn: guests besides the host, and spots still open. From "Just opened" to "1 spot left". */
const CREW_STANDS: readonly (readonly [guests: number, open: number])[] = [
  [0, 4],
  [1, 3],
  [2, 2],
  [3, 1],
  [0, 3],
  [2, 3],
  [4, 1],
];
const FIRST_START = Date.UTC(2027, 2, 2);
const LAST_START = Date.UTC(2027, 4, 24);
const DAY_MS = 86_400_000;
const MAX_NIGHTS = 14;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Houses with their dates in March–May 2027 and crews of their own: the same every time. */
function launchData(): AppData {
  const list = [...LAUNCH_HOUSES.map(([id, city]) => ({ id, city, round: 1 })), ...LAUNCH_SECOND_ROUND.map((id) => ({ id, city: LAUNCH_HOUSES.find((h) => h[0] === id)![1], round: 2 }))];
  const people = users.filter((u) => u.photos.length > 0);
  const requests: JoinRequest[] = [];
  const houses = list.slice(0, LAUNCH_SIZE).map(({ id, city, round }, i): Stay => {
    const base = published.find((s) => s.id === id)!;
    const [guests, open] = CREW_STANDS[i % CREW_STANDS.length];
    const start = FIRST_START + Math.round(((LAST_START - FIRST_START) * i) / (LAUNCH_SIZE - 1) / DAY_MS) * DAY_MS;
    const nights = Math.min(MAX_NIGHTS, Math.max(3, Math.round((Date.parse(base.endDate) - Date.parse(base.startDate)) / DAY_MS) || 7));
    const houseId = round === 1 ? base.id : `${base.id}-r2`;
    const crew = people.filter((u) => u.id !== base.hostId);
    for (let g = 0; g < guests; g++) {
      requests.push({ id: `launch-${houseId}-${g}`, stayId: houseId, userId: crew[(i * 7 + g * 3) % crew.length].id, message: "", status: "accepted", createdAt: "2026-10-20T12:00:00Z" });
    }
    const photos = base.photos ?? [];
    return {
      ...base,
      id: houseId,
      slug: round === 1 ? base.slug : `${base.slug}-spring`,
      title: round === 1 ? base.title : `${base.title} II`,
      city,
      region: city === "Bangkok" ? "Thailand" : "Portugal",
      location: { city, country: city === "Bangkok" ? "Thailand" : "Portugal" },
      startDate: isoDay(start),
      endDate: isoDay(start + nights * DAY_MS),
      spotsFilled: guests + 1,
      spotsTotal: guests + 1 + open,
      spotsInvited: undefined,
      spotsReserved: undefined,
      paymentDueAt: undefined,
      acceptingRequests: true,
      accommodationStatus: "open",
      pricePerPerson: base.pricePerPerson,
      photos: round === 1 ? photos : [...photos.slice(1), ...photos.slice(0, 1)],
    };
  });
  return { stays: houses, users, joinRequests: requests, threads: [] };
}

/** The mock data for a state. Pre-launch: the first three Houses of Launch, unlisted by their number alone (src/lib/launch.ts). */
export function getMockDataset(state: DataState): AppData {
  if (state === "full") return { stays, users, joinRequests, threads };
  const launch = launchData();
  if (state === "launch") return launch;
  const kept = launch.stays.slice(0, PRELAUNCH_SIZE);
  return { ...launch, stays: kept, joinRequests: launch.joinRequests.filter((r) => kept.some((s) => s.id === r.stayId)) };
}

