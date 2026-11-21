import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Container } from "@/components/layout/Container";
import { LAUNCH_HUBS } from "@/config/launch";
import { CURATED_DESTINATIONS } from "@/lib/data/destinations";
import { getCities } from "@/lib/data/stays";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.places");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/places" });
}

/**
 * /places – where Houses are open now (cities with open Houses, most first) and where they open next (the launch hubs and the curated cities
 * without a House yet). Each to its page /co-living/[city]. "All places →" in the footer.
 */
/** The data is read inside a boundary (like the city pages): the list depends on today's Houses. */
export default function PlacesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlacesContent />
    </Suspense>
  );
}

async function PlacesContent() {
  const t = await getTranslations("seo.places");
  const open = await getCities();
  const openSlugs = new Set(open.map((c) => c.slug));
  const soon = [...LAUNCH_HUBS, ...CURATED_DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name }))].filter((c, i, all) => !openSlugs.has(c.slug) && all.findIndex((x) => x.slug === c.slug) === i);
  return (
    <Container page className="pb-(--space-section)">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-4 max-w-[640px] text-body-lg text-muted">{t("intro")}</p>
      {open.length > 0 && (
        <section aria-labelledby="places-open" className="mt-(--space-inner)">
          <h2 id="places-open" className="text-h2 text-ink">
            {t("open")}
          </h2>
          <ul data-places-open className="mt-4 grid gap-x-6 [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
            {open.map((c) => (
              <li key={c.slug} className="border-b border-line">
                <Link href={`/co-living/${c.slug}`} className="flex min-h-14 items-baseline justify-between gap-4 py-3">
                  <span className="text-body-lg font-semibold text-ink">{c.name}</span>
                  <span className="shrink-0 text-small text-muted">{t("count", { count: c.count })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {soon.length > 0 && (
        <section aria-labelledby="places-soon" className="mt-(--space-section)">
          <h2 id="places-soon" className="text-h2 text-ink">
            {t("soon")}
          </h2>
          <ul data-places-soon className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            {soon.map((c) => (
              <li key={c.slug}>
                <Link href={`/co-living/${c.slug}`} className="inline-flex min-h-11 items-center text-body text-muted transition-colors hover:text-ink md:min-h-8">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
