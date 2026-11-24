import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { HouseSkeleton } from "@/components/skeletons/HouseSkeleton";
import { HouseAreaPage } from "@/components/views/StayDetail";
import { getPublicStays, PLACEHOLDER_PARAM } from "@/lib/data/stays";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateStaticParams() {
  const params: { id: string }[] = (await getPublicStays()).map((stay) => ({ id: stay.id }));
  return params.length > 0 ? params : [{ id: PLACEHOLDER_PARAM }];
}

/** Private: never indexed. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("house"), robots: PRIVATE_ROBOTS };
}

/**
 * /houses/[id] – a House's private area (CLAUDE.md "Klare Ziele für alle House-Karten"): Chat · Plan · Crew · Moments (the host also Manage),
 * only for the host and the guests who are in; anyone else lands on the public House page (/house/[slug]).
 */
export default function HouseAreaRoute({ params }: PageProps<"/houses/[id]">) {
  return (
    <Suspense fallback={<HouseSkeleton />}>
      <HouseAreaPage params={params} />
    </Suspense>
  );
}
