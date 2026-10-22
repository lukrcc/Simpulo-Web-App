import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyProfile } from "@/components/views/ProfileView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("profile") };
}

export default function ProfilePage() {
  return <MyProfile />;
}
