import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { InboxList } from "@/components/views/InboxList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("messages") };
}

export default function InboxPage() {
  // ?id= selects the chat on desktop – search params need a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InboxList />
    </Suspense>
  );
}
