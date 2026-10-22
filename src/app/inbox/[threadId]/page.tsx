import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ThreadView } from "@/components/views/ThreadView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("chat") };
}

export default function ThreadPage({ params }: PageProps<"/inbox/[threadId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThreadView params={params} />
    </Suspense>
  );
}
