import { tEn } from "@/lib/i18n/translate";
import type { NotifyCategory } from "@/config/notifications";
import { NotifyEvent } from "@/lib/notify/events";

/** The one button of each kind of email. */
export const EMAIL_ACTION: Record<NotifyEvent, { label: string; path: string }> = {
  [NotifyEvent.RequestReceived]: { label: tEn("emails.actions.requestReceived"), path: "/your-houses" },
  [NotifyEvent.RequestAnswered]: { label: tEn("emails.actions.requestAnswered"), path: "/your-houses" },
  [NotifyEvent.Accepted]: { label: tEn("emails.actions.accepted"), path: "/your-houses" },
  [NotifyEvent.PaymentDue]: { label: tEn("emails.actions.paymentDue"), path: "/your-houses" },
  [NotifyEvent.PaymentReminder]: { label: tEn("emails.actions.paymentReminder"), path: "/your-houses" },
  [NotifyEvent.BookingConfirmed]: { label: tEn("emails.actions.bookingConfirmed"), path: "/your-houses" },
  [NotifyEvent.BookingCancelled]: { label: tEn("emails.actions.bookingCancelled"), path: "/your-houses" },
  [NotifyEvent.RefundIssued]: { label: tEn("emails.actions.refundIssued"), path: "/settings#payments" },
  [NotifyEvent.HouseArc]: { label: tEn("emails.actions.houseArc"), path: "/your-houses" },
  [NotifyEvent.ChatMessage]: { label: tEn("emails.actions.chatMessage"), path: "/messages" },
  [NotifyEvent.HouseNearby]: { label: tEn("emails.actions.houseNearby"), path: "/explore" },
  [NotifyEvent.SimpuloNews]: { label: tEn("emails.actions.simpuloNews"), path: "/" },
  [NotifyEvent.SupportReply]: { label: tEn("emails.actions.supportReply"), path: "/" },
};

/** Groups you can switch off get an unsubscribe link (signed token from the backend later); bookings & payments don't. */
export function unsubscribeHref(category: NotifyCategory): string | undefined {
  return category === "bookings" ? undefined : `/settings?unsubscribe=${category}#notifications`;
}
