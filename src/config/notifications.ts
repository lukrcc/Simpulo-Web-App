// The catalogue of every email and notice (CLAUDE.md "Benachrichtigungen"): the one place for each event – what triggers it, who gets it,
// which channels (email · push · in-app), which group in Settings, whether it can be switched off, how its email goes out. The words
// (subject, the short line for push and the lock screen, the body, the button) are in en.ts under notifications.catalog.<id>.
// lib/notify routes by it, Settings shows its groups, /dev/emails previews every email from it.
import type { NotifyEventKey } from "@/lib/data/notifications";

/**
 * The groups. "bookings" (money, deadlines, a House's milestones) and "account" (sign-in, applications, the waitlist, reports and
 * decisions, Terms, the account itself) are always on; the others have switches in Settings › Notifications.
 */
export type NotifyCategory = "bookings" | "account" | "messages" | "arc" | "people" | "nearby" | "news";
export type OptionalCategory = Exclude<NotifyCategory, "bookings" | "account">;
export const ALWAYS_ON: readonly NotifyCategory[] = ["bookings", "account"];

/**
 * When an email goes out:
 * - instant: right away, never bundled – money, deadlines, sign-in, decisions about you (Regel: Pflicht-Hinweise zu Geld und Fristen)
 * - daily: collected per person and day into one email (the daily bundle) – everything else that isn't time-critical
 * - unreadAfter: only if still unread after CHAT_EMAIL_AFTER_MINUTES, several collected into one email
 * - weekly: in the weekly summary
 * - optIn: only when switched on (off by default), then like daily
 */
export type EmailTiming = "instant" | "daily" | "unreadAfter" | "weekly" | "optIn";

/** Who gets it. */
export type Recipient = "guest" | "host" | "crew" | "invitee" | "applicant" | "waitlist" | "reporter" | "reported" | "account";

export interface CatalogEntry {
  /** Where in the code it's triggered (file › function) – null: not triggered yet (listed on /dev/emails and by scripts/check-notifications.ts) */
  trigger: string | null;
  to: Recipient;
  category: NotifyCategory;
  /** Can't be switched off (its category is always on) */
  mandatory: boolean;
  /** null = never by email */
  email: EmailTiming | null;
  /** Push and the lock screen: only the short line (the kind and the House – never what someone wrote) */
  push: boolean;
  /** Messages › Updates / Your houses › Activity */
  inApp: boolean;
  /** The email's one button, when the notification itself has no link */
  path: string;
}

const money = (trigger: string | null, to: Recipient, path = "/your-houses", extra: Partial<CatalogEntry> = {}): CatalogEntry => ({ trigger, to, category: "bookings", mandatory: true, email: "instant", push: true, inApp: true, path, ...extra });
const account = (trigger: string | null, to: Recipient, path = "/", extra: Partial<CatalogEntry> = {}): CatalogEntry => ({ trigger, to, category: "account", mandatory: true, email: "instant", push: false, inApp: false, path, ...extra });
const tip = (trigger: string | null, category: OptionalCategory, path = "/your-houses", extra: Partial<CatalogEntry> = {}): CatalogEntry => ({ trigger, to: "guest", category, mandatory: false, email: "daily", push: true, inApp: true, path, ...extra });

