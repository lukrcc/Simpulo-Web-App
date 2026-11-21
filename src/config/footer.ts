// The footer system: every route has ONE of three footers – large · slim · none, set only here, in the shared layout's one place
// (layout/FooterByRoute.tsx reads only this; no page styles its own). Layouts in the App Router can't hand a prop up to the shell, so the
// "property" lives here, by route. The room above it: --footer-gap (globals.css), the slim one's size: --footer-slim-h / --footer-slim-pad.
//   large – dark (graphite with a warm run), brand · Discover · Host · Simpulo · Help (FOOTER_COLUMNS) · the legal line: Explore, the start
//           page, place pages (/co-living/…), theme collections (/collections/…), /host, /about, the help center (/help). Phones: the
//           columns as groups that open with a tap, links 44px high.
//   slim  – one line on the light ground: Get help · Impressum · Privacy · Terms · Cookies. Every other page: the House page, Your houses,
//           the profile, Settings, Safety, Cancellation, the legal pages …
//   none  – Messages and Admin (one screen each, Impressum and Privacy via the avatar menu › Settings › Legal), and the flows: Open a
//           House's focus mode (its legal line sits under Back/Next), the welcome step, onboarding (/settings/profile?setup=1), login.
export type FooterVariant = "large" | "slim" | "none";

const LARGE_EXACT = ["/", "/explore", "/host", "/about", "/help"];
const LARGE_PREFIXES = ["/co-living/", "/collections/"];
/** Flows have no footer: Open a House, the welcome / onboarding step, the password page (/preview, preview gate and demo). Requests and payments are windows
 *  over their page (no page of their own). */
const NONE_EXACT = ["/create", "/welcome", "/preview"];
const NONE_PREFIXES = ["/messages", "/admin"];

export function footerOf(pathname: string, search?: URLSearchParams | null): FooterVariant {
  // Onboarding: Edit profile as the first steps (?setup=1) – a flow, no footer.
  if (pathname === "/settings/profile" && search?.get("setup") === "1") return "none";
  if (NONE_EXACT.includes(pathname) || NONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "none";
  if (LARGE_EXACT.includes(pathname) || LARGE_PREFIXES.some((p) => pathname.startsWith(p))) return "large";
  return "slim";
}

/**
 * The large footer's columns (layout/Footer.tsx), brand left of them. A link: `key` – its words footer.large.<key>; `href` – an existing page
 * (scripts/check-test-routes.ts checks every href against src/app on each build and stops it for a missing page – unless the link carries
 * `hidden` with the reason, then it isn't shown and the check lists it); or `action` – "help" / "idea" open their sheets (no pages).
 * A plain module without imports – the build check reads it.
 */
export interface FooterLink {
  key: string;
  href?: string;
  action?: "help" | "idea";
  /** Not shown yet – the reason (a page that doesn't exist yet) */
  hidden?: string;
}
export interface FooterColumn {
  id: "discover" | "host" | "simpulo" | "help";
  /** Discover: places and themes as two small lists above its links */
  groups?: true;
  links: readonly FooterLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    id: "discover",
    groups: true,
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
    ],
  },
];

/** The legal line (large: under a thin line, with ©; slim: after "Get help"). */
export const FOOTER_LEGAL: readonly FooterLink[] = [
  { key: "impressum", href: "/impressum" },
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "cookies", href: "/privacy#cookies" },
];

/** Every link a footer may show (places and themes included) – for the build check. */
export function footerHrefs(): string[] {
  return [
    ...FOOTER_PLACES.map((p) => `/co-living/${p.slug}`),
    ...FOOTER_THEMES.map((t) => `/explore?category=${t}`),
    ...FOOTER_COLUMNS.flatMap((c) => c.links),
    ...FOOTER_LEGAL,
  ].flatMap((l) => (typeof l === "string" ? [l] : l.href && !l.hidden ? [l.href] : []));
}

/** Links marked hidden (not shown, with their reason) – the build check lists them. */
export const hiddenFooterLinks = () => [...FOOTER_COLUMNS.flatMap((c) => c.links), ...FOOTER_LEGAL].filter((l) => l.hidden);

/** Discover in the large footer: places (their pages /co-living/{slug}) and themes (Explore filtered – categories have no pages). */
export const FOOTER_PLACES: readonly { slug: string; name: string }[] = [
  { slug: "lisbon", name: "Lisbon" },
  { slug: "canggu", name: "Canggu" },
  { slug: "ericeira", name: "Ericeira" },
  { slug: "bangkok", name: "Bangkok" },
  { slug: "barcelona", name: "Barcelona" },
];
export const FOOTER_THEMES = ["creator", "fitness", "founder", "remote-work", "surf-water"] as const;
