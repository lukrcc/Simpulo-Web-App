import { LAUNCH_MIN_HOUSES } from "@/config/explore";
import type { HouseInvite, Stay } from "./types";

/*
 * Pre-launch: fewer than LAUNCH_MIN_HOUSES published Houses. They work fully through their link but are "unlisted": not on
 * Explore, not in the sitemap. From that many on, all of them are listed for good.
 */

const isPublished = (stay: Stay) => stay.status === "published" && stay.hostId !== "";

export function isPreLaunch(stays: readonly Stay[]): boolean {
  return stays.filter(isPublished).length < LAUNCH_MIN_HOUSES;
}

/** The first 48h of a House that answers saved searches: only they see it (their token, `hasHeadStart`). */
export const inHeadStart = (stay: Pick<Stay, "priorityUntil">) => stay.priorityUntil !== undefined && stay.priorityUntil > new Date().toISOString();

/** On Explore and in every public list. */
export const isListedStay = (stay: Stay) => isPublished(stay) && stay.visibility !== "unlisted" && !inHeadStart(stay);

/** Someone whose search it answers, in its first 48h: for them it's already on Explore. */
export function hasHeadStart(stay: Stay, invites: readonly HouseInvite[], userId: string | null): boolean {
  return userId !== null && isPublished(stay) && stay.visibility !== "unlisted" && inHeadStart(stay) && invites.some((i) => i.priority && i.houseId === stay.id && i.invitedUserId === userId && i.status === "pending");
}

/** Every House with its visibility: new ones unlisted before the launch, all of them listed after it. The same array if nothing changed. */
export function withLaunchVisibility<T extends Stay>(stays: T[]): T[] {
  const preLaunch = isPreLaunch(stays);
  const target = (stay: T) => (preLaunch ? (stay.visibility ?? "unlisted") : "listed");
  return stays.some((stay) => stay.visibility !== target(stay)) ? stays.map((stay) => ({ ...stay, visibility: target(stay) })) : stays;
}
