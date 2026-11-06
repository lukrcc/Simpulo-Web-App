// What a House needs from you right now – Your houses ("NEEDS YOU", the dot on a House's card) and the manage page's next step.
import { openVote } from "./crewVotes";
import { requestExpiresAt } from "./requests";
import { getMyPayment, paymentProgress, type StoreData } from "./store";
import type { Payment, Stay } from "./types";
import { hasOffer } from "./waitlist";

export type HouseTaskKind =
  // Hosting
  | "finish"
  | "requests"
  | "choosePlace"
  | "voting"
  | "paymentsOpen"
  | "book"
  // Joined
  | "invite"
  | "pay"
  | "offer";

export interface HouseTask {
  id: string;
  kind: HouseTaskKind;
  stay: Stay;
  /** For the sentence: a count, a date */
  count?: number;
  date?: string;
  /** Where the task is done */
  href: string;
}

type TaskData = StoreData & { payments: Payment[] };

export const manageHref = (stay: Pick<Stay, "id">, tab?: string) => `/your-houses/${stay.id}${tab ? `?tab=${tab}` : ""}`;

/** The host's open tasks for one House, most pressing first. */
export function hostTasks(data: TaskData, stay: Stay): HouseTask[] {
  const id = (kind: HouseTaskKind) => `${stay.id}-${kind}`;
  if (stay.status === "draft") return [{ id: id("finish"), kind: "finish", stay, href: `/your-houses/${stay.id}/edit` }];
  if (stay.status !== "published" && stay.status !== "booked") return [];
  const tasks: HouseTask[] = [];
  const open = data.joinRequests.filter((r) => r.stayId === stay.id && (r.status === "pending" || r.status === "waitlist_requested"));
  // The date: when the first open request expires (48h after it came in) – Needs you sorts by it.
  const firstExpiry = open.filter((r) => r.status === "pending").map(requestExpiresAt).toSorted()[0];
  if (open.length > 0) tasks.push({ id: id("requests"), kind: "requests", stay, count: open.length, date: firstExpiry, href: manageHref(stay, "requests") });
  const full = stay.spotsFilled >= stay.spotsTotal;
  if (stay.accommodationStatus !== "locked") {
    if (openVote(stay, "accommodation")) tasks.push({ id: id("voting"), kind: "voting", stay, href: manageHref(stay) });
    else if (full) tasks.push({ id: id("choosePlace"), kind: "choosePlace", stay, href: manageHref(stay, "payments") });
  } else {
    const progress = paymentProgress(data, stay.id);
    if (stay.allPaidAt && !stay.bookingConfirmedAt) tasks.push({ id: id("book"), kind: "book", stay, href: manageHref(stay, "payments") });
    else if (stay.paymentDueAt && !progress.allPaid) tasks.push({ id: id("paymentsOpen"), kind: "paymentsOpen", stay, count: progress.count - progress.paidCount, date: stay.paymentDueAt, href: manageHref(stay, "payments") });
  }
  return tasks;
}

/** A guest's open task for one House: answer an invite, pay the share, take a spot offered from the waitlist. */
export function guestTasks(data: TaskData, stay: Stay, now: string): HouseTask[] {
  const me = data.currentUserId;
  const request = data.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === me);
  if (!request) return [];
  if (request.status === "invited") return [{ id: `${stay.id}-invite`, kind: "invite", stay, href: `/house/${stay.slug}` }];
  if (request.status === "waitlisted" && hasOffer(request, now)) return [{ id: `${stay.id}-offer`, kind: "offer", stay, date: request.offerExpiresAt, href: `/house/${stay.slug}` }];
  const payment = getMyPayment(data, stay.id);
  if (request.status === "accepted" && payment?.status === "pending" && stay.paymentDueAt) return [{ id: `${stay.id}-pay`, kind: "pay", stay, date: stay.paymentDueAt, href: manageHref(stay, "payment") }];
  return [];
}
