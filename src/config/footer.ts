// The footer system: every route has ONE of three footers – large · slim · none, set only here, in the shared layout's one place
// (layout/FooterByRoute.tsx reads only this; no page styles its own). Layouts in the App Router can't hand a prop up to the shell, so the
// "property" lives here, by route. The room above it: --footer-gap (globals.css), the slim one's size: --footer-slim-h / --footer-slim-pad.
//   large – dark (graphite with a warm run), brand · Discover · Host · Simpulo · the legal line: Explore, the start page, place pages
//           (/co-living/…), theme collections (/collections/…), the host page (/host, when it exists).
//   slim  – one line on the light ground: logo · Help · Share an idea · right Impressum · Privacy · Terms · Cookies · socials. Every other
//           page: the House page, Your houses, the profile, Settings, the help pages (FAQ, Safety, Cancellation, legal) …
//   none  – Messages and Admin (one screen each, Impressum and Privacy via the avatar menu › Settings › Legal), and the flows: Open a
//           House's focus mode (its legal line sits under Back/Next), the welcome step, onboarding (/settings/profile?setup=1), login.
export type FooterVariant = "large" | "slim" | "none";

const LARGE_EXACT = ["/", "/explore", "/host"];
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

/** Discover in the large footer: places (their pages /co-living/{slug}) and themes (Explore filtered – categories have no pages). */
export const FOOTER_PLACES: readonly { slug: string; name: string }[] = [
  { slug: "lisbon", name: "Lisbon" },
  { slug: "canggu", name: "Canggu" },
  { slug: "ericeira", name: "Ericeira" },
  { slug: "bangkok", name: "Bangkok" },
  { slug: "barcelona", name: "Barcelona" },
];
export const FOOTER_THEMES = ["creator", "fitness", "founder", "remote-work", "surf-water"] as const;
