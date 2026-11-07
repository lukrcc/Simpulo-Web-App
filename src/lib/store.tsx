"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useSyncExternalStore, type ReactNode } from "react";
import { MOCK_USER_KEY, OPEN_AS_PARAM, TAB_USER_KEY } from "./authHint";
import { useFeatureFlag } from "./featureFlags";
import { guestFee, paymentSplit } from "./fees";
import {
  attributionOf,
  claimToken,
  firstTouch,
  stripAttributionParams,
  type DemandAlert,
  type GrowthEvent,
  type GrowthEventName,
  type HostApplication,
  type ShareChannel,
} from "./growth";
import { VOTE_FIELD, paymentWaitsForCrew, voteOutcome } from "./crewVotes";
import { BOOKING_WINDOW_HOURS, PAYMENT_WINDOW_HOURS } from "./joinFlow";
import { locationOf } from "./catalog";
import { defaultUserId, type DataState, getClaimableHouses, getData, getSavedSearches, growthEventsFor, paidUsersOf, previewForUrl, readDataState, withAttribution, withChatHistory, type AppData } from "./data";
import { contactsAllowed, maskContacts } from "./contactFilter";
import { withLaunchVisibility } from "./launch";
import { crewThreadId } from "./links";
import type { AppNotification, NotifyEventKey } from "./data/notifications";
import { LOCAL_SEARCH_PREFIX, openSearchesFor, sameSearch, type SavedSearch } from "./savedSearches";
import { SEARCH_HEAD_START_HOURS } from "@/config/explore";
import { doItAgainDue, type Reminder } from "./reminders";
import type {
  Attachment,
  Attribution,
  Crew,
  Currency,
  HouseInvite,
  JoinRequest,
  LivedWith,
  LockDetails,
  Message,
  MessageType,
  NewStayInput,
  NotificationGroup,
  Payment,
  PaymentStatus,
  Report,
  ReportReason,
  Stay,
  SystemEventKey,
  Thread,
  VoteKind,
  User,
  UserSettings,
} from "./types";
import { findUrls, makeId, openSpots, slugify } from "./utils";
import { bindPaymentsMock } from "./payments/mock";
import { audienceFit, didntWorkOut, requestExpiresAt } from "./requests";
import { earningsFor } from "./earnings";
import { payments } from "./payments";
import { records as inAppRecords } from "./notify/channels/inapp";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@/config/notifications";
import { hasOffer, pendingRequestsOf, WAITLIST_OFFER_HOURS, waitlistOf, waitlistOpen, waitlistReason, waitlistRefund } from "./waitlist";

export { crewThreadId };

interface StoreState {
  users: User[];
  stays: Stay[];
  joinRequests: JoinRequest[];
  threads: Thread[];
  /** null = logged out (mock auth) */
  currentUserId: string | null;
  /** threadId → ISO timestamp of the newest message the current user has seen */
  lastReadAt: Record<string, string>;
  /** One record per crew member and locked stay (mock payments – no Stripe yet). */
  payments: Payment[];
  /** threadId → who is "typing" right now (dev-only mock replies) */
  typing: Record<string, string | null>;
  /** Mock moderation queue (Report sheet) */
  reports: Report[];
  /** Every notification, one per recipient (in-app under the bell; also email / push – see NotificationToasts). Newest last. */
  notifications: AppNotification[];
  /** Analytics events, oldest first (seeded history + this browser's; also logged to the console) */
  events: GrowthEvent[];
  /** "Notify me" on an empty Explore */
  alerts: DemandAlert[];
  /** /host applications */
  applications: HostApplication[];
  /** "Where do you want to go next?" – one record per person, place and month (mock: placeholder demand + this browser's) */
  /** Searches people saved to hear about a House first */
  savedSearches: SavedSearch[];
  /** Who lived together – one record per completed House (see Crew) */
  crews: Crew[];
  /** Every pair of housemates from completed Houses, both ways (see LivedWith) – written with the Crew record */
  livedWith: LivedWith[];
  /** Hosts' invite links (/invite/[token]) – kept in this browser across reloads, so a copied link still opens */
  houseInvites: HouseInvite[];
  /** "Something went wrong" during a stay – /admin/support (mock) */
  supportCases: SupportCase[];
}

export type SupportCategory = "place" | "host" | "safety" | "payment" | "other";

/** A help request from someone in a House, shortly before or during the stay. */
export interface SupportCase {
  id: string;
  /** "SUP-4821" – what the person quotes */
  number: string;
  stayId: string;
  userId: string;
  category: SupportCategory;
  text: string;
  /** A photo as a data URL (mock upload) */
  photo?: string;
  createdAt: string;
  status: "open" | "closed";
}

/** What a House prepared on someone's behalf needs (admin form). */
export interface ClaimableStayInput {
  name: string;
  photoUrl: string;
  sourceLink: string;
  title: string;
  region: string;
  city: string;
  startDate: string;
  endDate: string;
  spotsTotal: number;
  pitch: string;
}

export type { AppNotification, NotifyEventKey } from "./data/notifications";

// Actions that belong to "the current user" leave the user out: the reducer fills in state.currentUserId when it
// processes them. So an action dispatched right after login() in the same click already acts as the new user.
type StoreAction =
  | { type: "login"; userId: string }
  | { type: "logout" }
  | { type: "updateCurrentUser"; patch: ProfilePatch }
  | {
      type: "createStay";
      stay: Omit<Stay, "hostId">;
      attribution: Attribution;
      /** People from the host's past crews to invite (each holds a spot until they answer) */
      invite: string[];
    }
  | { type: "publishStay"; stayId: string; at: string; attribution: Attribution }
  | { type: "createClaimableStay"; stay: Stay }
  | { type: "claimStay"; token: string; at: string }
  | { type: "respondToInvite"; stayId: string; accept: boolean; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "completeStay"; stayId: string; at: string }
  | { type: "inviteToStay"; stayId: string; userId: string; at: string }
  | { type: "createHouseInvite"; invite: HouseInvite }
  | { type: "resendHouseInvite"; token: string; at: string }
  | { type: "cancelHouseInvite"; token: string }
  | { type: "expireHouseInvites"; at: string }
  | { type: "redeemHouseInvite"; token: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "track"; event: GrowthEvent }
  | { type: "attributeUser"; userId: string; attribution: Attribution }
  | { type: "addAlert"; alert: DemandAlert }
  | { type: "saveSearch"; search: SavedSearch }
  | { type: "markNotificationRead"; id: string; at: string }
  | { type: "markAllNotificationsRead"; at: string }
  /** notify() from outside the reducer: its in-app records */
  | { type: "addNotifications"; records: AppNotification[] }
  | { type: "addApplication"; application: HostApplication }
  | { type: "restoreGrowth"; saved: PersistedGrowth }
  | { type: "loadDataset"; state: StoreState }
  | { type: "updateStay"; stayId: string; patch: NewStayInput }
  | { type: "leaveStay"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "requestWaitlist"; stayId: string; id: string; message: string; at: string }
  | { type: "withdrawRequest"; stayId: string; at: string }
  | { type: "deleteDraft"; stayId: string }
  | { type: "undoDecline"; requestId: string }
  | { type: "addSupportCase"; supportCase: SupportCase }
  | { type: "removeFromWaitlist"; requestId: string }
  | { type: "takeWaitlistSpot"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "removeMember"; stayId: string; userId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "castVote"; stayId: string; kind: VoteKind; optionId: string; at: string }
  | { type: "closeVote"; stayId: string; kind: VoteKind; at: string }
  | { type: "decideVote"; stayId: string; kind: VoteKind; optionId: string; message: Pick<Message, "id" | "createdAt"> }
  | { type: "unlockAccommodation"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "closeStay"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "requestToJoin"; request: Omit<JoinRequest, "userId">; at: string }
  | { type: "acceptRequest"; requestId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "declineRequest"; requestId: string }
  | { type: "sendMessage"; threadId: string; message: Omit<Message, "senderId" | "threadId"> }
  | { type: "createThread"; thread: Thread }
  | { type: "markThreadRead"; threadId: string; at: string }
  | {
      type: "lockAccommodation";
      stayId: string;
      patch: Pick<Stay, "currency" | "totalPrice" | "payByDate" | "lockedAt">;
      lock: LockDetails;
      message: Pick<Message, "id" | "createdAt">;
    }
  | { type: "payShare"; stayId: string; message: Pick<Message, "id" | "createdAt"> }
  | { type: "confirmBooking"; stayId: string; proofUrl: string; message: Pick<Message, "id" | "createdAt"> }
  | { type: "resetPayments"; stayId: string }
  | { type: "toggleReaction"; threadId: string; messageId: string; emoji: string }
  | { type: "setTyping"; threadId: string; userId: string | null }
  | { type: "receiveMessage"; threadId: string; message: Message }
  | { type: "toggleSaved"; stayId: string }
  | { type: "confirmLivedWith"; otherUserId: string; at: string }
  | { type: "toggleHostAlert"; hostId: string }
  | { type: "setNotification"; group: NotificationGroup; channel: NotificationChannel; on: boolean }
  | { type: "unblockUser"; userId: string }
  | { type: "blockUser"; userId: string }
  | { type: "report"; report: Omit<Report, "reporterId"> }
  | { type: "deleteAccount"; at: string }
  | { type: "settlePayments"; at: string }
  | { type: "lapsePaymentWindow"; stayId: string; at: string }
  | { type: "fireReminder"; reminder: Reminder; message: Pick<Message, "id" | "createdAt"> }
  | { type: "setAcceptingRequests"; stayId: string; accepting: boolean };

/** The profile bits Edit profile, the Create flow's "About you" step and the photo sheet can change. */
export type ProfilePatch = Partial<
  Pick<
    User,
    | "name"
    | "age"
    | "birthDate"
    | "country"
    | "city"
    | "bio"
    | "languages"
    | "photos"
    | "socials"
    | "verified"
    | "preferredCurrency"
  >
>;

interface StoreActions {
  login: (userId: string) => void;
  logout: () => void;
  updateCurrentUser: (patch: ProfilePatch) => void;
  /**
   * Creates a House hosted by the current user. Returns its slug.
   * `accommodationIdeas` (links) become the host's first messages in the crew thread. `crew.invite`: people the host
   * lived with before (anyone else is ignored) – notified and emailed, each holding a spot as 'invited' until they
   * answer. `crew.againFrom`: the completed House this one repeats ("Do it again").
   */
  /** Returns the new House's id */
  createStay: (input: NewStayInput, accommodationIdeas?: string[], crew?: { invite: string[]; againFrom?: string }) => string;
  /** Host only: saves the edited House (slug and crew stay as they are). */
  updateStay: (stayId: string, patch: NewStayInput) => void;
  /** Host only: a draft goes live (listed, taking requests). */
  publishStay: (stayId: string) => void;
  /** Admin: prepares a House for someone (status draft_unclaimed). Returns its claim token. */
  createClaimableStay: (input: ClaimableStayInput) => string;
  /** The current user becomes the host of the prepared House (now a draft they can edit, then publish). */
  claimStay: (token: string) => void;
  /** Invited from a past crew: yes (→ in the crew, and the chat) or no (the spot opens up again). */
  respondToInvite: (stayId: string, accept: boolean) => void;
  /** The House is over (later: a scheduled job after the end date): status 'completed' and its Crew record written. */
  completeStay: (stayId: string) => void;
  /** Host: invites someone from their People to an open House – 'invited', holds a spot, notification + email. */
  inviteToStay: (stayId: string, userId: string) => void;
  /** Host: an invite link for someone by name or email – reserves a spot for 48h; with an email it's mailed (mock). */
  createHouseInvite: (stayId: string, to: { name?: string; email?: string }) => HouseInvite | null;
  /** Host: another 48h from now – and the mail again, if it has an email. */
  resendHouseInvite: (token: string) => void;
  /** Host: the link stops working and the spot is free again. */
  cancelHouseInvite: (token: string) => void;
  /**
   * Guest with a valid invite link: joins the House. A locked place is paid first (mock card – 0000… is declined);
   * otherwise they join now and pay their share once the place is locked, like everyone.
   */
  redeemHouseInvite: (token: string) => Promise<"joined" | "invalid">;
  /** Analytics: records an event with the browser's first-touch attribution (and logs it to the console). */
  track: (name: GrowthEventName, props?: { houseId?: string; channel?: ShareChannel; userId?: string }) => void;
  /** "Notify me" on an empty Explore. */
  addAlert: (alert: Pick<DemandAlert, "email" | "region" | "from" | "to">) => void;
  /** "Notify me": saved for this account or email, once (the same search again changes nothing). */
  saveSearch: (input: Pick<SavedSearch, "place" | "month" | "category" | "userId" | "email" | "consent">) => void;
  /** Bell / notifications page: one of the current user's notifications is read */
  markNotificationRead: (id: string) => void;
  /** …or all of them */
  markAllNotificationsRead: () => void;
  /** The in-app channel's sink: records made by notify() outside the reducer */
  addNotifications: (records: AppNotification[]) => void;
  /** /host application form. */
  addApplication: (application: Omit<HostApplication, "id" | "createdAt" | "userId">) => void;
  /** Crew member (not the host) leaves: spot freed, out of the crew chat. */
  leaveStay: (stayId: string) => void;
  /** Host: takes back "Not a fit" right after (the toast's Undo) – the request is open again, the guest's notification gone. */
  undoDecline: (requestId: string) => void;
  /** Host: a House that's still a draft is deleted (never published, nobody in it). */
  deleteDraft: (stayId: string) => void;
  /** Takes back the current user's open request (to join or for the waitlist); the host is told. */
  withdrawRequest: (stayId: string) => void;
  /** "Something went wrong": a case for support (mock: /admin/support). Returns its number. */
  addSupportCase: (input: Pick<SupportCase, "stayId" | "category" | "text" | "photo">) => string;
  /** A full House: asks the host for a place on its waitlist (optional message). Accept/decline as with requests. */
  requestWaitlist: (stayId: string, message: string) => void;
  /** Host: takes someone off the waitlist. */
  removeFromWaitlist: (requestId: string) => void;
  /** Waitlisted with a running offer: takes the spot (no new yes from the host). */
  takeWaitlistSpot: (stayId: string) => void;
  /** Host only: ends the House early. The crew is told in the crew chat. */
  closeStay: (stayId: string) => void;
  /** Host only: takes a member out of the crew (spot freed, out of the chat). */
  removeMember: (stayId: string, userId: string) => void;
  /** Host only: back to "crew decides together" – link and price are cleared, paid shares refunded. */
  /** One vote per member; a second one moves it. */
  castVote: (stayId: string, kind: VoteKind, optionId: string) => void;
  /** Host: ends the vote early. */
  closeVote: (stayId: string, kind: VoteKind) => void;
  /** Applies a vote's result: the winner, or the host's pick on a tie. */
  decideVote: (stayId: string, kind: VoteKind, optionId: string) => void;
  unlockAccommodation: (stayId: string) => Promise<void>;
  requestToJoin: (stayId: string, message: string) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  /** Sends as the current user. Images in `attachments` make it an image message; a URL makes it a link message. */
  sendMessage: (threadId: string, text: string, extra?: { attachments?: Attachment[]; replyToId?: string }) => void;
  /** Adds the current user's reaction, or removes it if it's already there. */
  toggleReaction: (threadId: string, messageId: string, emoji: string) => void;
  /**
   * Finds or creates the 1:1 thread between the current user and `userId` about a stay. Returns its id.
   * Pass `asUserId` when calling right after login (e.g. from a requireAuth callback), before the new user is in state.
   */
  openDirectThread: (stayId: string, userId: string, asUserId?: string) => string;
  markThreadRead: (threadId: string) => void;
  /**
   * Host locks a link: total split across `spots` → per person. Creates a pending payment for every crew member
   * and posts the lock card into the crew chat. Resolves after a mock delay.
   */
  lockAccommodation: (
    stayId: string,
    input: { link: string; total: number; spots: number; currency: Currency; payBy: string },
  ) => Promise<void>;
  /** Mock card payment of the current user's share. Card numbers starting with 0000 are declined. */
  payShare: (stayId: string, cardNumber: string) => Promise<"paid" | "declined">;
  /** After lib/payments charged it: the share is paid */
  markSharePaid: (stayId: string) => void;
  /** Host, once everyone paid: upload the booking confirmation → House status 'booked'. */
  confirmBooking: (stayId: string, file: File) => Promise<void>;
  /** Dev only: every payment of the stay back to pending, booking proof cleared. */
  resetPayments: (stayId: string) => void;
  /** Host's "Taking requests" switch. Nothing else ever changes it. */
  setAcceptingRequests: (stayId: string, accepting: boolean) => void;
  /** Heart: adds the House to the current user's saved list, or removes it. */
  toggleSaved: (stayId: string) => void;
  /** "Yes, I lived with them": shown on both profiles once they have said the same. */
  confirmLivedWith: (otherUserId: string) => void;
  /** "Notify me": get an alert when this host opens a House, or stop it. */
  toggleHostAlert: (hostId: string) => void;
  /** Settings → Notifications: one channel of one group on/off. */
  setNotification: (group: NotificationGroup, channel: NotificationChannel, on: boolean) => void;
  unblockUser: (userId: string) => void;
  /** Their Houses and profile are hidden from you, their requests to your Houses auto-declined, direct threads gone. */
  blockUser: (userId: string) => void;
  /** Mock: queued in `reports` for review. */
  report: (target: Report["target"], reason: ReportReason, text?: string) => void;
  /** Mock: marks the account deleted and logs out (nothing else is removed). */
  deleteAccount: () => void;
  /** Dev: fires a computed reminder now – notification (email/push mock), plus a crew chat line if crew-related. */
  fireReminder: (reminder: Reminder) => void;
  /** Dev: as if the House's open 48 hours (payment, then booking) were over now */
  lapsePaymentWindow: (stayId: string) => void;
}

