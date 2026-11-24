import { BadgeCheck, Armchair, CalendarDays, Camera, Dumbbell, GraduationCap, House, Landmark, Laptop, Leaf, MessageCircle, Mountain, PartyPopper, Rocket, Star, Sun, User, Users, WavesHorizontal, type LucideIcon, Layers } from "lucide-react";
import type { Vibe } from "@/lib/types";

/** One line icon (16px) per category: before the words in the filter row and in the panel's category capsules. */
export const VIBE_ICONS: Record<Vibe, LucideIcon> = {
  fitness: Dumbbell,
  "surf-water": WavesHorizontal,
  "remote-work": Laptop,
  founder: Rocket,
  creator: Camera,
  wellness: Leaf,
  adventure: Mountain,
  culture: Landmark,
  party: PartyPopper,
  holiday: Sun,
  social: Users,
  students: GraduationCap,
};

/** The panel's "More" dropdowns, each with its icon before the words. */
export const FILTER_ICONS = {
  who: User,
  age: CalendarDays,
  accommodation: House,
  spots: Armchair,
  language: MessageCircle,
  hostExperience: Star,
  verified: BadgeCheck,
  depth: Layers,
} satisfies Record<string, LucideIcon>;

// Explore filter UI – the knobs that decide what the header's filter row shows. The side panel ("Filters") always has
// everything; these only add shortcuts to the row once there are enough Houses for them to pay off.

/**
 * Category chips in the filter row (besides "All") before "More": the first VISIBLE_CHIPS - 1 are fixed (most Houses
 * first), the last one shows whatever was picked from "More". Always exactly this many – the row never scrolls.
 */
export const VISIBLE_CHIPS = 8;




/** The House grid, everywhere: as many columns of at least 260px as fit, at most 6. */
export const HOUSE_GRID = "card-grid house-grid [--card-min:260px] [--card-cols:6]";

/** Explore's grid (and its pages): fixed columns per width – 1 · 2 from 640px · 3 from 1024px · 4 from 1440px – gap 16 / 24px, no auto-fill
 *  (globals.css .explore-grid). Shelves there use .explore-slide: exactly one column wide. */
export const EXPLORE_GRID = "explore-grid";

/** Under the Spotlight, before the grid: at most this many shelves – "Your people are going", then one by state. */
export const TOP_SHELVES_MAX = 2;
/** The shelf by state (Just opened, else Starting soon, else Short trips) only with at least this many Houses. "Your people" from one. */
export const TOP_SHELF_MIN = 4;


/** Below this many published Houses Explore shows its pre-launch view, and Houses are only reachable by link (src/lib/launch.ts). */
export const LAUNCH_MIN_HOUSES = 10;

/** The Spotlight goes on by itself every so often. */
export const SPOTLIGHT_AUTOPLAY_MS = 6_500;
/** sessionStorage: the Spotlight's entrance has played in this session. Read before the first paint too (app/layout.tsx). */
export const SPOTLIGHT_INTRO_KEY = "simpulo:spotlight-intro";

/** The Spotlight only with at least this many Houses to choose from. */
export const SPOTLIGHT_MIN = 5;
/**
 * The results head's counts (CLAUDE.md "Gesamtzahl mit Mindestwert"): the unfiltered "Open Houses" shows its number of Houses only from
 * `showTotalCountMin`, else only "{M} countries" – and that only from `showCountriesMin`. Filtered views always show the number.
 */
export const EXPLORE_COUNTS = { showTotalCountMin: 50, showCountriesMin: 5 } as const;


/** A new House belongs to the people whose search it answers this long: only they see it, and each has a token to join. */
export { SEARCH_HEAD_START_HOURS } from "./policies";


/** Starting soon: starts within this many days. */
export const STARTING_SOON_DAYS = 30;

/** Just opened: at most this many days old, and only the host in it. */
export const JUST_OPENED_DAYS = 7;


/** Cards in one shelf at most; "See all" has the rest. */
export const SHELF_MAX_ITEMS = 24;

