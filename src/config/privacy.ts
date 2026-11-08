// Who sees whom – the one place for it. The crew on House pages and cards, ages, private profiles. With a real backend the same rules run
// on the server: what a viewer may not see never reaches their browser.
import type { User } from "@/lib/types";

/** Each person's switches (Settings › Privacy). Unset = these. */
export const PRIVACY_DEFAULTS = {
  /** Signed-in members may see your photo and first name in a crew. Your host and crew always see your full profile. */
  showOnHousePages: true,
  /** Your age on your profile and next to your name – only when you turn it on. */
  showAge: false,
} as const;

/**
 * How a crew member appears to a viewer:
 * - full: their own House (host or accepted crew of it), or themselves – the whole profile
 * - named: signed-in, the member shows on House pages – photo and first name
 * - hidden: signed-in, the member turned it off – no face, no name; counted as "+1"
 * - blurred: logged out – the photo softly blurred, no name; the count ("3 of 5 in") stays
 * The host isn't a crew member here: hosting is public.
 */
export type CrewFaceMode = "full" | "named" | "hidden" | "blurred";

export function crewFaceMode(member: Pick<User, "id" | "privacy">, viewer: { id: string | null; inCrew: boolean }, isHost: boolean): CrewFaceMode {
  if (isHost || viewer.id === member.id || viewer.inCrew) return "full";
  if (!viewer.id) return "blurred";
  return showsOnHousePages(member) ? "named" : "hidden";
}

export function showsOnHousePages(user: Pick<User, "privacy">): boolean {
  return user.privacy?.showOnHousePages ?? PRIVACY_DEFAULTS.showOnHousePages;
}

/** Age only when released by its owner (they always see their own). */
export function showsAge(user: Pick<User, "id" | "privacy">, viewerId: string | null): boolean {
  return viewerId === user.id || (user.privacy?.showAge ?? PRIVACY_DEFAULTS.showAge);
}

/** Never public: a last name. Everyone but the person themselves sees the first name only. */
export function publicName(user: Pick<User, "id" | "name">, viewerId: string | null): string {
  return viewerId === user.id ? user.name : (user.name.trim().split(/\s+/)[0] ?? user.name);
}
