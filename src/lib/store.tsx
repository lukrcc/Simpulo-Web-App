"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useSyncExternalStore, type ReactNode } from "react";
import { joinRequests as mockJoinRequests, stays as mockStays, threads as mockThreads, users as mockUsers } from "./mock";
import { withMockHistory } from "./mock-chat";
import type { Reminder } from "./reminders";
import { crewThreadId, mockPaidUsers, mockPreviewForUrl } from "./mock-extras";
import type {
  Attachment,
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
import { findUrls, makeId, slugify } from "./utils";

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
  /** Mock outbox: every notification that would go out by email (and push, if installed). Newest last. */
  notifications: AppNotification[];
}

export type NotifyEventKey =
  | "newRequest"
  | "accepted"
  | "declined"
  | "locked"
  | "paid"
  | "left"
  // Scheduled reminders (src/lib/reminders.ts)
  | "reminderPayDue"
  | "reminderPayToday"
  | "reminderBookingUpload"
  | "reminderPendingRequests"
  | "reminderArrival"
  | "reminderSavedSoon"
  | "hostOpened";

/** One notification event – email always, push if the recipient installed the app. Text comes from translations. */
export interface AppNotification {
  id: string;
  to: string[];
  key: NotifyEventKey;
  values: Record<string, string | number>;
}

// Actions that belong to "the current user" leave the user out: the reducer fills in state.currentUserId when it
// processes them. So an action dispatched right after login() in the same click already acts as the new user.
type StoreAction =
  | { type: "login"; userId: string }
  | { type: "logout" }
  | { type: "updateCurrentUser"; patch: ProfilePatch }
  | { type: "createStay"; stay: Omit<Stay, "hostId">; threadId: string; firstMessages: Array<Omit<Message, "userId">> }
  | { type: "updateStay"; stayId: string; patch: NewStayInput }
  | { type: "leaveStay"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "removeMember"; stayId: string; userId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "unlockAccommodation"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "closeStay"; stayId: string; systemMessage: Pick<Message, "id" | "createdAt"> }
  | { type: "requestToJoin"; request: Omit<JoinRequest, "userId"> }
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
  | { type: "setNotification"; group: NotificationGroup; channel: "push" | "email"; on: boolean }
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
    | "preferredCurrency"
  >
>;

