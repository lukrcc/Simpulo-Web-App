// The mock data per platform phase (Dev menu "Phase", config/platform.ts): deterministic sets, so every stage of the app can be seen with
// the same Houses every time. Lives in the data layer: a real backend simply returns what exists, and the UI reacts to the
// counts, never to the state's name. Theme shelves: lower their thresholds in src/config/explore.ts to see them.
import type { AppData } from "./data/adapter";
import type { PlatformPhase } from "./types";
import { joinRequests, stays, threads, users as mockUsers, type JoinRequest, type Stay } from "./mock";
import { MOCK_FOUNDING_HOST_IDS } from "./mock-admin";

/** The founding hosts the admin said "Yes" to (mock-admin.ts) – in every phase, like their accounts. */
const users = mockUsers.map((u) => (MOCK_FOUNDING_HOST_IDS.includes(u.id) ? { ...u, foundingHost: true } : u));

const published = stays.filter((s) => s.status === "published");

/** Beta: Bangkok and Lisbon, the founding hosts' first Houses. */
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
function betaData(): AppData {
  const list = [...LAUNCH_HOUSES.map(([id, city]) => ({ id, city, round: 1 })), ...LAUNCH_SECOND_ROUND.map((id) => ({ id, city: LAUNCH_HOUSES.find((h) => h[0] === id)![1], round: 2 }))];
  const people = users.filter((u) => u.photos.length > 0);
  const requests: JoinRequest[] = [];
  const houses = list.slice(0, LAUNCH_SIZE).map(({ id, city, round }, i): Stay => {
    const base = published.find((s) => s.id === id)!;
    const [guests, open] = CREW_STANDS[i % CREW_STANDS.length];
    const start = FIRST_START + Math.round(((LAST_START - FIRST_START) * i) / (LAUNCH_SIZE - 1) / DAY_MS) * DAY_MS;
    const nights = Math.min(MAX_NIGHTS, Math.max(3, Math.round((Date.parse(base.endDate) - Date.parse(base.startDate)) / DAY_MS) || 7));
    // Own ids (f-…): in the beta they sit beside the example Houses, which keep the live ids.
    const houseId = round === 1 ? `f-${base.id}` : `f-${base.id}-r2`;
    const crew = people.filter((u) => u.id !== base.hostId);
    for (let g = 0; g < guests; g++) {
      requests.push({ id: `beta-${houseId}-${g}`, stayId: houseId, userId: crew[(i * 7 + g * 3) % crew.length].id, message: "", status: "accepted", createdAt: "2026-10-20T12:00:00Z" });
    }
    const photos = base.photos ?? [];
    return {
      ...base,
      id: houseId,
      slug: round === 1 ? `${base.slug}-founding` : `${base.slug}-spring`,
      isFounding: true,
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

/**
 * The live data as example Houses (pre-launch and beta): every House marked `isExample`, without crews, chats or requests – the sample shows
 * the place, never people. Hosts stay in the data (the cards and the House page hide them).
 */
function exampleData(): AppData {
  const ids = new Set(stays.map((s) => s.id));
  return {
    users,
    stays: stays.map((s) => ({ ...s, isExample: true, spotsFilled: 1, spotsInvited: undefined, spotsReserved: undefined, spotsOffered: undefined, paymentDueAt: undefined, allPaidAt: undefined })),
    joinRequests: joinRequests.filter((r) => !ids.has(r.stayId)),
    threads: threads.filter((t) => !t.houseId || !ids.has(t.houseId)),
  };
}

/**
 * The mock data for a phase. Live: the full data (~100 Houses). Pre-launch: the same Houses, all as examples. Beta: the examples and the 15
 * founding Houses (Bangkok and Lisbon, real hosts and crews, `isFounding`). What of it shows: getVisibleHouses (lib/data).
 */
export function getMockDataset(phase: PlatformPhase): AppData {
  if (phase === "live") return { stays, users, joinRequests, threads };
  const examples = exampleData();
  if (phase === "prelaunch") return examples;
  const beta = betaData();
  return { users, stays: [...examples.stays, ...beta.stays], joinRequests: [...examples.joinRequests, ...beta.joinRequests], threads: examples.threads };
}
