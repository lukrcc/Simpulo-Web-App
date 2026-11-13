// Domain types live next to the mock data in ./mock.ts (the data contract). App-only types are added here.
import type { Stay, Thread, Vibe } from "./mock";

export type {
  AccommodationStatus,
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
  HouseVibe,
  ReportReason,
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
> & Partial<Pick<Stay, "waitlistMax" | "verifiedGuestsOnly" | "accommodationPhoto" | "currency" | "customVibe" | "hostFeePerPerson" | "accommodationVote" | "datesVote" | "datesOpen" | "languages" | "photos" | "totalPrice" | "who" | "audience" | "ageRange">>;

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
  /** Instagram, TikTok, YouTube … – full URLs */
  audienceLinks: string[];
  /** One or two sentences: the House they have in mind */
  pitch?: string;
  status: ApplicationStatus;
  createdAt: string;
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
}

export type AdminAction =
  | "phase_changed"
  | "application_decided"
  | "founding_host_added"
  | "ticket_replied"
  | "ticket_status"
  | "ticket_tags"
  | "ticket_note"
  | "ticket_merged"
  | "payout_requested"
  | "withdrawal_added";

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
