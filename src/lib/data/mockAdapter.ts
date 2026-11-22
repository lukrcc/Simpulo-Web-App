import { CURRENT_USER_ID, joinRequests, stays, users } from "../mock";
import { getMockDataset } from "../mock-datasets";
import { mockHouseOutcomes } from "../mock-analysis";
import { MOCK_BANK_BALANCE, mockHostTaxData, mockLedger } from "../mock-ledger";
import { MOCK_PAYMENT_ISSUES, MOCK_HYPOTHESIS_RESULTS, MOCK_METRICS_HISTORY, MOCK_PLATFORM_PAYOUTS, MOCK_TRAFFIC, mockAdminData } from "../mock-admin";
import { mockInstalledUsers, mockPaidUsers, mockPastEarnings, mockPreviewForUrl } from "../mock-extras";
import { mockClaimableStays, mockGrowthEvents, withMockAttribution } from "../mock-growth";
import { withMockHistory } from "../mock-chat";
import { withMockPlaces } from "../mock-places";
import { MOCK_SEARCHES, MOCK_SEARCHES_LIVE } from "../mock-saved-searches";
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
  getSavedSearches: (phase) => (phase === "live" ? MOCK_SEARCHES_LIVE : MOCK_SEARCHES),
  getClaimableHouses: () => mockClaimableStays,
  defaultUserId: CURRENT_USER_ID,
  installedUsers: mockInstalledUsers,
  // Emma just signed up; Noah only ever joined (one House on the waitlist); Lukas hosts and joins.
  devPersonas: { new: "u90", guest: "u17", host: CURRENT_USER_ID },
  paidUsers: (stayId) => mockPaidUsers[stayId] ?? [],
  pastEarnings: (userId) => mockPastEarnings[userId] ?? [],
  previewForUrl: mockPreviewForUrl,
  withAttribution: withMockAttribution,
  withPlaces: withMockPlaces,
  withChatHistory: withMockHistory,
  growthEvents: mockGrowthEvents,
  loadPage: (list, keyOf, request) => delayedPageOfList(list, keyOf, request),
  // The mock photos' measures (data/image-meta.json from scripts/image-meta.mjs).
  getPhotoMeta: (src) => PHOTO_META[src] ?? null,
  getAdminData: mockAdminData,
  getTrafficReport: () => MOCK_TRAFFIC,
  getMetricsHistory: () => MOCK_METRICS_HISTORY,
  getHypothesisResults: () => MOCK_HYPOTHESIS_RESULTS,
  getPlatformPayouts: () => MOCK_PLATFORM_PAYOUTS,
  getHouseOutcomes: mockHouseOutcomes,
  getPaymentIssues: () => MOCK_PAYMENT_ISSUES.map((issue) => ({ ...issue })),
  getLedger: mockLedger,
  getBankBalance: () => MOCK_BANK_BALANCE,
  // ⚠ Simulated: around 6 people in the evening, 2 at night, a little noise – the overview reads it again every few seconds.
  getLiveVisitors: () => {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const base = 4 + 3 * Math.sin(((hour - 13) / 24) * 2 * Math.PI);
    return Math.max(0, Math.round(base + (Math.random() - 0.5) * 3));
  },
  getHostTaxData: mockHostTaxData,
};
