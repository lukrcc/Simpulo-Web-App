import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PublicProfile } from "@/components/views/ProfileView";
import { users } from "@/lib/mock";

/** Shared profile links: name + bio; the image comes from ./opengraph-image.tsx. Reads the mock data directly. */
export async function generateMetadata({ params }: PageProps<"/u/[userId]">): Promise<Metadata> {
  const { userId } = await params;
  const user = users.find((u) => u.id === userId && !u.deletedAt);
  if (!user) {
    const t = await getTranslations("meta.pages");
    return { title: t("profile") };
  }
  return {
    title: user.name,
    description: user.bio,
    openGraph: { title: user.name, description: user.bio },
    twitter: { card: "summary_large_image", title: user.name, description: user.bio },
  };
}

export default function UserProfilePage({ params }: PageProps<"/u/[userId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicProfile params={params} />
    </Suspense>
  );
}
