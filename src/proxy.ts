import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Private test deployments: when SITE_PASSWORD is set, every request needs HTTP Basic Auth (user "simpulo").
 * Unset (local dev) there is no gate. Same-origin requests – pages, /_next assets, images – reuse the credentials
 * the browser cached after the first prompt.
 */

const USER = "simpulo";

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

/** Constant-time comparison, so response timing doesn't leak how much of the password matched. */
function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorized(header: string | null, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon >= 0 && same(decoded.slice(0, colon), USER) && same(decoded.slice(colon + 1), password);
}

export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  if (!PUBLIC_PATHS.has(request.nextUrl.pathname) && !authorized(request.headers.get("authorization"), password)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Simpulo", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const response = NextResponse.next();
  // The password only exists at runtime, so prerendered pages can't carry it in their meta tags – this header can.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
