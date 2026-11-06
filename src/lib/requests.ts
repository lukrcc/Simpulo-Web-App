// Requests: how long they wait, what the guest sees when one doesn't happen, similar Houses, and how reliably a host answers.
// Rules in config/policies.ts (REQUEST_POLICY). Declined and expired stay apart in the data, but the guest sees the same:
// "Didn't work out" – never whether the host said no or the time ran out.
import { REQUEST_POLICY } from "@/config/policies";
import type { JoinRequest, Stay, User } from "./types";
import { openSpots } from "./utils";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** When an open request expires. */
export const requestExpiresAt = (request: Pick<JoinRequest, "createdAt">) => new Date(Date.parse(request.createdAt) + REQUEST_POLICY.requestExpiryHours * HOUR_MS).toISOString();

/** Hours until it expires (at least 1 while it's open). */
export const hoursLeft = (request: Pick<JoinRequest, "createdAt">, now: number) => Math.max(1, Math.ceil((Date.parse(requestExpiresAt(request)) - now) / HOUR_MS));

/** Declined or expired: for the guest one thing – it didn't work out. */
export const didntWorkOut = (request: Pick<JoinRequest, "status"> | undefined) => request?.status === "declined" || request?.status === "expired";

/** Up to `max` open Houses like this one: same city or same category, dates overlapping, a spot free, not the guest's own, none in `skip` (already asked or in). */
export function similarHouses(stays: readonly Stay[], stay: Stay, viewerId: string | null, skip: ReadonlySet<string> = new Set(), max = 3): Stay[] {
  const overlaps = (s: Stay) => s.startDate <= stay.endDate && s.endDate >= stay.startDate;
  return stays
    .filter((s) => s.id !== stay.id && !skip.has(s.id) && s.status === "published" && s.visibility !== "unlisted" && s.hostId !== viewerId && openSpots(s) > 0 && (s.city === stay.city || s.vibe === stay.vibe) && overlaps(s))
    .toSorted((a, b) => Number(b.city === stay.city) - Number(a.city === stay.city) || a.startDate.localeCompare(b.startDate))
    .slice(0, max);
}

/**
 * How reliably a host answers (internal, never shown): of the requests their Houses got in the last 90 days that are settled, the share
 * they answered (accepted, declined, waitlisted) rather than let expire. Still open ones don't count yet. No requests: 1.
 */
export function responseRate(data: { stays: readonly Stay[]; joinRequests: readonly JoinRequest[] }, hostId: string, now: number): number {
  const hosted = new Set(data.stays.filter((s) => s.hostId === hostId).map((s) => s.id));
  const since = now - REQUEST_POLICY.responseWindowDays * DAY_MS;
  const settled = data.joinRequests.filter((r) => hosted.has(r.stayId) && Date.parse(r.createdAt) >= since && ["accepted", "declined", "expired", "waitlisted"].includes(r.status));
  if (settled.length === 0) return 1;
  return settled.filter((r) => r.status !== "expired").length / settled.length;
}

/** Below the bar: a quiet nudge for the host and a little lower in "recommended" orders. */
export const answersSlowly = (rate: number) => rate < REQUEST_POLICY.responseRateBar;

/** An audience House (women only) and this person: "blocked" – the profile says otherwise; "unknown" – the profile doesn't say; "ok". */
export function audienceFit(stay: Pick<Stay, "audience">, user: Pick<User, "gender"> | undefined): "ok" | "blocked" | "unknown" | "none" {
  if (stay.audience !== "women") return "none";
  if (!user || !user.gender) return "unknown";
  return user.gender === "woman" ? "ok" : "blocked";
}
