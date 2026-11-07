import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetApp } from "@/components/get/GetApp";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("install");
  return pageMetadata({ title: t("getTitle"), description: t("getLead"), path: "/get" });
}

/**
 * /get – getting Simpulo on the phone, the same for visitors and members. Only the logo in the header (SiteHeader), no tabs, no footer
 * tabs. What it offers depends on the device (GetApp): Chrome's install on Android, the Safari steps on an iPhone/iPad, a QR code on a
 * computer, "You already have Simpulo" in the installed app. Once the store links are set (config/app-links.ts) it forwards there.
 */
export default function GetPage() {
  return <GetApp />;
}
