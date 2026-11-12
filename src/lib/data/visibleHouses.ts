import { examples, showsExamples, type PlatformPhase } from "@/config/platform";
import type { Stay } from "../types";

/**
 * The one source of the Houses anyone can see (Explore, its filters, counts, the Spotlight and the shelves): the store's Houses for the
 * platform phase. Live: every real House, no examples. Pre-launch and beta: the real Houses (beta: the founding Houses) and the example
 * Houses – an example gives way once its category has `examples.hideCategoryAtRealCount` real Houses, and all examples go at
 * `examples.removeAllAtRealCount` real Houses in all (config/platform.ts). The callers apply listing, head start and blocking on top.
 */
export function getVisibleHouses<T extends Pick<Stay, "isExample" | "vibe" | "status">>(stays: readonly T[], phase: PlatformPhase): T[] {
  const real = stays.filter((s) => !s.isExample);
  if (!showsExamples(phase)) return real;
  const live = real.filter((s) => s.status === "published" || s.status === "booked");
  if (live.length >= examples.removeAllAtRealCount) return real;
  const perVibe = new Map<string, number>();
  for (const s of live) perVibe.set(s.vibe, (perVibe.get(s.vibe) ?? 0) + 1);
  return stays.filter((s) => !s.isExample || (perVibe.get(s.vibe) ?? 0) < examples.hideCategoryAtRealCount);
}
