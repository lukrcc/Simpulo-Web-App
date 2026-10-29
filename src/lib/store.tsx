"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useSyncExternalStore, type ReactNode } from "react";
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
import { CURRENT_USER_ID } from "./mock";
import { getMockDataset, readPreset, type MockDataset } from "./mock-datasets";
import type { AppNotification, NotifyEventKey } from "./data/notifications";
import { FLEXIBLE, interestIn, interestsFor, MOCK_INTERESTS, wantsMonth, type DemandSpot, type Interest } from "./interests";
import { withMockHistory } from "./mock-chat";
import { mockClaimableStays, mockGrowthEvents, withMockAttribution } from "./mock-growth";
import { doItAgainDue, type Reminder } from "./reminders";
import { crewThreadId, mockPaidUsers, mockPreviewForUrl } from "./mock-extras";
import type {
  Attachment,
  Attribution,
  Crew,
  Currency,
  JoinRequest,
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
  User,
  UserSettings,
} from "./types";
import { findUrls, makeId, openSpots, slugify } from "./utils";

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
  interests: Interest[];
  /** stayId → when its host invited the people interested in it */
  interestInvites: Record<string, string>;
  /** Who lived together – one record per completed House (see Crew) */
  crews: Crew[];
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
      threadId: string;
      firstMessages: Array<Omit<Message, "userId">>;
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
  | { type: "track"; event: GrowthEvent }
  | { type: "attributeUser"; userId: string; attribution: Attribution }
  | { type: "addAlert"; alert: DemandAlert }
  | { type: "toggleInterest"; userId: string; spot: Pick<DemandSpot, "placeName" | "country" | "region" | "months">; interest: Pick<Interest, "id" | "createdAt"> }
  | { type: "addInterest"; interest: Interest }
  | { type: "markNotificationRead"; id: string; at: string }
  | { type: "markAllNotificationsRead"; at: string }
  | { type: "inviteInterested"; stayId: string; at: string }
  | { type: "addApplication"; application: HostApplication }
  | { type: "restoreGrowth"; saved: PersistedGrowth }
  | { type: "loadDataset"; state: StoreState }
  | { type: "updateStay"; stayId: string; patch: NewStayInput }
  | { type: "leaveStay"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "removeMember"; stayId: string; userId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "unlockAccommodation"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "closeStay"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "requestToJoin"; request: Omit<JoinRequest, "userId">; at: string }
  | { type: "acceptRequest"; requestId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "declineRequest"; requestId: string }
  | { type: "sendMessage"; threadId: string; message: Omit<Message, "userId"> }
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
  | { type: "toggleHostAlert"; hostId: string }
  | { type: "setNotification"; group: NotificationGroup; channel: NotificationChannel; on: boolean }
  | { type: "unblockUser"; userId: string }
  | { type: "blockUser"; userId: string }
  | { type: "report"; report: Omit<Report, "reporterId"> }
  | { type: "deleteAccount"; at: string }
  | { type: "fireReminder"; reminder: Reminder; message: Pick<Message, "id" | "createdAt"> }
  | { type: "setAcceptingRequests"; stayId: string; accepting: boolean };

/** The profile bits Edit profile, the Create flow's "About you" step and the photo sheet can change. */
export type ProfilePatch = Partial<
  Pick<
    User,
    | "name"
    | "age"
    | "country"
    | "city"
    | "bio"
    | "languages"
    | "photos"
    | "instagram"
    | "tiktok"
    | "youtube"
    | "twitch"
    | "kick"
    | "linkedin"
    | "x"
    | "threads"
    | "website"
    | "privateContacts"
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
  /** Analytics: records an event with the browser's first-touch attribution (and logs it to the console). */
  track: (name: GrowthEventName, props?: { houseId?: string; channel?: ShareChannel; userId?: string }) => void;
  /** "Notify me" on an empty Explore. */
  addAlert: (alert: Pick<DemandAlert, "email" | "region" | "from" | "to">) => void;
  /** "I'm interested" on a demand spot: on, or off again. `userId` – right after an inline login the store doesn't know the user yet. */
  toggleInterest: (spot: Pick<DemandSpot, "placeName" | "country" | "region" | "months">, userId: string) => void;
  /** "+ Add a place": a new interest of `userId` (shows up in the demand row right away) */
  addInterest: (input: Pick<Interest, "placeName" | "placeId" | "country" | "region" | "months" | "notify" | "visible">, userId: string) => void;
  /** Bell / notifications page: one of the current user's notifications is read */
  markNotificationRead: (id: string) => void;
  /** …or all of them */
  markAllNotificationsRead: () => void;
  /** Host: tell everyone interested in the House's city and month about it (notification + email) – once */
  inviteInterested: (stayId: string) => void;
  /** /host application form. */
  addApplication: (application: Omit<HostApplication, "id" | "createdAt" | "userId">) => void;
  /** Crew member (not the host) leaves: spot freed, out of the crew chat. */
  leaveStay: (stayId: string) => void;
  /** Host only: ends the House early. The crew is told in the crew chat. */
  closeStay: (stayId: string) => void;
  /** Host only: takes a member out of the crew (spot freed, out of the chat). */
  removeMember: (stayId: string, userId: string) => void;
  /** Host only: back to "crew decides together" – link and price are cleared, paid shares refunded. */
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
  /** Host, once everyone paid: upload the booking confirmation → House status 'booked'. */
  confirmBooking: (stayId: string, file: File) => Promise<void>;
  /** Dev only: every payment of the stay back to pending, booking proof cleared. */
  resetPayments: (stayId: string) => void;
  /** Host's "Taking requests" switch. Nothing else ever changes it. */
  setAcceptingRequests: (stayId: string, accepting: boolean) => void;
  /** Heart: adds the House to the current user's saved list, or removes it. */
  toggleSaved: (stayId: string) => void;
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
}