type StoreValue = StoreState & StoreActions;

/**
 * A House has its thread once somebody joined (see threadsAfterJoin) – seed the ones the mock data leaves out: every
 * House with a confirmed crew, host + crew as participants.
 */
function withCrewThreads(stays: Stay[], threads: Thread[], requests: JoinRequest[]): Thread[] {
  const missing = stays
    .map((stay) => ({ stay, crew: requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId) }))
    .filter(({ stay, crew }) => stay.hostId && crew.length > 0 && !threads.some((t) => t.id === crewThreadId(stay.id)))
    .map<Thread>(({ stay, crew }) => ({
      id: crewThreadId(stay.id),
      type: "house",
      houseId: stay.id,
      participantIds: [stay.hostId, ...crew],
      messages: [],
    }));
  return [...threads, ...missing];
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mock network latency for payment actions. */
export const MOCK_DELAY_MS = 600;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Simpulo's guest fee on a share – see src/lib/fees.ts. */
export const feeFor = guestFee;

/** A crew member's payment record for a share: the host programme on top for guests, never for the host. */
/** One crew member's payment: everyone pays the same share; guests add the service fee (and a host fee, if set) – the host doesn't. */
function paymentFor(stay: Stay, userId: string, share: number, attribution: Attribution): Omit<Payment, "id" | "status"> {
  const host = userId === stay.hostId;
  const split = paymentSplit(share, host ? 0 : (stay.hostFeePerPerson ?? 0));
  return {
    stayId: stay.id,
    userId,
    share,
    ...(split.hostFee > 0 && { hostFee: split.hostFee }),
    fee: host ? 0 : split.fee,
    total: host ? split.share : split.total,
    ...attributionOf(attribution),
  };
}

/** Where a crew member came from: their accepted request's attribution (the host: their own signup's). */
function memberAttribution(users: User[], requests: JoinRequest[], stay: Stay, userId: string): Attribution {
  if (userId === stay.hostId) return attributionOf(users.find((u) => u.id === userId));
  return attributionOf(requests.findLast((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted"));
}

/** Default pay-by date when locking: five days from now (never after arrival). */
export function defaultPayBy(stay: Pick<Stay, "startDate">, now = new Date()): string {
  const inFiveDays = now.getTime() + 5 * DAY_MS;
  const arrival = stay.startDate ? new Date(`${stay.startDate}T00:00:00Z`).getTime() : Number.NaN;
  // Dates still TBD: no arrival to cap at.
  const due = Number.isNaN(arrival) ? inFiveDays : Math.min(inFiveDays, arrival);
  return new Date(due).toISOString().slice(0, 10);
}

/** The lock card data for a locked stay, from the stay itself. */
function lockFromStay(stay: Stay): LockDetails | undefined {
  if (stay.accommodationStatus !== "locked" || !stay.pricePerPerson) return undefined;
  const total = stay.totalPrice ?? stay.pricePerPerson * stay.spotsTotal;
  const link = stay.accommodationLink ?? "";
  return {
    link,
    title: link ? previewForUrl(link, stay.title).title : stay.title,
    total,
    perPerson: stay.pricePerPerson,
    spots: Math.max(1, Math.round(total / stay.pricePerPerson)),
    payBy: stay.payByDate ?? stay.startDate,
  };
}

/** Mock data locked before payments existed: give those stays lock dates and a total. */
function seedLockedStays(stays: Stay[]): Stay[] {
  return stays.map((stay) => {
    if (stay.accommodationStatus !== "locked" || !stay.pricePerPerson) return stay;
    const lockedAt = stay.lockedAt ?? new Date(new Date(stay.createdAt).getTime() + 2 * DAY_MS).toISOString();
    return {
      ...stay,
      lockedAt,
      totalPrice: stay.totalPrice ?? stay.pricePerPerson * stay.spotsTotal,
      payByDate: stay.payByDate ?? defaultPayBy(stay, new Date(lockedAt)),
    };
  });
}

/** A payment record per crew member of every locked stay; mockPaidUsers (and past Houses) are paid already. */
function seedPayments(stays: Stay[], requests: JoinRequest[], users: User[]): Payment[] {
  return stays.flatMap((stay) => {
    if (stay.accommodationStatus !== "locked" || !stay.pricePerPerson) return [];
    const share = stay.pricePerPerson;
    const crew = [stay.hostId, ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)];
    const paidAt = new Date(new Date(stay.lockedAt ?? stay.createdAt).getTime() + DAY_MS).toISOString();
    return crew.map<Payment>((userId) => {
      const paid = Boolean(stay.bookingConfirmedAt) || paidUsersOf(stay.id).includes(userId);
      return {
        id: `pay-${stay.id}-${userId}`,
        ...paymentFor(stay, userId, share, memberAttribution(users, requests, stay, userId)),
        status: paid ? "paid" : "pending",
        ...(paid && { paidAt }),
      };
    });
  });
}

/**
 * ⚠ MOCK: about 40 notifications for the default mock user across every type and the last two months, so the bell,
 * the bell's dropdown has something to show. Built from Houses and chats that exist in
 * the dataset – a type without a fitting House is skipped. Anything older than two days is read.
 */
const MOCK_NOW = Date.parse("2026-10-29T08:00:00Z");
const MOCK_DAYS = [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 9, 10, 11, 12, 14, 15, 17, 18, 20, 21, 24, 26, 28, 31, 34, 37, 40, 43, 47, 51, 55, 60];

function mockInbox(stays: Stay[], requests: JoinRequest[], users: User[], threads: Thread[]): AppNotification[] {
  const me = defaultUserId ?? "";
  const published = stays.filter((s) => s.status === "published" || s.status === "booked");
  const hosted = published.filter((s) => s.hostId === me);
  const joined = published.filter((s) => s.hostId !== me && requests.some((r) => r.stayId === s.id && r.userId === me && r.status === "accepted"));
  const locked = joined.filter((s) => s.accommodationStatus === "locked" && s.pricePerPerson);
  const others = published.filter((s) => s.hostId !== me && !joined.includes(s));
  // Requests of Lukas's that didn't work out (declined or expired): the same words for both, leading to Your houses.
  const gone = requests.filter((r) => r.userId === me && (r.status === "declined" || r.status === "expired")).flatMap((r) => {
    const stay = published.find((s) => s.id === r.stayId);
    return stay ? [{ stay, key: r.status === "declined" ? ("declined" as const) : ("requestExpired" as const) }] : [];
  });
  const names = users.filter((u) => u.id !== me && u.photos.length > 0).map((u) => u.name.split(" ")[0]);
  const chats = threads.filter((t) => t.participantIds.includes(me));
  const pick = <T,>(list: T[], i: number): T | undefined => list[i % Math.max(1, list.length)];

  const builders: Array<(i: number) => Omit<AppNotification, "id" | "userId" | "eventId" | "createdAt"> | null> = [
    (i) => { const s = pick(hosted, i); return s ? { key: "newRequest", values: { name: pick(names, i * 3)!, title: s.title }, stayId: s.id } : null; },
    (i) => { const t = pick(chats, i); const s = t && stays.find((x) => x.id === t.houseId); return t && s ? { key: "newMessage", values: { name: pick(names, i * 5 + 1)!, title: s.title, preview: MOCK_PREVIEWS[i % MOCK_PREVIEWS.length] }, stayId: s.id, threadId: t.id } : null; },
    (i) => { const s = pick(joined, i); return s ? { key: "accepted", values: { title: s.title }, stayId: s.id } : null; },
    (i) => { const s = pick(locked, i); return s ? { key: "reminderPayDue", values: { title: s.title, price: s.pricePerPerson!, payBy: s.payByDate ?? s.startDate }, stayId: s.id } : null; },
    (i) => { const s = pick(others, i * 7); return s ? { key: "searchOpened", values: { place: s.city || s.region, title: s.title, hours: SEARCH_HEAD_START_HOURS }, stayId: s.id } : null; },
    (i) => { const s = pick(locked, i + 1); return s ? { key: "locked", values: { title: s.title, price: s.pricePerPerson!, payBy: s.payByDate ?? s.startDate }, stayId: s.id } : null; },
    (i) => { const g = i < gone.length ? gone[i] : undefined; return g ? { key: g.key, values: { title: g.stay.title }, stayId: g.stay.id, href: "/your-houses?tab=past" } : null; },
    (i) => { const s = pick(hosted, i + 1); return s ? { key: "crewFull", values: { title: s.title }, stayId: s.id } : null; },
    (i) => ({ key: (["systemVerify", "systemPhoto", "systemWelcome"] as const)[i % 3], values: {}, href: (["/settings", "/profile/edit", "/how-it-works"] as const)[i % 3] }),
  ];

  return MOCK_DAYS.flatMap((days, i) => {
    const item = builders[i % builders.length](Math.floor(i / builders.length));
    if (!item) return [];
    // Spread over the day: newest first within a day, a few hours apart.
    const createdAt = new Date(MOCK_NOW - days * 86_400_000 - (i % 4) * 2.5 * 3_600_000).toISOString();
    const read = days >= 2 || i % 3 === 2;
    return [{ ...item, id: `n-mock-${i}`, userId: me, eventId: `n-mock-${i}`, createdAt, ...(read && { readAt: createdAt }), mock: true as const }];
  });
}

/**
 * ⚠ MOCK: what the crew features would have sent already – "Want to do it again?" two days after each House ended
 * (to every member) and the open invites from past crews. Read when older than two days, like mockInbox.
 */
function mockCrewInbox(stays: Stay[], requests: JoinRequest[], users: User[], crews: Crew[]): AppNotification[] {
  const seeded = (n: Omit<AppNotification, "eventId" | "mock" | "readAt">): AppNotification => {
    const read = MOCK_NOW - Date.parse(n.createdAt) > 2 * DAY_MS;
    return { ...n, eventId: n.id, mock: true, ...(read && { readAt: n.createdAt }) };
  };
  const again = crews.flatMap((crew) => {
    const stay = stays.find((s) => s.id === crew.houseId);
    const due = doItAgainDue(crew);
    if (!stay || Date.parse(due) > MOCK_NOW) return [];
    return crew.memberIds.map((userId) =>
      seeded({ id: `n-again-${stay.id}-${userId}`, userId, key: "doItAgain", values: { title: stay.title }, createdAt: due, stayId: stay.id, href: `/your-houses/${stay.id}` }),
    );
  });
  const invites = requests.flatMap((r) => {
    const stay = stays.find((s) => s.id === r.stayId);
    if (r.status !== "invited" || !stay) return [];
    const name = users.find((u) => u.id === stay.hostId)?.name.split(" ")[0] ?? "";
    return [seeded({ id: `n-invite-${r.id}`, userId: r.userId, key: "crewInvite", values: { name, title: stay.title }, createdAt: r.createdAt, stayId: stay.id })];
  });
  return [...again, ...invites];
}

/** A completed House's housemate pairs, both ways: for each member, one entry per other member. */
/** The mock's housemates: most pairs have both confirmed; in every fourth one only one side has, and the other still can. */
function withMockConfirmations(entries: LivedWith[]): LivedWith[] {
  const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7);
  return entries.map((entry) => {
    const [first, second] = [entry.userId, entry.otherUserId].toSorted();
    const onlyOne = hash(`${first}|${second}`) % 4 === 0;
    return !onlyOne || entry.userId === second ? { ...entry, confirmedAt: entry.endedAt } : entry;
  });
}

function livedWithOf(crew: Crew): LivedWith[] {
  return crew.memberIds.flatMap((userId) =>
    crew.memberIds.filter((other) => other !== userId).map((otherUserId) => ({ userId, otherUserId, houseId: crew.houseId, endedAt: crew.endedAt })),
  );
}

/** The Crew record of a House that just completed: the host plus everyone accepted right now. */
function crewRecord(stay: Stay, requests: JoinRequest[], endedAt: string): Crew {
  return {
    houseId: stay.id,
    memberIds: [stay.hostId, ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)],
    endedAt,
  };
}

const MOCK_PREVIEWS = ["Who's bringing the speaker?", "Landing at 14:20, anyone around?", "Booked my flight 🎉", "Can we push dinner to 8?", "Found a great coworking spot nearby"];

/** The store's starting state for the data source's data (in dev: the Dev menu's data state). */
function buildInitialState({ stays: rawStays, users, joinRequests: rawRequests, threads }: AppData, dataState: DataState = "full"): StoreState {
  const joinRequests = withAttribution(rawRequests, rawStays);
  const stays = seedLockedStays(rawStays);
  const payments = seedPayments(stays, joinRequests, users);
  const chat = withChatHistory(withCrewThreads(stays, threads, joinRequests), { stays, users, joinRequests });
  const crews = stays.filter((s) => s.status === "completed").map((s) => crewRecord(s, joinRequests, s.endDate));
  return {
    users,
    // Houses waiting to be claimed have no host and no crew thread until someone claims them.
    stays: withLaunchVisibility([...stays, ...getClaimableHouses()]),
    joinRequests,
    threads: chat.threads,
    currentUserId: null,
    lastReadAt: chat.lastReadAt,
    payments,
    typing: {},
    reports: [],
    events: growthEventsFor({ stays, joinRequests, payments }),
    alerts: [],
    applications: [],
    savedSearches: [...getSavedSearches(dataState)],
    crews,
    livedWith: withMockConfirmations(crews.flatMap(livedWithOf)),
    houseInvites: [],
    supportCases: [],
    notifications: [...mockInbox(stays, joinRequests, users, chat.threads), ...mockCrewInbox(stays, joinRequests, users, crews)],
  };
}

/** Server render and hydration always start from the full data; another preset is swapped in right after. */
const initialState: StoreState = buildInitialState(getData("full"));

/** The growth bits kept in this browser across reloads (mock – no backend). Seeded events are left out. */
interface PersistedGrowth {
  events: GrowthEvent[];
  alerts: DemandAlert[];
  applications: HostApplication[];
  /** Prepared Houses created here, and every claimed one – so claim links and claimed drafts survive a reload */
  claimStays: Stay[];
  /** Attribution attached to users at signup in this browser */
  userAttribution: Record<string, Attribution>;
  /** Invite links made here – so a copied link still opens after a reload or in a new tab */
  houseInvites: HouseInvite[];
  /** Searches saved here, and seeded ones that were told about a House */
  savedSearches: SavedSearch[];
}

const GROWTH_KEY = "simpulo:growth";
/**
 * The whole mock state, per data state, so a reload keeps requests, payments, messages (the login has its own key). Versioned: a new
 * MOCK_VERSION drops what an older build saved. Dev menu › "Reset mock data" clears it (resetMockData).
 */
const MOCK_VERSION = 6;
const MOCK_PREFIX = "simpulo:mock:";
const mockKey = (dataState: string) => `${MOCK_PREFIX}v${MOCK_VERSION}:${dataState}`;

function readPersistedMock(dataState: string): StoreState | null {
  try {
    const raw = localStorage.getItem(mockKey(dataState));
    if (!raw) return null;
    const saved = JSON.parse(raw) as StoreState;
    // A state saved before the audience guard may hold a request to an audience House the profile doesn't fit (a man in a women-only
    // House): it's dropped, like the request could never have been sent.
    const stayOf = (id: string) => saved.stays.find((s) => s.id === id);
    const userOf = (id: string) => saved.users.find((u) => u.id === id);
    return { ...saved, joinRequests: saved.joinRequests.filter((r) => { const stay = stayOf(r.stayId); return !stay || audienceFit(stay, userOf(r.userId)) !== "blocked"; }) };
  } catch {
    return null;
  }
}

