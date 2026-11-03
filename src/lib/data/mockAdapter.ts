import { CURRENT_USER_ID, joinRequests, stays, users } from "../mock";
import { getMockDataset } from "../mock-datasets";
import { mockInstalledUsers, mockPaidUsers, mockPreviewForUrl } from "../mock-extras";
import { mockClaimableStays, mockGrowthEvents, withMockAttribution } from "../mock-growth";
import { withMockHistory } from "../mock-chat";
import { MORE_CITIES } from "./moreCities";
import { MOCK_INTERESTS } from "../mock-interests";
import type { DataAdapter } from "./adapter";

/** Dev and demo: the mock data. */
export const mockAdapter: DataAdapter = {
  getData: getMockDataset,
  getHouses: () => stays,
  getUsers: () => users,
  getJoinRequests: () => joinRequests,
  getInterests: () => MOCK_INTERESTS,
  getClaimableHouses: () => mockClaimableStays,
  // A place that reached the threshold and waits for approval, with what an automatic picture would look like (mock credit).
  getKnownDestinations: () => [
    {
      ...MORE_CITIES.find((d) => d.id === "bergen")!,
      coverImage: "/mock/houses/s38/3.webp",
      imageSource: "pexels",
      photographer: { name: "Mock Photographer", url: "https://www.pexels.com" },
      status: "pending",
      interestedCount: 0,
      interestedMonths: [],
    },
  ],
  defaultUserId: CURRENT_USER_ID,
  installedUsers: mockInstalledUsers,
  paidUsers: (stayId) => mockPaidUsers[stayId] ?? [],
  previewForUrl: mockPreviewForUrl,
  withAttribution: withMockAttribution,
  withChatHistory: withMockHistory,
  growthEvents: mockGrowthEvents,
};
