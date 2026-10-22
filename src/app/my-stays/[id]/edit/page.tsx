import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EditStay } from "@/components/views/EditStay";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("editHouse") };
}

export default function EditStayPage({ params }: PageProps<"/my-stays/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditStay params={params} />
    </Suspense>
  );
}
