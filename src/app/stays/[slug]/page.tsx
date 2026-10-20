import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { StayDetail } from "@/components/views/StayDetail";

// Stays can be created client-side at any time, so params are runtime data and need a Suspense boundary.
export default function StayPage({ params }: PageProps<"/stays/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StayDetail params={params} />
    </Suspense>
  );
}
