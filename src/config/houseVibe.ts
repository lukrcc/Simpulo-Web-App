// How someone lives in a House: four scales, each 1–3 (User.houseVibe). Shown on the profile (Vibe row: icon + where they lean, three dots),
// set in Edit profile › About you. Words in messages (profile.vibe.{key}.{1|2|3}).
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
