import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PublicProfile } from "@/components/views/ProfileView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("profile") };
}

export default function UserProfilePage({ params }: PageProps<"/u/[userId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicProfile params={params} />
    </Suspense>
  );
}
