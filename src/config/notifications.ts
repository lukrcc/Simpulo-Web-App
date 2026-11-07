// Which channel each kind of notification takes – the one place for it. lib/notify routes by it; Settings shows the switches from it.
import { NotifyEvent } from "@/lib/notify/events";

/** The groups in Settings: "bookings" can't be switched off (money and deadlines), the others have a Push and an Email switch. */
export type NotifyCategory = "bookings" | "messages" | "nearby" | "news";
export type OptionalCategory = Exclude<NotifyCategory, "bookings">;

/**
 * When an email goes out:
 * - instant: right away
 * - unreadAfter: only if still unread after CHAT_EMAIL_AFTER_MINUTES, several collected into one email
 * - weekly: in the weekly summary
 * - optIn: right away, but only when switched on (off by default)
 */
export type EmailTiming = "instant" | "unreadAfter" | "weekly" | "optIn";

export interface ChannelRule {
  category: NotifyCategory;
  /** Push right away (Firebase Cloud Messaging later); false = never */
  push: boolean;
  /** null = never by email */
  email: EmailTiming | null;
}

/** In-app (Messages › Updates) always; the rest by this table. */
export const CHANNELS: Record<NotifyEvent, ChannelRule> = {
  // Money and deadlines: in-app + push + email, can't be switched off.
  [NotifyEvent.RequestReceived]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.RequestAnswered]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.Accepted]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.PaymentDue]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.PaymentReminder]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.BookingConfirmed]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.BookingCancelled]: { category: "bookings", push: true, email: "instant" },
  [NotifyEvent.RefundIssued]: { category: "bookings", push: true, email: "instant" },
  // Chat: push right away; email only if still unread after an hour, collected.
  [NotifyEvent.ChatMessage]: { category: "messages", push: true, email: "unreadAfter" },
  // New Houses near a search: push; email as the weekly summary.
  [NotifyEvent.HouseNearby]: { category: "nearby", push: true, email: "weekly" },
  // News from Simpulo: in-app; email only with opt-in; never push.
  [NotifyEvent.SimpuloNews]: { category: "news", push: false, email: "optIn" },
};

/** A chat message is emailed only if it's still unread this long after it arrived. */
export const CHAT_EMAIL_AFTER_MINUTES = 60;

/** The switchable groups in Settings' order, with the channels they have at all (news has no push). */
export const OPTIONAL_CATEGORIES: ReadonlyArray<{ key: OptionalCategory; push: boolean; email: boolean }> = [
  { key: "messages", push: true, email: true },
  { key: "nearby", push: true, email: true },
  { key: "news", push: false, email: true },
];

export type NotificationPrefs = Record<OptionalCategory, { push: boolean; email: boolean }>;

/** Everyone starts here: chat and nearby on, Simpulo's news off (opt-in). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: { push: true, email: true },
  nearby: { push: true, email: true },
  news: { push: false, email: false },
};
