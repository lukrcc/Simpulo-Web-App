import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("pages.privacy") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("footer.pages");
  return (
    <ContentPage title={t("privacy.title")}>
      <TodoNote>{t("placeholder")}</TodoNote>
      <p>{t("privacy.text")}</p>
    </ContentPage>
  );
}
