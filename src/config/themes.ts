// The themes – ONE list (CLAUDE.md "Themen erweiterbar"): every top theme and every sub theme with a fixed id, its status (active ·
// hidden) and optionally the theme it was merged into. Statistics, filters, Explore and Open a House read only this list (lib/catalog.ts
// VIBES is derived from it), so a new entry shows up everywhere by itself. Renaming changes only the words (lib/i18n/en.ts common.vibes,
// admin.de.ts themes.sub), never the id; a merged theme counts towards its target in every statistic (lib/themes.ts themeOf).
// Sub themes and the hosts' free labels: `keywords` sort a House's own label (Stay.customVibe) or its title under a sub theme – and so
// under its top theme; a label no keyword knows lands under "Sonstige" in Admin › Houses › Themen, listed for sorting in.
// Structure only, no words (CLAUDE.md "Configs halten Struktur, keine Wörter").
// TODO(backend, Backlog "Themen im Admin pflegen"): edit this list in Admin › System › Themen, stored through the data adapter.

export type ThemeStatus = "active" | "hidden";

export interface ThemeDef {
  id: string;
  status: ThemeStatus;
  /** Merged into this theme (its id) – statistics count it there; it no longer appears in lists */
  mergedInto?: string;
}

export interface SubThemeDef extends ThemeDef {
  /** Its top theme (a THEMES id) */
  parent: TopThemeId;
  /** Lower-case words that sort a host's label or a House's title under it */
  keywords: readonly string[];
}

/** The top themes, in the order lists show them. */
export const THEMES = [
  { id: "fitness", status: "active" },
  { id: "surf-water", status: "active" },
  { id: "remote-work", status: "active" },
  { id: "founder", status: "active" },
  { id: "creator", status: "active" },
  { id: "wellness", status: "active" },
  { id: "adventure", status: "active" },
  { id: "culture", status: "active" },
  { id: "party", status: "active" },
  { id: "holiday", status: "active" },
  { id: "social", status: "active" },
  { id: "students", status: "active" },
] as const satisfies readonly ThemeDef[];

export type TopThemeId = (typeof THEMES)[number]["id"];

/** The sub themes under the top themes, with the words that sort labels and titles under them. */
export const SUB_THEMES: readonly SubThemeDef[] = [
  { id: "running", parent: "fitness", status: "active", keywords: ["run", "marathon", "trail"] },
  { id: "martial-arts", parent: "fitness", status: "active", keywords: ["muay thai", "bjj", "boxing", "martial", "jiu"] },
  { id: "strength", parent: "fitness", status: "active", keywords: ["gym", "strength", "crossfit", "lifting"] },
  { id: "yoga", parent: "wellness", status: "active", keywords: ["yoga", "pilates", "breathwork"] },
  { id: "retreat", parent: "wellness", status: "active", keywords: ["retreat", "sober", "detox", "meditation", "silent"] },
  { id: "surf", parent: "surf-water", status: "active", keywords: ["surf"] },
  { id: "dive-sail", parent: "surf-water", status: "active", keywords: ["dive", "diving", "sail", "kite", "freedive"] },
  { id: "nomads", parent: "remote-work", status: "active", keywords: ["remote", "nomad", "cowork", "laptop"] },
  { id: "startup", parent: "founder", status: "active", keywords: ["founder", "startup", "build", "hack"] },
  { id: "music", parent: "creator", status: "active", keywords: ["music", "producer", "dj", "band"] },
  { id: "film-photo", parent: "creator", status: "active", keywords: ["film", "photo", "video", "stream", "content"] },
  { id: "writing", parent: "creator", status: "active", keywords: ["writer", "writing", "thesis", "book"] },
  { id: "mountains", parent: "adventure", status: "active", keywords: ["ski", "hike", "climb", "mountain", "trek", "snow"] },
  { id: "language", parent: "culture", status: "active", keywords: ["language", "spanish", "japanese", "learn"] },
  { id: "food", parent: "culture", status: "active", keywords: ["food", "cook", "wine", "kitchen"] },
  { id: "festival", parent: "party", status: "active", keywords: ["festival", "carnival", "rave", "new year", "nye"] },
  { id: "study", parent: "students", status: "active", keywords: ["study", "exam", "semester", "student"] },
];

export type SubThemeId = string;
