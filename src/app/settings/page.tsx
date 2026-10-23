import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Settings } from "@/components/views/Settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("settings") };
}

export default function SettingsPage() {
  return <Settings />;
}
