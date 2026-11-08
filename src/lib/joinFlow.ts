// Joining a House, per member: requested → accepted (spot held, nothing paid) → payment_due (the crew is complete and the place
// chosen: 48 hours) → paid. Unpaid after 48 hours: the spot opens up again. Everyone paid: the money goes to the host, who confirms
// the booking within 48 hours, otherwise it is all refunded. Cards are only charged at "paid": never authorised ahead of time, a
// hold would run out after about 7 days. The clock itself: settlePayments in lib/store.tsx.
import { PAYMENT_POLICY } from "@/config/policies";
import type { JoinRequest, Payment, Stay } from "./types";

/** From config/policies.ts – the one place for these clocks. */
export const PAYMENT_WINDOW_HOURS = PAYMENT_POLICY.paymentWindowHours;
export const BOOKING_WINDOW_HOURS = PAYMENT_POLICY.hostBookingWindowHours;

export type MemberStage = "requested" | "accepted" | "payment_due" | "paid";

/** Where `userId` stands in this House; null when they aren't on the way in (no request, declined, or only invited). */
export function memberStage(data: { joinRequests: readonly JoinRequest[]; payments: readonly Payment[] }, stay: Stay, userId: string | null): MemberStage | null {
  if (!userId) return null;
  const request = data.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === userId);
  if (stay.hostId !== userId) {
    if (request?.status === "pending") return "requested";
    if (request?.status !== "accepted") return null;
  }
  const payment = data.payments.find((p) => p.stayId === stay.id && p.userId === userId && p.status !== "refunded");
  if (payment?.status === "paid") return "paid";
  return payment && stay.paymentDueAt ? "payment_due" : "accepted";
}
