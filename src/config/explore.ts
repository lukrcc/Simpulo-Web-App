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

/** The House grid, everywhere: 4 columns from 1600px, 3 from 1100px, 2 from 700px, else 1. GRID_COLUMNS says the same for code. */
export const HOUSE_GRID = "grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 md:gap-6 min-[1100px]:grid-cols-3 min-[100rem]:grid-cols-4";
export const GRID_COLUMNS = [
  { query: "(min-width: 1600px)", cols: 4 },
  { query: "(min-width: 1100px)", cols: 3 },
  { query: "(min-width: 700px)", cols: 2 },
] as const;

/** A shelf goes into Open Houses after this many full rows of the grid. */
export const SHELF_EVERY_ROWS = 3;

/** Below this many published Houses Explore shows its pre-launch view, and Houses are only reachable by link (src/lib/launch.ts). */
export const LAUNCH_MIN_HOUSES = 10;

/** The Spotlight only with at least this many Houses to choose from. */
export const SPOTLIGHT_MIN = 5;

/** A destination is on a public card only with at least this many people interested (and approved). */
export const DESTINATION_MIN_INTEREST = 3;

/** From this many listed Houses, curated destinations show even without that many people. */
export const DESTINATIONS_ALL_FROM_HOUSES = 50;

/*
 * The shelves' thresholds. To see the theme shelves in dev: lower THEME_SHELVES_MIN_TOTAL and THEME_SHELF_MIN_ITEMS here
 * (the Full data state has 100 Houses, with 5 to 24 per theme).
 */
/** Short trips only with at least this many Houses of up to 5 nights. */
export const SHORT_TRIPS_MIN = 8;

/** Theme shelves (Party houses, Train together, …) only from this many Houses overall. */
export const THEME_SHELVES_MIN_TOTAL = 300;

/** A theme shelf only with at least this many Houses of its own. */
export const THEME_SHELF_MIN_ITEMS = 12;

export const MAX_THEME_SHELVES = 4;

/** Cards in one shelf at most; "See all" has the rest. */
export const SHELF_MAX_ITEMS = 24;

/**
 * Explore's vertical spacing, the one place for it (Tailwind classes, so they end up in the CSS). 96px between all
 * sections, from the bottom of the cards or the button to the next eyebrow.
 */
export const EXPLORE_SPACING = {
  /** The Spotlight's content under the header's bar, clear of the nav tab. */
  spotlightTop: "lg:pt-12",
  /** Every section after the first. */
  section: "pt-24",
  /** Open Houses under the hero. From lg 96px from the centre card: the Spotlight's own 640px keep 53.5px below it. */
  underHero: "pt-24 lg:pt-[42.5px]",
  /** A scoped feed's first section (collection pages): no hero above it. */
  scopedTop: "pt-8",
  /** The last section to the footer. */
  feedEnd: "pb-24",
  /** "Show 24 more" under the grid. */
  showMore: "mt-10",
  /** A shelf inside the list: above it, and below it when the list goes on. */
  shelfTop: "pt-24",
  shelfBottom: "pb-24",
  /** A row's heading to its cards. */
  rowCards: "mt-8",
} as const;
