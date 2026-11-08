import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PublicProfile } from "@/components/views/ProfileView";
import { publicName, showsOnHousePages } from "@/config/privacy";
import { getUsers } from "@/lib/data";

/** Profiles are never indexed (people, not pages to find). */
const NOINDEX: Metadata["robots"] = { index: false, follow: true };

/**
 * Shared profile links: first name + bio (a private profile: the first name only); the image comes from ./opengraph-image.tsx. Reads the
 * mock data directly.
 */
export async function generateMetadata({ params }: PageProps<"/u/[userId]">): Promise<Metadata> {
  const { userId } = await params;
  const user = getUsers().find((u) => u.id === userId && !u.deletedAt);
  if (!user) {
    const t = await getTranslations("meta.pages");
    return { title: t("profile"), robots: NOINDEX };
  }
  const name = publicName(user, null);
  const description = showsOnHousePages(user) ? user.bio : undefined;
  return {
    title: name,
    description,
    robots: NOINDEX,
    openGraph: { title: name, description },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

export default function UserProfilePage({ params }: PageProps<"/u/[userId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicProfile params={params} />
    </Suspense>
  );
}
