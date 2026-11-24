import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
import { SeoHouses } from "@/components/seo/SeoHouses";
import { COLLECTION_SEO, SEO_STARTING_SOON } from "@/config/seo";

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
    // Like the vibe pages: fewer than three Houses is thin content – rendered, but kept out of the index. A dated collection (Just opened,
    // Starting soon) changes every day: it isn't counted here – that would read today's date while prerendering (the dev overlay's "1 Issue").
    noindex: !collection.dated && (await countOf(collection)) < MIN_COLLECTION_SIZE,
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
  // A dated collection reads today's date (new Date() in its filter): wait for the request instead of computing it while prerendering
  // (Next.js: "encountered the unstable value new Date() while prerendering").
  if (collection.dated) await connection();
  const t = await getTranslations();
  const tSeo = await getTranslations("seo");
  const title = t(`explore.collections.${collection.id}.title`);
  const own = COLLECTION_SEO[collection.id];
  // ONE line of description – the collection's own (CLAUDE.md "Aufräumen – ein Design": no long introduction, no questions on "See all" pages;
  // the questions are kept in content/faq.ts for the footer and the help page later).
  const intro = t(`explore.collections.${collection.id}.subline`);
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
          <h1 className="text-section text-ink">{title}</h1>
          <p className="mt-1 truncate text-body text-muted">{intro}</p>
          <SeoEmpty title={tSeo("collectionEmptyTitle")} text={tSeo("collectionEmptyText")} createHref={create} category={own?.category} />
        </Container>
      ) : (
        <>
          <MockDelay ms={400} fallback={<ExploreSkeleton />}>
            <ExploreFeed scope={{ collection: collection.id }} />
          </MockDelay>
          <Container className="explore-width pb-(--space-section)">
            {/* "Starting soon" only when there are more Houses than the row would show (else it repeats the grid). */}
            {collection.id !== "startingSoon" && <SeoHouses id="seo-starting-soon" title={tSeo("collectionStartingSoon")} ids={houses.map((x) => x.id)} when="soon" max={SEO_STARTING_SOON} hideIfAll />}
          </Container>
        </>
      )}
    </>
  );
}
