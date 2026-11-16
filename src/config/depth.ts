// The social depth of a House – Easy · Balanced · Deep: the one place for the levels, what each one switches on in the arc of a House, the
// suggestion per topic and how the onboarding question "How much community do you need?" weighs into the order on Explore.
// The app's words are in messages (depth.*), the admin's German labels here (ARC_MODULES) and in lib/i18n/admin.de.ts.
// Behind config/platform.ts depthChoiceEnabled (off by default): while off every House counts as Balanced and nothing of it shows.
import type { Stay, Vibe } from "@/lib/types";

export type Depth = "easy" | "balanced" | "deep";
export const DEPTHS: readonly Depth[] = ["easy", "balanced", "deep"];
export const DEFAULT_DEPTH: Depth = "balanced";

/** A House's depth: its own, else Balanced – and always Balanced while the choice is switched off. */
export function depthOf(stay: Pick<Stay, "depth">, enabled: boolean): Depth {
  return enabled ? (stay.depth ?? DEFAULT_DEPTH) : DEFAULT_DEPTH;
}

/**
 * Open a House preselects this per topic (the host can change it). Party → Easy, Founder → Deep, the rest Balanced. A suggestion to tune –
 * ski trips and short trips lean Easy too, but they aren't topics (the mock sets them, lib/mock-depth.ts).
 */
export const DEPTH_BY_TOPIC: Partial<Record<Vibe, Depth>> = {
  party: "easy",
  founder: "deep",
};
export const suggestedDepth = (topic: Vibe | null | undefined): Depth => (topic && DEPTH_BY_TOPIC[topic]) || DEFAULT_DEPTH;

/** Shown as a small capsule ("Deep House") on cards and the House page – Balanced is the default and stays quiet (no capsule). */
export const DEPTH_CAPSULE: readonly Depth[] = ["easy", "deep"];

// ── What each level switches on in the arc of a House ────────────────────────────────────────────────────────────────────────────
// The building blocks themselves are built in their own steps; here only which one is on at which level. Labels German (admin).

export type ArcModuleKey = "intention" | "questionCards" | "agreement" | "halftime" | "closing" | "after";

/** null = off ("–"); otherwise what the level gets. */
export const ARC_MODULES: readonly { key: ArcModuleKey; label: string; levels: Record<Depth, string | null> }[] = [
  { key: "intention", label: "Absicht vorher", levels: { easy: null, balanced: "optional", deep: "ja" } },
  { key: "questionCards", label: "Fragenkarten", levels: { easy: null, balanced: "leicht", deep: "alle Stufen" } },
  { key: "agreement", label: "House agreement", levels: { easy: "ja", balanced: "ja", deep: "ja" } },
  { key: "halftime", label: "Halbzeit", levels: { easy: null, balanced: null, deep: "ja" } },
  { key: "closing", label: "Abschlussrunde", levels: { easy: null, balanced: "eine Frage", deep: "drei Fragen" } },
  {
    key: "after",
    label: "Danach",
    levels: { easy: "Mit wem wieder + Bewertung", balanced: "Mit wem wieder + Bewertung + Absicht erreicht", deep: "Mit wem wieder + Bewertung + Absicht erreicht + 30-Tage-Frage" },
  },
];

/** Whether a building block is on at a level (for the blocks once they're built). */
export const arcModuleOn = (key: ArcModuleKey, depth: Depth) => ARC_MODULES.find((m) => m.key === key)?.levels[depth] != null;

// ── Matching: "How much community do you need?" ─────────────────────────────────────────────────────────────────────────────────

/** The onboarding question's answer (User.communityNeed): 1 a little · 2 some · 3 a lot. */
export type CommunityNeed = 1 | 2 | 3;
export const COMMUNITY_NEEDS: readonly CommunityNeed[] = [1, 2, 3];

/** Which depth fits which answer: quiet → Easy, some → Balanced, a lot → Deep. */
export const DEPTH_FOR_NEED: Record<CommunityNeed, Depth> = { 1: "easy", 2: "balanced", 3: "deep" };

/**
 * Interest ranking (config/models.ts interestRanking): in the default order ("Soonest first") a House at the depth that fits counts as
 * starting this many days earlier, one level off as unchanged, two levels off as this many days later. A recommendation only – never a filter,
 * nothing is hidden.
 */
export const DEPTH_MATCH_WEIGHT = { matchDays: 5, farOffDays: 3 } as const;

/** Days to shift a House's start in the default order for this viewer (negative = earlier). 0 without an answer. */
export function depthShiftDays(depth: Depth, need: CommunityNeed | undefined): number {
  if (!need) return 0;
  const distance = Math.abs(DEPTHS.indexOf(depth) - DEPTHS.indexOf(DEPTH_FOR_NEED[need]));
  return distance === 0 ? -DEPTH_MATCH_WEIGHT.matchDays : distance === 2 ? DEPTH_MATCH_WEIGHT.farOffDays : 0;
}
