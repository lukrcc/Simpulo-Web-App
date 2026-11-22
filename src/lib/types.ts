// Domain types live next to the mock data in ./mock.ts (the data contract). App-only types are added here.
import type { HouseSpace } from "@/config/space";
import type { Currency, HostTier, Stay, Thread, Vibe } from "./mock";

export type {
  AccommodationStatus,
  ArcArrival,
  ArcAfter,
  ArcThirty,
  ArcIntention,
  HouseMemory,
  HostHelpItem,
  StayPractical,
  Attribution,
  Currency,
  JoinRequest,
  LockDetails,
  Message,
  MessageEvent,
  MessageType,
  Attachment,
  Crew,
  LivedWith,
  TypicalDayStop,
  CrewVote,
  VoteKind,
  VoteOption,
  HouseInvite,
  HouseInviteStatus,
  Reaction,
  Report,
  ModerationNotice,
  ProgramItem,
  HostBusiness,
  HouseVibe,
  HostTier,
  ReportReason,
  ReportOutcome,
  NotificationGroup,
  Payment,
  SocialLink,
  SocialPlatform,
  PaymentRecordStatus,
  SystemEventKey,
  RequestStatus as JoinRequestStatus,
  Stay,
  StayClaim,
  StayStatus,
  Thread,
  User,
  UserSettings,
  ConsentRecord,
  Vibe,
} from "./mock";

/** The platform's phase (config/platform.ts): before the launch, the founding hosts' beta, live. In dev the Dev menu's "Phase" picks it
 *  (and the mock data set that goes with it). */
export type PlatformPhase = "prelaunch" | "beta" | "live";

export type PaymentStatus = "paid" | "pending";

export type ThreadType = Thread["type"];

export type NewStayInput = Pick<
  Stay,
  | "title"
  | "city"
  | "region"
  | "startDate"
  | "endDate"
  | "spotsTotal"
  | "vibe"
  | "language"
  | "pricePerPerson"
  | "budgetPerPerson"
  | "accommodationLink"
  | "crewGroupUrl"
  | "accommodationStatus"
  | "description"
  | "whyText"
  | "dayText"
  | "lookingForText"
  | "interests"
  | "houseRules"
  | "hostNote"
> & Partial<Pick<Stay, "waitlistMax" | "friendSpotsMax" | "verifiedGuestsOnly" | "accommodationPhoto" | "currency" | "customVibe" | "hostFeePerPerson" | "accommodationVote" | "datesVote" | "datesOpen" | "languages" | "photos" | "totalPrice" | "who" | "audience" | "ageRange" | "accommodationType" | "space" | "depth" | "placeId">>;

/**
 * "Host from your place": a place the host lives in and saved (Your houses › Your places). Each House opened from it is a "window" in
 * the host's rental period (`Stay.placeId`); the host lives there and counts as one of the crew, so a window has at most `freeSpots` + 1
 * people. Saved only with `allowedToHost` (the host's own statement – Simpulo checks nothing). Data points place.* (config/data-points.ts).
 */
export interface Place {
  id: string;
  ownerId: string;
  /** "Apartment in Barceloneta" – only the host sees it */
  name: string;
  /** The kind of place: a type id from config/accommodation.ts ("large-apartment", "villa") */
  accommodationType: string;
  photos: string[];
  /** All rooms, the host's own included */
  rooms: number;
  /** Rooms guests can have – a window's crew is at most this + the host */
  freeSpots: number;
  /** One rule per entry */
  rules: string[];
  /** City and region as Open a House stores them on a House; the street only for the host (shared with the crew after booking, later) */
  address: { city: string; region: string; street?: string };
  /** The host's rental period (YYYY-MM-DD): windows lie inside it */
  rentFrom: string;
  rentTo: string;
  /** The host's rent for the whole place per month, in `currency` – a window's price starts from it pro rata (lib/price.ts) */
  monthlyRent: number;
  currency: Currency;
  /** "I'm allowed to host guests here (sublet or guests allowed by my landlord and local rules)" – required to save */
  allowedToHost: boolean;
  /** "About the space", saved with the place – the next House from it starts with it (config/space.ts) */
  space?: HouseSpace;
  createdAt: string;
}

// Admin (/admin, lib/admin): the collections the waitlist and the host application write to. Mock through the data adapter; later Firestore.

/** One sign-up for the waitlist ("Join the waitlist"). */
export interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: string;
  /** Ticked "I'd like to host" */
  wantsToHost: boolean;
  /** Categories they're into */
  interests: Vibe[];
  /** A city or region, free as they typed it ("Lisbon") – null = anywhere */
  where: string | null;
  /** "YYYY-MM" – null = any time */
  when: string | null;
  /** ?src=… of the link they came through ("instagram", "tiktok") – null = direct */
  source: string | null;
  /** The person (user id or waitlist id) whose link brought them */
  referredBy: string | null;
  /** Ticked "Email me when Houses open here" – required to be taken in */
  consent?: boolean;
  /** Double opt-in: set when they clicked the link in the confirmation email; null = waiting for it. (Unset: from before the double opt-in – counts as confirmed.) */
  confirmedAt?: string | null;
  /** Unsubscribed (the link in every email) – no more emails, not counted */
  unsubscribedAt?: string;
  /** The secret in the confirm and unsubscribe links */
  token?: string;
  /** Their account, when they were logged in */
  userId?: string;
}

