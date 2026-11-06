import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MockDelay } from "@/components/MockDelay";
import { InboxSkeleton } from "@/components/skeletons/InboxSkeleton";
import { InboxList } from "@/components/views/InboxList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("messages") };
}

export default function InboxPage() {
  // ?id= selects the chat on desktop – search params need a Suspense boundary.
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <MockDelay ms={400} fallback={<InboxSkeleton />}>
        <InboxList />
      </MockDelay>
    </Suspense>
  );
}
