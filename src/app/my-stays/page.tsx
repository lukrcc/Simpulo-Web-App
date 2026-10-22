import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { MyStays } from "@/components/views/MyStays";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("houses") };
}

export default function MyStaysPage() {
  // ?id= selects the House on desktop – search params need a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyStays />
    </Suspense>
  );
}