/** Where a sign-up stands: waiting for the confirmation click, confirmed, or unsubscribed. */
export function waitlistStatus(e: Pick<WaitlistEntry, "confirmedAt" | "unsubscribedAt">): "pending" | "confirmed" | "unsubscribed" {
  if (e.unsubscribedAt) return "unsubscribed";
  return e.confirmedAt === null ? "pending" : "confirmed";
}

export type ApplicationStatus = "new" | "yes" | "maybe" | "no";

/** An application to become a founding host. */
export interface HostApplication {
  id: string;
  /** Their account, when they have one – "Yes" makes it a founding host */
  userId?: string;
  name: string;
  /** The category of the House they want to run */
  topic: Vibe;
  /** The city they'd host in ("Lisbon", "Bangkok") */
  hub: string;
  hostType: "share" | "pro";
  /** Set by hand in the admin (unset = suggested: lib/admin/metrics.ts suggestTier) */
  hostTier?: HostTier;
  /** Instagram, TikTok, YouTube … – full URLs */
  audienceLinks: string[];
  /** Followers across those links (mock values) */
  audienceSize: number;
  /** One or two sentences: the House they have in mind ("Why I want to host") */
  pitch?: string;
  status: ApplicationStatus;
  createdAt: string;
  /** Their email (the confirmation and the answers go there) */
  email?: string;
  /** Roughly when ("YYYY-MM"), null = open */
  when?: string | null;
  /** The Marketing › Kontakte entry with the same email, linked on arrival */
  contactId?: string;
  /** The last question the admin sent (Rückfrage) – with its time */
  question?: { text: string; at: string };
  /** When it was decided (yes / no) */
  decidedAt?: string;
  /** Host brings host (HOST_REFERRAL, prepared): the host whose link (/host?ref=…&src=hostref) brought this application */
  referredBy?: string;
}

/** Every admin action, newest first in the Log. */
export interface AdminLogEntry {
  id: string;
  /** "phase_changed", "application_decided" … */
  action: AdminAction;
  /** What it was done to: a phase, an application's name */
  target: string;
  /** The admin's user id */
  by: string;
  createdAt: string;
  /** What it belongs to, when it is a House (its id) – Houses › Verlauf reads the log by it */
  ref?: string;
}

export type AdminAction =
  | "phase_changed"
  | "application_decided"
  | "application_question"
  | "deadline_step"
  | "report_viewed"
  | "report_decided"
  | "content_reported"
  | "notice_sent"
  | "appeal_received"
  | "appeal_decided"
  | "host_business_set"
  | "host_tax_submitted"
  | "founding_host_added"
  | "ticket_replied"
  | "ticket_status"
  | "ticket_tags"
  | "ticket_note"
  | "ticket_merged"
  | "payout_requested"
  | "withdrawal_added"
  | "host_tier_changed"
  | "house_highlighted"
  | "host_suggestions"
  | "alternative_proposed"
  | "waitlist_notified"
  | "host_reminded"
  | "guest_reminded"
  | "task_done"
  | "task_snoozed"
  | "receipt_attached"
  | "tax_question_updated"
  | "export_created"
  | "funding_moved"
  | "funding_doc"
  | "backlog_status"
  | "launch_check"
  | "location_decided"
  | "marketing_step"
  | "roadmap_todo"
  | "roadmap_milestone"
  | "launch_task"
  | "content_post"
  | "marketing_contact_added"
  | "marketing_contact_updated"
  | "marketing_contact_deleted"
  | "marketing_demo_seen"
  | "marketing_clips"
  | "marketing_export"
  | "partner_added"
  | "partner_updated"
  | "partner_deleted"
  | "partner_note"
  | "partner_export"
  | "house_done"
  | "host_quote_asked"
  | "content_marked";

// Support ("Help & feedback" → Admin › Support). Free text from support is never read by a model or for matching (config/data-points.ts).

export const TICKET_CATEGORIES = ["question", "bug", "idea", "safety"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
/** new → open → answered → closed; an idea also planned / done */
export type TicketStatus = "new" | "open" | "answered" | "closed" | "planned" | "done";

export interface TicketContext {
  /** The page it was sent from ("/house/surf-house-ericeira") */
  page: string;
  houseId?: string;
  /** "Desktop · Chrome", "iPhone · Safari" */
  device: string;
  /** px */
  screenWidth: number;
  phase: PlatformPhase;
}

export interface TicketReply {
  id: string;
  /** "admin" = Simpulo's answer, "user" = the person's follow-up */
  from: "admin" | "user";
  /** The admin's user id for "admin" */
  by?: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  email: string;
  category: TicketCategory;
  message: string;
  context: TicketContext;
  /** Screenshots: their file name and size (the file itself goes to storage later) */
  attachments: readonly { name: string; size: number }[];
  status: TicketStatus;
  /** Safety: always high – first in the inbox */
  priority: "normal" | "high";
  tags: readonly string[];
  /** Ideas: how many asked for it (1 = this person; merged duplicates add theirs) */
  votes: number;
  /** A duplicate: the ticket it was merged into */
  mergedInto?: string;
  /** Opened by the team (Admin › Houses › Host helfen, Ausweichen): no message of the person – the conversation starts with Simpulo's */
  fromTeam?: true;
  /** Internal, never shown to the person */
  adminNotes: string;
  replies: readonly TicketReply[];
  createdAt: string;
}

/** Admin › Money: a private withdrawal from the company account, entered by hand. */
export interface Withdrawal {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** EUR */
  amount: number;
  note?: string;
}

