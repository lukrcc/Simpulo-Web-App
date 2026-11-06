// Cancellation rules – the one place they're decided. The texts (messages "policy") are a DRAFT: legal review still open.
// Shown in full on /cancellation, in short in the pay sheet and on the House page; the store follows the same rules.
import { BOOKING_WINDOW_HOURS } from "@/lib/joinFlow";

export const CANCELLATION_POLICY = {
  /** Draft until the legal review: the page says so. */
  draft: true,
  /** Until the crew is complete: a request or a spot can be withdrawn any time, for free (nothing is paid before). */
  freeUntil: "crew_complete",
  /** After paying: out only by handing the spot to someone on the waitlist – back is everything but Simpulo's fee. */
  afterPayment: "transfer_only",
  /** After paying, with nobody waiting to take the spot: no refund. */
  afterPaymentWithoutTransfer: "no_refund",
  /** The host cancels, or doesn't confirm the booking within this many hours after everyone paid: everything back. */
  hostCancelsOrNoBooking: "full_refund",
  bookingWindowHours: BOOKING_WINDOW_HOURS,
} as const;

/** Rule keys in reading order (messages policy.rules.*). */
export const POLICY_RULES = ["beforeComplete", "afterPayment", "withoutTransfer", "hostCancels"] as const;
