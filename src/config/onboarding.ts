// Onboarding after signing in (CLAUDE.md "Onboarding"): structure only – the words are in lib/i18n/en.ts onboarding.*.
import type { ProfileSectionKey } from "./profile-sections";

/** The guest's steps, in this order (Edit profile ?setup=1): name → photos → a sentence → vibe → socials → "I'm in for" → done with 3 Houses. */
export const GUEST_ONBOARDING: readonly ProfileSectionKey[] = ["basics", "photos", "about", "vibe", "links", "inFor"];
/** The photos step asks for this many (Edit profile keeps up to MAX_PHOTOS). */
export const ONBOARDING_PHOTOS = { min: 2, max: 4 } as const;
/** "Done": this many matching Houses. */
export const ONBOARDING_HOUSES = 3;

/** The host's steps (/welcome/host): welcome → save your place (optional) → payouts (needed before the first payout) → the first House. */
export const HOST_ONBOARDING = ["welcome", "place", "payouts", "house"] as const;
export type HostOnboardingStep = (typeof HOST_ONBOARDING)[number];
