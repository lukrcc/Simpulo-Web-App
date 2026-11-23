// The header's one text entry (CLAUDE.md "Kopfleiste neu geordnet"): Where, When, Short trips, Themes, Filters – no capsule, the same 36px height
// and size as the tabs; a light surface only on hover or while its menu is open; chosen (a value set, Short trips on) semibold.
export const hdrItem =
  "hdr-item press inline-flex h-(--header-pill-h) min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-nav-main text-ink transition-colors duration-150 hover:bg-(--hdr-tab-hover) aria-expanded:bg-(--hdr-tab-hover) data-on:font-semibold [&_svg]:size-4 [&_svg]:shrink-0";

// Where and When as one unit (CLAUDE.md "Where/When als eine Kapsel"): at rest plain words; hovering either – or the sheet open – one shared,
// faint capsule around both (the wrapper, `hdrPair`), one even surface. Both words always the same colour and weight – at rest, on hover,
// with the sheet open, with a value chosen (CLAUDE.md "Feinschliff"). Never a capsule around one of them alone, never a segment.
export const hdrPair =
  "inline-flex min-w-0 items-center rounded-full transition-colors duration-150 hover:bg-(--hdr-tab-hover) data-open:bg-(--hdr-tab-hover)";
export const hdrSegment =
  "press inline-flex h-(--header-pill-h) min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-nav-main font-medium text-ink transition-colors duration-150 [&_svg]:size-4 [&_svg]:shrink-0";
