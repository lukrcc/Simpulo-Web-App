import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { YourHouses } from "@/components/views/YourHouses";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  // Logged-in area: never indexed (the category pages under /houses/… are public, so this page says it itself).
  return { title: t("houses"), robots: PRIVATE_ROBOTS };
}

/** Your houses: everything at a glance (?tab=earnings: the money). */
export default function YourHousesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <YourHouses />
    </Suspense>
  );
}
