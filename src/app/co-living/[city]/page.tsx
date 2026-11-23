import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LandingPage } from "@/components/seo/LandingPage";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getCities, getStaysByCity, MIN_INDEXABLE_HOUSES, PLACEHOLDER_PARAM } from "@/lib/data/stays";
import { pageMetadata } from "@/lib/seo";
import { FEE_MODEL } from "@/config/policies";
import { CITY_FAQ, CITY_SEO } from "@/config/seo";
import { CURATED_DESTINATIONS } from "@/lib/data/destinations";

/** "Also popular": other cities shown at the end of the page – same country first, then by Houses. */
const MAX_RELATED = 4;

/** Every city with Houses, and every curated city (lib/data/destinations.ts) – a city without a House gets "Open the first one" + waitlist. */
export async function generateStaticParams() {
  const slugs = new Set([...(await getCities()).map((city) => city.slug), ...CURATED_DESTINATIONS.map((d) => d.slug)]);
  const params = [...slugs].map((city) => ({ city }));
  return params.length > 0 ? params : [{ city: PLACEHOLDER_PARAM }];
}

/** A city with Houses – else a curated city with none yet (count 0, thin: noindex). */
async function cityOf(slug: string) {
  const withHouses = (await getCities()).find((c) => c.slug === slug);
  if (withHouses) return withHouses;
  const curated = CURATED_DESTINATIONS.find((d) => d.slug === slug);
  return curated ? { slug: curated.slug, name: curated.name, country: curated.country, count: 0 } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/co-living/[city]">): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await cityOf(slug);
  if (!city) return {};
  const t = await getTranslations("seo.city");
  return pageMetadata({
    title: t("h1", { city: city.name }),
    description: t("description", { city: city.name, country: city.country, count: city.count }),
    path: `/co-living/${city.slug}`,
    image: { url: `/co-living/${city.slug}/opengraph-image`, alt: t("h1", { city: city.name }) },
    // Fewer than three Houses is thin content: the page works, but stays out of the index.
    noindex: city.count < MIN_INDEXABLE_HOUSES,
  });
}

/** "Co-living in Bangkok": every open House in the city, plus links to other cities. */
export default function CityPage({ params }: PageProps<"/co-living/[city]">) {
  // Every page is prerendered (generateStaticParams); params are read inside the boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CityPageContent params={params} />
    </Suspense>
  );
}

async function CityPageContent({ params }: { params: PageProps<"/co-living/[city]">["params"] }) {
  const { city: slug } = await params;
  const city = await cityOf(slug);
  if (!city) notFound();
  const t = await getTranslations("seo");
  const stays = await getStaysByCity(city.slug);
  const others = (await getCities())
    .filter((c) => c.slug !== city.slug)
    .toSorted((a, b) => Number(b.country === city.country) - Number(a.country === city.country) || b.count - a.count)
    .slice(0, MAX_RELATED);
  const tVibe = await getTranslations("common.vibes");
  // "Starting soon": the browser keeps the ones starting within STARTING_SOON_DAYS (components/seo/SeoHouses.tsx).
  // The questions: the template, or the city's own (config/seo.ts CITY_SEO).
  const own = CITY_SEO[city.slug];
  const faqIds = own?.faq ?? CITY_FAQ;
  const tFaq = await getTranslations(own?.faq ? `seo.cityOverrides.${city.slug}.faq` as "seo.cityFaq" : "seo.cityFaq");
  const faqItems = faqIds.map((id) => ({ q: tFaq(`${id}.q` as "how.q", { name: city.name }), a: tFaq(`${id}.a` as "how.a", { name: city.name, percent: FEE_MODEL.serviceFeePercent }) }));
  // check-messages: optional (CITY_SEO decides whether a city has its own words)
  const intro = own?.intro ? t(`cityOverrides.${city.slug}.intro` as "city.intro", { city: city.name }) : t(stays.length === 0 ? "city.introEmpty" : "city.intro", { city: city.name });
  // The categories this city's Houses have, as Explore filters.
  const vibes = [...new Set(stays.map((s) => s.vibe))];
  return (
    <LandingPage
      h1={t("city.h1", { city: city.name })}
      intro={intro}
      stays={stays}
      startingSoon={{ title: t("city.startingSoon", { city: city.name }), ids: stays.map((x) => x.id) }}
      faq={{ title: t("city.faqTitle", { city: city.name }), items: faqItems }}
      empty={{ title: t("city.emptyTitle", { city: city.name }), text: t("city.emptyText", { city: city.name }), where: city.name }}
      scope={{ citySlug: city.slug }}
      createHref={`/create?place=${encodeURIComponent(city.slug)}`}
      breadcrumbs={[
        { name: t("breadcrumbs.home"), path: "/" },
        { name: t("city.h1", { city: city.name }), path: `/co-living/${city.slug}` },
      ]}
      related={[
        { title: t("city.related"), links: others.map((c) => ({ href: `/co-living/${c.slug}`, label: t("city.link", { city: c.name }) })) },
        { title: t("city.vibes", { city: city.name }), links: vibes.map((v) => ({ href: `/themes/${v}`, label: t("vibe.h1", { vibe: tVibe(v) }) })) },
      ]}
    />
  );
}
