import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { HouseRedirect } from "@/components/views/HouseRedirect";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("manageHouse"), robots: PRIVATE_ROBOTS };
}

/** Old links: a House lives on /h/[id] now (guests), its management on /h/[id]/manage (host). ?focus= goes along. */
export default function OldManagePage({ params }: PageProps<"/your-houses/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HouseRedirect params={params} />
    </Suspense>
  );
}
