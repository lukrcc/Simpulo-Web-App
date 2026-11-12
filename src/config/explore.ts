import { BadgeCheck, Armchair, CalendarDays, Camera, Dumbbell, GraduationCap, House, Landmark, Laptop, Leaf, MessageCircle, Mountain, PartyPopper, Rocket, Star, Sun, User, Users, WavesHorizontal, type LucideIcon } from "lucide-react";
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
} satisfies Record<string, LucideIcon>;

// Explore filter UI – the knobs that decide what the header's filter row shows. The side panel ("Filters") always has
// everything; these only add shortcuts to the row once there are enough Houses for them to pay off.

/**
 * Category chips in the filter row (besides "All") before "More": the first VISIBLE_CHIPS - 1 are fixed (most Houses
 * first), the last one shows whatever was picked from "More". Always exactly this many – the row never scrolls.
 */
export const VISIBLE_CHIPS = 8;



/** The bar's categories on Explore, in this order: as many as fit between Short trips and All filters (at least 2, at most 6); the rest under
 *  "More". Later personalised. */
export const TOP_CATEGORIES: readonly Vibe[] = ["creator", "fitness", "remote-work", "surf-water", "founder", "wellness"];
/** The bar shows at least this many and at most this many categories. */
export const BAR_CATEGORIES_MIN = 2;
export const BAR_CATEGORIES_MAX = 6;

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
export const SPOTLIGHT_AUTOPLAY_MS = 7_000;
/** sessionStorage: the Spotlight's entrance has played in this session. Read before the first paint too (app/layout.tsx). */
export const SPOTLIGHT_INTRO_KEY = "simpulo:spotlight-intro";

/** The Spotlight only with at least this many Houses to choose from. */
export const SPOTLIGHT_MIN = 5;


/** A new House belongs to the people whose search it answers this long: only they see it, and each has a token to join. */
export const SEARCH_HEAD_START_HOURS = 48;


/** Starting soon: starts within this many days. */
export const STARTING_SOON_DAYS = 30;

/** Just opened: at most this many days old, and only the host in it. */
export const JUST_OPENED_DAYS = 7;


/** Cards in one shelf at most; "See all" has the rest. */
export const SHELF_MAX_ITEMS = 24;

/**
 * The Spotlight's line beside the centre card (logged in; visitors: SPOTLIGHT_THEME_LINES_VISITOR), by the card's category: a short sentence, then that category's
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
/** The same line for visitors (logged out): more inviting – what living in such a House is like. */
export const SPOTLIGHT_THEME_LINES_VISITOR: Record<Vibe, string> = {
  fitness: "Train together. Split the villa.",
  "surf-water": "Four strangers, one villa, one swell.",
  "remote-work": "Work mornings. Sunsets with your crew.",
  founder: "Build all day. Dinner with people who get it.",
  creator: "Shoot by day. Edit together at night.",
  wellness: "Slow mornings, one kitchen, real rest.",
  adventure: "Strangers at the start, friends at the top.",
  culture: "A new city, seen with new friends.",
  party: "One villa, one crew, big nights.",
  holiday: "Time off with people worth meeting.",
  social: "Come for the place, stay for the people.",
  students: "Same city, same semester, one House.",
};
/** A House without a category: the number is the sentence. */
export const spotlightThemeFallback = (count: number) => `${count} ${count === 1 ? "house" : "houses"} open right now.`;

/** Open Houses loads page by page, only on a click ("Show 24 more"; never on scroll): this many per page, rounded up to full rows. */
export const pageSize = 24;

/**
 * Explore's rhythm (browsing, no filter): Spotlight → band → grid of `rowsPerBlock` rows → band → grid of 4 rows → … (4 rows = 16 cards at 4
 * columns, 12 at 3). The shelves in this order; one with too few Houses (TOP_SHELF_MIN) is skipped, no House in two bands. It goes on after
 * "Show N more" while shelves are left. "peopleGoing": "Your people are going"; every other id is a collection (lib/collections).
 */
export const EXPLORE_RHYTHM = {
  rowsPerBlock: 4,
  shelves: ["justOpened", "shortTrips", "peopleGoing", "startingSoon", "lastSpot", "party", "trainTogether", "buildTogether", "meetSomeone"],
} as const;

/** From this many columns each block of the grid has one highlight two columns wide (it fills two cells: one card fewer per block). */
export const HIGHLIGHT_MIN_COLS = 3;
/** Cards in one block of the grid: columns × rowsPerBlock, one fewer with the highlight (4 columns 15, 3 → 11, 2 → 8). */
export const exploreBlockSize = (cols: number) => Math.max(1, cols) * EXPLORE_RHYTHM.rowsPerBlock - (cols >= HIGHLIGHT_MIN_COLS ? 1 : 0);
/** How many cards a page loads: two blocks (4 columns 30, 3 → 22, 2 → 16) – "Show {n} more" loads exactly one page. */
export const explorePageSize = (cols: number) => exploreBlockSize(cols) * 2;

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
  /** Explore: between two sections (shelves, Open Houses) 72px, a section's head to its content 24px. */
  between: "mt-18",
  headContent: "mt-6",
  /** Open Houses under the hero, from its lowest card, where the Spotlight ends: always 96px. */
  underHero: "pt-24",
  /** A scoped feed's first section (collection pages): no hero above it. */
  scopedTop: "pt-(--space-inner)",
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
