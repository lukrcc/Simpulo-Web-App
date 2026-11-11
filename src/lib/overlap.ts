// Several Houses at once (config/policies.ts › PARALLEL_POLICY): which of the viewer's Houses share nights with another.
import { getMyPayment, isCrewMember, type StoreData } from "./store";
import type { Payment, Stay } from "./types";

type Data = StoreData & { payments: Payment[] };

/** Do two Houses share a night? (The day one leaves, the next can begin.) */
export function overlaps(a: Pick<Stay, "startDate" | "endDate">, b: Pick<Stay, "startDate" | "endDate">): boolean {
  if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) return false;
  return a.startDate < b.endDate && b.startDate < a.endDate;
}

const live = (s: Stay) => s.status !== "closed" && s.status !== "completed" && s.status !== "draft";

/** A House the viewer has paid their share for whose dates overlap this one – the one to cancel first. */
export function paidOverlapOf(data: Data, stay: Stay): Stay | null {
  const me = data.currentUserId;
  if (!me) return null;
  return (
    data.stays.find(
      (other) => other.id !== stay.id && live(other) && other.hostId !== me && overlaps(other, stay) && data.payments.some((p) => p.stayId === other.id && p.userId === me && p.status === "paid"),
    ) ?? null
  );
}

/** The viewer's acceptances (in the crew, the share not paid) that overlap each other – each pair once. */
export function acceptedOverlaps(data: Data): [Stay, Stay][] {
  const me = data.currentUserId;
  if (!me) return [];
  const accepted = data.stays.filter(
    (s) => live(s) && s.hostId !== me && data.joinRequests.some((r) => r.userId === me && r.stayId === s.id && r.status === "accepted") && getMyPayment(data, s.id)?.status !== "paid",
  );
  const pairs: [Stay, Stay][] = [];
  accepted.forEach((a, i) => accepted.slice(i + 1).forEach((b) => overlaps(a, b) && pairs.push([a, b])));
  return pairs;
}

/** Another House the viewer hosts at the same time as this one. */
export function hostOverlapOf(data: StoreData, stay: Stay): Stay | null {
  const me = data.currentUserId;
  if (!me || stay.hostId !== me) return null;
  return data.stays.find((other) => other.id !== stay.id && other.hostId === me && live(other) && overlaps(other, stay)) ?? null;
}

/** Houses the viewer is in now (in the crew or hosting, between start and end) – Up next swipes through them when there are several. */
export function runningNow(data: StoreData, today: string): Stay[] {
  const me = data.currentUserId;
  if (!me) return [];
  return data.stays.filter((s) => live(s) && s.startDate <= today && today < s.endDate && (s.hostId === me || isCrewMember(data, s, me)));
}