/** Dev menu: back to the mock data as shipped – every saved mock state, the payments mock, the growth data; then a reload. */
export function resetMockData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(MOCK_PREFIX) || key === GROWTH_KEY || key === "simpulo:payments") localStorage.removeItem(key);
    }
  } catch {
    // nothing to clear
  }
  window.location.reload();
}

function persistedGrowth(state: StoreState): PersistedGrowth {
  return {
    events: state.events.filter((e) => !e.seed),
    alerts: state.alerts,
    applications: state.applications,
    claimStays: state.stays.filter((s) => s.claim && (s.claim.claimedAt || !getClaimableHouses().some((m) => m.id === s.id))),
    userAttribution: Object.fromEntries(
      state.users.filter((u) => attributionOf(u).utmSource || u.refUserId).map((u) => [u.id, attributionOf(u)]),
    ),
    houseInvites: state.houseInvites,
    savedSearches: state.savedSearches.filter((s) => !s.id.startsWith("mock-") || s.notifiedAt !== null),
  };
}

function readPersistedGrowth(): PersistedGrowth | null {
  try {
    const raw = localStorage.getItem(GROWTH_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<PersistedGrowth>;
    return {
      events: Array.isArray(saved.events) ? saved.events : [],
      alerts: Array.isArray(saved.alerts) ? saved.alerts : [],
      applications: Array.isArray(saved.applications) ? saved.applications : [],
      claimStays: Array.isArray(saved.claimStays) ? saved.claimStays : [],
      userAttribution: saved.userAttribution && typeof saved.userAttribution === "object" ? saved.userAttribution : {},
      houseInvites: Array.isArray(saved.houseInvites) ? saved.houseInvites : [],
      savedSearches: Array.isArray(saved.savedSearches) ? saved.savedSearches : [],
    };
  } catch {
    return null;
  }
}

function event(id: string, name: GrowthEventName, at: string, props: Omit<GrowthEvent, "id" | "name" | "at">): GrowthEvent {
  return { id: `ev-${id}`, name, at, ...props };
}

/** text / image / link / system – stored, or derived for older messages. */
export function messageType(message: Message): MessageType {
  if (message.type) return message.type;
  if (message.senderId === "system") return "system";
  if (message.attachments?.some((a) => a.kind === "image")) return "image";
  return findUrls(message.text).length > 0 ? "link" : "text";
}

const firstNameOf = (state: Pick<StoreState, "users">, userId: string, fallback = "Someone") =>
  state.users.find((u) => u.id === userId)?.name.split(" ")[0] ?? fallback;

/** The user's own signup attribution; without one, `fallback` (the first touch the action was sent with). */
function attributionFor(state: Pick<StoreState, "users">, userId: string, fallback: Attribution | undefined): Attribution {
  const own = attributionOf(state.users.find((u) => u.id === userId));
  return Object.keys(own).length > 0 ? own : attributionOf(fallback);
}

/** Everyone with an alert on this host hears about their new House. */
function notifyHostAlerts(state: StoreState, hostId: string, stay: Pick<Stay, "id" | "title">): AppNotification[] {
  return notifyInApp(
    state,
    state.users.filter((u) => u.hostAlerts?.includes(hostId)).map((u) => u.id),
    "hostOpened",
    { name: firstNameOf(state, hostId), title: stay.title },
    stay.id,
    stay.id,
  );
}

/** A line from Simpulo in each person's own updates chat (Messages), made on the first one. */
function withUpdateLines(threads: Thread[], to: readonly string[], key: SystemEventKey, values: Record<string, string | number>, id: string, createdAt: string): Thread[] {
  const missing = to.filter((userId) => !threads.some((t) => t.id === updatesThreadId(userId)));
  const all = [...threads, ...missing.map((userId): Thread => ({ id: updatesThreadId(userId), type: "updates", participantIds: [userId], messages: [] }))];
  return all.map((thread) => {
    if (thread.type !== "updates" || !to.includes(thread.participantIds[0])) return thread;
    return { ...thread, messages: [...thread.messages, systemLine({ id: `${id}-${thread.participantIds[0]}`, createdAt }, thread.id, key, values)] };
  });
}

/**
 * Publishing a House: every open search it answers is told first (bell + Messages), with a token of its own, and for the first 48h only they
 * see it. Each search is told once (notifiedAt). People without an account get their email from the backend later; here they're only marked.
 */
function announceToSearches(state: StoreState, stay: Stay): Pick<StoreState, "notifications" | "threads" | "houseInvites" | "savedSearches"> & { stay: Stay } {
  const matches = openSearchesFor(state.savedSearches, stay).filter((s) => s.userId !== stay.hostId);
  const { notifications, threads, houseInvites, savedSearches } = state;
  if (matches.length === 0) return { notifications, threads, houseInvites, savedSearches, stay };
  const people = [...new Set(matches.flatMap((s) => (s.userId && state.users.some((u) => u.id === s.userId) ? [s.userId] : [])))];
  const place = stay.location.city || stay.city || stay.location.country;
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SEARCH_HEAD_START_HOURS * 3_600_000).toISOString();
  const tokens = people.map((userId): HouseInvite => ({ token: inviteToken(), houseId: stay.id, invitedUserId: userId, priority: true, createdAt, expiresAt, status: "pending" }));
  const values = { place, title: stay.title, hours: SEARCH_HEAD_START_HOURS };
  return {
    stay: { ...stay, priorityUntil: expiresAt },
    savedSearches: savedSearches.map((s) => (matches.includes(s) ? { ...s, notifiedAt: createdAt } : s)),
    houseInvites: [...houseInvites, ...tokens],
    threads: withUpdateLines(threads, people, "searchHouseOpened", values, `${stay.id}-search`, createdAt),
    // Each person's own link (their token), so one record each.
    notifications: [
      ...notifications,
      ...tokens.flatMap((token) =>
        inAppRecords([token.invitedUserId!], { key: "searchOpened", values, eventId: `${stay.id}-search`, stayId: stay.id, href: houseInviteUrl("", stay, token) }, createdAt),
      ),
    ],
  };
}

/** Host plus accepted members. */
/** The place is locked: its price replaces the budget, and everyone in the crew owes a share. Nothing goes into the thread. */
function withLock(state: StoreState, stay: Stay, lock: LockDetails, patch: Pick<Stay, "currency" | "totalPrice" | "payByDate" | "lockedAt">, messageId: string): StoreState {
  const payments: Payment[] = crewIds(state, stay).map((userId) => ({
    id: `pay-${stay.id}-${userId}-${messageId}`,
    ...paymentFor(stay, userId, lock.perPerson, memberAttribution(state.users, state.joinRequests, stay, userId)),
    status: "pending",
  }));
  return {
    ...state,
    stays: state.stays.map((s) =>
      s.id === stay.id
        ? // A locked place has a real price – the rough budget is history. The currency may change with it.
          { ...s, ...patch, accommodationStatus: "locked", accommodationLink: lock.link, pricePerPerson: lock.perPerson, budgetPerPerson: undefined }
        : s,
    ),
    // A new lock replaces any earlier, refunded round of payments.
    payments: [...state.payments.filter((p) => p.stayId !== stay.id || p.status === "refunded"), ...payments],
  };
}

function crewIds(state: Pick<StoreState, "joinRequests">, stay: Stay): string[] {
  return [stay.hostId, ...state.joinRequests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)];
}

/**
 * The reducer's way into Messages › Updates: the in-app channel's records (lib/notify/channels/inapp). Push and email for them go out
 * through notify() once they're in the store (NotifyBridge) – the reducer itself stays pure.
 */
function notifyInApp(
  state: StoreState,
  to: string[],
  key: NotifyEventKey,
  values: Record<string, string | number>,
  id: string,
  /** The House it's about – where the notification links to */
  stayId?: string,
  /** A chat it's about (new messages) */
  threadId?: string,
  extra?: Pick<AppNotification, "href">,
): AppNotification[] {
  const added = inAppRecords(to, { key, values, eventId: id, stayId, threadId, href: extra?.href });
  return added.length === 0 ? state.notifications : [...state.notifications, ...added];
}

/** A system line in a House thread: no stored text, rendered from the event's translation (centred, muted). */
function systemLine(base: Pick<Message, "id" | "createdAt">, threadId: string, key: SystemEventKey, values: Record<string, string | number>): Message {
  return { ...base, threadId, senderId: "system", text: "", event: { key, values } };
}

/** Lines at the end of a House's thread – nothing when the House has no thread yet (nobody joined). */
function postToHouse(threads: Thread[], stayId: string, lines: Message[]): Thread[] {
  return updateThread(threads, crewThreadId(stayId), (t) => ({ ...t, messages: [...t.messages, ...lines] }));
}

/**
 * The House thread after `userId` joined: created with the first confirmed join (host + crew, opening with the host's
 * accommodation ideas), the newcomer added, a "joined" line – and "Crew complete" when that took the last spot.
 */
function threadsAfterJoin(state: StoreState, stay: Stay, userId: string, base: Pick<Message, "id" | "createdAt">, complete: boolean): Thread[] {
  const id = crewThreadId(stay.id);
  const lines = [
    systemLine(base, id, "joined", { name: firstNameOf(state, userId) }),
    ...(complete ? [systemLine({ id: `${base.id}-complete`, createdAt: base.createdAt }, id, "crewComplete", {})] : []),
  ];
  if (state.threads.some((t) => t.id === id)) {
    return updateThread(state.threads, id, (t) => ({
      ...t,
      participantIds: t.participantIds.includes(userId) ? t.participantIds : [...t.participantIds, userId],
      messages: [...t.messages, ...lines],
    }));
  }
  const ideas = (stay.accommodationIdeas ?? []).map<Message>((link, i) => ({ id: `${id}-idea-${i}`, threadId: id, senderId: stay.hostId, text: link, createdAt: stay.createdAt }));
  const thread: Thread = { id, type: "house", houseId: stay.id, participantIds: [...new Set([...crewIds(state, stay), userId])], messages: [...ideas, ...lines] };
  return [thread, ...state.threads];
}

/** Dev-only mock replies after you send a message. */
const CANNED_REPLIES = ["Haha nice 😄", "Agreed!", "Sounds good to me 👍", "Love it", "On it", "Wait, really?", "Perfect, thanks!", "🙌"];

export { OPEN_AS_PARAM };

/** Where the mock user lives for this tab: sessionStorage once the tab was opened "as" someone, else localStorage. */
function userStorage(): Storage {
  return sessionStorage.getItem(TAB_USER_KEY) !== null ? sessionStorage : localStorage;
}

function updateThread(threads: Thread[], threadId: string, update: (t: Thread) => Thread): Thread[] {
  return threads.map((t) => (t.id === threadId ? update(t) : t));
}

/**
 * Takes an accepted member out of a crew: request removed (they could ask again later), spot freed, out of the
 * crew chat. "Taking requests" stays as the host set it.
 */
function withoutMember(state: StoreState, stay: Stay, userId: string, systemMessage: Message): StoreState {
  const request = state.joinRequests.find((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted");
  if (!request) return state;
  // A paid share goes back – the thread says so (how much stays on the House page).
  const refunded = state.payments.some((p) => p.stayId === stay.id && p.userId === userId && p.status === "paid");
  const refund = refunded ? [systemLine({ id: `${systemMessage.id}-refund`, createdAt: systemMessage.createdAt }, systemMessage.threadId, "refund", { count: 1 })] : [];
  return {
    ...state,
    joinRequests: state.joinRequests.filter((r) => r.id !== request.id),
    // A paid share goes back (mock refund); an open one is simply dropped.
    payments: state.payments
      .filter((p) => !(p.stayId === stay.id && p.userId === userId && p.status === "pending"))
      .map((p) => (p.stayId === stay.id && p.userId === userId && p.status === "paid" ? { ...p, status: "refunded" } : p)),
    stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled: Math.max(1, s.spotsFilled - 1) } : s)),
    threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({
      ...t,
      participantIds: t.participantIds.filter((id) => id !== userId),
      messages: [...t.messages, systemMessage, ...refund],
    })),
  };
}

/**
 * The money's clock, after everything that can move it: the crew complete and the place chosen opens the 48 hours to pay; when they
 * are over an unpaid member's spot opens up again and host and crew hear it. Everyone paid: the money is released to the host, who
 * confirms the booking within 48 hours, or it all goes back. No card is held before that: nothing happens to anyone's card until
 * they pay. The host's own share has no spot to free, so it never lapses.
 */
const HOUR_MS = 3_600_000;
const SETTLE_EVERY_MS = 60_000;

function settlePayments(state: StoreState, at: string, announce: boolean): StoreState {
  let next = state;
  for (const stay of state.stays) {
    if (stay.accommodationStatus !== "locked" || !stay.pricePerPerson || (stay.status !== "published" && stay.status !== "booked")) continue;
    const payments = next.payments.filter((p) => p.stayId === stay.id && p.status !== "refunded");
    const open = payments.filter((p) => p.status === "pending");
    const complete = stay.spotsFilled >= stay.spotsTotal;
    const patch = (fields: Partial<Stay>) => {
      next = { ...next, stays: next.stays.map((s) => (s.id === stay.id ? { ...s, ...fields } : s)) };
    };

    if (open.length > 0 && complete && !stay.paymentDueAt) {
      const due = new Date(Date.parse(at) + PAYMENT_WINDOW_HOURS * HOUR_MS).toISOString();
      patch({ paymentDueAt: due });
      if (announce) next = { ...next, notifications: notifyInApp(next, open.map((p) => p.userId), "paymentDue", { title: stay.title }, `${stay.id}-due-${at}`, stay.id) };
    } else if (stay.paymentDueAt && (open.length === 0 || !complete)) {
      patch({ paymentDueAt: undefined });
    } else if (stay.paymentDueAt && stay.paymentDueAt <= at) {
      const lapsed = open.filter((p) => p.userId !== stay.hostId);
      if (lapsed.length > 0) {
        for (const payment of lapsed) {
          const name = firstNameOf(next, payment.userId);
          const id = `${stay.id}-lapsed-${payment.userId}-${at}`;
          const others = crewIds(next, stay);
          const current = next.stays.find((s) => s.id === stay.id) ?? stay;
          next = withoutMember(next, current, payment.userId, systemLine({ id, createdAt: at }, crewThreadId(stay.id), "paymentLapsed", { name }));
          next = { ...next, payments: next.payments.filter((p) => !(p.stayId === stay.id && p.userId === payment.userId && p.status === "pending")), notifications: notifyInApp(next, others, "paymentLapsed", { title: stay.title, name }, id, stay.id) };
        }
        patch({ paymentDueAt: undefined });
      }
    }

    const settled = next.stays.find((s) => s.id === stay.id) ?? stay;
    const everyonePaid = payments.length > 0 && open.length === 0 && settled.spotsFilled >= settled.spotsTotal;
    if (settled.bookingConfirmedAt || !everyonePaid) {
      if (settled.allPaidAt && !settled.bookingConfirmedAt) patch({ allPaidAt: undefined });
      continue;
    }
    if (!settled.allPaidAt) {
      patch({ allPaidAt: at });
    } else if (Date.parse(settled.allPaidAt) + BOOKING_WINDOW_HOURS * HOUR_MS <= Date.parse(at)) {
      // No booking confirmed in time: everything goes back, and the crew decides on the place again.
      const lines = [systemLine({ id: `${stay.id}-refund-${at}`, createdAt: at }, crewThreadId(stay.id), "refund", { count: payments.length })];
      next = {
        ...next,
        stays: next.stays.map((s) => (s.id === stay.id ? { ...s, accommodationStatus: "open", accommodationLink: undefined, pricePerPerson: undefined, totalPrice: undefined, payByDate: undefined, lockedAt: undefined, allPaidAt: undefined, paymentDueAt: undefined } : s)),
        payments: next.payments.map((p) => (p.stayId === stay.id && p.status === "paid" ? { ...p, status: "refunded" as const } : p)),
        threads: postToHouse(next.threads, stay.id, lines),
        notifications: notifyInApp(next, crewIds(next, stay), "bookingRefunded", { title: stay.title }, `${stay.id}-refund-${at}`, stay.id),
      };
    }
  }
  return next;
}

/** Open requests past their 48 hours become "expired"; the guest gets the same words as for a no. */
function expireRequests(state: StoreState, at: string): StoreState {
  const due = state.joinRequests.filter((r) => r.status === "pending" && requestExpiresAt(r) <= at);
  if (due.length === 0) return state;
  let next: StoreState = { ...state, joinRequests: state.joinRequests.map((r) => (due.some((d) => d.id === r.id) ? { ...r, status: "expired" as const } : r)) };
  for (const r of due) {
    const stay = state.stays.find((s) => s.id === r.stayId);
    if (stay) next = { ...next, notifications: notifyInApp(next, [r.userId], "requestExpired", { title: stay.title }, `${r.id}-expired`, stay.id, undefined, { href: "/your-houses?tab=past" }) };
  }
  return next;
}

