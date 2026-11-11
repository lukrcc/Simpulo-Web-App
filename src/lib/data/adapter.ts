// The one contract between the app and where its data comes from: the mock (dev, demo) or the real source (production).
import type { SavedSearch } from "../savedSearches";
import type { LinkPreview } from "../links";
import type { GrowthEvent } from "../growth";
import type { JoinRequest, Payment, Stay, Thread, User } from "../types";
import type { Page, PageRequest } from "./paging";

/** What the app starts from. */
export interface AppData {
  stays: Stay[];
  users: User[];
  joinRequests: JoinRequest[];
  threads: Thread[];
}

/** A House a host ran before the data starts (the mock's earnings history): enough to show what it paid out. */
export interface PastEarning {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  guests: number;
  share: number;
  hostFee: number;
  currency: "EUR" | "USD" | "GBP";
}

/** The mock's data states, chosen in the Dev menu; "full" everywhere else. */
export const DATA_STATES = ["prelaunch", "launch", "full"] as const;
export type DataState = (typeof DATA_STATES)[number];

export interface DataAdapter {
  getData(state: DataState): AppData;
  getHouses(): Stay[];
  getUsers(): User[];
  getJoinRequests(): JoinRequest[];
  /** The saved searches a data state starts with */
  getSavedSearches(state: DataState): readonly SavedSearch[];
  /** Houses from outside waiting for their host */
  getClaimableHouses(): Stay[];
  /** Who a past demo session is logged in as; null in production */
  defaultUserId: string | null;
  installedUsers: ReadonlySet<string>;
  /** Dev menu: one person per Your houses layout – a new account, a guest who never hosted, a host; null in production */
  devPersonas: { new: string; guest: string; host: string } | null;
  paidUsers(stayId: string): string[];
  /** Earlier Houses of a host, for Earnings (the real source: the payout records) */
  pastEarnings(userId: string): PastEarning[];
  previewForUrl(url: string, fallbackTitle?: string): LinkPreview;
  withAttribution(requests: JoinRequest[], stays: Stay[]): JoinRequest[];
  withChatHistory(threads: Thread[], seed: { stays: Stay[]; users: User[]; joinRequests: JoinRequest[] }): { threads: Thread[]; lastReadAt: Record<string, string> };
  growthEvents(seed: { stays: Stay[]; joinRequests: JoinRequest[]; payments: Payment[] }): GrowthEvent[];
  /**
   * The next page of an ordered list (Open Houses, Your houses, Updates), after the cursor. The mock pages the list it is handed, after a short
   * delay; the real source runs the list's query with startAfter(cursor) + limit and ignores `list`.
   */
  loadPage<T>(list: readonly T[], keyOf: (item: T) => string, request: PageRequest): Promise<Page<T>>;
}
