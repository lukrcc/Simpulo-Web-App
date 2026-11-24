import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PlacePage } from "@/components/places/PlacePage";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("houses.places");
  return { title: t("title"), robots: PRIVATE_ROBOTS };
}

/** /places/[id] – a host's own place (only its owner): its photo, details, the windows opened in it and "Open a window". Never indexed. */
export default function PlaceRoute({ params }: PageProps<"/places/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlacePage params={params} />
    </Suspense>
  );
}