/**
 * The waitlist's clock (src/lib/waitlist.ts): offers that ran out drop their person from the list; every free spot of an open House goes,
 * as an offer for 24h, to the first waitlisted person without one (they and the host are told); `Stay.spotsOffered` counts the running
 * offers, so a held spot isn't free to anyone else.
 */
function syncWaitlist(state: StoreState, at: string): StoreState {
  let next = state;
  for (const r of state.joinRequests) {
    if (r.status !== "waitlisted" || !r.offerExpiresAt || hasOffer(r, at)) continue;
    const stay = state.stays.find((s) => s.id === r.stayId);
    next = { ...next, joinRequests: next.joinRequests.filter((x) => x.id !== r.id) };
    if (stay) next = { ...next, notifications: notifyInApp(next, [r.userId, stay.hostId], "waitlistOfferExpired", { name: firstNameOf(state, r.userId), title: stay.title }, `${r.id}-expired`, stay.id) };
  }
  const until = new Date(Date.parse(at) + WAITLIST_OFFER_HOURS * HOUR_MS).toISOString();
  for (const stay of next.stays) {
    if (stay.status !== "published" && stay.status !== "booked") continue;
    const list = waitlistOf(next, stay.id);
    if (list.length === 0) continue;
    const offered = list.filter((r) => hasOffer(r, at)).length;
    let free = stay.spotsTotal - stay.spotsFilled - (stay.spotsInvited ?? 0) - (stay.spotsReserved ?? 0) - offered;
    const pending = new Set(pendingRequestsOf(next, stay.id).map((r) => r.id));
    for (const r of list) {
      if (free <= 0) break;
      if (hasOffer(r, at)) continue;
      // Joined behind open requests: only a spot beyond the ones they still cover.
      if (free - (r.coveredBy ?? []).filter((id) => pending.has(id)).length <= 0) continue;
      free--;
      next = { ...next, joinRequests: next.joinRequests.map((x) => (x.id === r.id ? { ...x, offerExpiresAt: until } : x)) };
      const values = { name: firstNameOf(next, r.userId), title: stay.title };
      next = { ...next, notifications: notifyInApp(next, [r.userId], "waitlistOffer", values, `${r.id}-offer-${at}`, stay.id) };
      next = { ...next, notifications: notifyInApp(next, [stay.hostId], "waitlistMovedUp", values, `${r.id}-moved-${at}`, stay.id) };
    }
  }
  const count = new Map<string, number>();
  for (const r of next.joinRequests) if (r.status === "waitlisted" && hasOffer(r, at)) count.set(r.stayId, (count.get(r.stayId) ?? 0) + 1);
  if (next.stays.some((s) => (s.spotsOffered ?? 0) !== (count.get(s.id) ?? 0))) {
    next = { ...next, stays: next.stays.map((s) => ((s.spotsOffered ?? 0) === (count.get(s.id) ?? 0) ? s : { ...s, spotsOffered: count.get(s.id) || undefined })) };
  }
  return next;
}

/** Whatever changed the Houses: their visibility follows how many are published (src/lib/launch.ts). */
function reducer(state: StoreState, action: StoreAction): StoreState {
  const applied = applyAction(state, action);
  const moved = action.type === "settlePayments" || applied.stays !== state.stays || applied.payments !== state.payments;
  // The clock's own tick only finds Houses that were already complete when the data loaded: nothing new to tell anyone.
  const at = "at" in action && action.at ? action.at : new Date().toISOString();
  const settled = moved ? settlePayments(applied, at, action.type !== "settlePayments") : applied;
  // The waitlist follows every change and every tick of the clock: offers run out, free spots are offered.
  const synced = moved || applied.joinRequests !== state.joinRequests ? syncWaitlist(settled, at) : settled;
  // Open requests expire after 48h (config/policies.ts): the guest hears it like a no – "didn't work out".
  const next = moved ? expireRequests(synced, at) : synced;
  if (next.stays === state.stays) return next;
  const stays = withLaunchVisibility(next.stays);
  return stays === next.stays ? next : { ...next, stays };
}

