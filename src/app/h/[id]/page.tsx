import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MockDelay } from "@/components/MockDelay";
import { HouseSkeleton } from "@/components/skeletons/HouseSkeleton";
import { StayDetail } from "@/components/views/StayDetail";
import { getPublicStays, PLACEHOLDER_PARAM } from "@/lib/data/stays";
import { PRIVATE_ROBOTS } from "@/lib/seo";

/** Every public House is prerendered by id; Houses opened in the browser (mock) render on request. */
export async function generateStaticParams() {
  const params: { id: string }[] = (await getPublicStays()).map((stay) => ({ id: stay.id }));
  return params.length > 0 ? params : [{ id: PLACEHOLDER_PARAM }];
}

/** The short link of a House – what members, the host and links from Your houses use. Never indexed: /house/[slug] is the public page. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("house"), robots: PRIVATE_ROBOTS };
}

/**
 * /h/[id] (the id or the slug): one page for a House, by who's looking (lib/useHouseRole.ts) – visitors see the public page, members (requested,
 * accepted, paid, booked) their way through the House, the host its status and "Manage" (→ /h/[id]/manage).
 */
export default function HouseByIdPage({ params }: PageProps<"/h/[id]">) {
  const slugParams = params.then(({ id }) => ({ slug: id }));
  return (
    <Suspense fallback={<HouseSkeleton />}>
      <MockDelay ms={400} fallback={<HouseSkeleton />}>
        <StayDetail params={slugParams} />
      </MockDelay>
    </Suspense>
  );
}