type StoreValue = StoreState & StoreActions;

/** Every stay has exactly one crew thread – seed empty ones where the mock data has none. */
function withCrewThreads(stays: Stay[], threads: Thread[], requests: JoinRequest[]): Thread[] {
  const missing = stays
    // A House waiting to be claimed has nobody to talk to yet.
    .filter((stay) => stay.hostId && !threads.some((t) => t.id === crewThreadId(stay.id)))
    .map<Thread>((stay) => ({
      id: crewThreadId(stay.id),
      type: "crew",
      stayId: stay.id,
      participantIds: [
        stay.hostId,
        ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId),
      ],
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
function paymentFor(stay: Stay, userId: string, share: number, attribution: Attribution): Omit<Payment, "id" | "status"> {
  const split = paymentSplit(share, userId === stay.hostId ? 0 : (stay.hostFeePerPerson ?? 0));
  return {
    stayId: stay.id,
    userId,
    share,
    ...(split.hostFee > 0 && { hostFee: split.hostFee }),
    fee: split.fee,
    total: split.total,
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
    title: link ? mockPreviewForUrl(link, stay.title).title : stay.title,
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
      const paid = Boolean(stay.bookingConfirmedAt) || (mockPaidUsers[stay.id]?.includes(userId) ?? false);
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
 * the day groups and "Load more" on /notifications have something to show. Built from Houses and chats that exist in
 * the dataset – a type without a fitting House is skipped. Anything older than two days is read.
 */
const MOCK_NOW = Date.parse("2026-10-29T08:00:00Z");
const MOCK_DAYS = [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 9, 10, 11, 12, 14, 15, 17, 18, 20, 21, 24, 26, 28, 31, 34, 37, 40, 43, 47, 51, 55, 60];

function mockInbox(stays: Stay[], requests: JoinRequest[], users: User[], threads: Thread[]): AppNotification[] {
  const me = CURRENT_USER_ID;
  const published = stays.filter((s) => s.status === "published" || s.status === "booked");
  const hosted = published.filter((s) => s.hostId === me);
  const joined = published.filter((s) => s.hostId !== me && requests.some((r) => r.stayId === s.id && r.userId === me && r.status === "accepted"));
  const locked = joined.filter((s) => s.accommodationStatus === "locked" && s.pricePerPerson);
  const others = published.filter((s) => s.hostId !== me && !joined.includes(s));
  const names = users.filter((u) => u.id !== me && u.photos.length > 0).map((u) => u.name.split(" ")[0]);
  const chats = threads.filter((t) => t.participantIds.includes(me));
  const pick = <T,>(list: T[], i: number): T | undefined => list[i % Math.max(1, list.length)];

  const builders: Array<(i: number) => Omit<AppNotification, "id" | "userId" | "eventId" | "createdAt"> | null> = [
    (i) => { const s = pick(hosted, i); return s ? { key: "newRequest", values: { name: pick(names, i * 3)!, title: s.title }, stayId: s.id } : null; },
    (i) => { const t = pick(chats, i); const s = t && stays.find((x) => x.id === t.stayId); return t && s ? { key: "newMessage", values: { name: pick(names, i * 5 + 1)!, title: s.title, preview: MOCK_PREVIEWS[i % MOCK_PREVIEWS.length] }, stayId: s.id, threadId: t.id } : null; },
    (i) => { const s = pick(joined, i); return s ? { key: "accepted", values: { title: s.title }, stayId: s.id } : null; },
    (i) => { const s = pick(locked, i); return s ? { key: "reminderPayDue", values: { title: s.title, price: s.pricePerPerson!, payBy: s.payByDate ?? s.startDate }, stayId: s.id } : null; },
    (i) => { const s = pick(others, i * 7); return s ? { key: "interestOpened", values: { place: s.city || s.region, title: s.title }, stayId: s.id } : null; },
    (i) => { const s = pick(locked, i + 1); return s ? { key: "locked", values: { title: s.title, price: s.pricePerPerson!, payBy: s.payByDate ?? s.startDate }, stayId: s.id } : null; },
    (i) => { const s = pick(others, i * 5 + 2); return s ? { key: "declined", values: { title: s.title }, stayId: s.id } : null; },
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
      seeded({ id: `n-again-${stay.id}-${userId}`, userId, key: "doItAgain", values: { title: stay.title }, createdAt: due, stayId: stay.id, href: `/my-stays/${stay.id}` }),
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

/** The Crew record of a House that just completed: the host plus everyone accepted right now. */
function crewRecord(stay: Stay, requests: JoinRequest[], endedAt: string): Crew {
  return {
    houseId: stay.id,
    memberIds: [stay.hostId, ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)],
    endedAt,
  };
}

const MOCK_PREVIEWS = ["Who's bringing the speaker?", "Landing at 14:20, anyone around?", "Booked my flight 🎉", "Can we push dinner to 8?", "Found a great coworking spot nearby"];

/** The store's starting state for a mock dataset (see mock-datasets.ts – the DevSwitcher's "Data" preset). */
function buildInitialState({ stays: rawStays, users, joinRequests: rawRequests, threads }: MockDataset): StoreState {
  const joinRequests = withMockAttribution(rawRequests, rawStays);
  const stays = seedLockedStays(rawStays);
  const payments = seedPayments(stays, joinRequests, users);
  const chat = withMockHistory(withCrewThreads(stays, threads, joinRequests), { stays, users, joinRequests, payments, lockFor: lockFromStay });
  const crews = stays.filter((s) => s.status === "completed").map((s) => crewRecord(s, joinRequests, s.endDate));
  return {
    users,
    // Houses waiting to be claimed have no host and no crew thread until someone claims them.
    stays: [...stays, ...mockClaimableStays],
    joinRequests,
    threads: chat.threads,
    currentUserId: null,
    lastReadAt: chat.lastReadAt,
    payments,
    typing: {},
    reports: [],
    events: mockGrowthEvents({ stays, joinRequests, payments }),
    alerts: [],
    applications: [],
    interests: [...MOCK_INTERESTS],
    interestInvites: {},
    crews,
    notifications: [...mockInbox(stays, joinRequests, users, chat.threads), ...mockCrewInbox(stays, joinRequests, users, crews)],
  };
}

/** Server render and hydration always start from the full data; another preset is swapped in right after. */
const initialState: StoreState = buildInitialState(getMockDataset("full"));

/** The growth bits kept in this browser across reloads (mock – no backend). Seeded events are left out. */
interface PersistedGrowth {
  events: GrowthEvent[];
  alerts: DemandAlert[];
  applications: HostApplication[];
  /** Prepared Houses created here, and every claimed one – so claim links and claimed drafts survive a reload */
  claimStays: Stay[];
  /** Attribution attached to users at signup in this browser */
  userAttribution: Record<string, Attribution>;
}

const GROWTH_KEY = "simpulo:growth";

function persistedGrowth(state: StoreState): PersistedGrowth {
  return {
    events: state.events.filter((e) => !e.seed),
    alerts: state.alerts,
    applications: state.applications,
    claimStays: state.stays.filter((s) => s.claim && (s.claim.claimedAt || !mockClaimableStays.some((m) => m.id === s.id))),
    userAttribution: Object.fromEntries(
      state.users.filter((u) => attributionOf(u).utmSource || u.refUserId).map((u) => [u.id, attributionOf(u)]),
    ),
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
    };
  } catch {
    return null;
  }
}

function event(id: string, name: GrowthEventName, at: string, props: Omit<GrowthEvent, "id" | "name" | "at">): GrowthEvent {
  return { id: `ev-${id}`, name, at, ...props };
}

/** text / image / link / lock / payment / system – stored, or derived for older messages. */
export function messageType(message: Message): MessageType {
  if (message.type) return message.type;
  if (message.userId === "system") return "system";
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
  return notify(
    state,
    state.users.filter((u) => u.hostAlerts?.includes(hostId)).map((u) => u.id),
    "hostOpened",
    { name: firstNameOf(state, hostId), title: stay.title },
    stay.id,
    stay.id,
  );
}

/** Everyone interested in this place and the House's start month (with "notify me" on) hears that it opened. */
function notifyInterested(state: StoreState, stay: Pick<Stay, "id" | "title" | "city" | "startDate">): AppNotification[] {
  const place = stay.city.trim().toLowerCase();
  const month = stay.startDate.slice(0, 7);
  const people = state.interests
    .filter((i) => i.notify && i.placeName.trim().toLowerCase() === place && wantsMonth(i, month))
    .map((i) => i.userId)
    .filter((id) => state.users.some((u) => u.id === id));
  return notify(state, people, "interestOpened", { place: stay.city, title: stay.title }, `${stay.id}-interest`, stay.id);
}

/** Host plus accepted members. */
function crewIds(state: Pick<StoreState, "joinRequests">, stay: Stay): string[] {
  return [stay.hostId, ...state.joinRequests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)];
}

function notify(
  state: StoreState,
  to: string[],
  key: NotifyEventKey,
  values: Record<string, string | number>,
  id: string,
  /** The House it's about – where the notification links to */
  stayId?: string,
  /** A chat it's about (new messages) */
  threadId?: string,
): AppNotification[] {
  const recipients = [...new Set(to)].filter(Boolean);
  if (recipients.length === 0) return state.notifications;
  const createdAt = new Date().toISOString();
  return [
    ...state.notifications,
    ...recipients.map((userId) => ({
      id: `n-${id}-${userId}`,
      userId,
      eventId: `n-${id}`,
      key,
      values,
      createdAt,
      ...(stayId && { stayId }),
      ...(threadId && { threadId }),
    })),
  ];
}

/** A system line in the crew chat: no stored text, rendered from the event's translation. */
function systemLine(base: Pick<Message, "id" | "createdAt">, key: SystemEventKey, values: Record<string, string | number>): Message {
  return { ...base, userId: "system", text: "", event: { key, values } };
}

/** Dev-only mock replies after you send a message. */
const CANNED_REPLIES = ["Haha nice 😄", "Agreed!", "Sounds good to me 👍", "Love it", "On it", "Wait, really?", "Perfect, thanks!", "🙌"];

/** Mock auth: the chosen user survives a refresh. */
const MOCK_USER_KEY = "simpulo:mock-user";
/** Dev "Open as…": a ?as=userId tab keeps its own user in sessionStorage, so two tabs can be host and guest. */
const TAB_USER_KEY = "simpulo:tab-user";
export const OPEN_AS_PARAM = "as";

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
      messages: [...t.messages, systemMessage],
    })),
  };
}

