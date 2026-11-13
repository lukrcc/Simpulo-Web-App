// All data goes through here: the mock in dev and demo, the real source in production. No component imports a mock file.
import { APP_MODE } from "../appMode";
import { ALL_PLACES } from "./places";
import { createListPlaceProvider, type PlaceProvider } from "./placeProvider";
import type { Stay } from "../types";
import { PLATFORM_PHASES, type DataAdapter } from "./adapter";
import type { PlatformPhase } from "../types";

export { PLATFORM_PHASES, type AdminData, type AppData, type HypothesisResult, type MetricsHistory, type PhotoMeta, type PlatformPayouts, type TrafficReport } from "./adapter";
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
export const getAdminData = adapter.getAdminData;
export const getTrafficReport = adapter.getTrafficReport;
export const getMetricsHistory = adapter.getMetricsHistory;
export const getHypothesisResults = adapter.getHypothesisResults;
export const getPlatformPayouts = adapter.getPlatformPayouts;
/** A photo's { tint, lum } for the card's darkening; without a measure: tint #1A1614, lum .5. */
export const photoMetaOf = (src: string): PhotoMeta => adapter.getPhotoMeta(src) ?? { tint: "#1a1614", lum: 0.5 };
export type { Page, PageRequest } from "./paging";

const PHASE_KEY = "simpulo:phase";
/** Before the phases: the Dev menu's data state, under its own key – read once and moved over (launch → beta, full → live). */
const LEGACY_KEY = "simpulo:dataset";
const LEGACY_PHASE: Record<string, PlatformPhase> = { prelaunch: "prelaunch", launch: "beta", full: "live" };
const DEFAULT_PHASE: PlatformPhase = "live";

/**
 * The platform phase. In dev the Dev menu's choice (localStorage); in demo and production "live" – the real launch switch comes later. Read
 * it through config/platform.ts (usePlatformPhase and its helpers), never on its own.
 */
export function readPlatformPhase(): PlatformPhase {
  if (APP_MODE !== "dev") return DEFAULT_PHASE;
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      localStorage.removeItem(LEGACY_KEY);
      const moved = LEGACY_PHASE[legacy];
      if (moved && moved !== DEFAULT_PHASE) localStorage.setItem(PHASE_KEY, moved);
    }
    const saved = localStorage.getItem(PHASE_KEY);
    return PLATFORM_PHASES.find((p) => p === saved) ?? DEFAULT_PHASE;
  } catch {
    return DEFAULT_PHASE;
  }
}

export function savePlatformPhase(phase: PlatformPhase) {
  try {
    if (phase === DEFAULT_PHASE) localStorage.removeItem(PHASE_KEY);
    else localStorage.setItem(PHASE_KEY, phase);
  } catch {
    // not saved – the next load is live
  }
}
