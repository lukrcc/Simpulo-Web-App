// Who sees how much of a person – the ONE place for profiles (CLAUDE.md "Privatsphäre der Profile"): private, not anonymous. Nobody can be
// searched for (only Houses can); profiles live under an id that can't be guessed; logged out nobody sees a guest's face or name; signed in
// the crew shows first name, photo and interests; the full profile only to people of the same House and to a host the person asked to join.
// Hosts are public with first name, photo and a short profile. Last names never. With a real backend the same rules run on the server: what
// a viewer may not see never reaches their browser. The crew on cards and House pages: config/privacy.ts crewFaceMode (built on these rules).
import { PRIVACY_DEFAULTS } from "@/config/privacy";
import { sharesCrew } from "./profilePrivacy";
import type { StoreData } from "./store";
import type { Stay, User } from "./types";

/**
 * How much of a profile a viewer gets:
 * - full: themselves; someone who shares a House with them (host or crew); a host they asked to join (any request to that host's House)
 * - host: they host (an open or upcoming House) – first name, photo, short profile and their Houses, for everyone (logged out too)
 * - basic: signed in – first name, photo, interests (only if they show on House pages)
 * - private: logged out, or they turned "Show me on House pages" off – nothing but "This profile is private"
 */
export type ProfileVisibility = "full" | "host" | "basic" | "private";

/** Hosts publicly: an open, upcoming or past House on Explore (not only by link). Their host page is public. */
export const hostsPublicly = (data: Pick<StoreData, "stays">, userId: string) => data.stays.some((s) => s.hostId === userId && (s.status === "published" || s.status === "booked" || s.status === "completed") && s.visibility !== "unlisted");

/** A request from `guestId` to a House `hostId` hosts – the host sees the full profile of who asks (also once declined: they asked). */
const askedHost = (data: StoreData, guestId: string, hostId: string) =>
  data.joinRequests.some((r) => r.userId === guestId && data.stays.some((s) => s.id === r.stayId && s.hostId === hostId) && r.status !== "invited");

export function getProfileVisibility(data: StoreData, subject: Pick<User, "id" | "privacy">, viewerId: string | null): ProfileVisibility {
  if (viewerId === subject.id) return "full";
  if (viewerId && (sharesCrew(data, subject.id, viewerId) || askedHost(data, subject.id, viewerId))) return "full";
  if (hostsPublicly(data, subject.id)) return "host";
  if (!viewerId) return "private";
  return (subject.privacy?.showOnHousePages ?? PRIVACY_DEFAULTS.showOnHousePages) ? "basic" : "private";
}

/** "Hide my photo until I'm accepted" (Settings › Privacy, default off): a host sees no photo on a request until they said yes. */
export const hidesPhotoUntilAccepted = (user: Pick<User, "privacy">) => user.privacy?.hidePhotoUntilAccepted ?? PRIVACY_DEFAULTS.hidePhotoUntilAccepted;

/**
 * The photo stays hidden from a host who has only a request from them (not yet accepted, no shared House) while "Hide my photo until I'm
 * accepted" is on – on the request and on the profile.
 */
export function photoHiddenFor(data: StoreData, subject: Pick<User, "id" | "privacy">, viewerId: string | null): boolean {
  if (!viewerId || viewerId === subject.id || !hidesPhotoUntilAccepted(subject)) return false;
  return askedHost(data, subject.id, viewerId) && !sharesCrew(data, subject.id, viewerId);
}

/** "Show my host page in search engines" (hosts only): off by default, on by default for Anchor creators. Everyone else: never indexed. */
export function hostPageInSearch(user: Pick<User, "privacy" | "hostTier">): boolean {
  return user.privacy?.hostPageInSearch ?? user.hostTier === "anchor";
}

// ─── Profile URLs: an id that can't be guessed ─────────────────────────────────────────────────────────────────────────────────

/** Salt of the mock's profile ids. TODO backend: a random id per account, stored with it (never derived from the account id). */
const PROFILE_SALT = "simpulo-profile-v1";

/** FNV-1a, 32 bit – twice with different seeds for 16 hex characters. */
function fnv(text: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The profile's public id: 16 hex characters, no running number, no name ("/u/3f9c0a…"). */
export const profileIdOf = (userId: string) => fnv(`${PROFILE_SALT}:${userId}`, 0x811c9dc5) + fnv(`${userId}:${PROFILE_SALT}`, 0x9e3779b9);

/** The link to someone's profile – always this, never /u/{account id}. Your own is /profile. */
export const profileHref = (userId: string) => `/u/${profileIdOf(userId)}`;

/** The person behind a profile id; account ids (u5) don't open profiles. */
export function userByProfileId<T extends Pick<User, "id">>(users: readonly T[], profileId: string): T | undefined {
  return users.find((u) => profileIdOf(u.id) === profileId);
}

/**
 * A profile's page for search engines and link previews (logged out): a host's page is public – indexed only with "Show my host page in
 * search engines" –; a guest's profile shares nothing and is never indexed (noindex, nofollow).
 */
export function publicProfileMeta(user: Pick<User, "id" | "privacy" | "hostTier">, stays: readonly Pick<Stay, "hostId" | "status" | "visibility">[]): { host: boolean; index: boolean } {
  const host = hostsPublicly({ stays: stays as Stay[] }, user.id);
  return { host, index: host && hostPageInSearch(user) };
}
