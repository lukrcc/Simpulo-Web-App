// The one contract between the app and where its data comes from: the mock (dev, demo) or the real source (production).
import type { SavedSearch } from "../savedSearches";
import type { LinkPreview } from "../links";
import type { GrowthEvent } from "../growth";
import type { JoinRequest, Payment, Stay, Thread, User } from "../types";

/** What the app starts from. */
export interface AppData {
  stays: Stay[];
  users: User[];
  joinRequests: JoinRequest[];
  threads: Thread[];
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
  paidUsers(stayId: string): string[];
  previewForUrl(url: string, fallbackTitle?: string): LinkPreview;
  withAttribution(requests: JoinRequest[], stays: Stay[]): JoinRequest[];
  withChatHistory(threads: Thread[], seed: { stays: Stay[]; users: User[]; joinRequests: JoinRequest[] }): { threads: Thread[]; lastReadAt: Record<string, string> };
  growthEvents(seed: { stays: Stay[]; joinRequests: JoinRequest[]; payments: Payment[] }): GrowthEvent[];
}
