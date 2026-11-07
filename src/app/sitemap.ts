import type { MetadataRoute } from "next";
import { citySlugOf, getCities, getPublicStays, MIN_INDEXABLE_HOUSES } from "@/lib/data/stays";
import { COLLECTIONS, MIN_COLLECTION_SIZE } from "@/lib/collections";
import { absoluteUrl } from "@/lib/seo";
import { isListedStay } from "@/lib/launch";

/** When the static pages last changed meaningfully – bump with real content updates. */
const STATIC_UPDATED = new Date("2026-10-28");

/** Static public pages (indexable). /explore is left out: it's canonicalised to the home page. */
const STATIC_PAGES = ["/", "/how-it-works", "/safety", "/faq", "/about", "/contact", "/impressum", "/privacy", "/terms"];

/**
 * Every indexable public page: the static ones, every public House, and the city, vibe and collection pages with enough Houses
 * (thin ones are noindex, so they stay out of here too). A House's lastModified is when it was created – the mock
 * has no update times yet.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stays, cities] = await Promise.all([getPublicStays(), getCities()]);
  const newest = (dates: string[]) => new Date(dates.toSorted().at(-1) ?? STATIC_UPDATED.toISOString());
  return [
    ...STATIC_PAGES.map((path) => ({ url: absoluteUrl(path), lastModified: STATIC_UPDATED })),
    ...stays.map((stay) => ({ url: absoluteUrl(`/house/${stay.slug}`), lastModified: new Date(stay.createdAt) })),
    ...cities
      .filter((city) => city.count >= MIN_INDEXABLE_HOUSES)
      .map((city) => ({
        url: absoluteUrl(`/co-living/${city.slug}`),
        lastModified: newest(stays.filter((s) => citySlugOf(s) === city.slug && isListedStay(s)).map((s) => s.createdAt)),
      })),
    ...COLLECTIONS.map((c) => ({ collection: c, houses: stays.filter((s) => isListedStay(s) && c.filter(s)) }))
      .filter(({ houses }) => houses.length >= MIN_COLLECTION_SIZE)
      .map(({ collection, houses }) => ({ url: absoluteUrl(`/collections/${collection.slug}`), lastModified: newest(houses.map((s) => s.createdAt)) })),
  ];
}
