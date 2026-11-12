// All data goes through here: the mock in dev and demo, the real source in production. No component imports a mock file.
import { APP_MODE } from "../appMode";
import { ALL_PLACES } from "./places";
import { createListPlaceProvider, type PlaceProvider } from "./placeProvider";
import type { Stay } from "../types";
import { DATA_STATES, type DataAdapter, type DataState } from "./adapter";

export { DATA_STATES, type AppData, type DataState, type PhotoMeta } from "./adapter";
import type { PhotoMeta } from "./adapter";

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
export const getSavedSearches = adapter.getSavedSearches;
export const getClaimableHouses = adapter.getClaimableHouses;
/** The one place search: our list of cities, regions and countries for now; createGooglePlacesProvider or createGeoNamesProvider later. */
const placeProvider: PlaceProvider = createListPlaceProvider(() => ALL_PLACES);
export const searchPlaces = placeProvider.search;
export const defaultUserId = adapter.defaultUserId;
export const installedUsers = adapter.installedUsers;
export const devPersonas = adapter.devPersonas;
export const paidUsersOf = adapter.paidUsers;
export const pastEarningsOf = adapter.pastEarnings;
export type { PastEarning } from "./adapter";
export const previewForUrl = adapter.previewForUrl;
/** Preview of a House's accommodation link (the booked place once it's locked). */
export const stayLinkPreview = (stay: Pick<Stay, "accommodationLink" | "title">) => (stay.accommodationLink ? adapter.previewForUrl(stay.accommodationLink, stay.title) : null);
export const withAttribution = adapter.withAttribution;
export const withChatHistory = adapter.withChatHistory;
export const growthEventsFor = adapter.growthEvents;
/** The next page of a list after a cursor (src/lib/data/paging.ts). */
export const loadPage = adapter.loadPage;
/** A photo's { tint, lum } for the card's darkening; without a measure: tint #1A1614, lum .5. */
export const photoMetaOf = (src: string): PhotoMeta => adapter.getPhotoMeta(src) ?? { tint: "#1a1614", lum: 0.5 };
export type { Page, PageRequest } from "./paging";

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