function reducer(state: StoreState, action: StoreAction): StoreState {
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
      // Every House gets its crew thread right away, with the host as first member.
      const messages = action.firstMessages.map((m) => ({ ...m, userId: me }));
      const thread: Thread = { id: action.threadId, type: "crew", stayId: action.stay.id, participantIds: [me], messages };
      const lastMessage = messages.at(-1);
      // Only the host's People (see getPeople), and never more than the spots besides the host's own.
      const livedWith = new Set(getPeople(state, me).map((p) => p.user.id));
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
        notifications: notify(state, invited, "crewInvite", { name: firstNameOf(state, me), title: action.stay.title }, `${action.stay.id}-crew`, action.stay.id),
      };
      return {
        ...state,
        stays: [{ ...action.stay, hostId: me, ...(invited.length > 0 && { spotsInvited: invited.length }) }, ...state.stays],
        joinRequests: [...state.joinRequests, ...invites],
        threads: [thread, ...state.threads],
        // The host's own ideas aren't unread for the host.
        lastReadAt: lastMessage ? { ...state.lastReadAt, [action.threadId]: lastMessage.createdAt } : state.lastReadAt,
        notifications: notifyInterested({ ...withInvites, notifications: notifyHostAlerts(withInvites, me, action.stay) }, action.stay),
        events: [
          ...state.events,
          event(action.stay.id, "house_published", action.stay.createdAt, { houseId: action.stay.id, userId: me, ...attributionFor(state, me, action.attribution) }),
        ],
      };
    }

    case "publishStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.status !== "draft") return state;
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, status: "published", acceptingRequests: true } : s)),
        notifications: notifyInterested({ ...state, notifications: notifyHostAlerts(state, me, stay) }, stay),
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
      const threadId = crewThreadId(stay.id);
      return {
        ...state,
        // A draft of their own now: they edit it, then publish. Their profile photo replaces the prepared one.
        stays: state.stays.map((s) =>
          s.id === stay.id
            ? { ...s, hostId: me, status: "draft", acceptingRequests: false, claim: { ...stay.claim!, claimedAt: action.at, claimedBy: me } }
            : s,
        ),
        threads: state.threads.some((t) => t.id === threadId)
          ? updateThread(state.threads, threadId, (t) => ({ ...t, participantIds: [me] }))
          : [{ id: threadId, type: "crew", stayId: stay.id, participantIds: [me], messages: [] }, ...state.threads],
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
      const systemMessage = systemLine(action.systemMessage, "joined", { name });
      const spotsFilled = stay.spotsFilled + 1;
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === invite.id ? { ...r, status: "accepted" } : r)),
        payments:
          stay.accommodationStatus === "locked" && stay.pricePerPerson
            ? [...state.payments, { id: `pay-${stay.id}-${me}`, ...paymentFor(stay, me, stay.pricePerPerson, attributionFor(state, me, undefined)), status: "pending" }]
            : state.payments,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsFilled, spotsInvited } : s)),
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({
          ...t,
          participantIds: t.participantIds.includes(me) ? t.participantIds : [...t.participantIds, me],
          messages: [...t.messages, systemMessage],
        })),
        notifications: notify(
          spotsFilled >= stay.spotsTotal
            ? { ...state, notifications: notify(state, [...crewIds(state, stay), me], "crewFull", { title: stay.title }, `${systemMessage.id}-full`, stay.id) }
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
      const existing = state.joinRequests.find((r) => r.stayId === stay.id && r.userId === action.userId && r.status !== "declined");
      if (existing) return state;
      const invite: JoinRequest = { id: `inv-${stay.id}-${action.userId}`, stayId: stay.id, userId: action.userId, message: "", status: "invited", createdAt: action.at };
      return {
        ...state,
        // An earlier "not this time" gives way to the invite.
        joinRequests: [...state.joinRequests.filter((r) => !(r.stayId === stay.id && r.userId === action.userId)), invite],
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, spotsInvited: (s.spotsInvited ?? 0) + 1 } : s)),
        notifications: notify(state, [action.userId], "houseInvite", { name: firstNameOf(state, me), title: stay.title }, invite.id, stay.id),
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

    case "toggleInterest": {
      const existing = interestIn(state.interests, action.userId, action.spot);
      if (existing) return { ...state, interests: state.interests.filter((i) => i.id !== existing.id) };
      // Joining a place: the months its people want (just "anytime" if none of them picked one).
      const months = action.spot.months.length > 0 ? action.spot.months.map((m) => m.month) : [FLEXIBLE];
      const { placeName, country, region } = action.spot;
      const interest: Interest = { placeName, country, region, months, ...action.interest, userId: action.userId, language: "en", notify: true, visible: true };
      return { ...state, interests: [...state.interests, interest] };
    }

    case "addInterest": {
      // One interest per person and place: adding a place again replaces its months and "notify me".
      const existing = interestIn(state.interests, action.interest.userId, action.interest);
      const others = existing ? state.interests.filter((i) => i.id !== existing.id) : state.interests;
      return { ...state, interests: [...others, action.interest] };
    }

    case "inviteInterested": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || state.interestInvites[stay.id]) return state;
      // Everyone – shown or not: people who opted out are told too, they just stay anonymous to the host.
      const people = interestsFor(state.interests, stay)
        .map((i) => i.userId)
        .filter((id) => id !== me && state.users.some((u) => u.id === id));
      return {
        ...state,
        interestInvites: { ...state.interestInvites, [stay.id]: action.at },
        notifications: notify(state, people, "interestInvite", { name: firstNameOf(state, me), place: stay.city, title: stay.title }, `${stay.id}-invite`, stay.id),
      };
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

    case "addApplication":
      return { ...state, applications: [...state.applications, action.application] };

    case "loadDataset":
      return { ...action.state, currentUserId: state.currentUserId };

    case "restoreGrowth": {
      const { saved } = action;
      const known = new Set(state.events.map((e) => e.id));
      const savedIds = new Set(saved.claimStays.map((s) => s.id));
      const stays = [...state.stays.filter((s) => !savedIds.has(s.id)), ...saved.claimStays];
      return {
        ...state,
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
      return { ...state, stays: state.stays.map((s) => (s.id === stay.id ? { ...s, ...action.patch, spotsTotal } : s)) };
    }

    case "leaveStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      // The host can't leave their own House – they close it instead.
      if (!stay || !me || stay.hostId === me) return state;
      const name = firstNameOf(state, me);
      const next = withoutMember(state, stay, me, systemLine(action.systemMessage, "left", { name }));
      return next === state
        ? state
        : { ...next, notifications: notify(next, [stay.hostId], "left", { name, title: stay.title }, action.systemMessage.id, stay.id) };
    }

    case "removeMember": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || action.userId === me) return state;
      const name = state.users.find((u) => u.id === action.userId)?.name.split(" ")[0] ?? "Someone";
      return withoutMember(state, stay, action.userId, systemLine(action.systemMessage, "removed", { name }));
    }

    case "unlockAccommodation": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.accommodationStatus !== "locked") return state;
      const name = state.users.find((u) => u.id === me)?.name.split(" ")[0] ?? "The host";
      const systemMessage = systemLine(action.systemMessage, "unlocked", { name });
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
                status: s.status === "booked" ? "published" : s.status,
              }
            : s,
        ),
        // Mock refund: paid shares go back, open ones disappear with the lock.
        payments: state.payments
          .filter((p) => !(p.stayId === stay.id && p.status === "pending"))
          .map((p) => (p.stayId === stay.id && p.status === "paid" ? { ...p, status: "refunded" } : p)),
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({ ...t, messages: [...t.messages, systemMessage] })),
      };
    }

    case "closeStay": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      if (!stay || !me || stay.hostId !== me || stay.status === "closed") return state;
      const name = state.users.find((u) => u.id === me)?.name.split(" ")[0] ?? "The host";
      const systemMessage = systemLine(action.systemMessage, "closed", { name });
      return {
        ...state,
        stays: state.stays.map((s) => (s.id === stay.id ? { ...s, status: "closed", acceptingRequests: false } : s)),
        // The system message makes the crew chat unread for every member – that's the notification.
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({ ...t, messages: [...t.messages, systemMessage] })),
      };
    }

    case "requestToJoin": {
      if (!me) return state;
      const stay = state.stays.find((s) => s.id === action.request.stayId);
      // An invite counts as asked: it's answered with respondToInvite, not with a request.
      const alreadyAsked = state.joinRequests.some(
        (r) => r.stayId === action.request.stayId && r.userId === me && r.status !== "declined",
      );
      // The host can't join their own House; a second request would only duplicate the first; a House that
      // isn't taking requests doesn't get new ones.
      if (!stay || stay.hostId === me || alreadyAsked || !stay.acceptingRequests) return state;
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
        notifications: notify(state, [stay.hostId], "newRequest", { name: firstNameOf(state, me), title: stay.title }, id, stay.id),
        events,
      };
    }

    case "acceptRequest": {
      const request = state.joinRequests.find((r) => r.id === action.requestId);
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      // Spots held by open invites aren't free.
      if (!request || !stay || request.status !== "pending" || openSpots(stay) === 0) {
        return state;
      }
      const spotsFilled = stay.spotsFilled + 1;
      const name = state.users.find((u) => u.id === request.userId)?.name.split(" ")[0] ?? "Someone";
      const systemMessage = systemLine(action.systemMessage, "joined", { name });
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
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({
          ...t,
          participantIds: t.participantIds.includes(request.userId) ? t.participantIds : [...t.participantIds, request.userId],
          messages: [...t.messages, systemMessage],
        })),
        notifications: notify(
          // The last spot taken: the whole crew hears it's complete.
          spotsFilled >= stay.spotsTotal
            ? { ...state, notifications: notify(state, [...crewIds(state, stay), request.userId], "crewFull", { title: stay.title }, `${systemMessage.id}-full`, stay.id) }
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
      const request = state.joinRequests.find((r) => r.id === action.requestId && r.status === "pending");
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay) return state;
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "declined" } : r)),
        notifications: notify(state, [request.userId], "declined", { title: stay.title }, `${request.id}-declined`, stay.id),
      };
    }

    case "sendMessage": {
      if (!me) return state;
      const thread = state.threads.find((t) => t.id === action.threadId);
      const stay = thread && state.stays.find((s) => s.id === thread.stayId);
      const preview = action.message.text.trim().slice(0, 80) || "📎";
      return {
        ...state,
        threads: updateThread(state.threads, action.threadId, (t) => ({
          ...t,
          messages: [...t.messages, { ...action.message, userId: me }],
        })),
        // Your own message is read by definition.
        lastReadAt: { ...state.lastReadAt, [action.threadId]: action.message.createdAt },
        // Everyone else in the chat gets a notification that leads to it.
        notifications: thread
          ? notify(state, thread.participantIds.filter((id) => id !== me), "newMessage", { name: firstNameOf(state, me), title: stay?.title ?? "", preview }, action.message.id, stay?.id, thread.id)
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
      const { lock } = action;
      // The lock card is a message from the host – the crew chat stays the full history.
      const message: Message = {
        ...action.message,
        userId: me,
        type: "lock",
        lock,
        text: "",
        event: { key: "locked", values: { name: firstNameOf(state, me, "The host"), price: lock.perPerson } },
      };
      const crew = crewIds(state, stay);
      const payments: Payment[] = crew.map((userId) => ({
        id: `pay-${stay.id}-${userId}-${action.message.id}`,
        ...paymentFor(stay, userId, lock.perPerson, memberAttribution(state.users, state.joinRequests, stay, userId)),
        status: "pending",
      }));
      return {
        ...state,
        stays: state.stays.map((s) =>
          s.id === stay.id
            ? // A locked place has a real price – the rough budget is history. The currency may change with it.
              { ...s, ...action.patch, accommodationStatus: "locked", accommodationLink: lock.link, pricePerPerson: lock.perPerson, budgetPerPerson: undefined }
            : s,
        ),
        // A new lock replaces any earlier, refunded round of payments.
        payments: [...state.payments.filter((p) => p.stayId !== stay.id || p.status === "refunded"), ...payments],
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({ ...t, messages: [...t.messages, message] })),
        lastReadAt: { ...state.lastReadAt, [crewThreadId(stay.id)]: message.createdAt },
        notifications: notify(state, crew.filter((id) => id !== me), "locked", { title: stay.title, price: lock.perPerson, payBy: lock.payBy }, message.id, stay.id),
      };
    }

    case "payShare": {
      const stay = state.stays.find((s) => s.id === action.stayId);
      const mine = state.payments.find((p) => p.stayId === action.stayId && p.userId === me && p.status === "pending");
      if (!stay || !me || stay.accommodationStatus !== "locked" || !mine) return state;
      const payments = state.payments.map((p) => (p.id === mine.id ? { ...p, status: "paid" as const, paidAt: action.message.createdAt } : p));
      const active = payments.filter((p) => p.stayId === stay.id && p.status !== "refunded");
      const name = firstNameOf(state, me);
      const message: Message = {
        ...systemLine(action.message, "paid", { name, paid: active.filter((p) => p.status === "paid").length, total: active.length }),
        type: "payment",
      };
      return {
        ...state,
        payments,
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({ ...t, messages: [...t.messages, message] })),
        notifications: notify(state, crewIds(state, stay).filter((id) => id !== me), "paid", { title: stay.title, name }, message.id, stay.id),
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
      const systemMessage = systemLine(action.message, "bookingConfirmed", {});
      return {
        ...state,
        stays: state.stays.map((s) =>
          s.id === stay.id ? { ...s, status: "booked", bookingConfirmedAt: action.message.createdAt, bookingProofUrl: action.proofUrl } : s,
        ),
        threads: updateThread(state.threads, crewThreadId(stay.id), (t) => ({ ...t, messages: [...t.messages, systemMessage] })),
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
            ? { ...s, bookingConfirmedAt: undefined, bookingProofUrl: undefined, status: s.status === "booked" ? "published" : s.status }
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
      return { ...state, currentUserId: null, users: state.users.map((u) => (u.id === me ? { ...u, deletedAt: action.at } : u)) };

    case "fireReminder": {
      const { reminder } = action;
      const notifications = notify(state, [reminder.userId], reminder.notifyKey, reminder.values, `${reminder.id}-${action.message.id}`, reminder.stayId);
      if (!reminder.chatEvent) return { ...state, notifications };
      const line = systemLine(action.message, reminder.chatEvent, reminder.values);
      return {
        ...state,
        notifications,
        threads: updateThread(state.threads, crewThreadId(reminder.stayId), (t) => ({ ...t, messages: [...t.messages, line] })),
      };
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
  const { currentUserId, threads, stays } = state;
  /** Events already in the console (or seeded/restored) – the log effect only prints new ones. */
  const loggedEvents = useRef<Set<string> | null>(null);
  /** Growth data is written back only after it was read, so the first render can't overwrite it. */
  const growthRestored = useRef(false);

  // Mock data volume (DevSwitcher "Data"): another preset than "full" is swapped in right after hydration. Runs before
  // the growth restore below, so restored claims and events land on top of it.
  useEffect(() => {
    const preset = readPreset();
    if (preset !== "full") dispatch({ type: "loadDataset", state: buildInitialState(getMockDataset(preset)) });
  }, []);

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
  }, [state.events, state.alerts, state.applications, state.stays, state.users]);

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
      threadId: crewThreadId(id),
      // One message per link, a millisecond apart so they keep their order.
      firstMessages: accommodationIdeas.map((link, i) => ({
        id: makeId("m"),
        text: link,
        createdAt: new Date(now + i).toISOString(),
      })),
      attribution: firstTouch(),
      invite: crew.invite,
      stay: {
        ...input,
        id,
        slug,
        ...(crew.againFrom && { duplicatedFrom: crew.againFrom }),
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
    return slug;
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
        vibe: "mixed",
        language: "en",
        city: input.city.trim(),
        region: input.region.trim(),
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
  const toggleInterest = useCallback(
    (spot: Pick<DemandSpot, "placeName" | "country" | "region" | "months">, userId: string) =>
      dispatch({ type: "toggleInterest", userId, spot, interest: { id: makeId("interest"), createdAt: new Date().toISOString() } }),
    [],
  );
  const addInterest = useCallback(
    (input: Pick<Interest, "placeName" | "placeId" | "country" | "region" | "months" | "notify" | "visible">, userId: string) =>
      dispatch({
        type: "addInterest",
        interest: { ...input, id: makeId("interest"), userId, language: "en", createdAt: new Date().toISOString() },
      }),
    [],
  );
  const markNotificationRead = useCallback((id: string) => dispatch({ type: "markNotificationRead", id, at: new Date().toISOString() }), []);
  const markAllNotificationsRead = useCallback(() => dispatch({ type: "markAllNotificationsRead", at: new Date().toISOString() }), []);
  const inviteInterested = useCallback((stayId: string) => dispatch({ type: "inviteInterested", stayId, at: new Date().toISOString() }), []);
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
  const removeMember = useCallback(
    (stayId: string, userId: string) =>
      dispatch({ type: "removeMember", stayId, userId, systemMessage: { id: makeId("m"), createdAt: new Date().toISOString() } }),
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
      const trimmed = text.trim();
      if (!trimmed && !extra.attachments?.length) return;
      const message: Omit<Message, "userId"> = { id: makeId("m"), text: trimmed, createdAt: new Date().toISOString(), ...extra };
      dispatch({ type: "sendMessage", threadId, message: { ...message, type: messageType({ ...message, userId: "" }) } });

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
            userId: replier,
            text: CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)],
            createdAt: new Date().toISOString(),
            type: "text",
          },
        });
      }, typingAfter + 1800);
    },
    [threads, currentUserId],
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
          t.stayId === stayId &&
          t.participantIds.includes(me) &&
          t.participantIds.includes(userId),
      );
      if (existing) return existing.id;
      const thread: Thread = {
        id: makeId("direct"),
        type: "direct",
        stayId,
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
          title: mockPreviewForUrl(input.link, stay.title).title,
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
  const confirmBooking = useCallback(async (stayId: string, file: File) => {
    await sleep(MOCK_DELAY_MS);
    // Mock upload: a local object URL stands in for the stored file.
    dispatch({ type: "confirmBooking", stayId, proofUrl: URL.createObjectURL(file), message: { id: makeId("m"), createdAt: new Date().toISOString() } });
  }, []);
  const resetPayments = useCallback((stayId: string) => dispatch({ type: "resetPayments", stayId }), []);
  const toggleSaved = useCallback((stayId: string) => dispatch({ type: "toggleSaved", stayId }), []);
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
      track,
      addAlert,
      toggleInterest,
      addInterest,
      markNotificationRead,
      markAllNotificationsRead,
      inviteInterested,
      addApplication,
      leaveStay,
      closeStay,
      removeMember,
      unlockAccommodation,
      requestToJoin,
      acceptRequest,
      declineRequest,
      sendMessage,
      openDirectThread,
      markThreadRead,
      toggleReaction,
      lockAccommodation,
      payShare,
      confirmBooking,
      resetPayments,
      setAcceptingRequests,
      toggleSaved,
      toggleHostAlert,
      setNotification,
      unblockUser,
      blockUser,
      report,
      deleteAccount,
      fireReminder,
    }),
    [state, premiumView, login, logout, updateCurrentUser, createStay, updateStay, publishStay, createClaimableStay, claimStay, respondToInvite, completeStay, inviteToStay, track, addAlert, toggleInterest, addInterest, markNotificationRead, markAllNotificationsRead, inviteInterested, addApplication, leaveStay, closeStay, removeMember, unlockAccommodation, requestToJoin, acceptRequest, declineRequest, sendMessage, openDirectThread, markThreadRead, toggleReaction, lockAccommodation, payShare, confirmBooking, resetPayments, setAcceptingRequests, toggleSaved, toggleHostAlert, setNotification, unblockUser, blockUser, report, deleteAccount, fireReminder],
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

