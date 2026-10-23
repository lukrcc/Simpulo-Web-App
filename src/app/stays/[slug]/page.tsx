import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MockDelay } from "@/components/MockDelay";
import { HouseSkeleton } from "@/components/skeletons/HouseSkeleton";
import { StayDetail } from "@/components/views/StayDetail";
import { stays } from "@/lib/mock";
import { firstSentence } from "@/lib/utils";

/**
 * Shared links show the House title and the host's hook sentence; the image comes from ./opengraph-image.tsx
 * (the file convention wins, so no image is set here).
 * Reads the mock data directly – Houses created in the browser only exist client-side and get the default title.
 */
export async function generateMetadata({ params }: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stay = stays.find((s) => s.slug === slug);
  if (!stay) {
    const t = await getTranslations("meta.pages");
    return { title: t("house") };
  }

  const description = firstSentence(stay.lookingForText);
  return {
    title: stay.title,
    description,
    openGraph: { title: stay.title, description },
    twitter: { card: "summary_large_image", title: stay.title, description },
  };
}

// Stays can be created client-side at any time, so params are runtime data and need a Suspense boundary.
export default function StayPage({ params }: PageProps<"/stays/[slug]">) {
  return (
    <Suspense fallback={<HouseSkeleton />}>
      <MockDelay ms={400} fallback={<HouseSkeleton />}>
        <StayDetail params={params} />
      </MockDelay>
    </Suspense>
  );
}
