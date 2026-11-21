// The one contract between the app and where its data comes from: the mock (dev, demo) or the real source (production).
import type { HypothesisStatus } from "@/config/hypotheses";
import type { SavedSearch } from "../savedSearches";
import type { LinkPreview } from "../links";
import type { GrowthEvent } from "../growth";
import type { HostTier, Vibe, AdminLogEntry, Place, HostApplication, JoinRequest, SupportTicket, Withdrawal, Payment, PlatformPhase, Stay, Thread, User, WaitlistEntry } from "../types";
import type { Page, PageRequest } from "./paging";

/** A photo's lower third: the darkening's colour (its hue and saturation at 12 % lightness) and its mean lightness 0–1. */
export interface PhotoMeta {
  tint: string;
  lum: number;
  /** The whole photo's average colour (hex) – the stage's breath of colour (lib/stageTint.ts) */
  accent?: string;
  /** The photo's mood (hex): main – its dominant colour (the House page's stage, 5 %), dark – its dark muted colour (the run under a photo tile's
   *  words) */
  palette?: { main: string; dark: string };
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
  /** Admin › Heute: a task done, or put off until a day (YYYY-MM-DD), by task id */
  taskStates: Record<string, { done?: boolean; snoozedUntil?: string }>;
  /** Geld › Steuern: receipts attached later, by receipt number → file name (the mock keeps only the name) */
  receipts: Record<string, string>;
  /** Geld › Steuern: questions for the tax advisor */
  taxQuestions: TaxQuestion[];
  /** Finanzierung › Bereitschaft: "Umzug erledigt, Firma im Ausland" – set by hand */
  fundingMoved: boolean;
  /** Finanzierung › Unterlagen: each document's status by key (config/funding.ts DOCUMENTS); missing = "missing" */
  fundingDocs: Record<string, "missing" | "inProgress" | "done">;
  /** Admin › System › Backlog: each item's status (config/backlog.ts ids), over the start value there */
  backlog: Record<string, "open" | "inProgress" | "done">;
  /** Vision › Standort: the chosen country (null = noch offen) and why */
  location: { country: string | null; reason: string };
  /** Launch › Marketing › Kontakte – creators written to (Firestore marketingContacts, admins only: firestore.rules) */
  marketingContacts: MarketingContact[];
  /** Launch › Marketing › Plan: the next steps ticked off, by step id (config/marketing.ts NEXT_STEPS) */
  marketingSteps: Record<string, boolean>;
  /** Launch › Marketing › Content: 2D series clips made so far */
  marketingClips: number;
  /**
   * Admin › Houses › "Braucht Hilfe": a House marked done, by its id – when, and how full it was then. It comes back once
   * HOUSE_DONE_RECHECK_DAYS have passed without it filling further (lib/admin/metrics.ts needsHelp).
   */
  houseDone: Record<string, { at: string; spotsFilled: number }>;
  /** Admin › Houses › "Läuft gut" → "Für Content vormerken": Houses for Marketing › Content */
  contentHouses: { stayId: string; at: string }[];
  /**
   * Tax details hosts entered (Settings › Payments & payouts, only past HOST_TAX_INFO's threshold, behind its switch) – Admin only; the host
   * never sees them again after saving. Later Firestore, readable by admins only.
   */
  hostTax?: Record<string, HostTaxData & { at: string }>;
  /** Launch › Marketing › Partner – one record per collaboration (Firestore marketingPartners, admins only: firestore.rules) */
  marketingPartners: MarketingPartner[];
}

/** Creator · community operator · connector · place/brand. */
export type PartnerKind = "creator" | "community" | "connector" | "brand";
/** The creator ladder: 1 hosts themselves · 2 "{Name}'s people" · 3 "Curated by". */
export type PartnerLadder = 1 | 2 | 3;
export type PartnerAgreementStatus = "draft" | "active" | "ended";

/** One collaboration (Admin › Launch › Marketing › Partner). Admins only – never shown in the app. No payouts from here. */
export interface MarketingPartner {
  /** "mp-…" */
  id: string;
  /** The contact it grew from (Kontakte), if any */
  contactId: string | null;
  name: string;
  kind: PartnerKind;
  /** Followers / members across their channels */
  reach: number;
  channels: string[];
  ladder: PartnerLadder;
  foundingHost: boolean;
  /** Their account when they host (→ Admin › Hosts) */
  hostUserId: string | null;
  agreement: {
    /** Their share in % (of Simpulo's revenue from what they brought) */
    sharePercent: number;
    from: string | null;
    to: string | null;
    /** Their share only once the stay is paid */
    payoutAfterPaidStay: boolean;
    contentRights: string;
    collabPosts: boolean;
    contractUrl: string;
    status: PartnerAgreementStatus;
  };
  /** Linked Houses (besides the ones they host themselves) */
  houseIds: string[];
  /** Their own ref code – the link /?ref=<code> */
  refCode: string;
  content: { planned: number; delivered: number; approved: number };
  notes: { id: string; at: string; text: string }[];
  /** The next step and its due day (YYYY-MM-DD); due ones show in the Posteingang */
  nextStep: { text: string; due: string | null } | null;
  createdAt: string;
}

