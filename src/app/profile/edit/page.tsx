import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditProfile } from "@/components/views/EditProfile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("editProfile") };
}

export default function EditProfilePage() {
  return <EditProfile />;
}
