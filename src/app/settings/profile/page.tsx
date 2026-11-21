import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { EditProfile } from "@/components/views/EditProfile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("editProfile") };
}

export default function EditProfilePage() {
  // Suspense: EditProfile reads ?setup=1 with useSearchParams (the onboarding, CLAUDE.md "Onboarding").
  return (
    <Suspense fallback={null}>
      <EditProfile />
    </Suspense>
  );
}
