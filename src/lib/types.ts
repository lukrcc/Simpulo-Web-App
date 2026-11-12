// Domain types live next to the mock data in ./mock.ts (the data contract). App-only types are added here.
import type { Stay, Thread } from "./mock";

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
