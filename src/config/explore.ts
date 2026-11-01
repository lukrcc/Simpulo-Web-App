// Explore filter UI – the knobs that decide what the header's filter row shows. The side panel ("Filters") always has
// everything; these only add shortcuts to the row once there are enough Houses for them to pay off.

/**
 * Category chips in the filter row (besides "All") before "More": the first VISIBLE_CHIPS - 1 are fixed (most Houses
 * first), the last one shows whatever was picked from "More". Always exactly this many – the row never scrolls.
 */
export const VISIBLE_CHIPS = 8;

/** From this many Houses (in the feed's scope) on, the row gets its own sort capsule next to Filters. */
export const SORT_INLINE_THRESHOLD = 50;

/** From this many Houses on, the row gets the place / date search field. Built already, not shown at today's numbers. */
export const SEARCH_INLINE_THRESHOLD = 300;

/** The "More" categories popover (a 3-column grid): at most this wide (px). */
export const MORE_POPOVER_MAX_WIDTH = 420;
