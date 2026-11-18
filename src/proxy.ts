import { NextResponse, type NextRequest } from "next/server";
import { previewGateOn } from "@/config/preview";
import { APP_MODE } from "@/lib/appMode";
import { DEMO_COOKIE, validDemoCookie } from "@/lib/demoAuth";
import { VIEWER_COUNTRY_COOKIE } from "@/lib/currency";
import { PREVIEW_COOKIE, validPreviewCookie } from "@/lib/previewAuth";

/*
 * Two gates, one door (/preview):
 * - the preview gate (config/preview.ts): before launch the whole site needs the password SITE_PASSWORD; a right password sets a signed
 *   cookie for 90 days. A cookie instead of HTTP Basic Auth, because the web app on the iPhone home screen runs apart from Safari and
 *   asked for Basic Auth on every start.
 * - the demo (NEXT_PUBLIC_APP_MODE=demo): its own password DEMO_PASSWORD and cookie.
 * Without a valid cookie a page goes to /preview?next=<path>, and back afterwards. What the door and the home screen need stays open.
 */

const DOOR = "/preview";
const NOINDEX = "noindex, nofollow";

/** Open without a cookie: the web app manifest and every icon (fetched without cookies), robots.txt, Next's assets and the share images. */
const PUBLIC_FILE = /^\/(manifest\.webmanifest|robots\.txt|favicon[^/]*|icon[^/]*|apple-touch-icon[^/]*)$/;
const SHARE_IMAGE = /\/(opengraph|twitter)-image(-[^/]*)?$/;

function isPublic(pathname: string): boolean {
  return pathname === DOOR || pathname.startsWith("/_next/") || PUBLIC_FILE.test(pathname) || SHARE_IMAGE.test(pathname);
}

/** Is this visitor through every gate that is on? */
function through(request: NextRequest): boolean {
  if (previewGateOn() && !validPreviewCookie(request.cookies.get(PREVIEW_COOKIE)?.value)) return false;
  if (APP_MODE === "demo" && !validDemoCookie(request.cookies.get(DEMO_COOKIE)?.value)) return false;
  return true;
}

/** Back where the visitor came from – only ever a path on this site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

function gate(request: NextRequest): NextResponse | null {
  const { pathname, search, searchParams } = request.nextUrl;
  const gated = previewGateOn() || APP_MODE === "demo";
  // The door itself: nothing to open (no gate on) or already through – on to the goal.
  if (pathname === DOOR && request.method === "GET" && (!gated || through(request))) {
    const next = safeNext(searchParams.get("next"));
    // Never back to the door itself (?next=/preview…): that would bounce between two redirects.
    return NextResponse.redirect(new URL(next.startsWith(DOOR) ? "/" : next, request.url));
  }
  if (!gated || isPublic(pathname) || through(request)) return null;
  const door = new URL(DOOR, request.url);
  door.searchParams.set("next", pathname + search);
  const response = NextResponse.redirect(door);
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

export function proxy(request: NextRequest) {
  const blocked = gate(request);
  if (blocked) return blocked;
  const response = NextResponse.next();
  // The secret only exists at runtime, so prerendered pages can't carry it in their meta tags – this header can.
  if (previewGateOn() || APP_MODE === "demo") response.headers.set("X-Robots-Tag", NOINDEX);
  rememberViewerCountry(request, response);
  return response;
}

/**
 * The viewer's country for their first currency (src/lib/currency.ts): only the ISO code Vercel derives from the IP, nothing personal, no IP.
 * Readable by the page (not httpOnly). Locally there is no header: no cookie, the browser falls back to its time zone.
 */
function rememberViewerCountry(request: NextRequest, response: NextResponse) {
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (!country || !/^[A-Z]{2}$/.test(country) || request.cookies.get(VIEWER_COUNTRY_COOKIE)?.value === country) return;
  response.cookies.set(VIEWER_COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}
