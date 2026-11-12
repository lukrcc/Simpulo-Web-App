// What's coming up in your sure Houses – those you host and those you're in (accepted, paid, booked); never ones you only asked for. One list,
// soonest first, for Your houses › Needs you › "Coming up". Words in messages (houses.home.dash.timeline.*).
import { openVote } from "./crewVotes";
import { BOOKING_WINDOW_HOURS } from "./joinFlow";
import { getMyPayment, type StoreData } from "./store";
import type { Payment, Stay } from "./types";

export type TimelineKind = "pay_opens" | "pay_due" | "booking_confirmed" | "arrival" | "house_starts" | "house_ends";

export interface TimelineEvent {
  key: string;
  kind: TimelineKind;
  stay: Stay;
  /** ISO date (YYYY-MM-DD) or time */
  at: string;
}

type Data = StoreData & { payments: Payment[] };

const isOpen = (stay: Stay) => stay.status === "published" || stay.status === "booked";
const plusHours = (iso: string, hours: number) => new Date(Date.parse(iso) + hours * 3_600_000).toISOString();

/**
 * The next events of the current user's sure Houses (on or after `now`, soonest first):
 * - pay_opens: the crew's vote on the place ends (its deadline) – then paying opens
 * - pay_due: your share is due (guests) / the crew pays by (host)
 * - booking_confirmed: everyone paid – the host confirms the booking by then
 * - arrival (guests) / house_starts (host): the first day · house_ends: the last day
 */
export function timelineFor(data: Data, now: string): TimelineEvent[] {
  const me = data.currentUserId;
  if (!me) return [];
  const today = now.slice(0, 10);
  const events: TimelineEvent[] = [];
  for (const stay of data.stays) {
    if (!isOpen(stay) || stay.endDate < today) continue;
    const hosting = stay.hostId === me;
    const accepted = data.joinRequests.some((r) => r.stayId === stay.id && r.userId === me && r.status === "accepted");
    if (!hosting && !accepted) continue;
    const add = (kind: TimelineKind, at: string | undefined) => {
      if (at && at >= (at.length === 10 ? today : now)) events.push({ key: `${stay.id}-${kind}`, kind, stay, at });
    };
    const vote = openVote(stay, "accommodation");
    if (vote?.deadline) add("pay_opens", vote.deadline);
    if (stay.paymentDueAt && !stay.allPaidAt) {
      const mine = getMyPayment(data, stay.id);
      if (hosting || mine?.status === "pending") add("pay_due", stay.paymentDueAt);
    }
    if (stay.allPaidAt && !stay.bookingConfirmedAt) add("booking_confirmed", plusHours(stay.allPaidAt, BOOKING_WINDOW_HOURS));
    add(hosting ? "house_starts" : "arrival", stay.startDate);
    add("house_ends", stay.endDate);
  }
  return events.toSorted((a, b) => a.at.localeCompare(b.at));
}

/** Whole days from `now` to the event (0: today). */
export function daysUntil(at: string, now: string): number {
  const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.max(0, Math.round((day(at) - day(now)) / 86_400_000));
}
