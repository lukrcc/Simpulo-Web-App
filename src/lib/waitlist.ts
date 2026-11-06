// The waitlist behind a full House – or behind one whose free spots are all asked for already (as many open requests as free spots
// or more): then "Request to join" stays the main action and the waitlist comes beside it. While a free spot has nobody asking for it,
// there is no waitlist. Who joins it then waits behind those requests (`JoinRequest.coveredBy`): an offer comes only once a spot is free
// beyond the ones those requests still cover.
// "Join waitlist" is a request to the host (waitlist_requested); accepted, the person is waitlisted. The order is the time of the
// request (`createdAt` = requestedAt); the position is derived from it, so removing someone never leaves a gap. At most
// `Stay.waitlistMax` people (default 3) – requested and waitlisted together.
// A spot opens: the first waitlisted person without an offer gets one – 24 hours to take the spot (or to pay, once payments are
// due) – the host is told and doesn't decide again. Not taken in time: they leave the list and the next one gets the offer.
// An offer holds the spot (`Stay.spotsOffered`). Someone who already paid leaves while people wait: their spot goes to the
// waitlist, they get their payment back minus Simpulo's fee. The clock: syncWaitlist in lib/store.tsx.
import type { JoinRequest, Payment, Stay } from "./types";
import { openSpots } from "./utils";

export const WAITLIST_MAX_DEFAULT = 3;
export const WAITLIST_MAX_LIMIT = 5;
export const WAITLIST_OFFER_HOURS = 24;

export function waitlistMaxOf(stay: Pick<Stay, "waitlistMax">): number {
  return Math.min(Math.max(stay.waitlistMax ?? WAITLIST_MAX_DEFAULT, 0), WAITLIST_MAX_LIMIT);
}

const byRequestTime = (a: JoinRequest, b: JoinRequest) => a.createdAt.localeCompare(b.createdAt);

/** Accepted waitlist, in order. */
export function waitlistOf(data: { joinRequests: readonly JoinRequest[] }, stayId: string): JoinRequest[] {
  return data.joinRequests.filter((r) => r.stayId === stayId && r.status === "waitlisted").toSorted(byRequestTime);
}

/** Waitlist requests the host hasn't answered yet, oldest first. */
export function waitlistRequestsOf(data: { joinRequests: readonly JoinRequest[] }, stayId: string): JoinRequest[] {
  return data.joinRequests.filter((r) => r.stayId === stayId && r.status === "waitlist_requested").toSorted(byRequestTime);
}

/** 1-based place on the accepted waitlist, or null. */
export function waitlistPosition(data: { joinRequests: readonly JoinRequest[] }, stayId: string, userId: string | null): number | null {
  if (!userId) return null;
  const index = waitlistOf(data, stayId).findIndex((r) => r.userId === userId);
  return index < 0 ? null : index + 1;
}

/** Open requests for a spot (not the waitlist's). */
export function pendingRequestsOf(data: { joinRequests: readonly JoinRequest[] }, stayId: string): JoinRequest[] {
  return data.joinRequests.filter((r) => r.stayId === stayId && r.status === "pending");
}

/**
 * Why the waitlist is open: "full" – every spot is taken (or held); "covered" – spots are free, but each already has an open request.
 * null: a free spot nobody asked for – no waitlist.
 */
export function waitlistReason(data: { joinRequests: readonly JoinRequest[] }, stay: Stay): "full" | "covered" | null {
  const free = openSpots(stay);
  if (free === 0) return "full";
  return free <= pendingRequestsOf(data, stay.id).length ? "covered" : null;
}

/** Room on the list (requested and waitlisted together). */
export function waitlistOpen(data: { joinRequests: readonly JoinRequest[] }, stay: Stay): boolean {
  return waitlistOf(data, stay.id).length + waitlistRequestsOf(data, stay.id).length < waitlistMaxOf(stay);
}

/** An offer that's still running. */
export function hasOffer(request: Pick<JoinRequest, "offerExpiresAt">, at: string): boolean {
  return Boolean(request.offerExpiresAt && request.offerExpiresAt > at);
}

/** What a paid leaver gets back when their spot goes to the waitlist: everything but Simpulo's fee. */
export function waitlistRefund(payment: Pick<Payment, "total" | "fee">): number {
  return Math.max(0, payment.total - payment.fee);
}