/**
 * The Spotlight's line beside the centre card, by the card's category (logged in "member", visitors the more inviting "visitor"): the words in
 * lib/i18n/en.ts (explore.themeLines), read through useSpotlightThemeLines (components/explore/themeLines.ts); a House without a category gets
 * "explore.themeLines.fallback" ("10 houses open right now.").
 */

/** Open Houses loads page by page, only on a click ("Show 24 more"; never on scroll): this many per page, rounded up to full rows. */
export const pageSize = 24;

/**
 * Explore's rhythm (browsing, no filter): Spotlight → band → grid of `rowsPerBlock` rows → band → grid of 4 rows → … (4 rows = 16 cards at 4
 * columns, 12 at 3). The shelves in this order; one with too few Houses (TOP_SHELF_MIN) is skipped, no House in two bands. It goes on after
 * "Show N more" while shelves are left. "peopleGoing": "Your people are going"; every other id is a collection (lib/collections).
 */
export const EXPLORE_RHYTHM = {
  /** Rows of cards in each block of the grid between two rows (CLAUDE.md "Rhythmus aus Raster und Reihen": 2 rows – 8 cards at 4 columns). */
  rowsPerBlock: 2,
  /** The rows between the blocks, in this order (empty ones skipped, never a House twice). "Your people are going" isn't here: signed in it
   *  comes right after the Spotlight, before the first block. */
  shelves: ["justOpened", "shortTrips", "startingSoon", "lastSpot", "party", "trainTogether", "buildTogether", "meetSomeone"],
} as const;

/** From this many columns a real last spot can show two columns wide (lib/highlight.ts feedLayout). */
export const HIGHLIGHT_MIN_COLS = 3;
/** How many cards a page loads: four blocks of 2 rows (4 columns 32, 3 → 24, 2 → 16) – "Show {n} more" loads exactly one, always whole rows. */
export const explorePageSize = (cols: number) => Math.max(1, cols) * EXPLORE_RHYTHM.rowsPerBlock * 4;

/**
 * Explore's vertical spacing, the one place for it (Tailwind classes, so they end up in the CSS). --space-section between
 * all sections, from the bottom of the cards or the button to the next eyebrow; --space-inner inside one (globals.css).
 */
export const EXPLORE_SPACING = {
  /** The Spotlight's top edge in the window, from the bar (--spot-top, globals.css). */
  spotlightTop: "lg:pt-[calc(var(--spot-top)-var(--band-h)-var(--header-h))]",
  /** With the text over the carousel instead (it doesn't fit beside it): from the bar to the text. */
  spotlightTextTop: "lg:pt-[calc(var(--space-inner)+6px)]",
  /** From that title's subline to the centre card. */
  spotlightIntroBottom: "mb-(--space-inner)",
  /** Every section after the first. */
  section: "pt-(--space-section)",
  /** Explore: between two sections (shelves, Open Houses) 72px, a section's head to its content 24px. */
  between: "mt-18",
  headContent: "mt-6",
  /** Open Houses under the hero, from its lowest card, where the Spotlight ends: always 96px. */
  // Under the Spotlight's stage (no strip between) – the stage fills the first screen, so this starts below it.
  underHero: "pt-16",
  /** A scoped feed's first section (collection pages): no hero above it. */
  // A results head with nothing above it (Explore's results, "See all" pages): 32px under the header (CLAUDE.md "Aufräumen – ein Design").
  scopedTop: "pt-8",
  /** The last section to the footer. */
  feedEnd: "pb-(--space-section)",
  /** "Show 24 more" under the grid: 48px (src/components/ui/LoadMore.tsx). */
  showMore: "mt-12",
  /** A shelf inside the list: above it, and below it when the list goes on. */
  shelfTop: "pt-(--space-section)",
  shelfBottom: "pb-(--space-section)",
  /** A row's heading to its cards. */
  rowCards: "mt-(--space-inner)",
} as const;
