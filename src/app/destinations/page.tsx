import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DestinationsView } from "@/components/explore/DestinationsView";
import { pageMetadata } from "@/lib/seo";

/** Public and server-rendered, but kept out of the index for now (mock demand). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore.destinationsPage");
  return pageMetadata({ title: t("title"), description: t("metaDescription"), path: "/destinations", noindex: true });
}

export default function DestinationsPage() {
  return <DestinationsView />;
}
