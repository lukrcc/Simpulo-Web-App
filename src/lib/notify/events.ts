import type { NotifyEventKey } from "@/lib/data/notifications";

/**
 * The eleven kinds of notification. They decide the channels (config/notifications.ts); the detailed text of each one is its
 * NotifyEventKey ("waitlistOffer", "reminderPayToday" …), translated under messages.notify.
 */
export enum NotifyEvent {
  RequestReceived = "request_received",
  RequestAnswered = "request_answered",
  Accepted = "accepted",
  PaymentDue = "payment_due",
  PaymentReminder = "payment_reminder",
  BookingConfirmed = "booking_confirmed",
  BookingCancelled = "booking_cancelled",
  RefundIssued = "refund_issued",
  ChatMessage = "chat_message",
  HouseNearby = "house_nearby",
  SimpuloNews = "simpulo_news",
  /** An answer to "Help & feedback" (Admin › Support) */
  SupportReply = "support_reply",
}

/** Which kind each detailed notification is. */
export const EVENT_OF: Record<NotifyEventKey, NotifyEvent> = {
  newRequest: NotifyEvent.RequestReceived,
  waitlistRequest: NotifyEvent.RequestReceived,
  reminderPendingRequests: NotifyEvent.RequestReceived,
  requestWithdrawn: NotifyEvent.RequestReceived,
  crewInvite: NotifyEvent.RequestReceived,
  houseInvite: NotifyEvent.RequestReceived,
  declined: NotifyEvent.RequestAnswered,
  requestExpired: NotifyEvent.RequestAnswered,
  waitlistRemoved: NotifyEvent.RequestAnswered,
  waitlistOfferExpired: NotifyEvent.RequestAnswered,
  accepted: NotifyEvent.Accepted,
  waitlistAccepted: NotifyEvent.Accepted,
  waitlistOffer: NotifyEvent.Accepted,
  waitlistMovedUp: NotifyEvent.Accepted,
  waitlistTookSpot: NotifyEvent.Accepted,
  inviteAccepted: NotifyEvent.Accepted,
  crewFull: NotifyEvent.Accepted,
  locked: NotifyEvent.PaymentDue,
  paymentDue: NotifyEvent.PaymentDue,
  paid: NotifyEvent.PaymentDue,
  reminderPayDue: NotifyEvent.PaymentReminder,
  reminderPayToday: NotifyEvent.PaymentReminder,
  reminderBookingUpload: NotifyEvent.PaymentReminder,
  bookingConfirmed: NotifyEvent.BookingConfirmed,
  reminderArrival: NotifyEvent.BookingConfirmed,
  houseCancelled: NotifyEvent.BookingCancelled,
  paymentLapsed: NotifyEvent.BookingCancelled,
  left: NotifyEvent.BookingCancelled,
  bookingRefunded: NotifyEvent.RefundIssued,
  leftRefund: NotifyEvent.RefundIssued,
  newMessage: NotifyEvent.ChatMessage,
  hostOpened: NotifyEvent.HouseNearby,
  searchOpened: NotifyEvent.HouseNearby,
  reminderSavedSoon: NotifyEvent.HouseNearby,
  doItAgain: NotifyEvent.SimpuloNews,
  systemWelcome: NotifyEvent.SimpuloNews,
  systemVerify: NotifyEvent.SimpuloNews,
  systemPhoto: NotifyEvent.SimpuloNews,
  supportReply: NotifyEvent.SupportReply,
};
