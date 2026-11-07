// Layout of the Explore "Open Houses" grid – a plain grid of equal cards (one HouseCard each, all the same size). Rule-based only: the same Houses in
// the same order always give the same layout (no randomness, no time).

/** Houses the Spotlight shows on load (the coverflow's five cards) – they never open the grid. */
export const SPOTLIGHT_VISIBLE = 5;

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
