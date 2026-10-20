import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PublicProfile } from "@/components/views/ProfileView";

export const metadata: Metadata = { title: "Profile" };

export default function UserProfilePage({ params }: PageProps<"/u/[userId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicProfile params={params} />
    </Suspense>
  );
}
