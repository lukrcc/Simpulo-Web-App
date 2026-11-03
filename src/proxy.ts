import { NextResponse, type NextRequest } from "next/server";
import { APP_MODE } from "@/lib/appMode";
import { DEMO_COOKIE, sameSecret, validDemoCookie } from "@/lib/demoAuth";

/*
 * Private test deployments: when SITE_PASSWORD is set, every request needs HTTP Basic Auth (user "simpulo").
 * Unset (local dev) there is no gate. Same-origin requests – pages, /_next assets, images – reuse the credentials
 * the browser cached after the first prompt.
 */

const USER = "simpulo";
const DEMO_LOGIN = "/demo-login";

/** The web app manifest and its icons: browsers fetch the manifest without credentials, so it must stay public. */
const PUBLIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/favicon-v2.svg",
  "/favicon-v2-32.png",
  "/favicon-v2-192.png",
  "/favicon-v2-512.png",
  "/apple-touch-icon-v2.png",
  "/icon-maskable-512.png",
  "/robots.txt",
]);

function authorized(header: string | null, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon >= 0 && sameSecret(decoded.slice(0, colon), USER) && sameSecret(decoded.slice(colon + 1), password);
}

const NOINDEX = "noindex, nofollow";

/** The demo: everything behind its password. What the login page itself needs stays open. */
function demoGate(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next/")) return null;
  const inside = validDemoCookie(request.cookies.get(DEMO_COOKIE)?.value);
  if (pathname === DEMO_LOGIN) return inside ? NextResponse.redirect(new URL("/", request.url)) : null;
  if (inside) return null;
  const login = new URL(DEMO_LOGIN, request.url);
  login.searchParams.set("next", pathname + search);
  const response = NextResponse.redirect(login);
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (password && !PUBLIC_PATHS.has(request.nextUrl.pathname) && !authorized(request.headers.get("authorization"), password)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Simpulo", charset="UTF-8"', "X-Robots-Tag": NOINDEX },
    });
  }
  if (APP_MODE === "demo") {
    const blocked = demoGate(request);
    if (blocked) return blocked;
  }
  const response = NextResponse.next();
  // The password only exists at runtime, so prerendered pages can't carry it in their meta tags – this header can.
  if (password || APP_MODE === "demo") response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}