export const NOTIFY_CATALOG = {
  // ── Account ──
  signIn: account("auth/AuthSheet › sendLink (the magic link)", "account", "/"),
  welcome: account("store › agree (the first Terms = a new account)", "account", "/settings/profile?setup=1", { inApp: true }),
  // ── Requests ──
  requestSent: money("store › requestToJoin", "guest", "/your-houses", { push: false }),
  requestReceived: money("store › requestToJoin, requestWaitlist, withdrawRequest", "host"),
  requestAccepted: money("store › acceptRequest, takeWaitlistSpot, syncWaitlist", "guest"),
  requestDeclined: money("store › declineRequest, removeFromWaitlist", "guest", "/your-houses"),
  requestExpired: money("deadlines (request 72 h) › store applyDeadlineEvents; store › syncWaitlist (offer ran out)", "guest", "/your-houses"),
  invited: money("store › createStay, inviteToStay, redeemHouseInvite", "invitee"),
  hostReminder: money("deadlines (request 24 h · 48 h) and store › remindHost (applyDeadlineEvents)", "host"),
  friendSpots: money("deadlines (invite 48 h) › store applyDeadlineEvents", "host"),
  // ── Money ──
  paymentDue: money("store › lockAccommodation, settlePayments", "guest"),
  paymentReminder: money("deadlines (payment 24 h · 44 h) and store › remindGuest (applyDeadlineEvents)", "guest"),
  paymentLapsed: money("deadlines (payment 48 h) › store applyDeadlineEvents, settlePayments", "guest"),
  paid: money("store › payShare", "crew"),
  bookingConfirmed: money("store › confirmBooking", "crew"),
  cancelled: money("store › closeStay, leaveStay", "crew"),
  refund: money("store › settlePayments, leaveStay", "guest", "/settings#payments"),
  // In-app + email (no push): the reason, if any, and three similar Houses.
  guestRemoved: money("store › removeMember", "guest", "/explore", { push: false }),
  houseMilestone: money("store › acceptRequest, takeWaitlistSpot, redeemHouseInvite, respondToInvite (crew complete)", "crew"),
  // ── The House's arc (House tips) ──
  arcStep: tip("stay/ArcParts › useArcEmails", "arc"),
  dayAfter: tip("stay/ArcParts › useArcEmails (again)", "arc"),
  albumReady: tip("stay/ArcParts › useArcEmails (albumReady)", "arc"),
  doItAgain: tip("stay/ArcParts › useArcEmails (doItAgain)", "arc"),
  thirtyDays: tip("stay/ArcParts › useArcEmails (thirtyDays)", "arc"),
  yourPeople: tip("stay/ArcParts › useArcEmails (chosen)", "people", "/people"),
  anniversary: tip("stay/ArcParts › useArcEmails (anniversary)", "arc"),
  // ── Chat, searches, news ──
  chatMessage: { trigger: "store › sendMessage", to: "crew", category: "messages", mandatory: false, email: "unreadAfter", push: true, inApp: true, path: "/messages" },
  houseNudge: { trigger: "lib/admin/actions › nudgeHouse (Admin › Houses › Nachfrage)", to: "account", category: "nearby", mandatory: false, email: "daily", push: true, inApp: false, path: "/explore" },
  newHouse: { trigger: "store › announceToSearches", to: "account", category: "nearby", mandatory: false, email: "weekly", push: true, inApp: true, path: "/explore" },
  // One tip at the end of the onboarding about the account itself – in the app and the daily bundle, no push.
  profileTips: { trigger: "store › setOnboarding (guest done)", to: "account", category: "account", mandatory: false, email: "daily", push: false, inApp: true, path: "/settings/profile" },
  // ── Applications, waitlist ──
  applicationReceived: account("store › addApplication", "applicant", "/apply"),
  applicationAccepted: account("lib/admin/actions › decide (yes)", "applicant", "/welcome/host"),
  applicationDeclined: account("lib/admin/actions › decide (no)", "applicant", "/apply"),
  applicationQuestion: account("lib/admin/actions › decide (maybe)", "applicant", "/apply"),
  waitlistConfirm: account("lib/waitlistSignup › joinWaitlist", "waitlist", "/"),
  waitlistOpen: account("lib/admin/actions › changePhase (live)", "waitlist", "/explore", { inApp: true }),
  // ── Safety ──
  reportReceived: account("store › reportContent, safety/ReportContentForm", "reporter", "/", { inApp: true }),
  reportDecided: account("store › decideReport (lib/admin/actions › moderate)", "reporter", "/", { inApp: true }),
  decision: account("store › decideReport, decideAppeal", "reported", "/notices", { inApp: true }),
  teamMessage: account("lib/admin/actions › sendHostSuggestions, proposeAlternative (Admin › Houses)", "host", "/messages?id=support", { push: true }),
  supportReply: account("lib/admin/actions › reply", "account", "/messages?id=support", { inApp: true }),
  // ── Terms and the account ──
  termsUpdate: account("consent/Agreements › TermsGate → store › announceTerms", "account", "/terms", { inApp: true }),
  accountPaused: account("store › updateCurrentUser (paused)", "account", "/settings#privacy", { inApp: true }),
  accountDeleted: account("store › deleteAccount (email only – the account is gone)", "account", "/"),
} satisfies Record<string, CatalogEntry>;

export type CatalogId = keyof typeof NOTIFY_CATALOG;
export const CATALOG_IDS = Object.keys(NOTIFY_CATALOG) as CatalogId[];

/**
 * Which catalogue entry each in-app line (messages.notify.<key>) belongs to – the store's reducer writes the detailed line, the entry
 * decides channels, category and the email.
 */
