import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PublicProfile } from "@/components/views/ProfileView";
import { publicName } from "@/config/privacy";
import { getHouses, getUsers } from "@/lib/data";
import { publicProfileMeta, userByProfileId } from "@/lib/privacy";

/** Guests' profiles are never indexed and nothing on them is followed (people, not pages to find); a host decides for their host page. */
const NOINDEX: Metadata["robots"] = { index: false, follow: false };

/**
 * /u/{profile id} – the id can't be guessed (lib/privacy.ts profileIdOf; an account id like "u5" opens nothing). Link previews as a logged-out
 * viewer sees it (lib/privacy.ts): a host's page – first name + short profile, indexed only with "Show my host page in search engines" (Anchor
 * creators: on by default); a guest's profile – nothing (no name, no photo), noindex, nofollow. The image: ./opengraph-image.tsx.
 */
export async function generateMetadata({ params }: PageProps<"/u/[userId]">): Promise<Metadata> {
  const { userId } = await params;
  const user = userByProfileId(getUsers().filter((u) => !u.deletedAt), userId);
  const t = await getTranslations("meta.pages");
  if (!user) return { title: t("profile"), robots: NOINDEX };
  const { host, index } = publicProfileMeta(user, getHouses());
  if (!host) return { title: t("profile"), robots: NOINDEX };
  const name = publicName(user, null);
  const description = user.bio || undefined;
  return {
    title: name,
    description,
    robots: index ? { index: true, follow: true } : NOINDEX,
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
