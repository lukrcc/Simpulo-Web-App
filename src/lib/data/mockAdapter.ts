import { CURRENT_USER_ID, joinRequests, stays, users } from "../mock";
import { getMockDataset } from "../mock-datasets";
import { mockInstalledUsers, mockPaidUsers, mockPastEarnings, mockPreviewForUrl } from "../mock-extras";
import { mockClaimableStays, mockGrowthEvents, withMockAttribution } from "../mock-growth";
import { withMockHistory } from "../mock-chat";
import { MOCK_SEARCHES, MOCK_SEARCHES_FULL } from "../mock-saved-searches";
import type { DataAdapter } from "./adapter";

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
  paidUsers: (stayId) => mockPaidUsers[stayId] ?? [],
  pastEarnings: (userId) => mockPastEarnings[userId] ?? [],
  previewForUrl: mockPreviewForUrl,
  withAttribution: withMockAttribution,
  withChatHistory: withMockHistory,
  growthEvents: mockGrowthEvents,
};