function applyAction(state: StoreState, action: StoreAction): StoreState {
  const me = state.currentUserId;
  switch (action.type) {
    case "login":
      return state.users.some((u) => u.id === action.userId) ? { ...state, currentUserId: action.userId } : state;

    case "logout":
      return { ...state, currentUserId: null };

    case "updateCurrentUser":
      if (!me) return state;
      return { ...state, users: state.users.map((u) => (u.id === me ? { ...u, ...action.patch } : u)) };

    case "createStay": {
      if (!me) return state;
      // No thread yet: it starts with the first confirmed join (the host's accommodation ideas open it).
      // Only people the host lived with (LivedWith), and never more than the spots besides the host's own.
      const livedWith = new Set(state.livedWith.filter((l) => l.userId === me).map((l) => l.otherUserId));
      const invited = [...new Set(action.invite)].filter((id) => livedWith.has(id)).slice(0, Math.max(0, action.stay.spotsTotal - 1));
      const invites = invited.map<JoinRequest>((userId) => ({
        id: `inv-${action.stay.id}-${userId}`,
        stayId: action.stay.id,
        userId,
        message: "",
        status: "invited",
        createdAt: action.stay.createdAt,
      }));
      const withInvites: StoreState = {
        ...state,
        notifications: notifyInApp(state, invited, "crewInvite", { name: firstNameOf(state, me), title: action.stay.title }, `${action.stay.id}-crew`, action.stay.id),
      };
      const announced = announceToSearches({ ...withInvites, notifications: notifyHostAlerts(withInvites, me, action.stay) }, { ...action.stay, hostId: me });
      return {
        ...state,
        stays: [{ ...announced.stay, ...(invited.length > 0 && { spotsInvited: invited.length }) }, ...state.stays],
        joinRequests: [...state.joinRequests, ...invites],
        notifications: announced.notifications,
        threads: announced.threads,
        houseInvites: announced.houseInvites,
        savedSearches: announced.savedSearches,
        events: [
          ...state.events,
          event(action.stay.id, "house_published", action.stay.createdAt, { houseId: action.stay.id, userId: me, ...attributionFor(state, me, action.attribution) }),
        ],
      };
    }

    case "publishStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.status !== "draft") return state;
      const announced = announceToSearches({ ...state, notifications: notifyHostAlerts(state, me, stay) }, stay);
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...announced.stay, status: "published", acceptingRequests: true } : s)),
        notifications: announced.notifications,
        threads: announced.threads,
        houseInvites: announced.houseInvites,
        savedSearches: announced.savedSearches,
        events: [
          ...state.events,
          event(`${stay.id}-${action.at}`, "house_published", action.at, { houseId: stay.id, userId: me, ...attributionFor(state, me, action.attribution) }),
        ],
      };
    }

    case "createClaimableStay":
      return { ...state, stays: [...state.stays, action.stay] };

    case "claimStay": {
      const stay = state.stays.find((s) => s.claim?.token === action.token);
      if (!stay?.claim || !me || stay.status !== "draft_unclaimed") return state;
      return {
        ...state,
        // A draft of their own now: they edit it, then publish. Their profile photo replaces the prepared one. (Its
        // thread comes with the first confirmed join, like any House's.)
        stays: state.stays.map((s) =>
          s.id === stay.id
            ? { ...s, hostId: me, status: "draft", acceptingRequests: false, claim: { ...stay.claim!, claimedAt: action.at, claimedBy: me } }
            : s,
        ),
      };
    }

    case "respondToInvite": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const invite = me && state.joinRequests.find((r) => r.stayId === action.stayId && r.userId === me && r.status === "invited");
      if (!stay || !invite) return state;
      // The held spot is released either way: taken for real, or open for anyone again.
      const spotsInvited = Math.max(0, (stay.spotsInvited ?? 0) - 1);
      // No thanks: the invite simply goes away – they can still ask to join like anyone else.
      if (!action.accept) {
        return {
          ...state,
          joinRequests: state.joinRequests.filter((r) => r.id !== invite.id),
          stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsInvited } : s)),
        };
      }
      const name = firstNameOf(state, me);
      const systemMessage = { ...action.systemMessage, threadId: crewThreadId(stay.id) };
      const spotsFilled = stay.spotsFilled + 1;
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === invite.id ? { ...r, status: "accepted" } : r)),
        payments:
          stay.accommodationStatus === "locked" && stay.pricePerPerson
            ? [...state.payments, { id: `pay-${stay.id}-${me}`, ...paymentFor(stay, me, stay.pricePerPerson, attributionFor(state, me, undefined)), status: "pending" }]
            : state.payments,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled, spotsInvited } : s)),
        threads: threadsAfterJoin(state, stay, me, systemMessage, spotsFilled >= stay.spotsTotal),
        notifications: notifyInApp(
          spotsFilled >= stay.spotsTotal
            ? { ...state, notifications: notifyInApp(state, [...crewIds(state, stay), me], "crewFull", { title: stay.title }, `${systemMessage.id}-full`, stay.id) }
            : state,
          [stay.hostId],
          "inviteAccepted",
          { name, title: stay.title },
          systemMessage.id,
          stay.id,
        ),
      };
    }

    case "inviteToStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || (stay.status !== "published" && stay.status !== "booked") || openSpots(stay) === 0) return state;
      if (!getPeople(state, me).some((p) => p.user.id === action.userId)) return state;
      // Already in, already asking (answer the request instead) or already invited: nothing to send.
      const existing = state.joinRequests.find((r) => r.stayId === stay.id && r.userId === action.userId && !didntWorkOut(r));
      if (existing) return state;
      const invite: JoinRequest = { id: `inv-${stay.id}-${action.userId}`, stayId: stay.id, userId: action.userId, message: "", status: "invited", createdAt: action.at };
      return {
        ...state,
        // An earlier "not this time" gives way to the invite.
        joinRequests: [...state.joinRequests.filter((r) => !(r.stayId === stay.id && r.userId === action.userId)), invite],
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsInvited: (s.spotsInvited ?? 0) + 1 } : s)),
        notifications: notifyInApp(state, [action.userId], "houseInvite", { name: firstNameOf(state, me), title: stay.title }, invite.id, stay.id),
      };
    }

    case "createHouseInvite": {
      const { invite } = action;
      const stay = state.stays.find((s) => s.id === invite.houseId);
      // The host or someone in the crew, on a House that's open to join, with a spot to reserve.
      if (!stay || !me || !isCrewMember(state, stay, me) || (stay.status !== "published" && stay.status !== "booked") || openSpots(stay) === 0) return state;
      return withInvites(state, [...state.houseInvites, invite]);
    }

    case "resendHouseInvite": {
      const invite = state.houseInvites.find((i) => i.token === action.token);
      const stay = invite && state.stays.find((s) => s.id === invite.houseId);
      if (!invite || !stay || stay.hostId !== me || invite.status !== "pending") return state;
      return withInvites(
        state,
        state.houseInvites.map((i) => (i === invite ? { ...i, expiresAt: inviteExpiry(action.at), ...(i.email && { emailedAt: action.at }) } : i)),
      );
    }

    case "cancelHouseInvite": {
      const invite = state.houseInvites.find((i) => i.token === action.token);
      const stay = invite && state.stays.find((s) => s.id === invite.houseId);
      if (!invite || !stay || stay.hostId !== me || invite.status !== "pending") return state;
      return withInvites(state, state.houseInvites.map((i) => (i === invite ? { ...i, status: "cancelled" } : i)));
    }

    case "expireHouseInvites": {
      if (!state.houseInvites.some((i) => i.status === "pending" && i.expiresAt <= action.at)) return state;
      return withInvites(state, state.houseInvites.map((i) => (i.status === "pending" && i.expiresAt <= action.at ? { ...i, status: "expired" } : i)));
    }

    case "redeemHouseInvite": {
      const invite = state.houseInvites.find((i) => i.token === action.token);
      const stay = invite && state.stays.find((s) => s.id === invite.houseId);
      if (!invite || !stay || !me || invite.status !== "pending" || invite.expiresAt <= action.systemMessage.createdAt) return state;
      // Not for the host or someone already in; a locked place needs its share paid first.
      if (stay.hostId === me || isCrewMember(state, stay, me)) return state;
      // A saved search's token is that person's, and holds no spot: first come, first in.
      if (invite.priority && (invite.invitedUserId !== me || openSpots(stay) === 0)) return state;
      const locked = stay.accommodationStatus === "locked" && Boolean(stay.pricePerPerson);
      const systemMessage = { ...action.systemMessage, threadId: crewThreadId(stay.id) };
      const spotsFilled = stay.spotsFilled + 1;
      const request: JoinRequest = {
        id: `hinv-${invite.token}`,
        stayId: stay.id,
        userId: me,
        message: "",
        status: "accepted",
        createdAt: systemMessage.createdAt,
        ...attributionFor(state, me, undefined),
      };
      // The reservation becomes the member: the spot moves from reserved to taken in one step.
      const joined: StoreState = withInvites(
        {
          ...state,
          stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled } : s)),
          // Any earlier request or past-crew invite of theirs gives way to the membership.
          joinRequests: [...state.joinRequests.filter((r) => !(r.stayId === stay.id && r.userId === me)), request],
        },
        state.houseInvites.map((i) => (i === invite ? { ...i, status: "used", usedBy: me } : i)),
      );
      const name = firstNameOf(state, me);
      return {
        ...joined,
        payments:
          locked && stay.pricePerPerson
            ? [
                ...state.payments.filter((p) => p.id !== `pay-${stay.id}-${me}`),
                { id: `pay-${stay.id}-${me}`, ...paymentFor(stay, me, stay.pricePerPerson, request), status: "pending" },
              ]
            : state.payments,
        threads: threadsAfterJoin(joined, stay, me, systemMessage, spotsFilled >= stay.spotsTotal),
        notifications: notifyInApp(
          spotsFilled >= stay.spotsTotal
            ? { ...state, notifications: notifyInApp(state, [...crewIds(state, stay), me], "crewFull", { title: stay.title }, `${systemMessage.id}-full`, stay.id) }
            : state,
          [stay.hostId],
          "inviteAccepted",
          { name, title: stay.title },
          systemMessage.id,
          stay.id,
        ),
      };
    }

    case "completeStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || stay.status === "completed" || stay.status === "closed" || stay.status === "draft" || stay.status === "draft_unclaimed") return state;
      // Open invites lapse – the House is over.
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, status: "completed", acceptingRequests: false, spotsInvited: undefined } : s)),
        joinRequests: state.joinRequests.filter((r) => !(r.stayId === stay.id && r.status === "invited")),
        crews: [...state.crews.filter((c) => c.houseId !== stay.id), crewRecord(stay, state.joinRequests, action.at)],
        livedWith: [...state.livedWith.filter((l) => l.houseId !== stay.id), ...livedWithOf(crewRecord(stay, state.joinRequests, action.at))],
      };
    }

    case "track":
      return { ...state, events: [...state.events, action.event] };

    case "attributeUser": {
      // First touch wins: a user who already has an attribution keeps it.
      const user = state.users.find((u) => u.id === action.userId);
      if (!user || Object.keys(attributionOf(user)).length > 0 || Object.keys(action.attribution).length === 0) return state;
      return { ...state, users: state.users.map((u) => (u.id === user.id ? { ...u, ...attributionOf(action.attribution) } : u)) };
    }

    case "addAlert":
      return { ...state, alerts: [...state.alerts, action.alert] };

    case "saveSearch": {
      const { search } = action;
      const owner = (s: SavedSearch) => (search.userId ? s.userId === search.userId : s.email === search.email);
      if (state.savedSearches.some((s) => s.notifiedAt === null && owner(s) && sameSearch(s, search))) return state;
      return { ...state, savedSearches: [...state.savedSearches, search] };
    }

    case "markNotificationRead":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id && n.userId === me && !n.readAt ? { ...n, readAt: action.at } : n)),
      };

    case "markAllNotificationsRead":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.userId === me && !n.readAt ? { ...n, readAt: action.at } : n)),
      };

    case "addNotifications": {
      const fresh = action.records.filter((r) => !state.notifications.some((n) => n.id === r.id));
      return fresh.length === 0 ? state : { ...state, notifications: [...state.notifications, ...fresh] };
    }

    case "addApplication":
      return { ...state, applications: [...state.applications, action.application] };

    case "loadDataset":
      return { ...action.state, currentUserId: state.currentUserId };

    case "restoreGrowth": {
      const { saved } = action;
      const known = new Set(state.events.map((e) => e.id));
      const savedIds = new Set(saved.claimStays.map((s) => s.id));
      const stays = withReservedSpots([...state.stays.filter((s) => !savedIds.has(s.id)), ...saved.claimStays], saved.houseInvites);
      return {
        ...state,
        houseInvites: saved.houseInvites,
        savedSearches: [...state.savedSearches.filter((s) => !saved.savedSearches.some((own) => own.id === s.id)), ...saved.savedSearches],
        events: [...state.events, ...saved.events.filter((e) => !known.has(e.id))],
        alerts: saved.alerts,
        applications: saved.applications,
        stays,
        threads: withCrewThreads(stays, state.threads, state.joinRequests),
        users: state.users.map((u) => (saved.userAttribution[u.id] && Object.keys(attributionOf(u)).length === 0 ? { ...u, ...attributionOf(saved.userAttribution[u.id]) } : u)),
      };
    }

    case "updateStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me) return state;
      // Never below the people already in.
      const spotsTotal = Math.max(action.patch.spotsTotal, stay.spotsFilled);
      return { ...state, stays: state.stays.map((s) => (s.id === stay.id ? { ...s, ...action.patch, location: locationOf(action.patch.city, action.patch.region), spotsTotal } : s)) };
    }

    case "leaveStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      // The host can't leave their own House – they close it instead.
      if (!stay || !me || stay.hostId === me) return state;
      const name = firstNameOf(state, me);
      const paid = state.payments.find((p) => p.stayId === stay.id && p.userId === me && p.status === "paid");
      const next = withoutMember(state, stay, me, systemLine(action.systemMessage, crewThreadId(stay.id), "left", { name }));
      if (next === state) return state;
      let left: StoreState = { ...next, notifications: notifyInApp(next, [stay.hostId], "left", { name, title: stay.title }, action.systemMessage.id, stay.id) };
      // Paid, and people are waiting: the spot goes to the waitlist (syncWaitlist offers it), the refund keeps Simpulo's fee.
      // Nobody waiting: no refund (below).
      // Paid and nobody waiting: no refund (config/policies.ts) – the record says "refunded 0" so the guest sees why.
      if (paid && waitlistOf(state, stay.id).length === 0) {
        left = { ...left, payments: left.payments.map((p) => (p.id === paid.id ? { ...p, refundedAmount: 0 } : p)) };
      }
      if (paid && waitlistOf(state, stay.id).length > 0) {
        const amount = waitlistRefund(paid);
        left = {
          ...left,
          payments: left.payments.map((p) => (p.id === paid.id ? { ...p, refundedAmount: amount } : p)),
          notifications: notifyInApp(left, [me], "leftRefund", { title: stay.title, amount: `${amount} ${stay.currency}` }, `${action.systemMessage.id}-refund`, stay.id),
        };
      }
      return left;
    }

    case "requestWaitlist": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const reason = stay ? waitlistReason(state, stay) : null;
      if (!stay || !me || stay.hostId === me || stay.status !== "published" || !reason || !waitlistOpen(state, stay)) return state;
      // Already on the way in (or on the list): nothing to add. A declined request may try again.
      if (state.joinRequests.some((r) => r.stayId === stay.id && r.userId === me && !didntWorkOut(r))) return state;
      const attribution = attributionFor(state, me, undefined);
      return {
        ...state,
        joinRequests: [...state.joinRequests, { id: action.id, stayId: stay.id, userId: me, message: action.message.trim(), status: "waitlist_requested", createdAt: action.at, ...attribution, ...(reason === "covered" && { coveredBy: pendingRequestsOf(state, stay.id).map((r) => r.id) }) }],
        notifications: notifyInApp(state, [stay.hostId], "waitlistRequest", { name: firstNameOf(state, me), title: stay.title }, action.id, stay.id),
      };
    }

    case "undoDecline": {
      const request = state.joinRequests.find((r) => r.id === action.requestId && r.status === "declined");
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay || stay.hostId !== me) return state;
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "pending" as const } : r)),
        notifications: state.notifications.filter((n) => n.eventId !== `n-${request.id}-declined`),
      };
    }

    case "deleteDraft": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || stay.hostId !== me || stay.status !== "draft") return state;
      return { ...state, stays: state.stays.filter((s) => s.id !== stay.id), joinRequests: state.joinRequests.filter((r) => r.stayId !== stay.id) };
    }

    case "withdrawRequest": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const request = me ? state.joinRequests.find((r) => r.stayId === action.stayId && r.userId === me && (r.status === "pending" || r.status === "waitlist_requested")) : undefined;
      if (!stay || !request || !me) return state;
      return {
        ...state,
        joinRequests: state.joinRequests.filter((r) => r.id !== request.id),
        notifications: notifyInApp(state, [stay.hostId], "requestWithdrawn", { name: firstNameOf(state, me), title: stay.title }, `${request.id}-withdrawn`, stay.id),
      };
    }

    case "addSupportCase":
      return me ? { ...state, supportCases: [...(state.supportCases ?? []), { ...action.supportCase, userId: me }] } : state;

    case "removeFromWaitlist": {
      const request = state.joinRequests.find((r) => r.id === action.requestId && (r.status === "waitlisted" || r.status === "waitlist_requested"));
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay || stay.hostId !== me) return state;
      return {
        ...state,
        joinRequests: state.joinRequests.filter((r) => r.id !== request.id),
        notifications: notifyInApp(state, [request.userId], "waitlistRemoved", { title: stay.title }, `${request.id}-off`, stay.id),
      };
    }

    case "takeWaitlistSpot": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const at = action.systemMessage.createdAt;
      const request = stay && me ? state.joinRequests.find((r) => r.stayId === stay.id && r.userId === me && r.status === "waitlisted" && hasOffer(r, at)) : undefined;
      if (!stay || !request || !me) return state;
      const spotsFilled = stay.spotsFilled + 1;
      const complete = spotsFilled >= stay.spotsTotal;
      const share = stay.accommodationStatus === "locked" ? stay.pricePerPerson : undefined;
      const systemMessage = { ...action.systemMessage, threadId: crewThreadId(stay.id) };
      const name = firstNameOf(state, me);
      let next: StoreState = {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "accepted" as const, offerExpiresAt: undefined } : r)),
        payments: share ? [...state.payments, { id: `pay-${stay.id}-${me}`, ...paymentFor(stay, me, share, request), status: "pending" as const }] : state.payments,
        // Payments already due: the share is due when the offer would have run out (the 24 hours to take it are the 24 hours to pay).
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled, ...(share && complete && { paymentDueAt: s.paymentDueAt ?? request.offerExpiresAt }) } : s)),
        threads: threadsAfterJoin(state, stay, me, systemMessage, complete),
      };
      next = { ...next, notifications: notifyInApp(next, [stay.hostId], "waitlistTookSpot", { name, title: stay.title }, systemMessage.id, stay.id) };
      if (complete) next = { ...next, notifications: notifyInApp(next, [...crewIds(state, stay), me], "crewFull", { title: stay.title }, `${systemMessage.id}-full`, stay.id) };
      return next;
    }

    case "removeMember": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || action.userId === me) return state;
      const name = state.users.find((u) => u.id === action.userId)?.name.split(" ")[0] ?? "Someone";
      return withoutMember(state, stay, action.userId, systemLine(action.systemMessage, crewThreadId(stay.id), "removed", { name }));
    }

    case "unlockAccommodation": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.accommodationStatus !== "locked") return state;
      // The thread only hears about money going back – the lock itself is House-page business.
      const refunds = state.payments.filter((p) => p.stayId === stay.id && p.status === "paid").length;
      const refundLine = refunds > 0 ? [systemLine(action.systemMessage, crewThreadId(stay.id), "refund", { count: refunds })] : [];
      return {
        ...state,
        stays: state.stays.map((s) =>
          s.id === stay.id
            ? {
                ...s,
                accommodationStatus: "open",
                accommodationLink: undefined,
                pricePerPerson: undefined,
                totalPrice: undefined,
                payByDate: undefined,
                lockedAt: undefined,
                bookingConfirmedAt: undefined,
                bookingProofUrl: undefined,
                paymentDueAt: undefined,
                allPaidAt: undefined,
                status: s.status === "booked" ? "published" : s.status,
              }
            : s,
        ),
        // Mock refund: paid shares go back, open ones disappear with the lock.
        payments: state.payments
          .filter((p) => !(p.stayId === stay.id && p.status === "pending"))
          .map((p) => (p.stayId === stay.id && p.status === "paid" ? { ...p, status: "refunded" } : p)),
        threads: postToHouse(state.threads, stay.id, refundLine),
      };
    }

    case "closeStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.status === "closed") return state;
      const name = state.users.find((u) => u.id === me)?.name.split(" ")[0] ?? "The host";
      const systemMessage = systemLine(action.systemMessage, crewThreadId(stay.id), "closed", { name });
      // Cancelled by the host: every paid share goes back in full (through lib/payments – see the refund effect), open ones are dropped; the
      // crew, everyone waiting and everyone who asked hear it (bell + email).
      const told = [
        ...crewIds(state, stay).filter((id) => id !== me),
        ...state.joinRequests.filter((r) => r.stayId === stay.id && (r.status === "pending" || r.status === "waitlisted" || r.status === "waitlist_requested")).map((r) => r.userId),
      ];
      const refunds = state.payments.some((p) => p.stayId === stay.id && p.status === "paid") ? [systemLine({ id: `${action.systemMessage.id}-refund`, createdAt: action.systemMessage.createdAt }, crewThreadId(stay.id), "refund", { count: state.payments.filter((p) => p.stayId === stay.id && p.status === "paid").length })] : [];
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, status: "closed", acceptingRequests: false, paymentDueAt: undefined } : s)),
        payments: state.payments
          .filter((p) => !(p.stayId === stay.id && p.status === "pending"))
          .map((p) => (p.stayId === stay.id && p.status === "paid" ? { ...p, status: "refunded" as const } : p)),
        threads: postToHouse(state.threads, stay.id, [systemMessage, ...refunds]),
        notifications: notifyInApp(state, told, "houseCancelled", { title: stay.title }, `${action.systemMessage.id}-cancelled`, stay.id),
      };
    }

    case "requestToJoin": {
      if (!me) return state;
      const stay = state.stays.find((s) => s.id === action.request.stayId);
      // An invite counts as asked: it's answered with respondToInvite, not with a request.
      const alreadyAsked = state.joinRequests.some(
        (r) => r.stayId === action.request.stayId && r.userId === me && r.status !== "declined" && r.status !== "expired",
      );
      // The host can't join their own House; a second request would only duplicate the first; a House that
      // isn't taking requests doesn't get new ones.
      // Only verified guests, if the host asked for it.
      const unverified = stay?.verifiedGuestsOnly && !state.users.find((u) => u.id === me)?.verified;
      // An audience House the profile doesn't fit (women only, profile says otherwise): no request. Not given: the host decides.
      const wrongAudience = stay ? audienceFit(stay, state.users.find((u) => u.id === me)) === "blocked" : false;
      if (!stay || stay.hostId === me || alreadyAsked || !stay.acceptingRequests || unverified || wrongAudience) return state;
      const { id, stayId, message, status, createdAt } = action.request;
      const attribution = attributionFor(state, me, action.request);
      const request: JoinRequest = { id, stayId, message, status, createdAt, ...attribution, userId: me };
      const events = [...state.events, event(id, "request_sent", action.at, { houseId: stayId, userId: me, ...attribution })];
      // A host who blocked me declines automatically – and isn't notified.
      const host = state.users.find((u) => u.id === stay.hostId);
      if (settingsOf(host).blockedUserIds.includes(me)) {
        return { ...state, joinRequests: [...state.joinRequests, { ...request, status: "declined" }], events };
      }
      return {
        ...state,
        joinRequests: [...state.joinRequests, request],
        notifications: notifyInApp(state, [stay.hostId], "newRequest", { name: firstNameOf(state, me), title: stay.title }, id, stay.id),
        events,
      };
    }

    case "acceptRequest": {
      const request = state.joinRequests.find((r) => r.id === action.requestId);
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      // A waitlist request: onto the list, in the order it was asked (no spot changes hands).
      if (request && stay && request.status === "waitlist_requested") {
        return {
          ...state,
          joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "waitlisted" as const } : r)),
          notifications: notifyInApp(state, [request.userId], "waitlistAccepted", { title: stay.title }, `${request.id}-waitlisted`, stay.id),
        };
      }
      // Spots held by open invites aren't free.
      if (!request || !stay || request.status !== "pending" || openSpots(stay) === 0) {
        return state;
      }
      const spotsFilled = stay.spotsFilled + 1;
      const systemMessage = { ...action.systemMessage, threadId: crewThreadId(stay.id) };
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "accepted" } : r)),
        // Joining a locked House means owing a share like everyone else.
        payments:
          stay.accommodationStatus === "locked" && stay.pricePerPerson
            ? [
                ...state.payments,
                {
                  id: `pay-${stay.id}-${request.userId}`,
                  ...paymentFor(stay, request.userId, stay.pricePerPerson, request),
                  status: "pending",
                },
              ]
            : state.payments,
        // Only the spot count changes – whether the House keeps taking requests is the host's call.
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled } : s)),
        // The first confirmed join creates the House thread (see threadsAfterJoin).
        threads: threadsAfterJoin(state, stay, request.userId, systemMessage, spotsFilled >= stay.spotsTotal),
        notifications: notifyInApp(
          // The last spot taken: the whole crew hears it's complete.
          spotsFilled >= stay.spotsTotal
            ? { ...state, notifications: notifyInApp(state, [...crewIds(state, stay), request.userId], "crewFull", { title: stay.title }, `${systemMessage.id}-full`, stay.id) }
            : state,
          [request.userId],
          "accepted",
          { title: stay.title },
          systemMessage.id,
          stay.id,
        ),
        events: [
          ...state.events,
          event(systemMessage.id, "request_accepted", systemMessage.createdAt, { houseId: stay.id, userId: request.userId, ...attributionOf(request) }),
        ],
      };
    }

    case "declineRequest": {
      const request = state.joinRequests.find((r) => r.id === action.requestId && (r.status === "pending" || r.status === "waitlist_requested"));
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay) return state;
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "declined" } : r)),
        notifications: notifyInApp(state, [request.userId], "declined", { title: stay.title }, `${request.id}-declined`, stay.id, undefined, { href: "/your-houses?tab=past" }),
      };
    }

    case "sendMessage": {
      if (!me) return state;
      const thread = state.threads.find((t) => t.id === action.threadId);
      const stay = thread && state.stays.find((s) => s.id === thread.houseId);
      const preview = action.message.text.trim().slice(0, 80) || "📎";
      return {
        ...state,
        threads: updateThread(state.threads, action.threadId, (t) => ({
          ...t,
          messages: [...t.messages, { ...action.message, threadId: action.threadId, senderId: me }],
        })),
        // Your own message is read by definition.
        lastReadAt: { ...state.lastReadAt, [action.threadId]: action.message.createdAt },
        // Everyone else in the chat gets a notification that leads to it.
        notifications: thread
          ? notifyInApp(state, thread.participantIds.filter((id) => id !== me), "newMessage", { name: firstNameOf(state, me), title: stay?.title ?? "", preview }, action.message.id, stay?.id, thread.id)
          : state.notifications,
      };
    }

    case "createThread":
      return { ...state, threads: [...state.threads, action.thread] };

    case "markThreadRead": {
      const current = state.lastReadAt[action.threadId];
      if (current && current >= action.at) return state;
      return { ...state, lastReadAt: { ...state.lastReadAt, [action.threadId]: action.at } };
    }

    case "setAcceptingRequests":
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === action.stayId ? { ...s, acceptingRequests: action.accepting } : s)),
      };

    case "lockAccommodation": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me) return state;
      const { lock, message } = action;
      return {
        ...withLock(state, stay, lock, action.patch, message.id),
        notifications: notifyInApp(state, crewIds(state, stay).filter((id) => id !== me), "locked", { title: stay.title, price: lock.perPerson, payBy: lock.payBy }, message.id, stay.id),
      };
    }

    case "castVote": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const field = VOTE_FIELD[action.kind];
      const vote = stay?.[field];
      if (!stay || !me || !vote || vote.decidedOptionId) return state;
      const memberIds = crewIds(state, stay);
      if (!memberIds.includes(me) || voteOutcome(vote, { memberIds, crewComplete: stay.spotsFilled >= stay.spotsTotal, today: action.at.slice(0, 10) }).state !== "open") return state;
      const options = vote.options.map((o) => ({ ...o, voterIds: o.id === action.optionId ? [...o.voterIds.filter((id) => id !== me), me] : o.voterIds.filter((id) => id !== me) }));
      return { ...state, stays: state.stays.map((s) => (s.id === stay.id ? { ...s, [field]: { ...vote, options } } : s)) };
    }

    case "closeVote": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const field = VOTE_FIELD[action.kind];
      const vote = stay?.[field];
      if (!stay || !me || stay.hostId !== me || !vote || vote.decidedOptionId) return state;
      return { ...state, stays: state.stays.map((s) => (s.id === stay.id ? { ...s, [field]: { ...vote, closedAt: action.at } } : s)) };
    }

    case "decideVote": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const field = VOTE_FIELD[action.kind];
      const vote = stay?.[field];
      if (!stay || !me || !vote || vote.decidedOptionId) return state;
      const outcome = voteOutcome(vote, { memberIds: crewIds(state, stay), crewComplete: stay.spotsFilled >= stay.spotsTotal, today: action.message.createdAt.slice(0, 10) });
      // The winner stands for anyone; a tie is the host's to break.
      const allowed = outcome.state === "won" ? outcome.optionId === action.optionId : outcome.state === "tie" && stay.hostId === me && outcome.optionIds.includes(action.optionId);
      const option = vote.options.find((o) => o.id === action.optionId);
      if (!allowed || !option) return state;
      const decided = { ...vote, decidedOptionId: option.id };
      const threadId = crewThreadId(stay.id);
      if (action.kind === "dates") {
        if (!option.startDate || !option.endDate) return state;
        const line = systemLine(action.message, threadId, "datesDecided", { date: option.startDate });
        return {
          ...state,
          stays: state.stays.map((s) => (s.id === stay.id ? { ...s, datesVote: decided, datesOpen: false, startDate: option.startDate!, endDate: option.endDate! } : s)),
          threads: state.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, line] } : t)),
        };
      }
      if (!option.link || !option.pricePerPerson) return state;
      const total = option.pricePerPerson * stay.spotsTotal;
      const payBy = defaultPayBy(stay, new Date(action.message.createdAt));
      const lock: LockDetails = { link: option.link, title: previewForUrl(option.link, stay.title).title, total, spots: stay.spotsTotal, perPerson: option.pricePerPerson, payBy };
      const locked = withLock(state, { ...stay, accommodationVote: decided }, lock, { currency: stay.currency, totalPrice: total, payByDate: payBy, lockedAt: action.message.createdAt }, action.message.id);
      const line = systemLine(action.message, threadId, "accommodationDecided", {});
      return { ...locked, stays: locked.stays.map((s) => (s.id === stay.id ? { ...s, accommodationVote: decided } : s)), threads: locked.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, line] } : t)) };
    }

    case "payShare": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const mine = state.payments.find((p) => p.stayId === action.stayId && p.userId === me && p.status === "pending");
      if (!stay || !me || stay.accommodationStatus !== "locked" || !mine || paymentWaitsForCrew(stay)) return state;
      const payments = state.payments.map((p) => (p.id === mine.id ? { ...p, status: "paid" as const, paidAt: action.message.createdAt } : p));
      const name = firstNameOf(state, me);
      // Who paid shows on the House page, not in the thread.
      const { message } = action;
      return {
        ...state,
        payments,
        notifications: notifyInApp(state, crewIds(state, stay).filter((id) => id !== me), "paid", { title: stay.title, name }, message.id, stay.id),
        events: [
          ...state.events,
          event(message.id, "payment_completed", message.createdAt, {
            houseId: stay.id,
            userId: me,
            amount: mine.total,
            revenue: paymentSplit(mine.share, mine.hostFee).revenue,
            currency: stay.currency,
            ...attributionOf(mine),
          }),
        ],
      };
    }

    case "confirmBooking": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.accommodationStatus !== "locked") return state;
      // The House's milestone, and with the booking the address is on the House page for the crew.
      const threadId = crewThreadId(stay.id);
      const lines = [
        systemLine(action.message, threadId, "bookingConfirmed", {}),
        systemLine({ id: `${action.message.id}-address`, createdAt: action.message.createdAt }, threadId, "addressShared", {}),
      ];
      return {
        ...state,
        stays: state.stays.map((s) =>
          s.id === stay.id ? { ...s, status: "booked", bookingConfirmedAt: action.message.createdAt, bookingProofUrl: action.proofUrl } : s,
        ),
        threads: postToHouse(state.threads, stay.id, lines),
        notifications: notifyInApp(state, crewIds(state, stay).filter((id) => id !== me), "bookingConfirmed", { title: stay.title }, `${action.message.id}-booked`, stay.id),
      };
    }

    case "resetPayments":
      return {
        ...state,
        payments: state.payments
          .filter((p) => p.stayId !== action.stayId || p.status !== "refunded")
          .map((p) => (p.stayId === action.stayId ? { ...p, status: "pending", paidAt: undefined } : p)),
        stays: state.stays.map((s) =>
          s.id === action.stayId
            ? { ...s, bookingConfirmedAt: undefined, bookingProofUrl: undefined, paymentDueAt: undefined, allPaidAt: undefined, status: s.status === "booked" ? "published" : s.status }
            : s,
        ),
      };

    case "toggleReaction": {
      if (!me) return state;
      return {
        ...state,
        threads: updateThread(state.threads, action.threadId, (t) => ({
          ...t,
          messages: t.messages.map((m) => {
            if (m.id !== action.messageId) return m;
            const reactions = m.reactions ?? [];
            const existing = reactions.find((r) => r.emoji === action.emoji);
            const next = existing
              ? reactions
                  .map((r) => (r.emoji === action.emoji ? { ...r, userIds: r.userIds.includes(me) ? r.userIds.filter((id) => id !== me) : [...r.userIds, me] } : r))
                  .filter((r) => r.userIds.length > 0)
              : [...reactions, { emoji: action.emoji, userIds: [me] }];
            return { ...m, reactions: next };
          }),
        })),
      };
    }

    case "setTyping":
      return { ...state, typing: { ...state.typing, [action.threadId]: action.userId } };

    case "confirmLivedWith":
      return {
        ...state,
        livedWith: state.livedWith.map((l) => (l.userId === state.currentUserId && l.otherUserId === action.otherUserId && !l.confirmedAt ? { ...l, confirmedAt: action.at } : l)),
      };

    case "toggleSaved": {
      if (!me) return state;
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== me) return u;
          const saved = u.savedStayIds ?? [];
          return { ...u, savedStayIds: saved.includes(action.stayId) ? saved.filter((id) => id !== action.stayId) : [...saved, action.stayId] };
        }),
      };
    }

    case "toggleHostAlert": {
      if (!me || action.hostId === me) return state;
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== me) return u;
          const alerts = u.hostAlerts ?? [];
          return { ...u, hostAlerts: alerts.includes(action.hostId) ? alerts.filter((id) => id !== action.hostId) : [...alerts, action.hostId] };
        }),
      };
    }

    case "setNotification": {
      if (!me) return state;
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== me) return u;
          const settings = settingsOf(u);
          const group = { ...settings.notifications[action.group], [action.channel]: action.on };
          return { ...u, settings: { ...settings, notifications: { ...settings.notifications, [action.group]: group } } };
        }),
      };
    }

    case "unblockUser": {
      if (!me) return state;
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== me) return u;
          const settings = settingsOf(u);
          return { ...u, settings: { ...settings, blockedUserIds: settings.blockedUserIds.filter((id) => id !== action.userId) } };
        }),
      };
    }

    case "blockUser": {
      if (!me || action.userId === me) return state;
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== me) return u;
          const settings = settingsOf(u);
          if (settings.blockedUserIds.includes(action.userId)) return u;
          return { ...u, settings: { ...settings, blockedUserIds: [...settings.blockedUserIds, action.userId] } };
        }),
        // Their open requests to my Houses are declined right away.
        joinRequests: state.joinRequests.map((r) =>
          r.userId === action.userId && r.status === "pending" && state.stays.some((s) => s.id === r.stayId && s.hostId === me)
            ? { ...r, status: "declined" }
            : r,
        ),
      };
    }

    case "report":
      if (!me) return state;
      return { ...state, reports: [...state.reports, { ...action.report, reporterId: me }] };

    case "deleteAccount":
      if (!me) return state;
      return { ...state, currentUserId: null, savedSearches: state.savedSearches.filter((s) => s.userId !== me), users: state.users.map((u) => (u.id === me ? { ...u, deletedAt: action.at } : u)) };

    // Only the clock: settlePayments runs after this.
    case "settlePayments":
      return state;

    case "lapsePaymentWindow":
      return { ...state, stays: state.stays.map((s) => (s.id !== action.stayId ? s : { ...s, ...(s.paymentDueAt && { paymentDueAt: action.at }), ...(s.allPaidAt && { allPaidAt: new Date(Date.parse(action.at) - BOOKING_WINDOW_HOURS * HOUR_MS).toISOString() }) })) };

    case "fireReminder": {
      const { reminder } = action;
      // Notification only – payment and arrival reminders stay out of the thread.
      return { ...state, notifications: notifyInApp(state, [reminder.userId], reminder.notifyKey, reminder.values, `${reminder.id}-${action.message.id}`, reminder.stayId) };
    }

    case "receiveMessage":
      return { ...state, threads: updateThread(state.threads, action.threadId, (t) => ({ ...t, messages: [...t.messages, action.message] })) };
  }
}

