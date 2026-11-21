// The legal pages and their languages – no imports, so the build check (scripts/check-legal.ts, run from next.config.ts) can read it.

/** Each has content/legal/<slug>.en.md and a page src/app/<slug>/page.tsx. */
export const LEGAL_PAGES = ["impressum", "privacy", "terms", "cancellation", "cookies", "safety", "community-guidelines"] as const;
export type LegalSlug = (typeof LEGAL_PAGES)[number];

/** English is the one written so far; German is prepared (a <slug>.de.md appears on its own, with the switch). */
export const LEGAL_LANGS = ["en", "de"] as const;
export type LegalLang = (typeof LEGAL_LANGS)[number];
