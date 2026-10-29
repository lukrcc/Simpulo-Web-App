// Technical SEO helpers: the public base URL, per-page metadata (canonical, Open Graph, Twitter) and JSON-LD.
// Server-safe – no client imports.
import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://simpulo.app";

/** Public base URL for canonical and absolute URLs: NEXT_PUBLIC_SITE_URL, else https://simpulo.app (invalid values too). */
export const SITE_URL: URL = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
})();

export const SITE_NAME = "Simpulo";

/** "/house/x" → "https://simpulo.app/house/x" */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** Gated test deployment (SITE_PASSWORD set): nothing gets indexed. Runtime-only – read it per request. */
export function siteIsGated(): boolean {
  return Boolean(process.env.SITE_PASSWORD);
}

interface PageMetadataInput {
  /** Page title without the " · Simpulo" suffix (the root layout's template adds it) */
  title: string;
  description: string;
  /** Canonical path, e.g. "/co-living/bangkok" */
  path: string;
  /** Thin or private pages: keep them out of the index (links are still followed) */
  noindex?: boolean;
  /** "article" for content pages; houses and listings stay "website" */
  type?: "website" | "article";
  /** The page's own share image (path), e.g. a House's opengraph-image route – else the site-wide card */
  image?: { url: string; alt: string };
}

/** The site-wide share card (src/app/opengraph-image.tsx). */
const DEFAULT_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Simpulo – Share a place. Find your people." };

/**
 * Metadata for a public page: unique title, description, canonical, Open Graph and a large Twitter card. The image is
 * the page's own (`image`) or the site-wide card – set explicitly, since a page's openGraph replaces its parent's.
 */
export function pageMetadata({ title, description, path, noindex = false, type = "website", image }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const og = image ? { ...DEFAULT_IMAGE, ...image } : DEFAULT_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type, url, siteName: SITE_NAME, title: `${title} · ${SITE_NAME}`, description, locale: "en", images: [og] },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE_NAME}`, description, images: [og.url] },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

/** Private, logged-in pages: never indexed, never followed. */
export const PRIVATE_ROBOTS: Metadata["robots"] = { index: false, follow: false };

/** A JSON-LD payload as script content – "<" escaped so a value can't close the script tag. */
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org BreadcrumbList from [name, path] pairs (Home first). */
export function breadcrumbList(items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}
