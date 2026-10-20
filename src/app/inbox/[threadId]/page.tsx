import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ThreadView } from "@/components/views/ThreadView";

export const metadata: Metadata = { title: "Chat" };

export default function ThreadPage({ params }: PageProps<"/inbox/[threadId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThreadView params={params} />
    </Suspense>
  );
}
