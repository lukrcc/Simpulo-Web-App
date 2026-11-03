// Layout of the Explore "Open Houses" grid – a plain grid of equal cards (MVP). Rule-based only: the same Houses in
// the same order always give the same layout (no randomness, no time).
import type { Stay } from "./types";

export type CardVariant = "default" | "wide" | "tall";

/** Houses the Spotlight shows on load (the coverflow's five cards) – they never open the grid. */
export const SPOTLIGHT_VISIBLE = 5;

/**
 * The one place that decides a card's variant. MVP: every card is default – the wide (almost full) and tall
 * (featured, later: boost) variants still exist in StayCard and can come back here.
 */
export function getCardVariant(stay: Stay, spotlightIds: ReadonlySet<string>): CardVariant {
  // The rules for later (unused for now): featured and not in the Spotlight → tall; one spot left → wide.
  void stay;
  void spotlightIds;
  return "default";
}

/**
 * The feed order with the Spotlight's Houses kept out of the first grid row: they move just behind it (in their
 * order), everything else keeps its place.
 */
export function withoutSpotlightUpFront<T extends { id: string }>(items: readonly T[], spotlightIds: ReadonlySet<string>, cols: number): T[] {
  const firstRow: T[] = [];
  const moved: T[] = [];
  let i = 0;
  for (; i < items.length && firstRow.length < cols; i++) (spotlightIds.has(items[i].id) ? moved : firstRow).push(items[i]);
  return [...firstRow, ...moved, ...items.slice(i)];
}
