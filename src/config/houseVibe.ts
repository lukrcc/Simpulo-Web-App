// How someone lives in a House: four questions, each 1–3 (User.houseVibe), each can be skipped. Shown on the profile as words ("Night owl ·
// Balanced · Active · Tidy"), answered in Edit profile › Vibe and the onboarding with three tiles per question. Read by the Crew fit model. Words in messages (profile.vibe.{key}.{1|2|3}).
import { Moon, Sparkles, Users, Zap, type LucideIcon } from "lucide-react";
import type { HouseVibe } from "@/lib/types";

export type HouseVibeKey = keyof HouseVibe;

/** In their order: Early bird ↔ Night owl, Quiet ↔ Social, Active ↔ Chill, Tidy ↔ Relaxed. */
export const HOUSE_VIBE_SCALES: readonly { key: HouseVibeKey; icon: LucideIcon }[] = [
  { key: "rhythm", icon: Moon },
  { key: "social", icon: Users },
  { key: "energy", icon: Zap },
  { key: "tidy", icon: Sparkles },
];

export const HOUSE_VIBE_STEPS = [1, 2, 3] as const;

/** At least one question answered. */
export const hasVibe = (vibe: HouseVibe | undefined): vibe is HouseVibe => vibe !== undefined && HOUSE_VIBE_SCALES.some(({ key }) => vibe[key] !== undefined);
