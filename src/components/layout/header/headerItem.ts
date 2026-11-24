// The header's one text entry (CLAUDE.md "Kopfleiste wie apple.com"): Short trips, Search, Themes, Filters – words only, no capsule and no
// surface in any state. At rest the secondary colour (--hdr-item), on hover, while its panel is open and when chosen the primary one
// (--hdr-item-on), the colour changing in 150ms; 14px regular – an active Short trips filter medium (500).
export const hdrItem =
  "hdr-item inline-flex h-(--header-pill-h) min-w-0 shrink-0 items-center whitespace-nowrap px-2.5 text-nav font-normal text-(--hdr-item) transition-colors duration-150 hover:text-(--hdr-item-on) aria-expanded:text-(--hdr-item-on) data-on:font-medium data-on:text-(--hdr-item-on) focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-(--focus-ring)";
