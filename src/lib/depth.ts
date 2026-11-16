// The social depth's one rule that needs the records: it's fixed after the first booking (config/depth.ts holds everything else).
import type { JoinRequest, Payment, Stay } from "./types";

/** Fixed once someone booked: a paid share, or (beta, no payments) a reserved spot. The host sees why on the edit page. */
export function depthLocked(stay: Pick<Stay, "id">, data: { payments: readonly Payment[]; joinRequests: readonly JoinRequest[] }): boolean {
  return data.payments.some((p) => p.stayId === stay.id && (p.status === "paid" || p.status === "refunded")) || data.joinRequests.some((r) => r.stayId === stay.id && r.status === "accepted" && r.reserved);
}
