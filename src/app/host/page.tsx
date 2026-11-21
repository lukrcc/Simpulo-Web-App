import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostPage } from "@/components/views/HostPage";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.host");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/host" });
}

/** /host – the page for hosts (components/views/HostPage.tsx). */
export default function Host() {
  return <HostPage />;
}
