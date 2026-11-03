import type { Vibe } from "@/lib/types";

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

/** The House grid, everywhere: as many columns of at least 300px as fit, at most 5 (the 1680px container then keeps a card under 380px). */
export const HOUSE_GRID = "card-grid house-grid [--card-min:300px] [--card-cols:5]";

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
 * The Spotlight's line beside the centre card (logged in), by the card's category: a short sentence, then that category's
 * open Houses. Later in en.json.
 */
export const SPOTLIGHT_THEME_LINES: Record<Vibe, string> = {
  fitness: "Train with people who show up.",
  "surf-water": "Waves before breakfast.",
  "remote-work": "Deep work, good people.",
  founder: "Build it with people who get it.",
  creator: "Make things together.",
  wellness: "Slow mornings, real rest.",
  adventure: "Out there, together.",
  culture: "See it with people who care.",
  party: "Big nights, one villa.",
  holiday: "Time off, in good company.",
  social: "Come for the place, stay for the people.",
  students: "Study less alone.",
};
/** A House without a category: the number is the sentence. */
export const spotlightThemeFallback = (count: number) => `${count} ${count === 1 ? "house" : "houses"} open right now.`;

/**
 * Explore's vertical spacing, the one place for it (Tailwind classes, so they end up in the CSS). --space-section between
 * all sections, from the bottom of the cards or the button to the next eyebrow; --space-inner inside one (globals.css).
 */
export const EXPLORE_SPACING = {
  /** The Spotlight's top edge in the window, from the bar (--spot-top, globals.css). */
  spotlightTop: "lg:pt-[calc(var(--spot-top)-var(--band-h)-64px)]",
  /** With the text over the carousel instead (it doesn't fit beside it): from the bar to the text. */
  spotlightTextTop: "lg:pt-[calc(var(--space-inner)+6px)]",
  /** From that title's subline to the centre card. */
  spotlightIntroBottom: "mb-(--space-inner)",
  /** Every section after the first. */
  section: "pt-(--space-section)",
  /** Open Houses under the hero, from its lowest card, where the Spotlight ends. */
  underHero: "pt-(--space-section)",
  /** A scoped feed's first section (collection pages): no hero above it. */
  scopedTop: "pt-(--space-inner)",
  /** The last section to the footer. */
  feedEnd: "pb-(--space-section)",
  /** "Show 24 more" under the grid. */
  showMore: "mt-(--space-inner)",
  /** A shelf inside the list: above it, and below it when the list goes on. */
  shelfTop: "pt-(--space-section)",
  shelfBottom: "pb-(--space-section)",
  /** A row's heading to its cards. */
  rowCards: "mt-(--space-inner)",
} as const;