export const EVENT_OF: Record<NotifyEventKey, CatalogId> = {
  newRequest: "requestReceived",
  waitlistRequest: "requestReceived",
  requestWithdrawn: "requestReceived",
  reminderPendingRequests: "hostReminder",
  deadlineHostReminder: "hostReminder",
  deadlineHostLastDay: "hostReminder",
  guestRemindedHost: "hostReminder",
  reminderBookingUpload: "hostReminder",
  crewInvite: "invited",
  houseInvite: "invited",
  inviteAccepted: "invited",
  declined: "requestDeclined",
  waitlistRemoved: "requestDeclined",
  requestExpired: "requestExpired",
  deadlineRequestExpired: "requestExpired",
  waitlistOfferExpired: "requestExpired",
  accepted: "requestAccepted",
  waitlistAccepted: "requestAccepted",
  waitlistOffer: "requestAccepted",
  waitlistMovedUp: "requestAccepted",
  waitlistTookSpot: "requestAccepted",
  crewFull: "houseMilestone",
  reminderArrival: "houseMilestone",
  locked: "paymentDue",
  paymentDue: "paymentDue",
  paid: "paid",
  reminderPayDue: "paymentReminder",
  reminderPayToday: "paymentReminder",
  deadlinePayReminder: "paymentReminder",
  deadlinePayLastHours: "paymentReminder",
  hostRemindedGuest: "paymentReminder",
  paymentLapsed: "paymentLapsed",
  deadlineYourPaymentLapsed: "paymentLapsed",
  bookingConfirmed: "bookingConfirmed",
  houseCancelled: "cancelled",
  left: "cancelled",
  bookingRefunded: "refund",
  leftRefund: "refund",
  newMessage: "chatMessage",
  hostOpened: "newHouse",
  searchOpened: "newHouse",
  reminderSavedSoon: "newHouse",
  doItAgain: "doItAgain",
  systemWelcome: "welcome",
  systemVerify: "profileTips",
  systemPhoto: "profileTips",
  supportReply: "supportReply",
  reportReceived: "reportReceived",
  reportActioned: "reportDecided",
  reportUnfounded: "reportDecided",
  accountWarning: "decision",
  removedModeration: "decision",
  accountSuspended: "decision",
  houseTakenDown: "decision",
  photoTakenDown: "decision",
  appealUpheld: "decision",
  appealReversed: "decision",
  friendSpotsExpired: "friendSpots",
  removedByHost: "guestRemoved",
  removedByHostReason: "guestRemoved",
  requestSent: "requestSent",
  termsUpdated: "termsUpdate",
  accountPaused: "accountPaused",
  waitlistOpen: "waitlistOpen",
  friendSpotExpiredForYou: "friendSpots",
};

/** The arc's steps that email (config/arc.ts) – each to its catalogue entry; the rest are "arcStep". */
export const ARC_STEP_EVENT: Partial<Record<string, CatalogId>> = { again: "dayAfter", albumReady: "albumReady", doItAgain: "doItAgain", thirtyDays: "thirtyDays", chosen: "yourPeople", anniversary: "anniversary" };

/**
 * How email and push are delivered: "mock" (console + Dev menu log) until the backend sends for real – then "resend" / "fcm". Admin › System
 * › Launch reads it ("E-Mail-Versand aktiv", "Push aktiv"). TODO(backend): switch when the senders exist.
 */
export const DELIVERY: { email: "mock" | "resend"; push: "mock" | "fcm" } = { email: "mock", push: "mock" };

/** The daily bundle goes out at this local hour (the server's job later), with everything collected that day. */
export const DAILY_BUNDLE_HOUR = 18;

/** A chat message is emailed only if it's still unread this long after it arrived. */
export const CHAT_EMAIL_AFTER_MINUTES = 60;

/**
 * The switchable groups in Settings' order (CLAUDE.md "Settings › Notifications"), with the channels they have at all (news has no push):
 *   messages – chat messages · arc – House tips (the arc's Simpulo cards in the House chat = in-app, and their emails) · people – Your people
 *   (prepared: nothing sends yet) · nearby – new Houses for your searches · news – product news (off by default)
 * "Requests & bookings" (bookings) isn't here: always on – money and deadlines.
 */
export const OPTIONAL_CATEGORIES: ReadonlyArray<{ key: OptionalCategory; push: boolean; email: boolean; inApp: boolean }> = [
  { key: "messages", push: true, email: true, inApp: true },
  { key: "arc", push: true, email: true, inApp: true },
  { key: "people", push: true, email: true, inApp: true },
  { key: "nearby", push: true, email: true, inApp: true },
  { key: "news", push: false, email: true, inApp: true },
];

export type NotificationPrefs = Record<OptionalCategory, { push: boolean; email: boolean; inApp: boolean }>;

/** Everyone starts here: chat by push (email only if asked), House tips in the app and by email, your people and searches by push, news off. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: { push: true, email: false, inApp: true },
  arc: { push: false, email: true, inApp: true },
  people: { push: true, email: false, inApp: true },
  nearby: { push: true, email: true, inApp: true },
  news: { push: false, email: false, inApp: false },
};

/** Quiet hours (Settings › Notifications): push waits until they end, in the device's local time; email and the app aren't held. */
export interface QuietHours {
  on: boolean;
  /** "HH:MM" local */
  from: string;
  to: string;
}
export const DEFAULT_QUIET_HOURS: QuietHours = { on: false, from: "22:00", to: "08:00" };

/** Is this moment (local "HH:MM") inside the quiet hours? Spans midnight when from > to (22:00–08:00). */
export function inQuietHours(quiet: QuietHours | undefined, hhmm: string): boolean {
  if (!quiet?.on) return false;
  return quiet.from <= quiet.to ? hhmm >= quiet.from && hhmm < quiet.to : hhmm >= quiet.from || hhmm < quiet.to;
}