const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    requests: { push: true, email: true },
    messages: { push: true, email: true },
    payments: { push: true, email: true },
    hostAlerts: { push: true, email: true },
    interests: { push: true, email: true },
    system: { push: false, email: true },
  },
  blockedUserIds: [],
};

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
  return {
    notifications: { ...DEFAULT_SETTINGS.notifications, ...user?.settings?.notifications },
    blockedUserIds: user?.settings?.blockedUserIds ?? [],
  };
}

/** Which Settings group a notification belongs to (its toggles decide whether push/email go out). */
/** In-app = under the bell; push only reaches installed apps; email always. */
export type NotificationChannel = "inApp" | "push" | "email";

export const NOTIFY_GROUP: Record<NotifyEventKey, NotificationGroup> = {
  newRequest: "requests",
  accepted: "requests",
  declined: "requests",
  reminderPendingRequests: "requests",
  left: "messages",
  locked: "payments",
  paid: "payments",
  reminderPayDue: "payments",
  reminderPayToday: "payments",
  reminderBookingUpload: "payments",
  reminderArrival: "payments",
  reminderSavedSoon: "payments",
  hostOpened: "hostAlerts",
  interestOpened: "interests",
  interestInvite: "interests",
  crewInvite: "requests",
  houseInvite: "requests",
  inviteAccepted: "requests",
  doItAgain: "system",
  crewFull: "requests",
  newMessage: "messages",
  systemWelcome: "system",
  systemVerify: "system",
  systemPhoto: "system",
};

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
  return store.joinRequests.filter((r) => r.stayId === stayId && r.status === "pending").length;
}

