import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MockDelay } from "@/components/MockDelay";
import { ExploreSkeleton } from "@/components/skeletons/ExploreSkeleton";
import { ExploreFeed } from "@/components/views/ExploreFeed";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

/** Same feed as the home page – the home page is the canonical one, so the two never compete. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.explore");
  const metadata = pageMetadata({ title: t("title"), description: t("description"), path: "/explore" });
  return { ...metadata, alternates: { canonical: absoluteUrl("/") } };
}

export default function ExploreRoute() {
  return (
    <MockDelay ms={400} fallback={<ExploreSkeleton />}>
      <ExploreFeed />
    </MockDelay>
  );
}
