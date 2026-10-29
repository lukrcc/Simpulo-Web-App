import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextView } from "@/components/explore/NextView";
import { pageMetadata } from "@/lib/seo";

/** Public and server-rendered, but kept out of the index for now (mock demand). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore.interests");
  return pageMetadata({ title: t("title"), description: t("pageIntro"), path: "/next", noindex: true });
}

export default function NextPage() {
  return <NextView />;
}
