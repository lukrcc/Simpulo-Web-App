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

export type AdminAction = "phase_changed" | "application_decided" | "founding_host_added";
