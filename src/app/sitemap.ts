import type { MetadataRoute } from "next";
import { citySlugOf, getCities, getPublicStays, MIN_INDEXABLE_HOUSES } from "@/lib/data/stays";
import { COLLECTIONS, MIN_COLLECTION_SIZE } from "@/lib/collections";
import { absoluteUrl } from "@/lib/seo";
import { isListedStay } from "@/lib/launch";
import { GUIDES } from "@/config/seo";
import { getUsers } from "@/lib/data";
import { hostPageInSearch, profileHref } from "@/lib/privacy";

/** When the static pages last changed meaningfully – bump with real content updates. */
const STATIC_UPDATED = new Date("2026-10-28");

/** Static public pages (indexable). /explore is left out: it's canonicalised to the home page. */
const STATIC_PAGES = ["/", "/help", "/host", "/about", "/guides", "/apply", "/safety", "/cancellation", "/contact", "/impressum", "/privacy", "/terms"];

/**
 * Every indexable public page: the static ones (start page, help center, /host, /about, the guides …), every public House, the city and
 * collection pages with enough Houses (thin ones are noindex, so they stay out of here too), the guides, and the host pages that chose to be
 * found. Guest profiles never (noindex). A House's lastModified is when it was created – the mock
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
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: new Date(g.published) })),
    // Host pages only when the host chose "Show my host page in search engines" (lib/privacy.ts) – guest profiles never (noindex).
    ...getUsers()
      .filter((u) => !u.deletedAt && stays.some((s) => s.hostId === u.id) && hostPageInSearch(u))
      .map((u) => ({ url: absoluteUrl(profileHref(u.id)), lastModified: STATIC_UPDATED })),
  ];
}
