import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LandingPage } from "@/components/seo/LandingPage";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { citySlugOf, getStaysByVibe, getVibes, MIN_INDEXABLE_HOUSES } from "@/lib/data/stays";
import { pageMetadata } from "@/lib/seo";

/** Cities linked at the end of a vibe page. */
const TOP_CITIES = 8;

export async function generateStaticParams() {
  return (await getVibes()).map((v) => ({ vibe: v.vibe }));
}

async function vibeOf(key: string) {
  return (await getVibes()).find((v) => v.vibe === key);
}

export async function generateMetadata({ params }: PageProps<"/houses/[vibe]">): Promise<Metadata> {
  const { vibe: key } = await params;
  const entry = await vibeOf(key);
  if (!entry) return {};
  const t = await getTranslations("seo.vibe");
  const tVibe = await getTranslations("common.vibes");
  const label = tVibe(entry.vibe);
  return pageMetadata({
    title: t("h1", { vibe: label }),
    description: t("description", { vibe: label.toLowerCase(), count: entry.count }),
    path: `/houses/${entry.vibe}`,
    noindex: entry.count < MIN_INDEXABLE_HOUSES,
  });
}

/** "Founder houses": every open House with this vibe, plus links to the other vibes. */
export default function VibePage({ params }: PageProps<"/houses/[vibe]">) {
  // Every page is prerendered (generateStaticParams); params are read inside the boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VibePageContent params={params} />
    </Suspense>
  );
}

async function VibePageContent({ params }: { params: PageProps<"/houses/[vibe]">["params"] }) {
  const { vibe: key } = await params;
  const entry = await vibeOf(key);
  if (!entry) notFound();
  const t = await getTranslations("seo");
  const tVibe = await getTranslations("common.vibes");
  const label = tVibe(entry.vibe);
  const stays = await getStaysByVibe(entry.vibe);
  const others = (await getVibes()).filter((v) => v.vibe !== entry.vibe);
  // Back to the cities: where this vibe's Houses are, most first – the top cities.
  const cityCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const stay of stays) {
    const slug = citySlugOf(stay);
    if (!slug) continue;
    const city = cityCounts.get(slug) ?? { slug, name: stay.city, count: 0 };
    city.count++;
    cityCounts.set(slug, city);
  }
  const cities = [...cityCounts.values()].toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, TOP_CITIES);
  return (
    <LandingPage
      h1={t("vibe.h1", { vibe: label })}
      intro={t("vibe.intro", { vibe: label.toLowerCase() })}
      stays={stays}
      scope={{ vibe: entry.vibe }}
      breadcrumbs={[
        { name: t("breadcrumbs.home"), path: "/" },
        { name: t("vibe.h1", { vibe: label }), path: `/houses/${entry.vibe}` },
      ]}
      related={[
        { title: t("vibe.cities", { vibe: label }), links: cities.map((c) => ({ href: `/co-living/${c.slug}`, label: t("city.h1", { city: c.name }) })) },
        { title: t("vibe.related"), links: others.map((v) => ({ href: `/houses/${v.vibe}`, label: t("vibe.h1", { vibe: tVibe(v.vibe) }) })) },
      ]}
    />
  );
}
