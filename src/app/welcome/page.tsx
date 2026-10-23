import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { WelcomeView } from "@/components/onboarding/WelcomeView";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("welcome"), robots: { index: false } };
}

export default function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  // ?next= is request data – it needs its own Suspense boundary (cacheComponents).
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Welcome searchParams={searchParams} />
    </Suspense>
  );
}

async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <WelcomeView next={Array.isArray(next) ? next[0] : next} />;
}
