import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { ContentPage, LEGAL_UPDATED, LegalSection, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.impressum");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/impressum", type: "article" });
}

const SECTIONS = ["provider", "representative", "contact", "register", "vat", "responsible", "disputes"] as const;

export default async function ImprintPage() {
  const tp = await getTranslations("footer.pages");
  const t = await getTranslations("legal");
  return (
    <ContentPage title={tp("imprint.title")} intro={t("imprint.intro")} updated={LEGAL_UPDATED}>
      <TodoNote>{t("draftNotice")}</TodoNote>
      {SECTIONS.map((key) => (
        <LegalSection key={key} id={key} title={t(`imprint.${key}.title`)}>
          <p>{t(`imprint.${key}.body`)}</p>
        </LegalSection>
      ))}
    </ContentPage>
  );
}
