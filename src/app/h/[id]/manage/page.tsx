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

/** The host's management of one House (for now still here; guests have theirs on /h/[id]). */
export default function HostManagePage({ params }: PageProps<"/h/[id]/manage">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageHouse params={params} />
    </Suspense>
  );
}
