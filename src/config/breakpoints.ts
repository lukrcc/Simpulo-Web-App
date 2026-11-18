/*
 * The screen classes – ONE place for JS (CLAUDE.md "Mobile"). globals.css carries the same values in its @theme (--breakpoint-*), its
 * @custom-variant and its @media rules; change both together.
 *
 *   Phone    < 768px          Tailwind: max-md:            JS: MEDIA.phone
 *   Tablet   768 – 1099px     Tailwind: md:  max-split:    JS: MEDIA.tabletUp && !MEDIA.desktop
 *   Desktop  ≥ 1100px         Tailwind: split:             JS: MEDIA.desktop, useIsDesktop()
 *
 * The other named widths (kept, documented here):
 *   md        768px  = start of Tablet (Tailwind default, written out in globals.css)
 *   nav-text  1024px = header tabs as words from here, icons below (= Tailwind lg)
 *   split     1100px = start of Desktop: two-column layouts, the stage side by side, master–detail
 *   nav       1200px = the header's wider spacing
 *   wide      1440px = the Explore grid's 4th column
 *   fit       ≥ 1100px wide AND ≥ 760px high (@custom-variant fit): layouts that need the whole window
 */
export const BREAKPOINTS = {
  /** Phone ends below this; Tablet starts here (Tailwind md) */
  tablet: 768,
  /** = Tailwind lg / nav-text */
  lg: 1024,
  /** Desktop starts here (split) */
  desktop: 1100,
  nav: 1200,
  wide: 1440,
} as const;

/** Media queries built from the values above – for matchMedia, useMediaQuery and <img sizes>. */
export const MEDIA = {
  phone: `(max-width: ${BREAKPOINTS.tablet - 0.02}px)`,
  tabletUp: `(min-width: ${BREAKPOINTS.tablet}px)`,
  belowLg: `(max-width: ${BREAKPOINTS.lg - 0.02}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  wide: `(min-width: ${BREAKPOINTS.wide}px)`,
} as const;
