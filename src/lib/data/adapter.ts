// The one contract between the app and where its data comes from: the mock (dev, demo) or the real source (production).
import type { HypothesisStatus } from "@/config/hypotheses";
import type { SavedSearch } from "../savedSearches";
import type { LinkPreview } from "../links";
import type { GrowthEvent } from "../growth";
import type { AdminLogEntry, HostApplication, JoinRequest, SupportTicket, Withdrawal, Payment, PlatformPhase, Stay, Thread, User, WaitlistEntry } from "../types";
import type { Page, PageRequest } from "./paging";

/** A photo's lower third: the darkening's colour (its hue and saturation at 12 % lightness) and its mean lightness 0–1. */
export interface PhotoMeta {
  tint: string;
  lum: number;
}

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

/** The admin collections (/admin): the waitlist and host application write to these; every admin action goes into the log. */
export interface AdminData {
  waitlist: WaitlistEntry[];
  applications: HostApplication[];
  log: AdminLogEntry[];
  /** "Help & feedback" (Admin › Support) */
  tickets: SupportTicket[];
  /** Admin › Money: private withdrawals entered by hand */
  withdrawals: Withdrawal[];
}

/** Simpulo's own payouts from Stripe (Admin › Money): read here, changed only in Stripe. */
export interface PlatformPayouts {
  /** "daily" · "weekly" · "monthly" */
  schedule: string;
  /** The bank account on file at Stripe ("Qonto ••1234") */
  account: string;
  /** EUR, ready to pay out */
  available: number;
  next: { date: string; amount: number } | null;
  /** Stripe's payout settings */
  manageUrl: string;
}

/** Admin › Traffic – demo data until Google Analytics reports it (phase 4). */
export interface TrafficReport {
  visitorsPerWeek: readonly { week: string; visitors: number }[];
  countries: readonly { country: string; share: number }[];
  sources: readonly { source: string; share: number }[];
  /** The way to the sign-up, in order */
  funnel: readonly { step: "visit" | "house" | "joinTapped" | "signedUp"; count: number }[];
}

/** History the admin Cockpit and Money draw (lib/admin/metrics.ts), per month. */
export interface MetricsHistory {
  /** Oldest first; 0 = this month so far */
  fullHousesPerMonth: readonly { monthsAgo: number; full: number }[];
  /** What Simpulo kept per month, EUR */
  profitPerMonth: readonly { monthsAgo: number; profit: number }[];
}

/** A hypothesis's current value and verdict (config/hypotheses.ts) */
export interface HypothesisResult {
  current: string;
  status: HypothesisStatus;
}

/** The platform phases in order (config/platform.ts); in dev the Dev menu's "Phase" picks one and the mock data set that goes with it. */
export const PLATFORM_PHASES = ["prelaunch", "beta", "live"] as const satisfies readonly PlatformPhase[];

export interface DataAdapter {
  getData(phase: PlatformPhase): AppData;
  getHouses(): Stay[];
  getUsers(): User[];
  getJoinRequests(): JoinRequest[];
  /** The saved searches a data state starts with */
  getSavedSearches(phase: PlatformPhase): readonly SavedSearch[];
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
  /** A photo's lower third, measured once (scripts/image-meta.mjs; later on upload): its dark tint and mean lightness – null when unknown */
  getPhotoMeta(src: string): PhotoMeta | null;
  /** The admin collections a data state starts with (the browser keeps its own changes, lib/admin/store.ts) */
  getAdminData(): AdminData;
  /** Admin › Traffic: demo numbers in the mock, null until the analytics source exists */
  getTrafficReport(): TrafficReport | null;
  /** Admin: the history behind the Cockpit – mock months; null where the real source computes it from its records */
  getMetricsHistory(): MetricsHistory | null;
  /** Admin › Data & Algorithm: where each hypothesis stands, by its id (missing = not measured yet) */
  getHypothesisResults(): Readonly<Record<string, HypothesisResult>>;
  /** Admin › Money: Simpulo's payout settings and balance at Stripe; null until it's connected */
  getPlatformPayouts(): PlatformPayouts | null;
}
