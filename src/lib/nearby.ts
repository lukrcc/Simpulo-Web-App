// "Nearby" (CLAUDE.md "Netzwerk-Seite"): Your people see when you're in the same city – or travelling there – at the same time. Only with
// consent on both sides (Settings › Privacy & safety › Nearby, off by default), only between Your people, only from Houses (there's no home
// city): a House you're in (host or crew) that runs now or starts within NEARBY_DAYS. Pure.
import type { Stay } from "./types";
import type { StoreData } from "./store";

export const NEARBY_DAYS = 60;
const DAY_MS = 86_400_000;

export interface Trip {
  stayId: string;
  city: string;
  from: string;
  to: string;
}

const cityOf = (s: Stay) => (s.location?.city || s.city || "").trim();

/** Where a person will be: their Houses (host or accepted), running or starting within NEARBY_DAYS. */
export function tripsOf(data: Pick<StoreData, "stays" | "joinRequests">, userId: string, today: string): Trip[] {
  const until = new Date(Date.parse(`${today}T12:00:00Z`) + NEARBY_DAYS * DAY_MS).toISOString().slice(0, 10);
  return data.stays
    .filter((s) => (s.status === "published" || s.status === "booked") && !s.isExample && s.endDate >= today && s.startDate <= until)
    .filter((s) => s.hostId === userId || data.joinRequests.some((r) => r.stayId === s.id && r.userId === userId && r.status === "accepted"))
    .filter((s) => cityOf(s) !== "")
    .map((s) => ({ stayId: s.id, city: cityOf(s), from: s.startDate, to: s.endDate }));
}

export interface NearbyMatch {
  userId: string;
  city: string;
  /** The days both are there */
  from: string;
  to: string;
  /** The same House – then they know already; left out */
  sameHouse: boolean;
}

/** Your people in the same city at the same time – only when both turned Nearby on. */
export function nearbyPeople(data: Pick<StoreData, "stays" | "joinRequests" | "users">, me: string, peopleIds: readonly string[], today: string): NearbyMatch[] {
  const meUser = data.users.find((u) => u.id === me);
  if (!meUser?.privacy?.nearby) return [];
  const mine = tripsOf(data, me, today);
  const matches: NearbyMatch[] = [];
  for (const id of peopleIds) {
    const other = data.users.find((u) => u.id === id);
    if (!other?.privacy?.nearby) continue;
    for (const a of mine) {
      const b = tripsOf(data, id, today).find((t) => t.city.toLowerCase() === a.city.toLowerCase() && t.from <= a.to && a.from <= t.to);
      if (!b || b.stayId === a.stayId) continue;
      matches.push({ userId: id, city: a.city, from: a.from > b.from ? a.from : b.from, to: a.to < b.to ? a.to : b.to, sameHouse: false });
      break;
    }
  }
  return matches;
}