/** How a creator was written to. */
export type MarketingContactWay = "email" | "dm" | "form";
/** open → replied → demo seen → House opened; "later": not now (a launch mail only with consent). */
export type MarketingContactStatus = "open" | "replied" | "demo" | "house" | "later";

/** One creator on the marketing list (Admin › Launch › Marketing › Kontakte). Admins only – never shown in the app. */
export interface MarketingContact {
  /** "mc-…" – also the demo link's ?ref= */
  id: string;
  name: string;
  /** Their email, when known – a host application with the same email is linked to the contact */
  email?: string;
  /** Instagram, TikTok, YouTube … */
  channel: string;
  niche: string;
  followers: number;
  contactWay: MarketingContactWay;
  /** The first message (YYYY-MM-DD); null = not written to yet */
  firstMessageAt: string | null;
  /** Follow-ups sent: 0–2 – after the second, quiet */
  followUps: 0 | 1 | 2;
  status: MarketingContactStatus;
  /** Agreed to the launch mail – with the date (YYYY-MM-DD) */
  launchConsent: boolean;
  launchConsentAt: string | null;
  /** Marked for the launch mail – only possible with consent */
  launchMail?: boolean;
  note: string;
  /** When the demo link was opened (set by the visit) */
  demoSeenAt?: string;
  createdAt: string;
}

/** A question for the tax advisor (Geld › Steuern): open → discussed → settled, with a note. */
export interface TaxQuestion {
  id: string;
  text: string;
  status: "open" | "discussed" | "settled";
  note: string;
}

/** Art of a journal line: income (service fees, Simpulo's share of host fees) · fee (Stripe) · refund · payout (passed on to hosts) · cost */
export type LedgerKind = "income" | "fee" | "refund" | "payout" | "cost";

/**
 * ONE line of the bookkeeping journal (lib/admin/ledger.ts – the one source for every financial export). Amounts in `currency`; `fxRate`
 * = EUR per unit (1 for EUR). Refunds are negative. Beyond the fixed fields: `partyId` (the host a payout went to – DAC7) and `receipt`
 * (the receipt's file name for costs and fees; null = missing).
 */
export interface LedgerEntry {
  /** YYYY-MM-DD */
  date: string;
  /** Belegnummer, "K-2026-0042" */
  receiptNo: string;
  kind: LedgerKind;
  net: number;
  /** Percent (19, 0 …) */
  taxRate: number;
  tax: number;
  gross: number;
  currency: string;
  fxRate: number;
  category: string;
  /** ISO 3166 alpha-2 */
  country: string;
  /** Kundenart for income and refunds; null for the rest */
  customerType: "private" | "business" | null;
  description: string;
  /** Stripe's id (ch_…, re_…, po_…, in_…); null without one */
  stripeRef: string | null;
  partyId: string | null;
  receipt: string | null;
}

/** Simpulo's business account (Geld › Steuern: the reserve against it). */
export interface BankBalance {
  account: string;
  balance: number;
  /** YYYY-MM-DD */
  at: string;
}

/** A host's tax data for DAC7 (Geld › Steuern); a missing field = not given yet. */
export interface HostTaxData {
  taxId?: string;
  address?: string;
  birthDate?: string;
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
  /**
   * The overview's monthly series (0 = this month so far): the north star "Gemeinsame Nächte" (people × nights in full Houses), the booking
   * volume (everything guests paid: rent, host fee, service fee, EUR), active users (searched, reserved, requested or stayed), new guests
   * (first stay), repeat guests (percent). The mock gives realistic values; the real source computes them from its records
   * (lib/admin/metrics.ts monthlySeries – repeat guests then only for this month).
   */
  series?: {
    sharedNights: readonly number[];
    bookingVolume: readonly number[];
    activeUsers: readonly number[];
    newGuests: readonly number[];
    repeatRate: readonly number[];
  };
  /**
   * Admin › Wachstum: per month (0 = this month so far) the guests with a booking (paid their share) and how many of them have Simpulo
   * installed, by device – iPhone (Safari: Add to Home Screen) and Android (Chrome's install). The mock gives realistic values; the real
   * source needs the install records per account (data point app.installed, lib/install.ts app_installed) – until then "noch nicht messbar".
   */
  installs?: Readonly<Record<"ios" | "android", readonly { booked: number; installed: number }[]>>;
  /**
   * The network as it stands (Übersicht › Qualität, Algorithmus › Netzwerk heute): pairs who lived together, repeat guests, days until
   * full. The mock gives realistic values; the real source computes them from its records (lib/admin/metrics.ts algorithmMetrics).
   */
  network?: NetworkStats;
  /**
   * Per House, how lively it is (Admin › Houses): days since its last request, the oldest unanswered request (hours), days until it was
   * full. The mock gives realistic values for some Houses (the others count as active); the real source reads the requests.
   */
  houseActivity?: Readonly<Record<string, { quietDays?: number; oldestPendingHours?: number; daysToFull?: number }>>;
  /**
   * The months before the last twelve (12 = a year ago, oldest first), for the overview's longer periods (8 quarters, every year): profit,
   * full Houses and the shared nights per month. The mock gives a plausible start (Jan 2024 on); the real source computes them from its records.
   */
  olderMonths?: readonly { monthsAgo: number; profit: number; full: number; sharedNights: number }[];
  /**
   * The overview's main numbers as they stood on the same day of the week, month and year before (Übersicht › change "like a stock"):
   * profit and full Houses of that month up to that day, the shares in percent. The real source computes profit and full Houses from its
   * records up to that day (lib/admin/metrics.ts getChange); the shares need stored daily snapshots (TODO(backend): a nightly aggregate).
   */
  snapshots?: Readonly<Record<"week" | "month" | "year", OverviewSnapshot>>;
  /**
   * Vision › Technik: what each provider cost over the last 12 months, EUR. ⚠ The mock gives example values; the real source reads the
   * invoices (TODO(backend): from billing exports – Google Cloud, Stripe fees, …).
   */
  providerCosts?: Readonly<Record<"firebase" | "stripe" | "analytics" | "maps" | "email", number>>;
}

