import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MockDelay } from "@/components/MockDelay";
import { ThreadSkeleton } from "@/components/skeletons/ThreadSkeleton";
import { ThreadView } from "@/components/views/ThreadView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("chat") };
}

export default function ThreadPage({ params }: PageProps<"/inbox/[threadId]">) {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <MockDelay ms={400} fallback={<ThreadSkeleton />}>
        <ThreadView params={params} />
      </MockDelay>
    </Suspense>
  );
}
