import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("pages.imprint") };
}

export default async function ImprintPage() {
  const t = await getTranslations("footer.pages");
  return (
    <ContentPage title={t("imprint.title")}>
      <TodoNote>{t("placeholder")}</TodoNote>
      <p>{t("imprint.text")}</p>
    </ContentPage>
  );
}
