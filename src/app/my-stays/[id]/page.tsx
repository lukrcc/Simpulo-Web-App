import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ManageStay } from "@/components/views/ManageStay";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("manageHouse") };
}

export default function ManageStayPage({ params }: PageProps<"/my-stays/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageStay params={params} />
    </Suspense>
  );
}
