import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { StayDetail } from "@/components/views/StayDetail";
import { stays, users } from "@/lib/mock";
import { firstSentence } from "@/lib/utils";

/**
 * Shared links show the House title, the host's hook sentence and the host's face photo.
 * Reads the mock data directly – Houses created in the browser only exist client-side and get the default title.
 */
export async function generateMetadata({ params }: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stay = stays.find((s) => s.slug === slug);
  if (!stay) return { title: "House" };

  const host = users.find((u) => u.id === stay.hostId);
  const description = firstSentence(stay.lookingForText);
  const image = host?.photos[0];
  return {
    title: stay.title,
    description,
    openGraph: { title: stay.title, description, images: image ? [image] : undefined },
  };
}

// Stays can be created client-side at any time, so params are runtime data and need a Suspense boundary.
export default function StayPage({ params }: PageProps<"/stays/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StayDetail params={params} />
    </Suspense>
  );
}
