import type { Stay } from "./types";

/** One card of Explore's grid and whether it spans two columns. */
export interface FeedItem {
  stay: Stay;
  wide: boolean;
}

/** At most one wide card per this many cards (CLAUDE.md "Explore – breite Karte nur für echten letzten Platz"). */
export const WIDE_EVERY = 8;

/**
 * Explore's browsing grid, laid out in advance (CLAUDE.md "Explore – breite Karte nur für echten letzten Platz", "Rhythmus aus Raster und
 * Reihen"):
 * - a card spans two columns only if `isWide` says so (a real House with exactly one free spot – never simulated) and the last wide card is
 *   at least WIDE_EVERY cards back; it never lands in the last column (the next card fills it, the wide one opens the next row);
 * - every block ends on full rows (`rowsPerBlock`; a wide card counts as two cells) – the rows of cards between the grid's blocks;
 * - a House in `avoid(block)` (the row right before that block) waits for a later block – never the same House twice in a row of the eye;
 * - `fullRowsOnly`: more is still to come (paging), so a last half row is left out – it shows once the next page is there.
 */
export function feedLayout(
  stays: readonly Stay[],
  cols: number,
  rowsPerBlock: number,
  isWide: (stay: Stay) => boolean,
  { avoid, fullRowsOnly = false }: { avoid?: (block: number) => ReadonlySet<string> | undefined; fullRowsOnly?: boolean } = {},
): FeedItem[][] {
  const blocks: FeedItem[][] = [];
  let block: FeedItem[] = [];
  let col = 0;
  let row = 0;
  let sinceWide = Number.POSITIVE_INFINITY;
  const queue = [...stays];
  // Houses waiting for a later block (the row before this one showed them), and a wide card waiting for the next row's start.
  let waiting: Stay[] = [];
  let wideNext: Stay | null = null;
  const blocked = (stay: Stay) => avoid?.(blocks.length)?.has(stay.id) ?? false;
  const place = (stay: Stay, wide: boolean) => {
    block.push({ stay, wide });
    col += wide ? 2 : 1;
    sinceWide = wide ? 1 : sinceWide + 1;
    if (col >= cols) {
      col = 0;
      row += 1;
      if (row >= rowsPerBlock) {
        blocks.push(block);
        block = [];
        row = 0;
      }
    }
  };
  const next = (): Stay | null => {
    // A wide card held back for the start of a row goes first, once the row starts.
    if (wideNext && col === 0) {
      const stay = wideNext;
      wideNext = null;
      return stay;
    }
    const ready = waiting.findIndex((s) => !blocked(s));
    if (ready >= 0) return waiting.splice(ready, 1)[0];
    while (queue.length > 0) {
      const stay = queue.shift()!;
      if (!blocked(stay)) return stay;
      waiting.push(stay);
    }
    // Nothing else left: what waits is placed after all.
    if (waiting.length > 0) return waiting.shift()!;
    if (wideNext) {
      const stay = wideNext;
      wideNext = null;
      return stay;
    }
    return null;
  };
  for (let stay = next(); stay; stay = next()) {
    const wanted = cols >= 3 && sinceWide >= WIDE_EVERY && isWide(stay);
    if (wanted && col <= cols - 2) place(stay, true);
    else if (wanted && col === cols - 1 && (queue.length > 0 || waiting.length > 0)) wideNext = stay;
    else place(stay, false);
  }
  if (block.length > 0) {
    if (fullRowsOnly && col > 0) {
      // Leave out the half row at the end (its cards come with the next page).
      let cells = col;
      while (cells > 0 && block.length > 0) cells -= block.pop()!.wide ? 2 : 1;
    }
    if (block.length > 0) blocks.push(block);
  }
  waiting = [];
  return blocks;
}