export function getCrewThread(store: Pick<StoreState, "threads">, stayId: string): Thread | undefined {
  return store.threads.find((t) => t.id === crewThreadId(stayId));
}

/** Unread = the newest message is from someone else (or the system) and newer than the last read mark. */
export function isThreadUnread(store: Pick<StoreState, "lastReadAt" | "currentUserId">, thread: Thread): boolean {
  const last = thread.messages.at(-1);
  if (!last || last.userId === store.currentUserId) return false;
  const readAt = store.lastReadAt[thread.id];
  return !readAt || readAt < last.createdAt;
}

/** Links shared in a stay's crew chat, oldest first, each once. */
export function getCrewLinks(store: Pick<StoreState, "threads">, stayId: string): string[] {
  const messages = getCrewThread(store, stayId)?.messages ?? [];
  return [...new Set(messages.filter((m) => m.userId !== "system").flatMap((m) => findUrls(m.text)))];
}

/** When someone joined: their accepted request's date (the host: when the House was opened). */
export function joinedAt(store: Pick<StoreState, "joinRequests">, stay: Stay, userId: string): string {
  if (userId === stay.hostId) return stay.createdAt;
  return store.joinRequests.find((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted")?.createdAt ?? "";
}

/**
 * Crew-only contacts are visible to people who share an accepted crew with the user – as host or as accepted
 * member of the same House (any status, past Houses included). A rule, not a setting. Users always see their own.
 */
export function canSeePrivateContacts(store: StoreData, viewerId: string | null, userId: string): boolean {
  if (!viewerId) return false;
  if (viewerId === userId) return true;
  return store.stays.some((stay) => isCrewMember(store, stay, viewerId) && isCrewMember(store, stay, userId));
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
