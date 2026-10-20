import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ManageStay } from "@/components/views/ManageStay";

export const metadata: Metadata = { title: "Manage House" };

export default function ManageStayPage({ params }: PageProps<"/my-stays/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageStay params={params} />
    </Suspense>
  );
}
