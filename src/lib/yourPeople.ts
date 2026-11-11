// "Your people": everyone you lived with in a House that ended, once both of you confirmed it ("Lived with", both ways). Removing someone
// is silent – nobody is told. One place for the network's signals: the Explore shelf, the hints on cards and House pages, the line on a
// host's requests and who can be invited in Open a House. Same rules on the server once there is one.
import { getCrew, isCrewMember, livedWithFor, settingsOf, type StoreData } from "./store";
import type { LivedWith, Stay, User } from "./types";

type PeopleData = StoreData & { livedWith: LivedWith[] };

export interface PersonOfYours {
  user: User;
  /** The most recent House you shared */
  house: Stay;
}

const confirmed = (data: PeopleData, from: string, to: string) => data.livedWith.some((l) => l.userId === from && l.otherUserId === to && l.confirmedAt);

/** Both confirmed: the pair counts as having lived together. */
export const livedTogether = (data: PeopleData, a: string, b: string) => confirmed(data, a, b) && confirmed(data, b, a);

/** `userId`'s people, most recent House first: both confirmed, not removed, not blocked. */
export function yourPeople(data: PeopleData, userId: string): PersonOfYours[] {
  const me = data.users.find((u) => u.id === userId);
  const settings = settingsOf(me);
  const left = new Set([...settings.blockedUserIds, ...(settings.removedPeopleIds ?? [])]);
  return livedWithFor(data, userId)
    .filter((entry) => !left.has(entry.user.id) && livedTogether(data, userId, entry.user.id))
    .map((entry) => ({ user: entry.user, house: entry.house }));
}

const isOpen = (stay: Stay, today: string) => (stay.status === "published" || stay.status === "booked") && stay.visibility !== "unlisted" && stay.endDate >= today;

export interface PeopleSignal {
  /** The first person of yours in it – the host before a crew member */
  user: User;
  role: "host" | "member";
  /** How many of your people are in it */
  count: number;
}

/** Who of the viewer's people is in this House ("Anna is in" / "Hosted by Tom from your people"); null without anyone. */
export function peopleSignal(data: PeopleData, stay: Stay, people: readonly PersonOfYours[]): PeopleSignal | null {
  if (people.length === 0) return null;
  const ids = new Set(people.map((p) => p.user.id));
  const crew = getCrew(data, stay).filter((u) => ids.has(u.id));
  if (crew.length === 0) return null;
  const host = crew.find((u) => u.id === stay.hostId);
  return { user: host ?? crew[0], role: host ? "host" : "member", count: crew.length };
}

/** "Your people are going": open, listed Houses one of your people hosts or is in – not your own and not ones you're in. Soonest first. */
export function housesOfYourPeople(data: PeopleData, viewerId: string, people: readonly PersonOfYours[], today: string): Stay[] {
  if (people.length === 0) return [];
  return data.stays
    .filter((s) => isOpen(s, today) && s.hostId !== viewerId && !isCrewMember(data, s, viewerId) && peopleSignal(data, s, people) !== null)
    .toSorted((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * A request to the host's House: people the host lived with (both confirmed) whom the guest lived with too – "Lived with Anna, who you
 * know". The host's people only, so it never shows anyone the host doesn't know.
 */
export function knownThrough(data: PeopleData, hostId: string, guestId: string): User[] {
  return yourPeople(data, hostId)
    .map((p) => p.user)
    .filter((u) => u.id !== guestId && livedTogether(data, guestId, u.id));
}
