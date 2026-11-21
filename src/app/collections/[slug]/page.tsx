import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockDelay } from "@/components/MockDelay";
import { JsonLd } from "@/components/seo/JsonLd";
import { ExploreSkeleton } from "@/components/skeletons/ExploreSkeleton";
import { ExploreFeed } from "@/components/views/ExploreFeed";
import { collectionBySlug, COLLECTIONS, MIN_COLLECTION_SIZE, type Collection } from "@/lib/collections";
import { getPublicStays } from "@/lib/data/stays";
import { breadcrumbList, pageMetadata } from "@/lib/seo";
import { isListedStay } from "@/lib/launch";
import { Container } from "@/components/layout/Container";
import { SeoEmpty } from "@/components/seo/SeoActions";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { SeoHouses } from "@/components/seo/SeoHouses";
import { FEE_MODEL } from "@/config/policies";
import { COLLECTION_FAQ, COLLECTION_SEO, SEO_STARTING_SOON } from "@/config/seo";

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

/** Listed Houses in a collection (the server's view – the feed itself reads the browser's store). */
async function countOf(collection: Collection): Promise<number> {
  return (await getPublicStays()).filter((s) => isListedStay(s) && collection.filter(s)).length;
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) return {};
  const t = await getTranslations("explore.collections");
  return pageMetadata({
    title: t(`${collection.id}.title`),
    description: t(`${collection.id}.subline`),
    path: `/collections/${collection.slug}`,
    // Like the vibe pages: fewer than three Houses is thin content – rendered, but kept out of the index.
    noindex: (await countOf(collection)) < MIN_COLLECTION_SIZE,
  });
}

/** /collections/[slug]: every House of one collection as a normal grid, with Explore's filters – no Spotlight. */
export default function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <CollectionContent params={params} />
    </Suspense>
  );
}

async function CollectionContent({ params }: { params: PageProps<"/collections/[slug]">["params"] }) {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) notFound();
  const t = await getTranslations();
  const tSeo = await getTranslations("seo");
  const title = t(`explore.collections.${collection.id}.title`);
  const own = COLLECTION_SEO[collection.id];
  // Intro and questions: the template (with the theme's name), or the theme's own (config/seo.ts COLLECTION_SEO).
  const intro = own?.intro ? tSeo(`collectionOverrides.${collection.id}.intro` as "city.intro") : `${t(`explore.collections.${collection.id}.subline`)} ${tSeo("collectionIntro")}`;
  const tFaq = await getTranslations(own?.faq ? (`seo.collectionOverrides.${collection.id}.faq` as "seo.collectionFaq") : "seo.collectionFaq");
  const faqItems = (own?.faq ?? COLLECTION_FAQ).map((id) => ({ q: tFaq(`${id}.q` as "what.q", { name: title }), a: tFaq(`${id}.a` as "what.a", { name: title, percent: FEE_MODEL.serviceFeePercent }) }));
  const houses = (await getPublicStays()).filter((s) => isListedStay(s) && collection.filter(s)).toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  const create = `/create${own?.category ? `?category=${own.category}` : ""}`;
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: t("seo.breadcrumbs.home"), path: "/" },
          { name: title, path: `/collections/${collection.slug}` },
        ])}
      />
      {houses.length === 0 ? (
        // No House in this theme yet: the title, the intro, "Open the first one" and the waitlist for this theme.
        <Container page>
          <h1 className="text-h2 md:text-h1">{title}</h1>
          <p className="mt-4 max-w-[640px] text-body-lg text-muted">{intro}</p>
          <SeoEmpty title={tSeo("collectionEmptyTitle")} text={tSeo("collectionEmptyText")} createHref={create} category={own?.category} />
          <SeoFaq id="seo-faq" title={tSeo("collectionFaqTitle")} items={faqItems} />
        </Container>
      ) : (
        <>
          <MockDelay ms={400} fallback={<ExploreSkeleton />}>
            <ExploreFeed scope={{ collection: collection.id }} intro={intro} />
          </MockDelay>
          <Container className="explore-width pb-(--space-section)">
            {/* "Starting soon" only when there are more Houses than the row would show (else it repeats the grid). */}
            {collection.id !== "startingSoon" && <SeoHouses id="seo-starting-soon" title={tSeo("collectionStartingSoon")} ids={houses.map((x) => x.id)} when="soon" max={SEO_STARTING_SOON} hideIfAll />}
            <SeoFaq id="seo-faq" title={tSeo("collectionFaqTitle")} items={faqItems} />
          </Container>
        </>
      )}
    </>
  );
}