/** The overview's numbers on one past day (see MetricsHistory.snapshots); null = not known. */
export interface OverviewSnapshot {
  profit: number | null;
  /** Admin › Houses: Houses that needed help that day */
  needsHelp?: number | null;
  /** The north star so far that month */
  sharedNights?: number | null;
  fullHouses: number | null;
  /** 0–100 */
  reservedShare: number | null;
  /** 0–100 */
  repeatRate: number | null;
}

/**
 * One House's outcome (Admin › Analyse): what it was, who came and what Simpulo kept – EUR. The mock gives two years of realistic Houses; the
 * real source derives them from its Houses, requests and payments (lib/admin/metrics.ts outcomesFromRecords).
 */
export interface HouseOutcome {
  id: string;
  hostId: string;
  topic: Vibe;
  nights: number;
  /** Crew size, host included */
  crewSize: number;
  /** config/accommodation.ts category id; null = not given */
  category: string | null;
  hub: string;
  tier: HostTier;
  /** YYYY-MM-DD */
  startDate: string;
  /** The guests who came (host not included) */
  guestIds: readonly string[];
  /** EUR: the guests' service fees */
  serviceFee: number;
  /** EUR: Simpulo's share of the host fees */
  hostFeeShare: number;
  /** null = it didn't fill */
  daysToFull: number | null;
  /** 0–1 */
  fillRate: number;
  /** Social depth (config/depth.ts); none = Balanced */
  depth?: "easy" | "balanced" | "deep";
  /** "Host from your place": the saved place it was a window of; null/unset = a place found for this House (Admin › Analyse › Ort-Herkunft) */
  placeId?: string | null;
  /** "Mit dir wieder" (data point after.again – the rating isn't built: only the mock's example values): crew pairs who answered, mutual "again" */
  againPairs?: number;
  againMutual?: number;
}

/** A guest's payment that didn't go through (Admin › Heute, "Geld"). */
export interface PaymentIssue {
  id: string;
  stayId: string;
  userId: string;
  /** In the House's currency */
  amount: number;
  /** "card_declined" · "insufficient_funds" · "expired_card" */
  reason: string;
  /** ISO */
  at: string;
}

export interface NetworkStats {
  mutualPairs: number;
  allPairs: number;
  peopleWithMutual: number;
  guests: number;
  repeatGuests: number;
  fullHouses: number;
  medianDaysToFull: number | null;
  daysToFullBuckets: readonly { key: string; count: number }[];
  /**
   * Gegenseitiges „Mit dir wieder“ (data point after.again, the rating after the stay – not built yet): crew pairs who both answered, and
   * those who both said "again". Only the mock has example values; the real source until the rating exists: none.
   */
  againPairs?: number;
  againMutual?: number;
  /** Bookings (accepted guests in real Houses) and how many came through an invite (link or the invite sheet) or through Your people (someone
   *  of theirs was already in the crew) – example values in the mock; the real source counts its records (lib/admin/metrics.ts networkBookings) */
  bookings?: number;
  bookingsViaInvite?: number;
  bookingsViaPeople?: number;
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
  /** "Host from your place": the saved places a data state starts with, and its Houses with their `placeId` (windows) */
  withPlaces(stays: Stay[]): { stays: Stay[]; places: Place[] };
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
  /** Admin › Analyse: the Houses' outcomes – mock history; null where the real source derives them from its records */
  getHouseOutcomes(): HouseOutcome[] | null;
  /** Admin › Heute: payments that failed – mock cases; null until Stripe reports them */
  getPaymentIssues(): PaymentIssue[] | null;
  /** Geld › Steuern: the bookkeeping journal – mock example data; the real source builds it from Stripe and the bank (null until then) */
  getLedger(): LedgerEntry[] | null;
  /** Geld › Steuern: the business account's balance (Qonto) – mock; null until the bank is connected */
  getBankBalance(): BankBalance | null;
  /** Geld › Steuern › DAC7: hosts' tax data by user id – mock; the real source from the payout onboarding */
  getHostTaxData(): Readonly<Record<string, HostTaxData>>;
}
