// Delete account (CLAUDE.md "Settings"): not while it would leave others stranded – a House you host that is still open or running, or a
// House you're in that is running or that you've paid for. Each with what to do. Pure; the page and the store both ask it.
import type { JoinRequest, Payment, Stay } from "./types";

export interface DeletionBlocker {
  stay: Stay;
  role: "host" | "guest";
  /** running now – else upcoming */
  running: boolean;
}

export function deletionBlockers(data: { stays: readonly Stay[]; joinRequests: readonly JoinRequest[]; payments: readonly Payment[] }, me: string, today: string): DeletionBlocker[] {
  const live = (s: Stay) => (s.status === "published" || s.status === "booked") && s.endDate >= today;
  const running = (s: Stay) => s.startDate <= today && s.endDate >= today;
  const hosting = data.stays.filter((s) => s.hostId === me && live(s) && !s.isExample).map((stay) => ({ stay, role: "host" as const, running: running(stay) }));
  const guest = data.stays
    .filter((s) => s.hostId !== me && live(s) && data.joinRequests.some((r) => r.stayId === s.id && r.userId === me && r.status === "accepted"))
    .filter((s) => running(s) || data.payments.some((p) => p.stayId === s.id && p.userId === me && p.status === "paid"))
    .map((stay) => ({ stay, role: "guest" as const, running: running(stay) }));
  return [...hosting, ...guest];
}
