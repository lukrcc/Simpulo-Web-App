import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LandingPage } from "@/components/seo/LandingPage";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getCities, getStaysByCity, MIN_INDEXABLE_HOUSES } from "@/lib/data/stays";
import { pageMetadata } from "@/lib/seo";

/** "Also popular": other cities shown at the end of the page – same country first, then by Houses. */
const MAX_RELATED = 4;

export async function generateStaticParams() {
  return (await getCities()).map((city) => ({ city: city.slug }));
}

async function cityOf(slug: string) {
  return (await getCities()).find((c) => c.slug === slug);
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
  // The vibe pages of the vibes this city's Houses have.
  const vibes = [...new Set(stays.map((s) => s.vibe))];
  return (
    <LandingPage
      h1={t("city.h1", { city: city.name })}
      intro={t("city.intro", { city: city.name })}
      stays={stays}
      scope={{ citySlug: city.slug }}
      breadcrumbs={[
        { name: t("breadcrumbs.home"), path: "/" },
        { name: t("city.h1", { city: city.name }), path: `/co-living/${city.slug}` },
      ]}
      related={[
        { title: t("city.related"), links: others.map((c) => ({ href: `/co-living/${c.slug}`, label: t("city.link", { city: c.name }) })) },
        { title: t("city.vibes", { city: city.name }), links: vibes.map((v) => ({ href: `/houses/${v}`, label: t("vibe.h1", { vibe: tVibe(v) }) })) },
      ]}
    />
  );
}
