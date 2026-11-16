// Urgent – the one place that says when a number in the header gets its small orange dot (CLAUDE.md "Orange im Header nur für Logo-Punkt,
// Short trips und dringende Signale"). Anything urgent:
//   · a payment of yours due in under 48h (an unpaid share of a House whose payment window is open)
//   · a request to a House you host that expires in under 24h (REQUEST_POLICY.requestExpiryHours after it came in)
//   · an open safety report of yours (Get help › Safety, not answered or closed yet)
// "Your houses" carries the first two, "Messages" the last (the answer comes in Simpulo Support there).
import { REQUEST_POLICY } from "@/config/policies";
import type { JoinRequest, Payment, Stay, SupportTicket } from "@/lib/types";

/** The windows that make a task urgent. */
export const URGENT = { payWithinHours: 48, requestExpiresWithinHours: 24 } as const;

const HOUR_MS = 3_600_000;

interface UrgentData {
  stays: readonly Stay[];
  joinRequests: readonly JoinRequest[];
  payments: readonly Payment[];
}

/** A share of yours to pay within 48h. */
export function paymentDueSoon(data: UrgentData, me: string, now: number): boolean {
  return data.stays.some((stay) => {
    if (!stay.paymentDueAt) return false;
    const left = Date.parse(stay.paymentDueAt) - now;
    if (left <= 0 || left > URGENT.payWithinHours * HOUR_MS) return false;
    const mine = data.joinRequests.some((r) => r.stayId === stay.id && r.userId === me && r.status === "accepted");
    const paid = data.payments.some((p) => p.stayId === stay.id && p.userId === me && p.status === "paid");
    return mine && !paid;
  });
}

/** A request to one of your Houses that runs out within 24h. */
export function requestExpiringSoon(data: UrgentData, me: string, now: number): boolean {
  const mine = new Set(data.stays.filter((s) => s.hostId === me).map((s) => s.id));
  return data.joinRequests.some((r) => {
    if (r.status !== "pending" || !mine.has(r.stayId)) return false;
    const left = Date.parse(r.createdAt) + REQUEST_POLICY.requestExpiryHours * HOUR_MS - now;
    return left > 0 && left <= URGENT.requestExpiresWithinHours * HOUR_MS;
  });
}

/** A safety report of yours that's still open. */
export function openSafetyReport(tickets: readonly SupportTicket[], me: string): boolean {
  return tickets.some((t) => t.userId === me && t.category === "safety" && (t.status === "new" || t.status === "open"));
}

export type UrgentArea = "houses" | "messages";

/** Whether an area's number in the header gets the urgent dot. */
export function isUrgent(area: UrgentArea, data: UrgentData & { tickets: readonly SupportTicket[] }, me: string | null, now: number | null): boolean {
  if (!me || now === null) return false;
  return area === "houses" ? paymentDueSoon(data, me, now) || requestExpiringSoon(data, me, now) : openSafetyReport(data.tickets, me);
}
