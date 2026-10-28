import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ClaimView } from "@/components/views/ClaimView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  // Claim links are personal – never indexed.
  return { title: t("claim"), robots: { index: false, follow: false } };
}

// Prepared Houses can be created client-side at any time, so the token is runtime data.
export default function ClaimPage({ params }: PageProps<"/claim/[token]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClaimView params={params} />
    </Suspense>
  );
}
