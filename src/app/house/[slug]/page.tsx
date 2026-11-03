import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockDelay } from "@/components/MockDelay";
import { JsonLd } from "@/components/seo/JsonLd";
import { HouseSkeleton } from "@/components/skeletons/HouseSkeleton";
import { StayDetail } from "@/components/views/StayDetail";
import { citySlugOf, countryOf, getPublicStays, getStayRecord, getUser, isPublicStay, PLACEHOLDER_PARAM } from "@/lib/data/stays";
import { absoluteUrl, breadcrumbList, pageMetadata } from "@/lib/seo";
import type { Stay } from "@/lib/types";
import { firstName, firstSentence } from "@/lib/utils";

const isDraft = (stay: Stay) => stay.status === "draft" || stay.status === "draft_unclaimed";

/** Every public House is prerendered; Houses opened in the browser (mock) render on request. */
export async function generateStaticParams() {
  const params: { slug: string }[] = (await getPublicStays()).map((stay) => ({ slug: stay.slug }));
  return params.length > 0 ? params : [{ slug: PLACEHOLDER_PARAM }];
}

/**
 * Title, hook sentence and canonical for public Houses; the image comes from ./opengraph-image.tsx. Closed Houses
 * and slugs the server doesn't know (opened in the browser, mock only) render but stay out of the index.
 */
export async function generateMetadata({ params }: PageProps<"/house/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stay = await getStayRecord(slug);
  if (!stay || !isPublicStay(stay)) {
    const t = await getTranslations("meta.pages");
    return { title: t("house"), robots: { index: false, follow: true } };
  }
  const t = await getTranslations("seo.house");
  return pageMetadata({
    title: stay.city ? t("title", { title: stay.title, city: stay.city }) : stay.title,
    description: firstSentence(stay.lookingForText) || firstSentence(stay.whyText),
    path: `/house/${stay.slug}`,
    image: { url: `/house/${stay.slug}/opengraph-image`, alt: t("imageAlt", { title: stay.title }) },
  });
}

// params are read inside the boundary (prerendered for every public House, so the fallback only shows for slugs
// opened in the browser).
export default function HousePage({ params }: PageProps<"/house/[slug]">) {
  return (
    <Suspense fallback={<HouseSkeleton />}>
      <House params={params} />
    </Suspense>
  );
}

async function House({ params }: { params: PageProps<"/house/[slug]">["params"] }) {
  const { slug } = await params;
  const stay = await getStayRecord(slug);
  // Drafts (and Houses still waiting to be claimed) don't exist for the public.
  if (stay && isDraft(stay)) notFound();

  return (
    <>
      {stay && isPublicStay(stay) && <HouseStructuredData stay={stay} />}
      <MockDelay ms={400} fallback={<HouseSkeleton />}>
        <StayDetail params={params} />
      </MockDelay>
    </>
  );
}

/** schema.org Event (a stay with dates, a place and an organiser) + the breadcrumb Home › City › House. */
async function HouseStructuredData({ stay }: { stay: Stay }) {
  const t = await getTranslations("seo");
  const host = await getUser(stay.hostId);
  const url = absoluteUrl(`/house/${stay.slug}`);
  const event = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: stay.title,
    description: firstSentence(stay.lookingForText) || firstSentence(stay.whyText),
    url,
    image: `${url}/opengraph-image`,
    startDate: stay.startDate,
    endDate: stay.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: stay.city || stay.region,
      address: { "@type": "PostalAddress", addressLocality: stay.city || undefined, addressRegion: stay.region, addressCountry: countryOf(stay) },
    },
    ...(host && { organizer: { "@type": "Person", name: firstName(host) } }),
  };
  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    ...(stay.city ? [{ name: t("city.h1", { city: stay.city }), path: `/co-living/${citySlugOf(stay)}` }] : []),
    { name: stay.title, path: `/house/${stay.slug}` },
  ];
  return <JsonLd data={[event, breadcrumbList(crumbs)]} />;
}
