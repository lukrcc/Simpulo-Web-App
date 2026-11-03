// All data goes through here: the mock in dev and demo, the real source in production. No component imports a mock file.
import { APP_MODE } from "../appMode";
import { foldPlace, type Destination, type DestinationCandidate } from "./destinationTypes";
import { CURATED_DESTINATIONS } from "./destinations";
import { MORE_CITIES } from "./moreCities";
import type { Stay } from "../types";
import { DATA_STATES, type DataAdapter, type DataState } from "./adapter";

export { DATA_STATES, type AppData, type DataState } from "./adapter";

// Written out, so a production build drops the mock from its bundle: these two are decided while bundling.
const adapter: DataAdapter =
  process.env.NEXT_PUBLIC_APP_MODE === "production" || (process.env.NEXT_PUBLIC_APP_MODE !== "dev" && process.env.NEXT_PUBLIC_APP_MODE !== "demo" && process.env.NODE_ENV !== "development")
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("./emptyAdapter") as typeof import("./emptyAdapter")).emptyAdapter
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("./mockAdapter") as typeof import("./mockAdapter")).mockAdapter;

export const getData = adapter.getData;
export const getHouses = adapter.getHouses;
export const getHouse = (slug: string): Stay | undefined => adapter.getHouses().find((house) => house.slug === slug);
export const getUsers = adapter.getUsers;
export const getJoinRequests = adapter.getJoinRequests;
export const getInterests = adapter.getInterests;
export const getClaimableHouses = adapter.getClaimableHouses;
/** The curated destinations and those the source knows about. */
export const getDestinations = (): readonly Destination[] => [...CURATED_DESTINATIONS, ...adapter.getKnownDestinations()];
const SEARCH_LIMIT = 6;
/** The place search behind "Somewhere else?": the destinations and more cities, later the Places API. Names starting with it first. */
export function searchDestinations(query: string): DestinationCandidate[] {
  const q = foldPlace(query.trim());
  if (!q) return [];
  const known = [...getDestinations(), ...MORE_CITIES.filter((c) => !getDestinations().some((d) => d.id === c.id))];
  const starts = known.filter((d) => foldPlace(d.name).startsWith(q));
  const contains = known.filter((d) => !starts.includes(d) && (foldPlace(d.name).includes(q) || foldPlace(d.country).includes(q)));
  return [...starts, ...contains].slice(0, SEARCH_LIMIT);
}
export const defaultUserId = adapter.defaultUserId;
export const installedUsers = adapter.installedUsers;
export const paidUsersOf = adapter.paidUsers;
export const previewForUrl = adapter.previewForUrl;
/** Preview of a House's accommodation link (the booked place once it's locked). */
export const stayLinkPreview = (stay: Pick<Stay, "accommodationLink" | "title">) => (stay.accommodationLink ? adapter.previewForUrl(stay.accommodationLink, stay.title) : null);
export const withAttribution = adapter.withAttribution;
export const withChatHistory = adapter.withChatHistory;
export const growthEventsFor = adapter.growthEvents;

const STATE_KEY = "simpulo:dataset";
const DEFAULT_STATE: DataState = "full";

/** The data state chosen in the Dev menu, only in dev. */
export function readDataState(): DataState {
  if (APP_MODE !== "dev") return DEFAULT_STATE;
  try {
    const saved = localStorage.getItem(STATE_KEY);
    return DATA_STATES.find((s) => s === saved) ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveDataState(state: DataState) {
  try {
    if (state === DEFAULT_STATE) localStorage.removeItem(STATE_KEY);
    else localStorage.setItem(STATE_KEY, state);
  } catch {
    // not saved – the next load uses the full data
  }
}
