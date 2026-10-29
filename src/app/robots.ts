import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl, siteIsGated } from "@/lib/seo";

/** Logged-in areas and flows – never crawled (their pages are noindex as well). */
const PRIVATE_PATHS = ["/inbox", "/notifications", "/my-stays", "/profile", "/settings", "/create", "/welcome", "/admin", "/claim"];

/** Gated test deployments (SITE_PASSWORD set) disallow everything; otherwise public pages are open and the sitemap is linked. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // SITE_PASSWORD is a runtime-only secret – read it per request, not once at build time.
  await connection();
  if (siteIsGated()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
