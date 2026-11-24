// The footer system: every route has ONE of three footers – large · slim · none, set only here, in the shared layout's one place
// (layout/FooterByRoute.tsx reads only this; no page styles its own). Layouts in the App Router can't hand a prop up to the shell, so the
// "property" lives here, by route. The room above it: --footer-gap (globals.css), the slim one's size: --footer-slim-h / --footer-slim-pad.
//   large – the header's colour (--footer-surface = --header-surface), brand · Places · Themes · Explore · Host · Simpulo · Help · the legal line: Explore, the start
//           page, place pages (/co-living/…), theme collections (/collections/…), /host, /about, the help center (/help). Phones: the
//           columns as groups that open with a tap, links 44px high.
//   slim  – one line on the page's own surface with a fine line on top (--footer-slim-line): Get help · Impressum · Privacy · Terms · Cookies. The other
//           public pages: the House page (/house/…), Safety, Cancellation, the legal pages, guides …
//   none  – everything that is yours (profile, Your houses, a House's members' area, Messages, Settings, Your people, Saved, /invite),
//           Admin and the flows (Open a House, the welcome step, onboarding, the password page).
import { LAUNCH_HUBS } from "./launch";

export type FooterVariant = "large" | "slim" | "none";

const LARGE_EXACT = ["/", "/explore", "/host", "/about", "/help", "/places", "/themes"];
const LARGE_PREFIXES = ["/co-living/", "/collections/", "/themes/"];
/** Flows have no footer: Open a House, the welcome / onboarding step, the password page (/preview, preview gate and demo). Requests and payments are windows
 *  over their page (no page of their own). */
const NONE_EXACT = ["/create", "/welcome", "/preview", "/invite", "/me"];
/** The footer only on public pages (CLAUDE.md "Footer nur auf öffentlichen Seiten"): your own areas have none – the profile (yours and
 *  others'), Your houses, a House's members' area (/h/…), Messages, Settings, Your people, Saved, decisions about you, Open a House. */
const NONE_PREFIXES = ["/messages", "/admin", "/profile", "/u", "/your-houses", "/h", "/settings", "/people", "/saved", "/notices", "/create", "/welcome"];

export function footerOf(pathname: string, search?: URLSearchParams | null): FooterVariant {
  // Onboarding: Edit profile as the first steps (?setup=1) – a flow, no footer.
  if (pathname === "/settings/profile" && search?.get("setup") === "1") return "none";
  if (NONE_EXACT.includes(pathname) || NONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "none";
  if (LARGE_EXACT.includes(pathname) || LARGE_PREFIXES.some((p) => pathname.startsWith(p))) return "large";
  return "slim";
}

/**
 * The large footer's columns (layout/Footer.tsx): Brand · Places · Themes · Explore · Host · Simpulo · Help – all headings in one style, no
 * second level inside a column. Places and Themes are computed from the data (lib/footerLinks.ts, FooterDiscover) and end in "All places →" /
 * "All themes →"; the four columns here are fixed. A link: `key` – its words footer.large.links.<key>; `href` – an existing page
 * (scripts/check-test-routes.ts checks every href against src/app on each build and stops it for a missing page – unless the link carries
 * `hidden` with the reason, then it isn't shown and the check lists it); or `action` – "help" / "idea" open their sheets (no pages).
 * Imports only plain config modules – the build check reads it.
 */
export interface FooterLink {
  key: string;
  href?: string;
  action?: "help" | "idea";
  /** Not shown yet – the reason (a page that doesn't exist yet) */
  hidden?: string;
}
export interface FooterColumn {
  id: "explore" | "host" | "simpulo" | "help";
  links: readonly FooterLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    id: "explore",
    links: [
      { key: "shortTrips", href: "/collections/short-trips" },
      { key: "startingSoon", href: "/collections/starting-soon" },
      { key: "guides", href: "/guides" },
    ],
  },
  {
    id: "host",
    links: [
      { key: "becomeHost", href: "/host" },
      { key: "howHosting", href: "/host#host-how" },
      { key: "hostFromPlace", href: "/help#host-at-home" },
      { key: "hostFaq", href: "/help?cat=hosting" },
    ],
  },
  {
    id: "simpulo",
    links: [
      { key: "about", href: "/about" },
      { key: "howItWorks", href: "/help?cat=joining" },
      { key: "safety", href: "/safety" },
      { key: "guidelines", href: "/community-guidelines" },
      { key: "contact", href: "/contact" },
    ],
  },
  {
    id: "help",
    links: [
      { key: "helpCenter", href: "/help" },
      { key: "getHelp", action: "help" },
      { key: "shareIdea", action: "idea" },
      { key: "cancellation", href: "/cancellation" },
      { key: "reportContent", href: "/report-content" },
    ],
  },
];

/** The overview pages the computed columns end with ("All places →", "All themes →"). */
export const FOOTER_ALL = { places: "/places", themes: "/themes" } as const;

/** The legal line (large: under a thin line, with ©; slim: after "Get help"). */
export const FOOTER_LEGAL: readonly FooterLink[] = [
  { key: "impressum", href: "/impressum" },
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "cookies", href: "/cookies" },
];

/** Every link a footer may show – the fixed ones, the overviews, and the pages the computed columns can point to (the hubs; a theme page
 *  /themes/{theme}) – for the build check. */
export function footerHrefs(): string[] {
  return [
    ...LAUNCH_HUBS.map((p) => `/co-living/${p.slug}`),
    "/themes/fitness",
    FOOTER_ALL.places,
    FOOTER_ALL.themes,
    ...FOOTER_COLUMNS.flatMap((c) => c.links),
    ...FOOTER_LEGAL,
  ].flatMap((l) => (typeof l === "string" ? [l] : l.href && !l.hidden ? [l.href] : []));
}

/** Links marked hidden (not shown, with their reason) – the build check lists them. */
export const hiddenFooterLinks = () => [...FOOTER_COLUMNS.flatMap((c) => c.links), ...FOOTER_LEGAL].filter((l) => l.hidden);

/** How many places and themes the computed columns show (lib/footerLinks.ts): at most this many, places at least `minPlaces` (filled with the
 *  hubs when the data has fewer). */
export const FOOTER_LIST = { max: 5, minPlaces: 3 } as const;
