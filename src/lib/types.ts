// Domain types live next to the mock data in ./mock.ts (the data contract). App-only types are added here.
import type { Stay, Thread } from "./mock";

export type {
  AccommodationStatus,
  Currency,
  JoinRequest,
  LockDetails,
  Message,
  MessageEvent,
  MessageType,
  Attachment,
  Reaction,
  Report,
  ReportReason,
  NotificationGroup,
  Payment,
  PrivateContacts,
  PaymentRecordStatus,
  SystemEventKey,
  RequestStatus as JoinRequestStatus,
  Stay,
  StayStatus,
  Thread,
  User,
  UserSettings,
  Vibe,
} from "./mock";

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
  | "accommodationStatus"
  | "description"
  | "whyText"
  | "dayText"
  | "lookingForText"
  | "interests"
  | "houseRules"
  | "hostNote"
> & Partial<Pick<Stay, "currency">>;
