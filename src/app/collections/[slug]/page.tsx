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

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

/** Listed Houses in a collection (the server's view – the feed itself reads the browser's store). */
async function countOf(collection: Collection): Promise<number> {
  return (await getPublicStays()).filter((s) => s.status === "published" && collection.filter(s)).length;
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
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: t("seo.breadcrumbs.home"), path: "/" },
          { name: t(`explore.collections.${collection.id}.title`), path: `/collections/${collection.slug}` },
        ])}
      />
      <MockDelay ms={400} fallback={<ExploreSkeleton />}>
        <ExploreFeed scope={{ collection: collection.id }} />
      </MockDelay>
    </>
  );
}
