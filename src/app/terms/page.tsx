import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("pages.terms") };
}

export default async function TermsPage() {
  const t = await getTranslations("footer.pages");
  return (
    <ContentPage title={t("terms.title")}>
      <TodoNote>{t("placeholder")}</TodoNote>
      <p>{t("terms.text")}</p>
    </ContentPage>
  );
}
