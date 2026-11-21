import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostApply } from "@/components/platform/HostApply";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.apply");
  return pageMetadata({ title: t("title"), description: t("text"), path: "/apply" });
}

/** /apply – "Become a host": the host application (and, once sent, where it stands). */
export default function ApplyPage() {
  return <HostApply />;
}
