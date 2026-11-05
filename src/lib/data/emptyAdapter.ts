import { linkDomain } from "../links";
import type { DataAdapter } from "./adapter";

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
  paidUsers: () => [],
  previewForUrl: (url, fallbackTitle) => ({ title: fallbackTitle ?? linkDomain(url), imageUrl: "", domain: linkDomain(url) }),
  withAttribution: (requests) => requests,
  withChatHistory: (threads) => ({ threads, lastReadAt: {} }),
  growthEvents: () => [],
};
