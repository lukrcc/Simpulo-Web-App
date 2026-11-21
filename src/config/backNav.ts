/**
 * The way back in the installed app (CLAUDE.md "Zurück-Pfeil auf jeder Unterseite"): it has no browser back button, so every sub-page needs
 * an arrow. Pages with their own arrow in their head keep it (House page, member page, profiles, Edit profile, Payouts, "See all", a chat,
 * Open a House's ✕); every other sub-page gets one in the header, left of the wordmark (layout/HeaderBack.tsx). The tab roots have none.
 */

/** The top level – reached from the header's tabs or the tab bar, nothing to go back to. */
const ROOTS = ["/", "/explore", "/your-houses", "/messages"];

/** Pages that draw their own arrow (BackButton / BackLink in their head) – the header shows none, so there's only one. */
const OWN_BACK = ["/house/", "/h/", "/u/", "/profile", "/me", "/settings/profile", "/settings/delete-account", "/your-houses/payouts", "/your-houses/all/", "/messages/", "/create", "/admin", "/preview"];

/** Where the arrow leads when there's no page of ours to go back to (a freshly launched app): the sensible parent. */
const PARENTS: [prefix: string, parent: string][] = [
  ["/people", "/profile"],
  ["/saved", "/profile"],
  ["/settings", "/profile"],
  ["/invite/", "/your-houses"],
  ["/claim/", "/your-houses"],
];

/** The header's back target for this path in the installed app – null on the roots and on pages with their own arrow. */
export function headerBackFor(pathname: string): string | null {
  if (ROOTS.includes(pathname)) return null;
  if (OWN_BACK.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)))) return null;
  return PARENTS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))?.[1] ?? "/explore";
}
