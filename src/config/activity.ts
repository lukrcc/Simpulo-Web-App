// What's new at a House, for its card in Your houses: the events of the last days, ranked; the most telling first, at most two parts
// combined ("Anna joined · 2 messages"). Only your own Houses' news – new Houses near your searches or from hosts you follow go to
// "For your next trip" and Explore instead.
import type { AppNotification } from "@/lib/data/notifications";

/** How far back a card's news reaches. */
export const ACTIVITY_DAYS = 7;
/** How many parts the card's line combines. */
export const ACTIVITY_PARTS = 2;

export type ActivityKey = "joined" | "youreIn" | "messages" | "paid" | "payDue" | "full" | "booked" | "newRequest" | "requests" | "invited" | "again" | "update";

/** An event's few words: its key, a name if it has one, and how telling it is (lower first). */
export interface ActivityPart {
  key: ActivityKey;
  name?: string;
  rank: number;
}

/** News about Houses you're not part of (a new House near a search, from a host you follow): never a card's line. */
export const isDiscovery = (n: Pick<AppNotification, "key">) => n.key === "hostOpened" || n.key === "searchOpened";

/** The few words for one event; null for what a card doesn't say (declined, discoveries). */
export function activityPartOf(n: AppNotification): ActivityPart | null {
  const name = typeof n.values?.name === "string" ? n.values.name : undefined;
  switch (n.key) {
    case "newRequest":
    case "waitlistRequest":
      return { key: "newRequest", rank: 2 };
    case "reminderPendingRequests":
      return { key: "requests", rank: 3 };
    case "accepted":
    case "inviteAccepted":
    case "waitlistAccepted":
      return name ? { key: "joined", name, rank: 1 } : { key: "youreIn", rank: 1 };
    case "paymentDue":
    case "reminderPayDue":
    case "reminderPayToday":
      return { key: "payDue", rank: 2 };
    case "paid":
      return { key: "paid", rank: 3 };
    case "crewFull":
      return { key: "full", rank: 4 };
    case "locked":
    case "bookingConfirmed":
      return { key: "booked", rank: 4 };
    case "newMessage":
      return { key: "messages", rank: 5 };
    case "crewInvite":
    case "houseInvite":
      return { key: "invited", rank: 2 };
    case "doItAgain":
      return { key: "again", rank: 6 };
    case "hostOpened":
    case "searchOpened":
    case "declined":
    case "requestExpired":
      return null;
    default:
      return { key: "update", rank: 9 };
  }
}

export interface ActivitySummary {
  /** At most ACTIVITY_PARTS, the most telling first (each kind once; messages counted) */
  parts: ActivityPart[];
  messages: number;
  unread: boolean;
  /** Every event behind it (marked read when the card is opened) */
  events: AppNotification[];
}

/** A House's news of the last ACTIVITY_DAYS, ranked and combined; null without any. */
export function activitySummary(events: readonly AppNotification[], now: string): ActivitySummary | null {
  const since = new Date(Date.parse(now) - ACTIVITY_DAYS * 86_400_000).toISOString();
  const recent = events.filter((e) => e.createdAt >= since && !isDiscovery(e));
  const ranked = recent.flatMap((e) => {
    const part = activityPartOf(e);
    return part ? [part] : [];
  });
  if (ranked.length === 0) return null;
  const seen = new Set<string>();
  const parts = ranked
    .toSorted((a, b) => a.rank - b.rank)
    .filter((p) => {
      const id = `${p.key}:${p.name ?? ""}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, ACTIVITY_PARTS);
  return { parts, messages: recent.filter((e) => e.key === "newMessage").length, unread: recent.some((e) => !e.readAt), events: recent };
}
