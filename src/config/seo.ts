// The SEO pages (CLAUDE.md "SEO-Seiten"): city pages (/co-living/[city]), theme pages (/collections/[slug]) and the guides (/guides).
// Structure only – the words are in lib/i18n/en.ts (seo.*, guides.*), the i18n rule. Every city and theme page uses the template (its
// intro, four questions); one can override it (`CITY_SEO` / `COLLECTION_SEO`: its own intro, its own questions – the words then under
// seo.cityOverrides.<slug> / seo.collectionOverrides.<id>).
import type { Vibe } from "@/lib/types";

/** The template's questions for a city / a theme (words seo.cityFaq.<id> / seo.collectionFaq.<id>, the city or theme as {name}). */
export const CITY_FAQ = ["how", "length", "cost", "open"] as const;
export const COLLECTION_FAQ = ["what", "who", "cost", "open"] as const;

/** Per city (slug): its own intro and/or its own questions instead of the template's. Empty until someone writes them. */
export const CITY_SEO: Readonly<Record<string, { intro?: true; faq?: readonly string[] }>> = {};

/**
 * Per theme collection (id): the category its waitlist is about (an empty page: "Join the waitlist" for this theme), and optional own
 * words (intro, questions) like the cities.
 */
export const COLLECTION_SEO: Readonly<Record<string, { category?: Vibe; intro?: true; faq?: readonly string[] }>> = {
  party: { category: "party" },
  trainTogether: { category: "fitness" },
  buildTogether: { category: "founder" },
  meetSomeone: { category: "social" },
};

/** "Starting soon" on a city / theme page: at most this many Houses, the soonest first (Explore's STARTING_SOON_DAYS). */
export const SEO_STARTING_SOON = 4;

/**
 * The guides (/guides/[slug]): question-and-answer articles. `sections` – how many questions (words guides.articles.<id>.s<n>.q / .a,
 * paragraphs split by a blank line); `houses` – which Houses fit at the end (a category, short trips, or the soonest); `published` – the
 * date in the Article data; `image` – a local picture (no faces in front).
 */
export const GUIDES = [
  { slug: "share-a-villa-solo", id: "villaSolo", sections: 6, houses: { kind: "category", vibe: "holiday" }, published: "2026-11-21", image: "/destinations/canggu.jpg" },
  { slug: "roommates-for-a-month-abroad", id: "roommatesMonth", sections: 7, houses: { kind: "soonest" }, published: "2026-11-21", image: "/destinations/lisbon.jpg" },
  { slug: "split-accommodation-digital-nomads", id: "splitNomads", sections: 7, houses: { kind: "category", vibe: "remote-work" }, published: "2026-11-21", image: "/destinations/chiang-mai.jpg" },
  { slug: "is-co-living-worth-it", id: "worthIt", sections: 7, houses: { kind: "soonest" }, published: "2026-11-21", image: "/destinations/funchal-madeira.jpg" },
  { slug: "make-friends-in-a-new-city", id: "friendsNewCity", sections: 8, houses: { kind: "category", vibe: "social" }, published: "2026-11-21", image: "/destinations/tbilisi.jpg" },
] as const satisfies readonly { slug: string; id: string; sections: number; houses: { kind: "category"; vibe: Vibe } | { kind: "soonest" }; published: string; image: string }[];
export type Guide = (typeof GUIDES)[number];

/** How many fitting Houses a guide shows at its end. */
export const GUIDE_HOUSES = 4;
