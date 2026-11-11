// Cancellation rules – the one place they're decided. The texts (messages "policy") are a DRAFT: legal review still open.
// Shown in full on /cancellation, in short in the pay sheet and on the House page; the store follows the same rules.
/**
 * The clocks of joining (lib/joinFlow.ts uses these): a member whose share is due has this many hours to pay; after everyone paid, the
 * host confirms the booking within this many hours, otherwise everything is refunded.
 */
export const PAYMENT_POLICY = {
  paymentWindowHours: 48,
  hostBookingWindowHours: 48,
} as const;

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
  bookingWindowHours: PAYMENT_POLICY.hostBookingWindowHours,
} as const;

/**
 * The fee model – the one source for every text and number about money (lib/fees.ts computes with it, How it works and the FAQ quote it).
 * Everyone in the crew, the host too, pays the same share of the place; guests also pay Simpulo's service fee, shown as its own line. The
 * host receives the guests' full shares. An optional host fee exists only as a setting in Open a House (off by default) and is never
 * advertised.
 */
export const FEE_MODEL = {
  serviceFeePercent: 10,
  /** On the rent (the crew's shares the host passes on): nothing – the host receives the guests' full shares */
  hostCommissionPercent: 0,
  /** On a host fee (coaching, a program, guiding – the host's real income): Simpulo keeps this much */
  hostFeeCommissionPercent: 10,
} as const;

/** What Simpulo takes from a host's payout: nothing on the rent, FEE_MODEL.hostFeeCommissionPercent of a host fee. */
export const HOST_FEES = {
  onStayShare: FEE_MODEL.hostCommissionPercent / 100,
  onHostExperience: FEE_MODEL.hostFeeCommissionPercent / 100,
} as const;

/**
 * Host types (Payouts): a pro host has at least one House with a host fee (hostFeePerPerson > 0) – their earnings are the host fees after
 * Simpulo's cut; everyone else is a share host, who only passes the crew's rent on. Top Host: this many full Houses hosted in a calendar
 * year and answering at least this share of requests (lib/requests.ts responseRate).
 */
export const HOST_POLICY = {
  topHostFullHouses: 5,
  topHostResponseRate: 0.9,
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

/**
 * Several Houses at once. Allowed: any number of requests at the same time (overlapping too), any number of Houses one after another, and
 * several hosted Houses. A guest can be in only one House per night: a request overlapping a paid House shows a calm note ("You're already
 * in Surf Bali on these dates") and still goes out; paying for the second is blocked ("Cancel Surf Bali first"). Two acceptances, both
 * unpaid, that overlap: a task "Pick one" – keeping one gives the other spot up (to the waitlist, or open again). A host may host
 * overlapping Houses (a note says so).
 */
export const PARALLEL_POLICY = {
  maxOpenRequests: Number.POSITIVE_INFINITY,
  maxHostedHouses: Number.POSITIVE_INFINITY,
  /** Paying for a House that overlaps one already paid for */
  payOverlappingPaid: false,
  /** Hosting Houses whose dates overlap */
  hostOverlapping: true,
} as const;


/**
 * Direct messages: a direct chat only ever starts from a House – a guest's "Message host" on the public House page, or the host from a
 * request or an invite. Never from a profile, no search for people. Every direct chat belongs to one House (houseId). Once the person is in
 * the House, the chat points to the House chat (it stays readable). Blocking closes it, and the blocked person can't request the House.
 * Without a new message for this many days a direct chat goes to "Past".
 */
export const DIRECT_MESSAGE_POLICY = {
  archiveAfterDays: 30,
} as const;
