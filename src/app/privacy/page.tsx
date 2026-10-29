import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { ContentPage, LEGAL_UPDATED, LegalSection, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.privacy");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/privacy", type: "article" });
}

const SECTIONS = ["controller", "data", "purposes", "sharing", "retention", "rights", "cookies", "contact"] as const;

export default async function PrivacyPage() {
  const tp = await getTranslations("footer.pages");
  const t = await getTranslations("legal");
  return (
    <ContentPage title={tp("privacy.title")} intro={t("privacy.intro")} updated={LEGAL_UPDATED}>
      <TodoNote>{t("draftNotice")}</TodoNote>
      {SECTIONS.map((key) => (
        <LegalSection key={key} id={key} title={t(`privacy.${key}.title`)}>
          <p>{t(`privacy.${key}.body`)}</p>
        </LegalSection>
      ))}
    </ContentPage>
  );
}
