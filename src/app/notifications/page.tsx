import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("notifications") };
}

export default function NotificationsPage() {
  return <NotificationsView />;
}
