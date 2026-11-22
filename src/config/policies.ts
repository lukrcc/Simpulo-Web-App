// Cancellation rules – the one place they're decided. The full text is content/legal/cancellation.en.md (a draft until the legal review,
// its header says so); in short in the pay sheet and on the House page; the store follows the same rules.
/**
 * The clocks of joining (lib/joinFlow.ts uses these): a member whose share is due has this many hours to pay; after everyone paid, the
 * host confirms the booking within this many hours, otherwise everything is refunded.
 */
export const PAYMENT_POLICY = {
  /** The hours to pay once the crew is complete – DEADLINES.payment's lapse step reads it */
  paymentWindowHours: 48,
  hostBookingWindowHours: 48,
} as const;

/** "Spots for friends" and invite links: a spot is held this many hours (DEADLINES.invite and INVITE_POLICY read it). */
const INVITE_HOLD_HOURS = 48;
/** Saved searches hear about a new House first: for this many hours only they see it on Explore (config/explore.ts re-exports it). */
export const SEARCH_HEAD_START_HOURS = 48;

export const CANCELLATION_POLICY = {
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
  /**
   * The service fee per guest and booking is at least this much (EUR, converted into the House's currency) – it applies when the percent
   * is lower (a short or cheap House). lib/fees.ts guestFee.
   */
  minServiceFeeEur: 5,
  /** A cap per guest and booking (EUR) – prepared, off: while `enabled` is false the percent has no ceiling. */
  serviceFeeCap: { enabled: false, eur: 150 },
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

/**
 * A Pro host's example (/host's numbers strip): a host fee per guest for leading the programme. An example value for the page – the
 * founders set the one they want to show; the rest is computed from STAY_EXAMPLE and FEE_MODEL.
 */
export const HOST_FEE_EXAMPLE = { perGuest: 100 } as const;

/** /host: the Pro example – the guests (the crew without the host), the host fee in all, what Simpulo keeps of it, what the host earns. */
export function hostFeeExample() {
  const guests = STAY_EXAMPLE.people - 1;
  const total = HOST_FEE_EXAMPLE.perGuest * guests;
  const kept = Math.round((total * FEE_MODEL.hostFeeCommissionPercent) / 100);
  return { perGuest: HOST_FEE_EXAMPLE.perGuest, guests, total, kept, earned: total - kept, percent: FEE_MODEL.hostFeeCommissionPercent };
}

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
/**
 * Every deadline of a request and of a payment – one place (CLAUDE.md "Fristen"). lib/deadlines.ts computes from these which steps are due
 * (today in the browser's clock with the Dev menu's time shift, later 1:1 as a Cloud Function every hour). Each step: after how many hours
 * (a request: since it was sent; a payment: since its 48-hour window opened), who hears it, and the text key of the notice (the words are in
 * lib/i18n/en.ts messages.notify.<notice> – the i18n rule). These notices are about money and deadlines: the arc's "one Simpulo card a
 * day" doesn't hold for them, but several for one person on one day become one (bundled, `count`).
 */
export const DEADLINES = {
  request: [
    /** A day without an answer: the host is reminded */
    { id: "hostReminder", afterHours: 24, to: "host", notice: "deadlineHostReminder" },
    /** Two days: the second (last) reminder */
    { id: "hostReminderLast", afterHours: 48, to: "host", notice: "deadlineHostLastDay" },
    /** 60 hours: the House shows in Admin › Houses "Braucht Hilfe" (no notice to anyone) */
    { id: "needsHelp", afterHours: 60, to: "admin", notice: null },
    /** Three days: the request runs out – the guest hears "didn't work out" and sees three similar Houses */
    { id: "expire", afterHours: 72, to: "guest", notice: "deadlineRequestExpired" },
  ],
  payment: [
    /** A day into the 48 hours: the guest is reminded */
    { id: "payReminder", afterHours: 24, to: "guest", notice: "deadlinePayReminder" },
    /** Four hours left */
    { id: "payReminderLast", afterHours: PAYMENT_POLICY.paymentWindowHours - 4, to: "guest", notice: "deadlinePayLastHours" },
    /** The window is over: the spot is free again – the guest hears it, the host and crew too (store settlePayments) */
    { id: "lapse", afterHours: PAYMENT_POLICY.paymentWindowHours, to: "guest", notice: "deadlineYourPaymentLapsed" },
  ],
  /**
   * "Spots for friends" (a member's or the host's invite link, HouseInvite.spots): the spots are held 48 hours (INVITE_POLICY.inviteHoldHours);
   * then they're free again – the one who saved them hears it ("guest" here = the inviter), and so does every signed-in friend who opened the
   * link (HouseInvite.openedBy).
   */
  invite: [{ id: "inviteExpire", afterHours: INVITE_HOLD_HOURS, to: "guest", notice: "friendSpotsExpired" }],
} as const satisfies Record<"request" | "payment" | "invite", readonly { id: string; afterHours: number; to: "host" | "guest" | "admin"; notice: string | null }[]>;
export type DeadlineFlow = keyof typeof DEADLINES;
export type DeadlineStepId = (typeof DEADLINES)[DeadlineFlow][number]["id"];

/** "Remind" by hand: the guest the host once per request (from 24 hours on), the host a guest once per payment. Then the button rests. */
/** A full House's waitlist: a free spot goes to the first waiting person as an offer for this many hours (lib/waitlist.ts). */
export const WAITLIST_POLICY = { offerHours: 24 } as const;

/**
 * Hosts' tax details, prepared for the platform's later reporting duties (DAC7 in the EU; CLAUDE.md "Plattform-Pflichten"): off until Lukas
 * and the lawyer switch it on. Asked only from this threshold on – DAC7 leaves out sellers with fewer than 30 activities AND at most €2,000
 * in a year (to be confirmed with the lawyer); a host who reaches either is asked in Settings › Payments & payouts. Stored for Admin only.
 */
export const HOST_TAX_INFO = {
  enabled: false,
  /** Paid shares received in the calendar year */
  minActivities: 30,
  /** Received in the calendar year, in EUR */
  minPayoutEur: 2000,
} as const;

/**
 * Founding Hosts (CLAUDE.md "Founding Host"): the first this-many hosts whose application was accepted carry the badge – on their profile,
 * their House cards (beside the host notch) and House page ("One of the first 50 hosts on Simpulo"). Numbered in order of acceptance
 * (User.foundingHostNo); later accepted hosts can open Houses all the same, without the badge.
 */
export const FOUNDING_HOST = { limit: 50 } as const;

/**
 * Host brings host (CLAUDE.md "Host wirbt Host") – prepared, off. A host's own link (/host?ref={id}&src=hostref) marks a new host as
 * "brought by" (HostApplication.referredBy → User.hostReferredBy). The share and how long it runs are still open (null: to be decided by
 * Lukas); it would be paid only after the brought host's first paid stay, and only one level (a host brought by a brought host earns the
 * first nothing).
 */
export const HOST_REFERRAL = {
  enabled: false,
  /** Of Simpulo's fees on the brought host's Houses, in percent – open */
  sharePercent: null as number | null,
  /** For how many months after the brought host's first paid stay – open */
  months: null as number | null,
} as const;

/** Everyone on Simpulo is at least this old (asked at the first request, lib/birthDate.ts; the terms say so). */
export const MIN_AGE = 18;

/** Reports (components/safety/ReportSheet.tsx): Simpulo looks at every report within this many hours – the sheet and /safety say so. */
export const REPORT_POLICY = { reviewHours: 24 } as const;

/** "Something went wrong" (the House's help): from this many days before the first day until this many after the last (components/help/HelpSheet.tsx). */
export const HELP_WINDOW = { daysBefore: 3, daysAfter: 2 } as const;

export const MANUAL_REMINDERS = {
  guestToHost: { afterHours: 24, perRequest: 1, notice: "guestRemindedHost" },
  hostToGuest: { perPayment: 1, notice: "hostRemindedGuest" },
} as const;

export const REQUEST_POLICY = {
  /** When an open request runs out – the last step of DEADLINES.request */
  requestExpiryHours: DEADLINES.request.find((s) => s.id === "expire")!.afterHours,
  /** Under this many hours left the countdown turns ink */
  urgentHours: 12,
  responseWindowDays: 90,
  responseRateBar: 0.7,
} as const;


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

/**
 * Bringing people into a House (components/InviteSheet.tsx, lib/invites.ts): an invite – a link (/i/{code}) or a person picked in the
 * sheet – holds a spot this many hours. Invites to people who aren't Your people, aren't saved and didn't say they're in for it: at most
 * this many a day. Whoever is invited can say "Don't invite me again" (to that person). No friend list, no followers, no requests.
 */
/**
 * Admin › Houses › Sichtbarkeit ("Im Explore hervorheben"): a House that needs help moves up in Explore's default order for a while – as if it
 * started `rankShiftDays` earlier (lib/houseHelp.ts). At most `maxConcurrent` Houses at once, each for `days`.
 */
export const HIGHLIGHT_POLICY = { days: 7, maxConcurrent: 3, rankShiftDays: 21 } as const;

/**
 * Admin › Houses › Nachfrage ("Passende Leute benachrichtigen"): at most `perPersonPerDay` such message per person and day, and only to people
 * who said yes – a confirmed waitlist sign-up, or an account whose "New Houses for your searches" is on (push or email).
 */
export const NUDGE_POLICY = { perPersonPerDay: 1 } as const;

export const INVITE_POLICY = {
  inviteHoldHours: INVITE_HOLD_HOURS,
  inviteNonConnectionsPerDay: 5,
  /** "Spots for friends": one link holds 1 to this many spots (never more than are open) */
  maxSpotsPerLink: 3,
} as const;

/** "I'm in for …" (lib/inFor.ts): at most this many running at once per person; each runs out after its last month. */
export const IN_FOR_POLICY = {
  maxActive: 3,
} as const;

/**
 * Every deadline a text names, in hours – the one place texts read them from (lib/i18n/en.ts fills them in; nothing writes "48h" by hand).
 * Each one is the value its rule above decides.
 */
export const DEADLINE_HOURS = {
  /** A request runs out (DEADLINES.request "expire") */
  request: DEADLINES.request.find((s) => s.id === "expire")!.afterHours,
  /** The window to pay once the crew is complete */
  payment: PAYMENT_POLICY.paymentWindowHours,
  /** The host books and uploads the confirmation after everyone paid */
  booking: PAYMENT_POLICY.hostBookingWindowHours,
  /** An invite link / spots for friends hold a spot */
  invite: INVITE_HOLD_HOURS,
  /** A waitlist offer */
  waitlistOffer: WAITLIST_POLICY.offerHours,
  /** Simpulo looks at a report */
  reportReview: REPORT_POLICY.reviewHours,
  /** Saved searches hear first */
  searchHeadStart: SEARCH_HEAD_START_HOURS,
} as const;

/**
 * The reminders of lib/reminders.ts (Dev menu "Reminders", "Do it again" in the store) – their timings from the rules above where one decides
 * it, the rest here. Nothing in lib/reminders.ts is a number of its own.
 */
export const REMINDER_TIMING = {
  /** Before the payment window closes: the first reminder (= the window minus DEADLINES.payment "payReminder") */
  payDueHoursBefore: PAYMENT_POLICY.paymentWindowHours - DEADLINES.payment.find((s) => s.id === "payReminder")!.afterHours,
  /** …and the last call (= the window minus "payReminderLast") */
  payLastCallHoursBefore: PAYMENT_POLICY.paymentWindowHours - DEADLINES.payment.find((s) => s.id === "payReminderLast")!.afterHours,
  /** After everyone paid: the host is reminded to upload the booking halfway through the booking window */
  bookingUploadAfterHours: PAYMENT_POLICY.hostBookingWindowHours / 2,
  /** Open requests: the host's last reminder (DEADLINES.request "hostReminderLast") */
  requestAnswerHours: DEADLINES.request.find((s) => s.id === "hostReminderLast")!.afterHours,
  arrivalDaysBefore: 3,
  savedWindowDays: 60,
  savedDaysBefore: 14,
  /** Host alerts: Houses an alerted host opened within this window */
  hostAlertWindowDays: 30,
  /** "Want to do it again?": this long after a House ended, to everyone in its crew */
  doItAgainDaysAfter: 2,
} as const;

/**
 * The move (Admin › Übersicht, under Gewinn): calendar months in a row with a profit of at least `profitPerMonth`; from `planFrom` months
 * the move is planned ("Planen ✓"), from `moveFrom` months it happens. Counted in calendar months, whatever period the overview shows.
 */
export const MOVE_STREAK = { profitPerMonth: 5000, planFrom: 3, moveFrom: 6 } as const;

/**
 * The overview's targets (Admin › Übersicht), monthly – scaled to the chosen period (config/admin.ts PERIOD_MONTHS: a week ≈ 10 full Houses,
 * a month 44): full Houses (not the launch criterion of 50 real Houses) and what Simpulo earns from a paid booking (the guest's service fee).
 */
export const OVERVIEW_GOALS = { fullHousesPerMonth: 44, perBookingGuest: 30 } as const;

/**
 * How long a House is at least (Regel „Mindestens eine Nacht“): living together means at least one night under one roof – no Houses without
 * a night (Day House, Nearby, City Circle are parked). Open a House, editing and the store check it (create/model.ts, lib/store.tsx).
 */
export const STAY_POLICY = { minNights: 1 } as const;
