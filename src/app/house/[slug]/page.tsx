import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { MockDelay } from "@/components/MockDelay";
import { HouseGrid } from "@/components/seo/HouseGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { HouseSkeleton } from "@/components/skeletons/HouseSkeleton";
import { StayDetail } from "@/components/views/StayDetail";
import { citySlugOf, countryOf, getPublicStays, getStayRecord, getStaysByVibe, getUser, isPublicStay } from "@/lib/data/stays";
import { absoluteUrl, breadcrumbList, pageMetadata } from "@/lib/seo";
import type { Stay } from "@/lib/types";
import { firstName, firstSentence } from "@/lib/utils";

const isDraft = (stay: Stay) => stay.status === "draft" || stay.status === "draft_unclaimed";
/** Completed by the host – its page stays up (links keep working) and points to similar Houses. */
const isEnded = (stay: Stay) => stay.status === "completed";

/** Every public House is prerendered; Houses opened in the browser (mock) render on request. */
export async function generateStaticParams() {
  return (await getPublicStays()).map((stay) => ({ slug: stay.slug }));
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
      {stay && isPublicStay(stay) && isEnded(stay) && <SimilarHouses stay={stay} />}
    </>
  );
}

const MAX_SIMILAR = 4;

/** Ended Houses keep their page – with a few open Houses of the same vibe (else the same country) to go on with. */
async function SimilarHouses({ stay }: { stay: Stay }) {
  const t = await getTranslations("seo.house");
  const sameVibe = (await getStaysByVibe(stay.vibe)).filter((s) => s.id !== stay.id);
  const sameCountry = (await getPublicStays()).filter((s) => s.status === "published" && s.id !== stay.id && countryOf(s) === countryOf(stay));
  const similar = (sameVibe.length > 0 ? sameVibe : sameCountry).slice(0, MAX_SIMILAR);
  if (similar.length === 0) return null;
  return (
    <Container className="mt-16">
      <section aria-labelledby="similar-houses">
        <h2 id="similar-houses" className="text-2xl font-bold tracking-tight">
          {t("similar")}
        </h2>
        <p className="mt-1 text-zinc-500">{t("similarText")}</p>
        <div className="mt-6">
          <HouseGrid stays={similar} />
        </div>
      </section>
    </Container>
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
