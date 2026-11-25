// The light mode's one page ground (CLAUDE.md "Ein einheitlicher Seitenhintergrund"): three tones to compare, one is live. The values sit in
// src/styles/tokens.css (--surface-page under :root[data-page-tone]); the root layout puts the choice on <html>. Dark mode doesn't read it.
export type PageTone = "a" | "b" | "c";

/** a #FAF9F7 almost white · b #F7F6F3 paper, slightly warm (default) · c #F3F1ED a little warmer */
export const pageTone: PageTone = "b";

export const PAGE_TONES: Record<PageTone, string> = { a: "#faf9f7", b: "#f7f6f3", c: "#f3f1ed" };
