// Domain types live next to the mock data in ./mock.ts (the data contract). App-only types are added here.
import type { Stay, Thread } from "./mock";

export type {
  AccommodationStatus,
  JoinRequest,
  Message,
  RequestStatus as JoinRequestStatus,
  Stay,
  StayStatus,
  Thread,
  User,
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
>;
