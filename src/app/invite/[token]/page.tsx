import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { InviteView } from "@/components/stay/InviteView";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/invite/[token]">): Promise<Metadata> {
  const { token } = await params;
  const t = await getTranslations("invitePage");
  const image = { url: `/invite/${token}/opengraph-image`, width: 1200, height: 630, alt: t("metaTitle") };
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_ROBOTS,
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), images: [image] },
    twitter: { card: "summary_large_image", title: t("metaTitle"), description: t("metaDescription"), images: [image.url] },
  };
}

/** An invite link: the House large, who invited you and how long your spot is held, "Accept invite". */
export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InviteView params={params} />
    </Suspense>
  );
}
