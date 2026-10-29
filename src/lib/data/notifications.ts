// Notifications: one record per recipient. The mock keeps them in the store; Firebase will keep the same documents
// (e.g. users/{uid}/notifications) and serve the same queries – a page by cursor, the unread count, mark read.
// Retention: read notifications older than 90 days may be deleted (a TTL on readAt + 90 days) – nothing relies on
// old read ones.

/** What happened – picks the icon and the tab. */
export type NotificationType =
  | "request_received"
  | "request_accepted"
  | "request_declined"
  | "crew_full"
  | "house_locked"
  | "payment_due"
  | "new_message"
  | "house_opened_in_place"
  | "crew_invite"
  | "do_it_again"
  | "system";

/** Tabs on /notifications (besides "All"). */
export const NOTIFICATION_CATEGORIES = ["requests", "houses", "messages", "system"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const TYPE_CATEGORY: Record<NotificationType, NotificationCategory> = {
  request_received: "requests",
  request_accepted: "requests",
  request_declined: "requests",
  crew_full: "houses",
  house_locked: "houses",
  payment_due: "houses",
  house_opened_in_place: "houses",
  crew_invite: "houses",
  do_it_again: "houses",
  new_message: "messages",
  system: "system",
};

/** The events the app sends; each is shown as its translation messages.notify.{key}. */
export type NotifyEventKey =
  | "newRequest"
  | "accepted"
  | "declined"
  | "crewFull"
  | "locked"
  | "paid"
  | "left"
  | "newMessage"
  // Scheduled reminders (src/lib/reminders.ts)
  | "reminderPayDue"
  | "reminderPayToday"
  | "reminderBookingUpload"
  | "reminderPendingRequests"
  | "reminderArrival"
  | "reminderSavedSoon"
  | "hostOpened"
  // A House opened in a place (and month) you said you're interested in
  | "interestOpened"
  // A host invited you to their new House in a place you're interested in
  | "interestInvite"
  // Crews: a past crew mate invited you to their new House / an invited person said yes (to the host)
  | "crewInvite"
  // A host invited you from their People to a House that's already open
  | "houseInvite"
  | "inviteAccepted"
  // Two days after a House ended, to everyone in its crew
  | "doItAgain"
  // From Simpulo itself
  | "systemWelcome"
  | "systemVerify"
  | "systemPhoto";

export const KEY_TYPE: Record<NotifyEventKey, NotificationType> = {
  newRequest: "request_received",
  reminderPendingRequests: "request_received",
  accepted: "request_accepted",
  declined: "request_declined",
  crewFull: "crew_full",
  locked: "house_locked",
  paid: "payment_due",
  reminderPayDue: "payment_due",
  reminderPayToday: "payment_due",
  reminderBookingUpload: "payment_due",
  newMessage: "new_message",
  hostOpened: "house_opened_in_place",
  interestOpened: "house_opened_in_place",
  interestInvite: "house_opened_in_place",
  crewInvite: "crew_invite",
  houseInvite: "crew_invite",
  inviteAccepted: "request_accepted",
  doItAgain: "do_it_again",
  left: "system",
  reminderArrival: "system",
  reminderSavedSoon: "system",
  systemWelcome: "system",
  systemVerify: "system",
  systemPhoto: "system",
};

/** One notification of one person. */
export interface AppNotification {
  id: string;
  /** The recipient */
  userId: string;
  /** Shared by everyone who got the same event (delivery shows once per event) */
  eventId: string;
  key: NotifyEventKey;
  values: Record<string, string | number>;
  /** ISO */
  createdAt: string;
  /** ISO, when the recipient read it – unset = unread. Read + older than 90 days = may be deleted. */
  readAt?: string;
  /** What it's about – where it leads */
  stayId?: string;
  threadId?: string;
  /** Explicit target (system notifications) */
  href?: string;
  /** Seeded mock history – never "delivered" again */
  mock?: true;
}

export const typeOf = (n: Pick<AppNotification, "key">): NotificationType => KEY_TYPE[n.key];

export interface NotificationPage {
  items: AppNotification[];
  /** Pass to the next call; null = no more */
  nextCursor: string | null;
}

export interface NotificationQuery {
  category?: NotificationCategory;
  /** From a previous page */
  cursor?: string | null;
  limit: number;
}

/** What the UI needs – the mock implements it over the store, Firebase over a collection query. */
export interface NotificationRepository {
  list(query: NotificationQuery): NotificationPage;
  unreadCount(): number;
  markRead(id: string): void;
  markAllRead(): void;
}

/** Newest first; ties by id, so the order (and the cursor) is stable. */
const newestFirst = (a: AppNotification, b: AppNotification) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
const cursorOf = (n: AppNotification) => `${n.createdAt}|${n.id}`;

/** One page of a person's notifications (already filtered to what they see), after `cursor`. */
export function pageOf(all: readonly AppNotification[], { category, cursor, limit }: NotificationQuery): NotificationPage {
  const sorted = all.filter((n) => !category || TYPE_CATEGORY[typeOf(n)] === category).toSorted(newestFirst);
  const start = cursor ? sorted.findIndex((n) => cursorOf(n) < cursor) : 0;
  if (start === -1) return { items: [], nextCursor: null };
  const items = sorted.slice(start, start + limit);
  return { items, nextCursor: start + limit < sorted.length && items.length > 0 ? cursorOf(items.at(-1)!) : null };
}
