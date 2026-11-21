import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LandingPage } from "@/components/seo/LandingPage";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { FEE_MODEL } from "@/config/policies";
import { COLLECTION_FAQ } from "@/config/seo";
import { citySlugOf, getStaysByVibe, MIN_INDEXABLE_HOUSES } from "@/lib/data/stays";
import { pageMetadata } from "@/lib/seo";
import type { Vibe } from "@/lib/types";
import { VIBES } from "@/lib/utils";

/** Other themes and cities shown at the end. */
const MAX_RELATED = 6;

const vibeOf = (slug: string): Vibe | undefined => VIBES.find((v) => v.key === slug)?.key;

/** Every theme (common.vibes) – one with no open House shows "Opening soon" with the waitlist and the guides. */
export function generateStaticParams() {
  return VIBES.map((v) => ({ theme: v.key }));
}

export async function generateMetadata({ params }: PageProps<"/themes/[theme]">): Promise<Metadata> {
  const { theme } = await params;
  const vibe = vibeOf(theme);
  if (!vibe) return {};
  const t = await getTranslations("seo.vibe");
  const name = (await getTranslations("common.vibes"))(vibe);
  const count = (await getStaysByVibe(vibe)).length;
  return pageMetadata({
    title: t("h1", { vibe: name }),
    description: t("description", { vibe: name, count }),
    path: `/themes/${vibe}`,
    // Without enough Houses there's no content of its own: the page works ("Opening soon"), but stays out of the index.
    noindex: count < MIN_INDEXABLE_HOUSES,
  });
}

/** /themes/[theme] – "Fitness Houses": every open House of the theme (Explore's grid and filters), or "Opening soon"; other themes and cities. */
export default function ThemePage({ params }: PageProps<"/themes/[theme]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThemeContent params={params} />
    </Suspense>
  );
}

async function ThemeContent({ params }: { params: PageProps<"/themes/[theme]">["params"] }) {
  const { theme } = await params;
  const vibe = vibeOf(theme);
  if (!vibe) notFound();
  const t = await getTranslations("seo");
  const tVibe = await getTranslations("common.vibes");
  const name = tVibe(vibe);
  const stays = await getStaysByVibe(vibe);
  const tFaq = await getTranslations("seo.collectionFaq");
  const faqItems = COLLECTION_FAQ.map((id) => ({ q: tFaq(`${id}.q`, { name: t("vibe.h1", { vibe: name }) }), a: tFaq(`${id}.a`, { name: t("vibe.h1", { vibe: name }), percent: FEE_MODEL.serviceFeePercent }) }));
  // The cities this theme's Houses are in (most first), and the other themes.
  const cityCount = new Map<string, { name: string; count: number }>();
  for (const s of stays) cityCount.set(citySlugOf(s), { name: s.city, count: (cityCount.get(citySlugOf(s))?.count ?? 0) + 1 });
  const cities = [...cityCount.entries()].toSorted((a, b) => b[1].count - a[1].count).slice(0, MAX_RELATED);
  const others = VIBES.filter((v) => v.key !== vibe).slice(0, MAX_RELATED);
  return (
    <LandingPage
      h1={t("vibe.h1", { vibe: name })}
      intro={t("vibe.intro", { vibe: name })}
      stays={stays}
      startingSoon={{ title: t("vibe.startingSoon", { vibe: name }), ids: stays.map((s) => s.id) }}
      faq={{ title: t("vibe.faqTitle", { vibe: name }), items: faqItems }}
      empty={{ title: t("vibe.emptyTitle", { vibe: name }), text: t("vibe.emptyText", { vibe: name }), category: vibe }}
      scope={{ vibe }}
      createHref={`/create?category=${vibe}`}
      breadcrumbs={[
        { name: t("breadcrumbs.home"), path: "/" },
        { name: t("themes.title"), path: "/themes" },
        { name: t("vibe.h1", { vibe: name }), path: `/themes/${vibe}` },
      ]}
      related={[
        { title: t("vibe.cities", { vibe: name }), links: cities.map(([slug, c]) => ({ href: `/co-living/${slug}`, label: c.name })) },
        { title: t("vibe.related"), links: others.map((v) => ({ href: `/themes/${v.key}`, label: t("vibe.h1", { vibe: tVibe(v.key) }) })) },
      ]}
    />
  );
}