const StoreContext = createContext<StoreValue | null>(null);

/**
 * Feature flag hostPremium off: the host fee doesn't exist for anyone – Houses lose their fee and what it includes,
 * payments their fee part (and total), nobody is a Pro host. The state itself keeps everything, so switching the flag
 * back on brings it all back.
 */
function withoutHostPremium({ stays, payments, users }: Pick<StoreState, "stays" | "payments" | "users">) {
  return {
    stays: stays.map((stay) => {
      if (stay.hostFeePerPerson === undefined && stay.hostOffer === undefined) return stay;
      const rest = { ...stay };
      delete rest.hostFeePerPerson;
      delete rest.hostOffer;
      return rest;
    }),
    payments: payments.map((payment) => {
      if (!payment.hostFee) return payment;
      const { hostFee, ...rest } = payment;
      return { ...rest, total: payment.total - hostFee };
    }),
    users: users.map((user) => (user.isPro || user.canChargeHostFee ? { ...user, isPro: false, canChargeHostFee: false } : user)),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hostPremium = useFeatureFlag("hostPremium");
  const { currentUserId, threads, stays, houseInvites } = state;

  // The payments mock reads the payment records and who's verified from here (lib/payments/mock.ts); Stripe has its own.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  // A share that became refunded (booking not confirmed, spot to the waitlist, left): the refund goes through the payment provider.
  const refundedBefore = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = new Set(state.payments.filter((p) => p.status === "refunded").map((p) => p.id));
    if (refundedBefore.current) {
      for (const payment of state.payments) {
        if (payment.status !== "refunded" || refundedBefore.current.has(payment.id) || payment.refundedAmount === 0) continue;
        const stay = state.stays.find((s) => s.id === payment.stayId);
        const reason = payment.refundedAmount !== undefined ? "spot_transferred" : stay?.status === "closed" ? "host_cancelled" : stay && stay.accommodationStatus !== "locked" ? "booking_not_confirmed" : "cancelled";
        void payments.refund(payment.id, payment.refundedAmount ?? payment.total, reason);
      }
    }
    refundedBefore.current = now;
  }, [state.payments, state.stays]);
  useEffect(() => {
    bindPaymentsMock({
      payments: () => latest.current.payments,
      currencyOf: (houseId) => latest.current.stays.find((s) => s.id === houseId)?.currency ?? "EUR",
      initiallyVerified: (userId) => Boolean(latest.current.users.find((u) => u.id === userId)?.verified),
      initiallyPaidOut: (userId) => earningsFor(latest.current, userId, new Date().toISOString().slice(0, 10)).payouts.some((p) => p.status === "paid"),
    });
  }, []);

  // Invite links lapse after 48h: swept now, and again when the next one is due (and every minute as a backstop).
  const nextExpiry = houseInvites.filter((i) => i.status === "pending").reduce<string | null>((min, i) => (!min || i.expiresAt < min ? i.expiresAt : min), null);
  useEffect(() => {
    if (!nextExpiry) return;
    const sweep = () => dispatch({ type: "expireHouseInvites", at: new Date().toISOString() });
    sweep();
    const due = setTimeout(sweep, Math.min(Math.max(0, new Date(nextExpiry).getTime() - Date.now()) + 50, 2 ** 31 - 1));
    const backstop = setInterval(sweep, 60_000);
    return () => {
      clearTimeout(due);
      clearInterval(backstop);
    };
  }, [nextExpiry]);

  /** Events already in the console (or seeded/restored) – the log effect only prints new ones. */
  const loggedEvents = useRef<Set<string> | null>(null);
  /** Growth data is written back only after it was read, so the first render can't overwrite it. */
  const growthRestored = useRef(false);

  // Mock data volume (DevSwitcher "Data"): another preset than "full" is swapped in right after hydration. Runs before
  // the growth restore below, so restored claims and events land on top of it.
  const mockRestored = useRef(false);
  useEffect(() => {
    const dataState = readDataState();
    // What this browser saved for this data state wins over the shipped mock (it started from it).
    const saved = readPersistedMock(dataState);
    if (saved) dispatch({ type: "loadDataset", state: { ...saved, typing: {} } });
    else if (dataState !== "full") dispatch({ type: "loadDataset", state: buildInitialState(getData(dataState), dataState) });
    mockRestored.current = true;
  }, []);

  // Saved shortly after each change (not the login, not who's "typing").
  useEffect(() => {
    if (!mockRestored.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(mockKey(readDataState()), JSON.stringify({ ...state, currentUserId: null, typing: {} }));
      } catch {
        // storage full or unavailable – it holds for this visit
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  // Growth: remember where this browser came from (first touch), bring back what was saved here, clean the URL.
  useEffect(() => {
    firstTouch();
    const saved = readPersistedGrowth();
    if (saved) {
      loggedEvents.current = new Set([...initialState.events, ...saved.events].map((e) => e.id));
      dispatch({ type: "restoreGrowth", saved });
    }
    growthRestored.current = true;
    stripAttributionParams();
  }, []);

  useEffect(() => {
    if (!growthRestored.current) return;
    try {
      localStorage.setItem(GROWTH_KEY, JSON.stringify(persistedGrowth(state)));
    } catch {
      // storage full or unavailable – the data stays for this visit
    }
    // Only these parts are persisted; the rest of the state doesn't need a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.events, state.alerts, state.applications, state.stays, state.users, state.houseInvites, state.savedSearches]);

  // Analytics: every new event goes to the console as well (mock – no analytics backend).
  useEffect(() => {
    const logged = (loggedEvents.current ??= new Set(initialState.events.map((e) => e.id)));
    for (const e of state.events) {
      // Seeded history (also a dataset's) isn't news.
      if (logged.has(e.id) || e.seed) continue;
      logged.add(e.id);
      console.info(`[analytics] ${e.name}`, e);
    }
  }, [state.events]);

  // Restore the mock user after a refresh (client only, so the server render stays logged out).
  useEffect(() => {
    try {
      // Read ?as= once, keep it for this tab, and take it out of the URL.
      const url = new URL(window.location.href);
      const as = url.searchParams.get(OPEN_AS_PARAM);
      if (as) {
        sessionStorage.setItem(TAB_USER_KEY, as);
        url.searchParams.delete(OPEN_AS_PARAM);
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
      // A tab-scoped user ("" = logged out in this tab) wins over the shared one.
      const tabUser = sessionStorage.getItem(TAB_USER_KEY);
      const saved = tabUser !== null ? tabUser : localStorage.getItem(MOCK_USER_KEY);
      if (saved) dispatch({ type: "login", userId: saved });
    } catch {
      // storage unavailable – stay logged out
    }
  }, []);

  const login = useCallback((userId: string) => {
    dispatch({ type: "login", userId });
    // Mock signup: the first login in this browser attaches its first touch to the account (an existing one wins).
    const attribution = firstTouch();
    dispatch({ type: "attributeUser", userId, attribution });
    dispatch({ type: "track", event: { id: makeId("ev"), name: "auth_completed", at: new Date().toISOString(), userId, ...attribution } });
    try {
      const storage = userStorage();
      storage.setItem(storage === sessionStorage ? TAB_USER_KEY : MOCK_USER_KEY, userId);
    } catch {
      // not persisted, still logged in for this visit
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "logout" });
    try {
      // A tab opened "as" someone stays tab-scoped: logging out there keeps the marker (empty = logged out).
      if (userStorage() === sessionStorage) sessionStorage.setItem(TAB_USER_KEY, "");
      else localStorage.removeItem(MOCK_USER_KEY);
    } catch {
      // nothing to clean up
    }
  }, []);

  const updateCurrentUser = useCallback((patch: ProfilePatch) => dispatch({ type: "updateCurrentUser", patch }), []);

  const createStay = useCallback((input: NewStayInput, accommodationIdeas: string[] = [], crew: { invite: string[]; againFrom?: string } = { invite: [] }): string => {
    const id = makeId("s");
    const now = Date.now();
    const slug = `${slugify(input.title) || "house"}-${id.slice(-4)}`;
    dispatch({
      type: "createStay",
      attribution: firstTouch(),
      invite: crew.invite,
      stay: {
        ...input,
        location: locationOf(input.city, input.region),
        id,
        slug,
        ...(crew.againFrom && { duplicatedFrom: crew.againFrom }),
        // They open the House thread once somebody joins.
        ...(accommodationIdeas.length > 0 && { accommodationIdeas }),
        // No geocoding yet: created Houses have no coordinates and no static map preview.
        lat: 0,
        lng: 0,
        mapPreviewUrl: "",
        spotsFilled: 1,
        // Unset → from the host's country, like the create stepper suggests.
        currency: input.currency ?? "EUR",
        status: "published",
        acceptingRequests: true,
        featured: false,
        createdAt: new Date(now).toISOString(),
      },
    });
    return id;
  }, []);

  // Flag off, the form never shows the host fee – an edit then keeps whatever fee the House has.
  const updateStay = useCallback(
    (stayId: string, patch: NewStayInput) => {
      const kept = { ...patch };
      if (!hostPremium) delete kept.hostFeePerPerson;
      dispatch({ type: "updateStay", stayId, patch: kept });
    },
    [hostPremium],
  );
  const publishStay = useCallback(
    (stayId: string) => dispatch({ type: "publishStay", stayId, at: new Date().toISOString(), attribution: firstTouch() }),
    [],
  );
  const createClaimableStay = useCallback((input: ClaimableStayInput): string => {
    const id = makeId("s");
    const token = claimToken();
    const createdAt = new Date().toISOString();
    dispatch({
      type: "createClaimableStay",
      stay: {
        id,
        slug: `${slugify(input.title) || "house"}-${id.slice(-4)}`,
        title: input.title.trim(),
        hostId: "",
        vibe: "social",
        language: "en",
        city: input.city.trim(),
        region: input.region.trim(),
        location: locationOf(input.city.trim(), input.region.trim()),
        lat: 0,
        lng: 0,
        mapPreviewUrl: "",
        startDate: input.startDate,
        endDate: input.endDate,
        spotsTotal: input.spotsTotal,
        spotsFilled: 1,
        currency: "EUR",
        accommodationStatus: "open",
        description: input.pitch.trim(),
        whyText: input.pitch.trim(),
        dayText: "",
        // Left for the creator: who they're looking for is theirs to say (the stepper asks before publishing).
        lookingForText: "",
        houseRules: [],
        interests: [],
        status: "draft_unclaimed",
        acceptingRequests: false,
        featured: false,
        createdAt,
        claim: { token, name: input.name.trim(), photoUrl: input.photoUrl.trim(), sourceLink: input.sourceLink.trim(), createdAt },
      },
    });
    return token;
  }, []);
  const claimStay = useCallback((token: string) => dispatch({ type: "claimStay", token, at: new Date().toISOString() }), []);
  const respondToInvite = useCallback(
    (stayId: string, accept: boolean) =>
      dispatch({ type: "respondToInvite", stayId, accept, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );
  const completeStay = useCallback((stayId: string) => dispatch({ type: "completeStay", stayId, at: new Date().toISOString() }), []);
  const inviteToStay = useCallback(
    (stayId: string, userId: string) => dispatch({ type: "inviteToStay", stayId, userId, at: new Date().toISOString() }),
    [],
  );
  const createHouseInvite = useCallback(
    (stayId: string, to: { name?: string; email?: string }): HouseInvite | null => {
      const stay = stays.find((s) => s.id === stayId);
      if (!stay || !currentUserId || !(stay.hostId === currentUserId || state.joinRequests.some((r) => r.stayId === stayId && r.userId === currentUserId && r.status === "accepted")) || openSpots(stay) === 0) return null;
      const now = new Date().toISOString();
      const email = to.email?.trim().toLowerCase() || undefined;
      const invite: HouseInvite = {
        token: inviteToken(),
        houseId: stayId,
        ...(to.name?.trim() && { invitedName: to.name.trim() }),
        ...(email && { email, emailedAt: now }),
        createdAt: now,
        expiresAt: inviteExpiry(now),
        status: "pending",
      };
      dispatch({ type: "createHouseInvite", invite });
      return invite;
    },
    [stays, state.joinRequests, currentUserId],
  );
  const resendHouseInvite = useCallback((token: string) => dispatch({ type: "resendHouseInvite", token, at: new Date().toISOString() }), []);
  const cancelHouseInvite = useCallback((token: string) => dispatch({ type: "cancelHouseInvite", token }), []);
  const redeemHouseInvite = useCallback(
    async (token: string): Promise<"joined" | "invalid"> => {
      const invite = houseInvites.find((i) => i.token === token && i.status === "pending");
      const stay = invite && stays.find((s) => s.id === invite.houseId);
      if (!invite || !stay || invite.expiresAt <= new Date().toISOString()) return "invalid";
      if (invite.priority && (invite.invitedUserId !== currentUserId || openSpots(stay) === 0)) return "invalid";
      const now = new Date().toISOString();
      dispatch({ type: "redeemHouseInvite", token, systemMessage: { id: makeId("m"), createdAt: now } });
      return "joined";
    },
    [houseInvites, stays, currentUserId],
  );
  const track = useCallback(
    (name: GrowthEventName, props: { houseId?: string; channel?: ShareChannel; userId?: string } = {}) => {
      const userId = props.userId ?? currentUserId ?? undefined;
      dispatch({
        type: "track",
        event: { id: makeId("ev"), name, at: new Date().toISOString(), ...firstTouch(), ...props, ...(userId && { userId }) },
      });
    },
    [currentUserId],
  );
  const addAlert = useCallback(
    (alert: Pick<DemandAlert, "email" | "region" | "from" | "to">) =>
      dispatch({
        type: "addAlert",
        alert: { ...alert, id: makeId("alert"), createdAt: new Date().toISOString(), ...(currentUserId && { userId: currentUserId }) },
      }),
    [currentUserId],
  );
  const saveSearch = useCallback(
    (input: Pick<SavedSearch, "place" | "month" | "category" | "userId" | "email" | "consent">) =>
      dispatch({ type: "saveSearch", search: { ...input, id: makeId(input.userId ? "search" : `${LOCAL_SEARCH_PREFIX}search`), createdAt: new Date().toISOString(), notifiedAt: null } }),
    [],
  );
  const markNotificationRead = useCallback((id: string) => dispatch({ type: "markNotificationRead", id, at: new Date().toISOString() }), []);
  const markAllNotificationsRead = useCallback(() => dispatch({ type: "markAllNotificationsRead", at: new Date().toISOString() }), []);
  const addNotifications = useCallback((records: AppNotification[]) => dispatch({ type: "addNotifications", records }), []);
  const addApplication = useCallback(
    (application: Omit<HostApplication, "id" | "createdAt" | "userId">) =>
      dispatch({
        type: "addApplication",
        application: { ...application, id: makeId("app"), createdAt: new Date().toISOString(), ...(currentUserId && { userId: currentUserId }) },
      }),
    [currentUserId],
  );
  const leaveStay = useCallback(
    (stayId: string) => dispatch({ type: "leaveStay", stayId, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );
  const undoDecline = useCallback((requestId: string) => dispatch({ type: "undoDecline", requestId }), []);
  const deleteDraft = useCallback((stayId: string) => dispatch({ type: "deleteDraft", stayId }), []);
  const withdrawRequest = useCallback((stayId: string) => dispatch({ type: "withdrawRequest", stayId, at: new Date().toISOString() }), []);
  const addSupportCase = useCallback((input: Pick<SupportCase, "stayId" | "category" | "text" | "photo">) => {
    const number = `SUP-${String(1000 + Math.floor(Math.random() * 9000))}`;
    dispatch({ type: "addSupportCase", supportCase: { ...input, id: makeId("sup"), number, userId: "", createdAt: new Date().toISOString(), status: "open" } });
    return number;
  }, []);
  const requestWaitlist = useCallback(
    (stayId: string, message: string) => dispatch({ type: "requestWaitlist", stayId, message, id: makeId("r"), at: new Date().toISOString() }),
    [],
  );
  const removeFromWaitlist = useCallback((requestId: string) => dispatch({ type: "removeFromWaitlist", requestId }), []);
  const takeWaitlistSpot = useCallback(
    (stayId: string) => dispatch({ type: "takeWaitlistSpot", stayId, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );
  const removeMember = useCallback(
    (stayId: string, userId: string) =>
      dispatch({ type: "removeMember", stayId, userId, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );
  const castVote = useCallback((stayId: string, kind: VoteKind, optionId: string) => dispatch({ type: "castVote", stayId, kind, optionId, at: new Date().toISOString() }), []);
  const closeVote = useCallback((stayId: string, kind: VoteKind) => dispatch({ type: "closeVote", stayId, kind, at: new Date().toISOString() }), []);
  const decideVote = useCallback(
    (stayId: string, kind: VoteKind, optionId: string) => dispatch({ type: "decideVote", stayId, kind, optionId, message: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );
  const unlockAccommodation = useCallback(async (stayId: string) => {
    await sleep(MOCK_DELAY_MS);
    dispatch({ type: "unlockAccommodation", stayId, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } });
  }, []);
  const closeStay = useCallback(
    (stayId: string) => dispatch({ type: "closeStay", stayId, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );

  const requestToJoin = useCallback((stayId: string, message: string) => {
    const createdAt = new Date().toISOString();
    dispatch({
      type: "requestToJoin",
      at: createdAt,
      // The browser's first touch – the reducer prefers the user's own signup attribution.
      request: { id: makeId("r"), stayId, message: message.trim(), status: "pending", createdAt, ...firstTouch() },
    });
  }, []);

  const sendMessage = useCallback(
    (threadId: string, text: string, extra: { attachments?: Attachment[]; replyToId?: string } = {}) => {
      const written = text.trim();
      if (!written && !extra.attachments?.length) return;
      const sentIn = threads.find((t) => t.id === threadId);
      const filter = sentIn && !contactsAllowed(sentIn, stays.find((st) => st.id === sentIn.houseId)) ? maskContacts(written) : { text: written, masked: false };
      const trimmed = filter.text;
      const message: Omit<Message, "senderId" | "threadId"> = { id: makeId("m"), text: trimmed, ...(filter.masked && { contactsHidden: true }), createdAt: new Date().toISOString(), ...extra };
      dispatch({ type: "sendMessage", threadId, message: { ...message, type: messageType({ ...message, threadId, senderId: "" }) } });

      // Dev only: someone else in the crew "types" and answers, so the chat feels alive while testing.
      if (process.env.NODE_ENV === "production") return;
      const thread = threads.find((t) => t.id === threadId);
      const others = thread?.participantIds.filter((id) => id !== currentUserId) ?? [];
      if (!thread || others.length === 0) return;
      const replier = others[Math.floor(Math.random() * others.length)];
      const typingAfter = 2000 + Math.random() * 2000;
      setTimeout(() => dispatch({ type: "setTyping", threadId, userId: replier }), typingAfter);
      setTimeout(() => {
        dispatch({ type: "setTyping", threadId, userId: null });
        dispatch({
          type: "receiveMessage",
          threadId,
          message: {
            id: makeId("m"),
            threadId,
            senderId: replier,
            text: CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)],
            createdAt: new Date().toISOString(),
            type: "text",
          },
        });
      }, typingAfter + 1800);
    },
    [threads, stays, currentUserId],
  );
  const toggleReaction = useCallback(
    (threadId: string, messageId: string, emoji: string) => dispatch({ type: "toggleReaction", threadId, messageId, emoji }),
    [],
  );

  const openDirectThread = useCallback(
    (stayId: string, userId: string, asUserId?: string): string => {
      const me = asUserId ?? currentUserId;
      if (!me) return "";
      const existing = threads.find(
        (t) =>
          t.type === "direct" &&
          t.houseId === stayId &&
          t.participantIds.includes(me) &&
          t.participantIds.includes(userId),
      );
      if (existing) return existing.id;
      const thread: Thread = {
        id: makeId("direct"),
        type: "direct",
        houseId: stayId,
        participantIds: [me, userId],
        messages: [],
      };
      dispatch({ type: "createThread", thread });
      return thread.id;
    },
    [threads, currentUserId],
  );

  const acceptRequest = useCallback(
    (requestId: string) =>
      dispatch({
        type: "acceptRequest",
        requestId,
        systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() },
      }),
    [],
  );
  const declineRequest = useCallback((requestId: string) => dispatch({ type: "declineRequest", requestId }), []);
  const markThreadRead = useCallback(
    (threadId: string) => {
      const last = threads.find((t) => t.id === threadId)?.messages.at(-1);
      if (last) dispatch({ type: "markThreadRead", threadId, at: last.createdAt });
    },
    [threads],
  );
  const setAcceptingRequests = useCallback(
    (stayId: string, accepting: boolean) => dispatch({ type: "setAcceptingRequests", stayId, accepting }),
    [],
  );
  const lockAccommodation = useCallback(
    async (stayId: string, input: { link: string; total: number; spots: number; currency: Currency; payBy: string }) => {
      const stay = stays.find((s) => s.id === stayId);
      if (!stay || input.total <= 0 || input.spots <= 0) return;
      await sleep(MOCK_DELAY_MS);
      const now = new Date().toISOString();
      const total = Math.round(input.total);
      dispatch({
        type: "lockAccommodation",
        stayId,
        patch: { currency: input.currency, totalPrice: total, payByDate: input.payBy, lockedAt: now },
        lock: {
          link: input.link,
          title: previewForUrl(input.link, stay.title).title,
          total,
          spots: input.spots,
          perPerson: Math.ceil(total / input.spots),
          payBy: input.payBy,
        },
        message: { id: makeId("m"), createdAt: now },
      });
    },
    [stays],
  );
  const payShare = useCallback(async (stayId: string, cardNumber: string): Promise<"paid" | "declined"> => {
    await sleep(MOCK_DELAY_MS);
    // Mock card network: 0000… is the test number for a declined card.
    if (cardNumber.replace(/\s/g, "").startsWith("0000")) return "declined";
    dispatch({ type: "payShare", stayId, message: { id: makeId("m"), createdAt: new Date().toISOString() } });
    return "paid";
  }, []);
  // The provider charged the share (lib/payments): only the record changes here.
  const markSharePaid = useCallback((stayId: string) => dispatch({ type: "payShare", stayId, message: { id: makeId("m"), createdAt: new Date().toISOString() } }), []);
  const confirmBooking = useCallback(async (stayId: string, file: File) => {
    await sleep(MOCK_DELAY_MS);
    // Mock upload: a local object URL stands in for the stored file.
    dispatch({ type: "confirmBooking", stayId, proofUrl: URL.createObjectURL(file), message: { id: makeId("m"), createdAt: new Date().toISOString() } });
  }, []);
  const resetPayments = useCallback((stayId: string) => dispatch({ type: "resetPayments", stayId }), []);
  const toggleSaved = useCallback((stayId: string) => dispatch({ type: "toggleSaved", stayId }), []);
  const confirmLivedWith = useCallback((otherUserId: string) => dispatch({ type: "confirmLivedWith", otherUserId, at: new Date().toISOString() }), []);
  const toggleHostAlert = useCallback((hostId: string) => dispatch({ type: "toggleHostAlert", hostId }), []);
  const setNotification = useCallback(
    (group: NotificationGroup, channel: NotificationChannel, on: boolean) => dispatch({ type: "setNotification", group, channel, on }),
    [],
  );
  const unblockUser = useCallback((userId: string) => dispatch({ type: "unblockUser", userId }), []);
  const blockUser = useCallback((userId: string) => dispatch({ type: "blockUser", userId }), []);
  const report = useCallback(
    (target: Report["target"], reason: ReportReason, text?: string) =>
      dispatch({ type: "report", report: { id: makeId("rep"), target, reason, text: text?.trim() || undefined, createdAt: new Date().toISOString() } }),
    [],
  );
  const deleteAccount = useCallback(() => {
    dispatch({ type: "deleteAccount", at: new Date().toISOString() });
    try {
      localStorage.removeItem(MOCK_USER_KEY);
      sessionStorage.removeItem(TAB_USER_KEY);
    } catch {
      // nothing to clean up
    }
  }, []);
  const lapsePaymentWindow = useCallback((stayId: string) => dispatch({ type: "lapsePaymentWindow", stayId, at: new Date().toISOString() }), []);
  // The clock runs in the browser for now (later a server job): on load, and once a minute.
  useEffect(() => {
    const settle = () => dispatch({ type: "settlePayments", at: new Date().toISOString() });
    settle();
    const timer = window.setInterval(settle, SETTLE_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);
  const fireReminder = useCallback(
    (reminder: Reminder) => dispatch({ type: "fireReminder", reminder, message: { id: makeId("m"), createdAt: new Date().toISOString() } }),
    [],
  );

  const premiumView = useMemo(
    () => (hostPremium ? null : withoutHostPremium({ stays: state.stays, payments: state.payments, users: state.users })),
    [hostPremium, state.stays, state.payments, state.users],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      ...premiumView,
      login,
      logout,
      updateCurrentUser,
      createStay,
      updateStay,
      publishStay,
      createClaimableStay,
      claimStay,
      respondToInvite,
      completeStay,
      inviteToStay,
      createHouseInvite,
      resendHouseInvite,
      cancelHouseInvite,
      redeemHouseInvite,
      track,
      addAlert,
      saveSearch,
      markNotificationRead,
      markAllNotificationsRead,
      addNotifications,
      addApplication,
      leaveStay,
      requestWaitlist,
      withdrawRequest,
      deleteDraft,
      undoDecline,
      addSupportCase,
      removeFromWaitlist,
      takeWaitlistSpot,
      closeStay,
      removeMember,
      unlockAccommodation,
      requestToJoin,
      castVote,
      closeVote,
      decideVote,
      acceptRequest,
      declineRequest,
      sendMessage,
      openDirectThread,
      markThreadRead,
      toggleReaction,
      lockAccommodation,
      payShare,
      markSharePaid,
      confirmBooking,
      resetPayments,
      setAcceptingRequests,
      toggleSaved,
      confirmLivedWith,
      toggleHostAlert,
      setNotification,
      unblockUser,
      blockUser,
      report,
      deleteAccount,
      fireReminder,
      lapsePaymentWindow,
    }),
    [state, premiumView, login, logout, updateCurrentUser, createStay, updateStay, publishStay, createClaimableStay, claimStay, respondToInvite, completeStay, inviteToStay, createHouseInvite, resendHouseInvite, cancelHouseInvite, redeemHouseInvite, track, addAlert, saveSearch, markNotificationRead, markAllNotificationsRead, addNotifications, addApplication, leaveStay, withdrawRequest, deleteDraft, undoDecline, addSupportCase, requestWaitlist, removeFromWaitlist, takeWaitlistSpot, closeStay, removeMember, castVote, closeVote, decideVote, unlockAccommodation, requestToJoin, acceptRequest, declineRequest, sendMessage, openDirectThread, markThreadRead, toggleReaction, lockAccommodation, payShare, markSharePaid, confirmBooking, resetPayments, setAcceptingRequests, toggleSaved, confirmLivedWith, toggleHostAlert, setNotification, unblockUser, blockUser, report, deleteAccount, fireReminder, lapsePaymentWindow],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

const noSubscribe = () => () => {};

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  // While a component hydrates it must render what the server did – logged out. The mock user is restored from
  // localStorage in an effect, which can run before late Suspense boundaries (nav, dynamic routes) hydrate.
  // getServerSnapshot (false) is used during hydration; React re-renders with the real user right after.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return hydrated || store.currentUserId === null ? store : { ...store, currentUserId: null };
}

// Selectors – pure helpers over store state.


/** Whether the current user blocked `userId` (their Houses, profile and direct threads are hidden). */
export function isBlocked(store: Pick<StoreState, "users" | "currentUserId">, userId: string): boolean {
  return settingsOf(getCurrentUser(store)).blockedUserIds.includes(userId);
}

/** Ready to send requests / publish: a face photo, a first name, an age (18+) and a country. */
export function isProfileComplete(user: Pick<User, "photos" | "name" | "age" | "country">): boolean {
  return Boolean(user.photos[0]) && user.name.trim() !== "" && user.age >= 18 && user.country.trim() !== "";
}

/** A user's settings with defaults filled in (everything on, nobody blocked). */
export function settingsOf(user: Pick<User, "settings"> | undefined): UserSettings {
  // Only the groups that exist now – settings saved before (requests, payments …) are dropped; those are always on.
  const stored: Partial<NotificationPrefs> = user?.settings?.notifications ?? {};
  const notifications = Object.fromEntries(
    (Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[]).map((key) => [key, { ...DEFAULT_NOTIFICATION_PREFS[key], ...stored[key] }]),
  ) as NotificationPrefs;
  return { notifications, blockedUserIds: user?.settings?.blockedUserIds ?? [] };
}

/** The switchable channels of a notification group (in-app is always on). */
export type NotificationChannel = "push" | "email";

export type StoreData = Pick<StoreState, "users" | "stays" | "joinRequests" | "currentUserId">;

export function findUser(store: Pick<StoreState, "users">, userId: string): User | undefined {
  return store.users.find((u) => u.id === userId);
}

/** The logged-in user, or undefined when logged out. */
export function getCurrentUser(store: Pick<StoreState, "users" | "currentUserId">): User | undefined {
  return store.currentUserId ? findUser(store, store.currentUserId) : undefined;
}

/** Host first, then accepted guests. */
export function getCrew(store: StoreData, stay: Stay): User[] {
  const memberIds = [
    stay.hostId,
    ...store.joinRequests
      .filter((r) => r.stayId === stay.id && r.status === "accepted")
      .map((r) => r.userId),
  ];
  return memberIds.map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));
}

export function isCrewMember(store: StoreData, stay: Stay, userId: string | null): boolean {
  if (!userId) return false;
  return (
    stay.hostId === userId ||
    store.joinRequests.some((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted")
  );
}

export function getMyRequest(store: StoreData, stayId: string): JoinRequest | undefined {
  if (!store.currentUserId) return undefined;
  return store.joinRequests.findLast((r) => r.stayId === stayId && r.userId === store.currentUserId);
}

export function pendingRequestCount(store: StoreData, stayId: string): number {
  return store.joinRequests.filter((r) => r.stayId === stayId && (r.status === "pending" || r.status === "waitlist_requested")).length;
}

export function getCrewThread(store: Pick<StoreState, "threads">, stayId: string): Thread | undefined {
  return store.threads.find((t) => t.id === crewThreadId(stayId));
}

/** Unread = the newest message is from someone else (or the system) and newer than the last read mark. */
export function isThreadUnread(store: Pick<StoreState, "lastReadAt" | "currentUserId">, thread: Thread): boolean {
  const last = thread.messages.at(-1);
  if (!last || last.senderId === store.currentUserId) return false;
  const readAt = store.lastReadAt[thread.id];
  return !readAt || readAt < last.createdAt;
}

/** How many of the current user's threads have unread messages (direct chats with people they blocked don't count). */
export function unreadThreadCount(store: Pick<StoreState, "threads" | "lastReadAt" | "currentUserId" | "users">): number {
  const me = store.currentUserId;
  if (!me) return 0;
  // Simpulo's own "updates" chat isn't a chat any more: what it says is in Messages › Updates (the notifications).
  return store.threads.filter(
    (t) => t.type !== "updates" && t.participantIds.includes(me) && isThreadUnread(store, t) && !(t.type === "direct" && t.participantIds.some((id) => id !== me && isBlocked(store, id))),
  ).length;
}

/** Links shared in a House's thread, oldest first, each once – before anyone joined: the host's accommodation ideas. */
export function getCrewLinks(store: Pick<StoreState, "threads" | "stays">, stayId: string): string[] {
  const thread = getCrewThread(store, stayId);
  if (!thread) return store.stays.find((s) => s.id === stayId)?.accommodationIdeas ?? [];
  return [...new Set(thread.messages.filter((m) => m.senderId !== "system").flatMap((m) => findUrls(m.text)))];
}

/** When someone joined: their accepted request's date (the host: when the House was opened). */
export function joinedAt(store: Pick<StoreState, "joinRequests">, stay: Stay, userId: string): string {
  if (userId === stay.hostId) return stay.createdAt;
  return store.joinRequests.find((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted")?.createdAt ?? "";
}

/** Payments of a stay's current lock (refunded ones from an earlier lock are left out). */
export function getPayments(store: Pick<StoreState, "payments">, stayId: string): Payment[] {
  return store.payments.filter((p) => p.stayId === stayId && p.status !== "refunded");
}

/** The current user's open or paid share of a stay, if any. */
export function getMyPayment(store: Pick<StoreState, "payments" | "currentUserId">, stayId: string): Payment | undefined {
  return getPayments(store, stayId).find((p) => p.userId === store.currentUserId);
}

export interface PaymentProgress {
  paidCount: number;
  count: number;
  /** What guests paid so far (shares + fees) */
  paidAmount: number;
  /** What guests pay in total (shares + fees) */
  totalAmount: number;
  /** Everyone paid – the shares (without fees) are released to the host */
  allPaid: boolean;
}

export function paymentProgress(store: Pick<StoreState, "payments">, stayId: string): PaymentProgress {
  const payments = getPayments(store, stayId);
  const paid = payments.filter((p) => p.status === "paid");
  return {
    paidCount: paid.length,
    count: payments.length,
    paidAmount: paid.reduce((sum, p) => sum + p.total, 0),
    totalAmount: payments.reduce((sum, p) => sum + p.total, 0),
    allPaid: payments.length > 0 && paid.length === payments.length,
  };
}

/** "paid" / "pending" for a member's share (no share yet counts as pending). */
export function paymentStatus(store: Pick<StoreState, "payments">, stayId: string, userId: string): PaymentStatus {
  return getPayments(store, stayId).some((p) => p.userId === userId && p.status === "paid") ? "paid" : "pending";
}

/** Paid shares of the current lock. */
export function paidCount(store: Pick<StoreState, "payments">, stay: Stay): number {
  return paymentProgress(store, stay.id).paidCount;
}

/** The lock card behind a locked stay (title, total, per person, spots, pay-by date). */
export function getLockDetails(_store: unknown, stay: Stay): LockDetails | undefined {
  return lockFromStay(stay);
}

/** @deprecated use messageType */
export const messageKind = messageType;

/** One of a person's past Houses with everyone else who lived in it. */
export interface CrewGroup {
  crew: Crew;
  stay: Stay;
  /** The other members (never the person themselves), host first */
  people: User[];
}

/** Every completed House `userId` lived in (host or member), most recent first, each with its whole crew. */
export function crewsOf(store: Pick<StoreState, "crews" | "stays" | "users">, userId: string): CrewGroup[] {
  return store.crews
    .filter((c) => c.memberIds.includes(userId))
    .toSorted((a, b) => b.endedAt.localeCompare(a.endedAt))
    .flatMap((crew) => {
      const stay = store.stays.find((s) => s.id === crew.houseId);
      if (!stay) return [];
      const people = crew.memberIds
        .filter((id) => id !== userId)
        .map((id) => store.users.find((u) => u.id === id))
        .filter((u): u is User => u !== undefined && !u.deletedAt);
      return [{ crew, stay, people }];
    });
}

/**
 * Everyone `userId` has lived with, each person once – under the most recent House they shared – grouped by House
 * (most recent first). Houses whose people all appear under a later one are left out.
 */
export function peopleLivedWith(store: Pick<StoreState, "crews" | "stays" | "users">, userId: string): CrewGroup[] {
  const seen = new Set<string>();
  return crewsOf(store, userId)
    .map((group) => ({ ...group, people: group.people.filter((u) => !seen.has(u.id) && seen.add(u.id)) }))
    .filter((group) => group.people.length > 0);
}

/** Invites of a House still waiting for an answer – these people hold a spot each. */
export function getInvited(store: Pick<StoreState, "joinRequests" | "users">, stayId: string): User[] {
  return store.joinRequests
    .filter((r) => r.stayId === stayId && r.status === "invited")
    .map((r) => store.users.find((u) => u.id === r.userId))
    .filter((u): u is User => u !== undefined);
}

/** Someone from your People and the Houses you shared, most recent first. */
export interface PersonEntry {
  user: User;
  houses: Stay[];
}

/**
 * "People": everyone `userId` has lived with or is about to – the crews of their completed Houses plus of the Houses
 * whose place is locked (booked together) – each person once, the one with the most recent shared House first.
 */
export function getPeople(store: Pick<StoreState, "crews" | "stays" | "users" | "joinRequests">, userId: string): PersonEntry[] {
  const together = new Map<string, Stay[]>();
  const add = (stay: Stay, memberIds: string[]) => {
    if (!memberIds.includes(userId)) return;
    for (const id of memberIds) {
      if (id === userId) continue;
      const houses = together.get(id) ?? [];
      if (!houses.includes(stay)) together.set(id, [...houses, stay]);
    }
  };
  for (const crew of store.crews) {
    const stay = store.stays.find((s) => s.id === crew.houseId);
    if (stay) add(stay, crew.memberIds);
  }
  for (const stay of store.stays) {
    if (stay.accommodationStatus !== "locked" || (stay.status !== "published" && stay.status !== "booked")) continue;
    add(stay, [stay.hostId, ...store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)]);
  }
  const newestFirst = (a: Stay, b: Stay) => b.endDate.localeCompare(a.endDate);
  return [...together]
    .map(([id, houses]) => ({ user: store.users.find((u) => u.id === id), houses: houses.toSorted(newestFirst) }))
    .filter((p): p is PersonEntry => p.user !== undefined && !p.user.deletedAt)
    .toSorted((a, b) => newestFirst(a.houses[0], b.houses[0]) || a.user.name.localeCompare(b.user.name));
}

/** One person the user lived with: the most recent House they shared. */
export interface LivedWithEntry {
  user: User;
  house: Stay;
  endedAt: string;
}

/**
 * Everyone `userId` lived with (from LivedWith), each person once with the most recent House they shared, most recent
 * first. Deleted accounts are left out.
 */
export function livedWithFor(store: Pick<StoreState, "livedWith" | "stays" | "users">, userId: string): LivedWithEntry[] {
  const latest = new Map<string, LivedWith>();
  for (const entry of store.livedWith) {
    if (entry.userId !== userId) continue;
    const seen = latest.get(entry.otherUserId);
    if (!seen || entry.endedAt > seen.endedAt) latest.set(entry.otherUserId, entry);
  }
  return [...latest.values()]
    .toSorted((a, b) => b.endedAt.localeCompare(a.endedAt))
    .flatMap((entry) => {
      const user = store.users.find((u) => u.id === entry.otherUserId);
      const house = store.stays.find((s) => s.id === entry.houseId);
      return user && house && !user.deletedAt ? [{ user, house, endedAt: entry.endedAt }] : [];
    });
}

/** The current user has an open invite to this House ("You're invited"). */
export function isInvitedTo(store: Pick<StoreState, "joinRequests" | "currentUserId">, stayId: string): boolean {
  return store.currentUserId !== null && store.joinRequests.some((r) => r.stayId === stayId && r.userId === store.currentUserId && r.status === "invited");
}

/** Invite links stay valid this long – from creating (or resending) them. */
export const INVITE_VALID_MS = 48 * 60 * 60 * 1000;
const inviteExpiry = (from: string) => new Date(new Date(from).getTime() + INVITE_VALID_MS).toISOString();

/** Every House's reserved spots, counted from its pending invite links. */
function withReservedSpots(stays: Stay[], invites: HouseInvite[]): Stay[] {
  const reserved = new Map<string, number>();
  for (const i of invites) if (i.status === "pending" && !i.priority) reserved.set(i.houseId, (reserved.get(i.houseId) ?? 0) + 1);
  return stays.map((s) => {
    const count = reserved.get(s.id);
    if ((s.spotsReserved ?? 0) === (count ?? 0)) return s;
    return { ...s, spotsReserved: count };
  });
}

/** New invite list – and the reserved spots that follow from it. */
function withInvites(state: StoreState, houseInvites: HouseInvite[]): StoreState {
  return { ...state, houseInvites, stays: withReservedSpots(state.stays, houseInvites) };
}

/** A House's invite links still waiting to be used (Host view), newest first. */
export function openHouseInvites(store: Pick<StoreState, "houseInvites">, stayId: string): HouseInvite[] {
  return store.houseInvites.filter((i) => i.houseId === stayId && i.status === "pending" && !i.priority).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The invite behind ?invite=token on this House – only while it can still be used (pending; expiry is swept). */
export function validHouseInvite(store: Pick<StoreState, "houseInvites" | "currentUserId">, stayId: string, token: string | null): HouseInvite | undefined {
  return token ? store.houseInvites.find((i) => i.token === token && i.houseId === stayId && i.status === "pending" && (!i.priority || i.invitedUserId === store.currentUserId)) : undefined;
}

/** The current user's updates chat from Simpulo. */
export const updatesThreadId = (userId: string) => `updates-${userId}`;

/** The invite link: its own page (/invite/[token]). */
export const houseInviteUrl = (origin: string, _stay: Pick<Stay, "slug">, invite: Pick<HouseInvite, "token">) => `${origin}/invite/${invite.token}`;

/** An unguessable token for an invite link. */
function inviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
