// Cancellation rules – the one place they're decided. The texts (messages "policy") are a DRAFT: legal review still open.
// Shown in full on /cancellation, in short in the pay sheet and on the House page; the store follows the same rules.
import { PLATFORM_COMMISSION_RATE } from "@/lib/fees";
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

/**
 * What Simpulo takes from a host's payout: nothing from the stay share; 10 % of a host experience (lib/fees.ts). A House without a host
 * experience therefore pays the host the whole share – Earnings shows the fee as "Free" with that reason.
 */
export const HOST_FEES = {
  onStayShare: 0,
  onHostExperience: PLATFORM_COMMISSION_RATE,
} as const;

/**
 * Requests: an open request expires after 48 hours; requested → accepted | declined | expired. The guest sees declined and expired the same
 * ("Didn't work out"). A host who lets too many expire (under 70 % answered, last 90 days) gets a nudge and sits a little lower in recommended
 * orders – never shown publicly.
 */
export const REQUEST_POLICY = {
  requestExpiryHours: 48,
  /** Under this many hours left the countdown turns ink */
  urgentHours: 12,
  responseWindowDays: 90,
  responseRateBar: 0.7,
} as const;

/** Rule keys in reading order (messages policy.rules.*). */
export const POLICY_RULES = ["beforeComplete", "afterPayment", "withoutTransfer", "hostCancels"] as const;
