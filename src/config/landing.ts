// The start page for visitors (/ logged out – CLAUDE.md "Landing"): its sections in order, their pictures, and which words each platform
// phase uses. Structure only – the words are in lib/i18n/en.ts (landing.*), per phase where they differ (landing.phase.<phase>.*) – the i18n
// rule. Logged in, / stays Explore.
import type { FaqRole } from "./faq";
import type { PlatformPhase } from "@/lib/types";

/** Top to bottom. */
export const LANDING_SECTIONS = ["stage", "how", "arc", "houses", "trust", "hosts", "faq", "guides", "closing"] as const;
export type LandingSection = (typeof LANDING_SECTIONS)[number];

/** "How it works" in three steps – one picture each (local files: public/destinations, the demo Houses' photos; no faces in front). */
export const LANDING_STEPS = [
  { id: "find", image: "/destinations/lisbon.jpg" },
  { id: "join", image: "/mock/houses/s1/3.webp" },
  { id: "leave", image: "/destinations/funchal-madeira.jpg" },
] as const;

/** The trust row – each with its icon (lucide) and, if any, a link. */
export const LANDING_TRUST = [
  { id: "verified", icon: "BadgeCheck" },
  { id: "payAfterYes", icon: "Wallet" },
  { id: "helpOnSite", icon: "LifeBuoy" },
  { id: "report", icon: "Flag" },
] as const;

/** The four short questions – the FAQ's own (config/faq.ts, words faq.items.<id>); "All questions" leads to /help. */
export const LANDING_FAQ: readonly { role: FaqRole; id: string }[] = [
  { role: "join", id: "people" },
  { role: "join", id: "payment" },
  { role: "join", id: "cancellation" },
  { role: "host", id: "host-fees" },
];

/** The hosts' teaser picture and the stage picture before the launch. */
export const LANDING_IMAGES = { hosts: "/destinations/palma-mallorca.jpg", prelaunchStage: "/destinations/canggu.jpg" } as const;

/** How many Houses the stage's spotlight and the shelf show. */
export const LANDING_HOUSES = { spotlight: 10, shelf: 10 } as const;

/**
 * Per phase: the stage and the end – before the launch the waitlist ("Opening {month}"), in the beta and live the search and the Houses.
 * `copy`: which word set of landing.phase.* (beta has its own: founding Houses, reserve a spot).
 */
export const LANDING_PHASE: Record<PlatformPhase, { copy: PlatformPhase; stage: "waitlist" | "search"; closing: "waitlist" | "explore"; shelf: "examples" | "open" }> = {
  prelaunch: { copy: "prelaunch", stage: "waitlist", closing: "waitlist", shelf: "examples" },
  beta: { copy: "beta", stage: "search", closing: "explore", shelf: "open" },
  live: { copy: "live", stage: "search", closing: "explore", shelf: "open" },
};
