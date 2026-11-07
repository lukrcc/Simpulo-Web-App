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

/**
 * The fee model – the one source for every text and number about money (lib/fees.ts computes with it, How it works and the FAQ quote it).
 * Everyone in the crew, the host too, pays the same share of the place; guests also pay Simpulo's service fee, shown as its own line. The
 * host receives the guests' full shares. An optional host fee exists only as a setting in Open a House (off by default) and is never
 * advertised.
 */
export const FEE_MODEL = {
  serviceFeePercent: 10,
  hostCommissionPercent: 0,
} as const;

/** What Simpulo takes from a host's payout: nothing (FEE_MODEL). Payouts shows the fee column as "Free". */
export const HOST_FEES = {
  onStayShare: 0,
  onHostExperience: FEE_MODEL.hostCommissionPercent / 100,
} as const;

/** How it works' one worked example: a villa, 7 nights, 4 people. */
export const STAY_EXAMPLE = { place: "Villa", total: 1260, nights: 7, people: 4 } as const;

/** The example's numbers: everyone's equal share, and the service fee a guest adds to it. */
export function stayExample() {
  const share = STAY_EXAMPLE.total / STAY_EXAMPLE.people;
  return { ...STAY_EXAMPLE, share: Math.round(share), serviceFee: Math.round((share * FEE_MODEL.serviceFeePercent) / 100) };
}

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
