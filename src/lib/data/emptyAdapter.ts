import { linkDomain } from "../links";
import type { DataAdapter } from "./adapter";
import { pageOfList } from "./paging";

/**
 * Production's data source for now: the real thing with nothing in it yet. Same contract as the mock, so the app runs and
 * shows Explore's pre-launch view. The backend goes in here.
 */
export const emptyAdapter: DataAdapter = {
  getData: () => ({ stays: [], users: [], joinRequests: [], threads: [] }),
  getHouses: () => [],
  getUsers: () => [],
  getJoinRequests: () => [],
  getSavedSearches: () => [],
  getClaimableHouses: () => [],
  defaultUserId: null,
  installedUsers: new Set(),
  devPersonas: null,
  paidUsers: () => [],
  pastEarnings: () => [],
  previewForUrl: (url, fallbackTitle) => ({ title: fallbackTitle ?? linkDomain(url), imageUrl: "", domain: linkDomain(url) }),
  withAttribution: (requests) => requests,
  withChatHistory: (threads) => ({ threads, lastReadAt: {} }),
  growthEvents: () => [],
  // TODO(firestore): run the list's query – orderBy(…), startAfter(the cursor's document), limit(request.limit) – and the total from
  // getCountFromServer. Until then the list the app already holds.
  loadPage: (list, keyOf, request) => Promise.resolve(pageOfList(list, keyOf, request)),
  // TODO(backend): the { tint, lum } stored with each photo on upload (a Cloud Function running scripts/image-meta.mjs's measure).
  getPhotoMeta: () => null,
  // TODO(firestore): the waitlist, hostApplications and adminLog collections.
  getAdminData: () => ({ waitlist: [], applications: [], log: [], tickets: [], withdrawals: [] }),
  // TODO(phase 4): the Google Analytics Data API, on the server.
  getTrafficReport: () => null,
  // TODO(backend): monthly aggregates (full Houses, fees kept), from a scheduled Function.
  getMetricsHistory: () => null,
  // TODO(backend): the analyses behind each hypothesis (scheduled queries).
  getHypothesisResults: () => ({}),
  // TODO(phase 5): Stripe balance + payout settings (server side, the platform account).
  getPlatformPayouts: () => null,
};
