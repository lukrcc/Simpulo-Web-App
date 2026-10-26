import type { MetadataRoute } from "next";
import { connection } from "next/server";

/** Gated test deployments (SITE_PASSWORD set) disallow everything; otherwise crawlers are welcome. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // SITE_PASSWORD is a runtime-only secret – read it per request, not once at build time.
  await connection();
  if (process.env.SITE_PASSWORD) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" } };
}
