import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WhereNextView } from "@/components/explore/WhereNextView";
import { pageMetadata } from "@/lib/seo";

/** Public and server-rendered, but kept out of the index for now (mock demand). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore.whereNext");
  return pageMetadata({ title: t("title"), description: t("metaDescription"), path: "/where-next", noindex: true });
}

export default function WhereNextPage() {
  return <WhereNextView />;
}
