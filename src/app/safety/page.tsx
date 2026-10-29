import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.safety");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/safety", type: "article" });
}

/** Section keys under seo.safety.sections – placeholder copy until the real page is written. */
const SECTIONS = ["profiles", "requests", "payments", "onSite", "reporting"] as const;

export default async function SafetyPage() {
  const t = await getTranslations("seo.safety");
  return (
    <ContentPage title={t("title")} intro={t("intro")}>
      <TodoNote>{t("todo")}</TodoNote>
      {SECTIONS.map((key) => (
        <section key={key} aria-labelledby={`safety-${key}`} className="pt-4">
          <h2 id={`safety-${key}`} className="text-xl font-semibold tracking-tight text-ink">
            {t(`sections.${key}`)}
          </h2>
          <p className="mt-2">{t("placeholder")}</p>
        </section>
      ))}
    </ContentPage>
  );
}