interface StoreActions {
  login: (userId: string) => void;
  logout: () => void;
  updateCurrentUser: (patch: ProfilePatch) => void;
  /**
   * Creates a House hosted by the current user. Returns its slug.
   * `accommodationIdeas` (links) become the host's first messages in the crew thread.
   */
  createStay: (input: NewStayInput, accommodationIdeas?: string[]) => string;
  /** Host only: saves the edited House (slug and crew stay as they are). */
  updateStay: (stayId: string, patch: NewStayInput) => void;
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
  setNotification: (group: NotificationGroup, channel: "push" | "email", on: boolean) => void;
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
    .filter((stay) => !threads.some((t) => t.id === crewThreadId(stay.id)))
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

/** Simpulo fee on a share: 10 %, capped at 50 in the house currency. */
export const FEE_RATE = 0.1;
export const FEE_CAP = 50;
export function feeFor(share: number): number {
  return Math.min(Math.round(share * FEE_RATE), FEE_CAP);
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
function seedPayments(stays: Stay[], requests: JoinRequest[]): Payment[] {
  return stays.flatMap((stay) => {
    if (stay.accommodationStatus !== "locked" || !stay.pricePerPerson) return [];
    const share = stay.pricePerPerson;
    const crew = [stay.hostId, ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)];
    const paidAt = new Date(new Date(stay.lockedAt ?? stay.createdAt).getTime() + DAY_MS).toISOString();
    return crew.map<Payment>((userId) => {
      const paid = Boolean(stay.bookingConfirmedAt) || (mockPaidUsers[stay.id]?.includes(userId) ?? false);
      return {
        id: `pay-${stay.id}-${userId}`,
        stayId: stay.id,
        userId,
        share,
        fee: feeFor(share),
        total: share + feeFor(share),
        status: paid ? "paid" : "pending",
        ...(paid && { paidAt }),
      };
    });
  });
}

const seededStays = seedLockedStays(mockStays);
const seededPayments = seedPayments(seededStays, mockJoinRequests);
const seededChat = withMockHistory(withCrewThreads(seededStays, mockThreads, mockJoinRequests), {
  stays: seededStays,
  users: mockUsers,
  joinRequests: mockJoinRequests,
  payments: seededPayments,
  lockFor: lockFromStay,
});

const initialState: StoreState = {
  users: mockUsers,
  stays: seededStays,
  joinRequests: mockJoinRequests,
  threads: seededChat.threads,
  currentUserId: null,
  lastReadAt: seededChat.lastReadAt,
  payments: seededPayments,
  typing: {},
  reports: [],
  notifications: [],
};

/** text / image / link / lock / payment / system – stored, or derived for older messages. */
export function messageType(message: Message): MessageType {
  if (message.type) return message.type;
  if (message.userId === "system") return "system";
  if (message.attachments?.some((a) => a.kind === "image")) return "image";
  return findUrls(message.text).length > 0 ? "link" : "text";
}

const firstNameOf = (state: Pick<StoreState, "users">, userId: string, fallback = "Someone") =>
  state.users.find((u) => u.id === userId)?.name.split(" ")[0] ?? fallback;

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
): AppNotification[] {
  const recipients = [...new Set(to)].filter(Boolean);
  return recipients.length > 0 ? [...state.notifications, { id: `n-${id}`, to: recipients, key, values }] : state.notifications;
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
      return {
        ...state,
        stays: [{ ...action.stay, hostId: me }, ...state.stays],
        threads: [thread, ...state.threads],
        // The host's own ideas aren't unread for the host.
        lastReadAt: lastMessage ? { ...state.lastReadAt, [action.threadId]: lastMessage.createdAt } : state.lastReadAt,
        // Everyone with an alert on this host hears about the new House.
        notifications: notify(
          state,
          state.users.filter((u) => u.hostAlerts?.includes(me)).map((u) => u.id),
          "hostOpened",
          { name: firstNameOf(state, me), title: action.stay.title },
          action.stay.id,
        ),
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
        : { ...next, notifications: notify(next, [stay.hostId], "left", { name, title: stay.title }, action.systemMessage.id) };
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
      const alreadyAsked = state.joinRequests.some(
        (r) => r.stayId === action.request.stayId && r.userId === me && r.status !== "declined",
      );
      // The host can't join their own House; a second request would only duplicate the first; a House that
      // isn't taking requests doesn't get new ones.
      if (!stay || stay.hostId === me || alreadyAsked || !stay.acceptingRequests) return state;
      // A host who blocked me declines automatically – and isn't notified.
      const host = state.users.find((u) => u.id === stay.hostId);
      if (settingsOf(host).blockedUserIds.includes(me)) {
        return { ...state, joinRequests: [...state.joinRequests, { ...action.request, userId: me, status: "declined" }] };
      }
      return {
        ...state,
        joinRequests: [...state.joinRequests, { ...action.request, userId: me }],
        notifications: notify(state, [stay.hostId], "newRequest", { name: firstNameOf(state, me), title: stay.title }, action.request.id),
      };
    }

    case "acceptRequest": {
      const request = state.joinRequests.find((r) => r.id === action.requestId);
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay || request.status === "accepted" || stay.spotsFilled >= stay.spotsTotal) {
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
                  stayId: stay.id,
                  userId: request.userId,
                  share: stay.pricePerPerson,
                  fee: feeFor(stay.pricePerPerson),
                  total: stay.pricePerPerson + feeFor(stay.pricePerPerson),
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
        notifications: notify(state, [request.userId], "accepted", { title: stay.title }, systemMessage.id),
      };
    }

    case "declineRequest": {
      const request = state.joinRequests.find((r) => r.id === action.requestId && r.status === "pending");
      const stay = request && state.stays.find((s) => s.id === request.stayId);
      if (!request || !stay) return state;
      return {
        ...state,
        joinRequests: state.joinRequests.map((r) => (r.id === request.id ? { ...r, status: "declined" } : r)),
        notifications: notify(state, [request.userId], "declined", { title: stay.title }, `${request.id}-declined`),
      };
    }

    case "sendMessage":
      if (!me) return state;
      return {
        ...state,
        threads: updateThread(state.threads, action.threadId, (t) => ({
          ...t,
          messages: [...t.messages, { ...action.message, userId: me }],
        })),
        // Your own message is read by definition.
        lastReadAt: { ...state.lastReadAt, [action.threadId]: action.message.createdAt },
      };

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
        stayId: stay.id,
        userId,
        share: lock.perPerson,
        fee: feeFor(lock.perPerson),
        total: lock.perPerson + feeFor(lock.perPerson),
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
        notifications: notify(state, crew.filter((id) => id !== me), "locked", { title: stay.title, price: lock.perPerson, payBy: lock.payBy }, message.id),
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
        notifications: notify(state, crewIds(state, stay).filter((id) => id !== me), "paid", { title: stay.title, name }, message.id),
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
      const notifications = notify(state, [reminder.userId], reminder.notifyKey, reminder.values, `${reminder.id}-${action.message.id}`);
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currentUserId, threads, stays } = state;

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

  const createStay = useCallback((input: NewStayInput, accommodationIdeas: string[] = []): string => {
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
      stay: {
        ...input,
        id,
        slug,
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

  const updateStay = useCallback((stayId: string, patch: NewStayInput) => dispatch({ type: "updateStay", stayId, patch }), []);
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
    dispatch({
      type: "requestToJoin",
      request: { id: makeId("r"), stayId, message: message.trim(), status: "pending", createdAt: new Date().toISOString() },
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
    (group: NotificationGroup, channel: "push" | "email", on: boolean) => dispatch({ type: "setNotification", group, channel, on }),
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

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      login,
      logout,
      updateCurrentUser,
      createStay,
      updateStay,
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
    [state, login, logout, updateCurrentUser, createStay, updateStay, leaveStay, closeStay, removeMember, unlockAccommodation, requestToJoin, acceptRequest, declineRequest, sendMessage, openDirectThread, markThreadRead, toggleReaction, lockAccommodation, payShare, confirmBooking, resetPayments, setAcceptingRequests, toggleSaved, toggleHostAlert, setNotification, unblockUser, blockUser, report, deleteAccount, fireReminder],
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
