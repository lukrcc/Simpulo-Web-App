import type { NotifyCategory } from "@/config/notifications";
import { NotifyEvent } from "@/lib/notify/events";

/** The one button of each kind of email. */
export const EMAIL_ACTION: Record<NotifyEvent, { label: string; path: string }> = {
  [NotifyEvent.RequestReceived]: { label: "See the request", path: "/your-houses" },
  [NotifyEvent.RequestAnswered]: { label: "See similar Houses", path: "/your-houses" },
  [NotifyEvent.Accepted]: { label: "Open your House", path: "/your-houses" },
  [NotifyEvent.PaymentDue]: { label: "Pay your share", path: "/your-houses" },
  [NotifyEvent.PaymentReminder]: { label: "Pay your share", path: "/your-houses" },
  [NotifyEvent.BookingConfirmed]: { label: "See your House", path: "/your-houses" },
  [NotifyEvent.BookingCancelled]: { label: "See what happens next", path: "/your-houses" },
  [NotifyEvent.RefundIssued]: { label: "See your refund", path: "/settings#payments" },
  [NotifyEvent.ChatMessage]: { label: "Reply", path: "/messages" },
  [NotifyEvent.HouseNearby]: { label: "See the House", path: "/explore" },
  [NotifyEvent.SimpuloNews]: { label: "Open Simpulo", path: "/" },
  [NotifyEvent.SupportReply]: { label: "Open Simpulo", path: "/" },
};

/** Groups you can switch off get an unsubscribe link (signed token from the backend later); bookings & payments don't. */
export function unsubscribeHref(category: NotifyCategory): string | undefined {
  return category === "bookings" ? undefined : `/settings?unsubscribe=${category}#notifications`;
}
