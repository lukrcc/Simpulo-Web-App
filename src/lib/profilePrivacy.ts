import { isCrewMember, livedWithFor, type LivedWithEntry, type StoreData } from "./store";
import type { LivedWith, Stay, User, Vibe } from "./types";

/*
 * What a profile shows, and to whom – the one place for it (CLAUDE.md "Privatsphäre Profil"). A component never picks a person's
 * Houses or housemates from the store itself. With a real backend the same rules have to run on the server: what isn't
 * allowed must not reach the browser at all.
 */

const isOver = (stay: Stay, today: string) => stay.status === "closed" || stay.status === "completed" || stay.endDate < today;
/** Over and really lived in: closed Houses never happened, drafts never started. */
const wasLivedIn = (stay: Stay, today: string) => stay.status === "completed" || ((stay.status === "published" || stay.status === "booked") && stay.endDate < today);
/** Public: open or upcoming, and not limited to its link (before the launch). */
const isPublicHosting = (stay: Stay, today: string) => (stay.status === "published" || stay.status === "booked") && stay.visibility !== "unlisted" && !isOver(stay, today);

export interface ProfileView {
  /** Their Houses, open or upcoming. Others: public ones only. Own: all of them, drafts included. */
  hostingNow: Stay[];
  /** Upcoming as a guest. Own: all. Others: only the Houses whose crew the viewer is in; nothing at all for anyone else. */
  upcoming: Stay[];
  /** How many Houses they hosted, as anyone may count them */
  hostedCount: number;
  /** How many Houses are over that they lived in */
  livedInCount: number;
  /** Those Houses' cities: no date, no title */
  livedInPlaces: string[];
  /** The year of the first thing they did here; null without any. There's no sign-up date in the data yet. */
  memberSince: number | null;
  /** The date (ISO) of the first thing they did here – "joined March 2026"; null without any */
  joinedAt: string | null;
  /** Housemates, both sides confirmed */
  livedWith: LivedWithEntry[];
  /** Own profile only: housemates still waiting for your confirmation */
  toConfirm: LivedWithEntry[];
  /** Own profile only: you confirmed, they haven't yet */
  waitingForThem: LivedWithEntry[];
}

/** `viewerId`: who's looking; null when logged out and in the preview of your own profile. */
export function profileViewFor(store: StoreData & { livedWith: LivedWith[] }, user: User, viewerId: string | null, today: string): ProfileView {
  const own = viewerId === user.id;
  const hosted = store.stays.filter((s) => s.hostId === user.id);
  const asGuest = store.joinRequests
    .filter((r) => r.userId === user.id && r.status === "accepted")
    .flatMap((r) => store.stays.filter((s) => s.id === r.stayId && s.hostId !== user.id));
  const livedIn = [...new Set([...hosted, ...asGuest])].filter((s) => wasLivedIn(s, today));

  const firstDates = [...hosted.map((s) => s.createdAt), ...store.joinRequests.filter((r) => r.userId === user.id).map((r) => r.createdAt)].filter(Boolean).toSorted();
  const firstYear = firstDates[0] ? Number(firstDates[0].slice(0, 4)) : null;

  const mine = (from: string, to: string) => store.livedWith.some((l) => l.userId === from && l.otherUserId === to && l.confirmedAt);
  const entries = livedWithFor(store, user.id);
  const confirmedByThem = (e: LivedWithEntry) => mine(e.user.id, user.id);
  const confirmedByUser = (e: LivedWithEntry) => mine(user.id, e.user.id);

  return {
    hostingNow: hosted.filter((s) => (own ? !isOver(s, today) : isPublicHosting(s, today))),
    upcoming: asGuest.filter((s) => !isOver(s, today) && (own || (viewerId !== null && isCrewMember(store, s, viewerId)))),
    hostedCount: hosted.filter((s) => (s.status === "published" || s.status === "booked" || s.status === "completed") && s.visibility !== "unlisted").length,
    livedInCount: livedIn.length,
    livedInPlaces: [...new Set(livedIn.map((s) => s.location?.city ?? s.city))],
    memberSince: firstYear,
    joinedAt: firstDates[0] ?? null,
    livedWith: entries.filter((e) => confirmedByUser(e) && confirmedByThem(e)),
    toConfirm: own ? entries.filter((e) => !confirmedByUser(e)) : [],
    waitingForThem: own ? entries.filter((e) => confirmedByUser(e) && !confirmedByThem(e)) : [],
  };
}

/** The middle of their latest reply times; null without any. */
export function medianReplyMinutes(user: Pick<User, "replyMinutes">): number | null {
  const times = (user.replyMinutes ?? []).toSorted((a, b) => a - b);
  if (times.length === 0) return null;
  const middle = Math.floor(times.length / 2);
  return times.length % 2 ? times[middle] : Math.round((times[middle - 1] + times[middle]) / 2);
}

export interface InCommon {
  /** Rarest first: everyone here has English */
  languages: string[];
  interests: Vibe[];
  /** People both of them lived with, each confirmed from both sides */
  livedWith: User[];
}

/** What the viewer shares with this person. Nothing logged out or on your own House. Only what either profile shows anyway. */
export function inCommonWith(store: StoreData & { livedWith: LivedWith[] }, person: User, viewerId: string | null, today: string): InCommon {
  const viewer = viewerId === null || viewerId === person.id ? undefined : store.users.find((u) => u.id === viewerId);
  if (!viewer) return { languages: [], interests: [], livedWith: [] };
  const theirs = profileViewFor(store, person, viewerId, today).livedWith;
  const mine = new Set(profileViewFor(store, viewer, viewerId, today).livedWith.map((e) => e.user.id));
  return {
    languages: person.languages.filter((l) => viewer.languages.includes(l)).toSorted((a, b) => Number(a === "English") - Number(b === "English")),
    interests: (person.interests ?? []).filter((i) => viewer.interests?.includes(i)),
    livedWith: theirs.filter((e) => mine.has(e.user.id)).map((e) => e.user),
  };
}

/** Whether two people were ever in the same crew (host or accepted, any House, past ones too) – they always see each other in full. */
export function sharesCrew(store: StoreData, userId: string, viewerId: string | null): boolean {
  if (!viewerId) return false;
  if (viewerId === userId) return true;
  return store.stays.some((stay) => isCrewMember(store, stay, userId) && isCrewMember(store, stay, viewerId));
}
