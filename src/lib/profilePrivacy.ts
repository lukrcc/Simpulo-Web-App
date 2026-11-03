import { isCrewMember, livedWithFor, type LivedWithEntry, type StoreData } from "./store";
import type { LivedWith, Stay, User } from "./types";

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
    livedWith: entries.filter((e) => confirmedByUser(e) && confirmedByThem(e)),
    toConfirm: own ? entries.filter((e) => !confirmedByUser(e)) : [],
    waitingForThem: own ? entries.filter((e) => confirmedByUser(e) && !confirmedByThem(e)) : [],
  };
}
