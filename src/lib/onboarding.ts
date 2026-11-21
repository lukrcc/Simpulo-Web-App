// Onboarding (CLAUDE.md "Onboarding"): the guest's progress, the host's checklist, three Houses to start with. Pure.
import { ONBOARDING_HOUSES, HOST_ONBOARDING, type HostOnboardingStep } from "@/config/onboarding";
import { PROFILE_SECTIONS, sectionDone } from "@/config/profile-sections";
import { inForMatches, type InFor } from "./inFor";
import { placesOf } from "./ownPlaces";
import type { Place, Stay, User } from "./types";
import { openSpots } from "./utils";

/** The profile's "4 of 6" (the sections that count, like Edit profile). */
export function profileProgress(user: User, today: string | null): { done: number; total: number } {
  const counted = PROFILE_SECTIONS.filter((s) => s.progress !== false);
  return { done: counted.filter((s) => sectionDone(s.key, user, today)).length, total: counted.length };
}

/** In this page load the guest onboarding was open – the "Finish your profile" card waits for the next visit. */
let onboardingThisLoad = false;
export const markOnboardingThisLoad = () => {
  onboardingThisLoad = true;
};
export const onboardingOpenedThisLoad = () => onboardingThisLoad;

/** "Finish your profile" (once, dismissable): an account that didn't finish onboarding and whose profile isn't complete – on a later visit. */
export function showsFinishCard(user: User | undefined, today: string | null): boolean {
  if (!user || onboardingThisLoad) return false;
  const o = user.settings?.onboarding;
  // Only who started and left it (older accounts never saw the onboarding – Edit profile's "5 of 6" is their way).
  if (o?.guest !== "started" || o?.finishCardSeen) return false;
  const p = profileProgress(user, today);
  return p.done < p.total;
}

/** Three open Houses to start with: what you're in for first, then your themes, then the soonest. Not your own, not full, not started. */
export function startingHouses(stays: readonly Stay[], me: User, inFor: readonly InFor[], today: string): Stay[] {
  const open = stays.filter((s) => s.status === "published" && s.hostId !== me.id && !s.isExample && s.startDate > today && openSpots(s) > 0 && s.visibility !== "unlisted");
  const mine = inFor.filter((i) => i.userId === me.id);
  const score = (s: Stay) => (mine.some((i) => inForMatches(i, { ...s, vibe: s.vibe })) ? 2 : 0) + ((me.interests ?? []).includes(s.vibe) ? 1 : 0);
  return open.toSorted((a, b) => score(b) - score(a) || a.startDate.localeCompare(b.startDate)).slice(0, ONBOARDING_HOUSES);
}

export interface HostStep {
  id: HostOnboardingStep;
  done: boolean;
  skipped: boolean;
}

/** The host's checklist: each step done (or skipped – only the place can be). Payouts: from the payout account's status. */
export function hostSteps(data: { stays: readonly Stay[]; places: readonly Place[] }, me: User, payoutReady: boolean): HostStep[] {
  const skipped = new Set(me.settings?.onboarding?.hostSkipped ?? []);
  const started = me.settings?.onboarding?.host !== undefined;
  const hosts = data.stays.some((s) => s.hostId === me.id && s.status !== "draft" && s.status !== "draft_unclaimed" && !s.isExample);
  const done: Record<HostOnboardingStep, boolean> = { welcome: started, place: placesOf(data, me.id).length > 0, payouts: payoutReady, house: hosts };
  return HOST_ONBOARDING.map((id) => ({ id, done: done[id], skipped: skipped.has(id) && !done[id] }));
}

/** All done (a skipped place counts as done). */
export const hostOnboardingComplete = (steps: readonly HostStep[]) => steps.every((s) => s.done || s.skipped);
