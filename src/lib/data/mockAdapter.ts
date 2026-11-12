import { CURRENT_USER_ID, joinRequests, stays, users } from "../mock";
import { getMockDataset } from "../mock-datasets";
import { mockInstalledUsers, mockPaidUsers, mockPastEarnings, mockPreviewForUrl } from "../mock-extras";
import { mockClaimableStays, mockGrowthEvents, withMockAttribution } from "../mock-growth";
import { withMockHistory } from "../mock-chat";
import { MOCK_SEARCHES, MOCK_SEARCHES_FULL } from "../mock-saved-searches";
import type { DataAdapter } from "./adapter";
import { delayedPageOfList } from "./paging";
import imageMeta from "../../../data/image-meta.json";

const PHOTO_META: Record<string, { tint: string; lum: number }> = imageMeta;

/** Dev and demo: the mock data. */
export const mockAdapter: DataAdapter = {
  getData: getMockDataset,
  getHouses: () => stays,
  getUsers: () => users,
  getJoinRequests: () => joinRequests,
  getSavedSearches: (state) => (state === "full" ? MOCK_SEARCHES_FULL : MOCK_SEARCHES),
  getClaimableHouses: () => mockClaimableStays,
  defaultUserId: CURRENT_USER_ID,
  installedUsers: mockInstalledUsers,
  // Emma just signed up; Noah only ever joined (one House on the waitlist); Lukas hosts and joins.
  devPersonas: { new: "u90", guest: "u17", host: CURRENT_USER_ID },
  paidUsers: (stayId) => mockPaidUsers[stayId] ?? [],
  pastEarnings: (userId) => mockPastEarnings[userId] ?? [],
  previewForUrl: mockPreviewForUrl,
  withAttribution: withMockAttribution,
  withChatHistory: withMockHistory,
  growthEvents: mockGrowthEvents,
  loadPage: (list, keyOf, request) => delayedPageOfList(list, keyOf, request),
  // The mock photos' measures (data/image-meta.json from scripts/image-meta.mjs).
  getPhotoMeta: (src) => PHOTO_META[src] ?? null,
};
