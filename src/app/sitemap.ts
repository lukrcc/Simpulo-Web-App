import type { MetadataRoute } from "next";
import { citySlugOf, getCities, getPublicStays, getVibes, MIN_INDEXABLE_HOUSES } from "@/lib/data/stays";
import { COLLECTIONS, MIN_COLLECTION_SIZE } from "@/lib/collections";
import { absoluteUrl } from "@/lib/seo";

/** When the static pages last changed meaningfully – bump with real content updates. */
const STATIC_UPDATED = new Date("2026-10-28");

/** Static public pages (indexable). /explore is left out: it's canonicalised to the home page. */
const STATIC_PAGES = ["/", "/how-it-works", "/host", "/safety", "/faq", "/about", "/contact", "/impressum", "/privacy", "/terms"];

/**
 * Every indexable public page: the static ones, every public House, and the city, vibe and collection pages with enough Houses
 * (thin ones are noindex, so they stay out of here too). A House's lastModified is when it was created – the mock
 * has no update times yet.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stays, cities, vibes] = await Promise.all([getPublicStays(), getCities(), getVibes()]);
  const newest = (dates: string[]) => new Date(dates.toSorted().at(-1) ?? STATIC_UPDATED.toISOString());
  return [
    ...STATIC_PAGES.map((path) => ({ url: absoluteUrl(path), lastModified: STATIC_UPDATED })),
    ...stays.map((stay) => ({ url: absoluteUrl(`/house/${stay.slug}`), lastModified: new Date(stay.createdAt) })),
    ...cities
      .filter((city) => city.count >= MIN_INDEXABLE_HOUSES)
      .map((city) => ({
        url: absoluteUrl(`/co-living/${city.slug}`),
        lastModified: newest(stays.filter((s) => citySlugOf(s) === city.slug && s.status === "published").map((s) => s.createdAt)),
      })),
    ...vibes
      .filter((v) => v.count >= MIN_INDEXABLE_HOUSES)
      .map((v) => ({
        url: absoluteUrl(`/houses/${v.vibe}`),
        lastModified: newest(stays.filter((s) => s.vibe === v.vibe && s.status === "published").map((s) => s.createdAt)),
      })),
    ...COLLECTIONS.map((c) => ({ collection: c, houses: stays.filter((s) => s.status === "published" && c.filter(s)) }))
      .filter(({ houses }) => houses.length >= MIN_COLLECTION_SIZE)
      .map(({ collection, houses }) => ({ url: absoluteUrl(`/collections/${collection.slug}`), lastModified: newest(houses.map((s) => s.createdAt)) })),
  ];
}
