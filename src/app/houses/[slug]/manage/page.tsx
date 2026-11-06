import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ManageHouse } from "@/components/views/ManageHouse";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("manageHouse"), robots: PRIVATE_ROBOTS };
}

/** One House you host or joined: where it stands and everything to manage. The segment is the House's id. */
export default function ManageHousePage({ params }: PageProps<"/houses/[slug]/manage">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageHouse params={params} />
    </Suspense>
  );
}
