import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, LEGAL_UPDATED, LegalSection, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("pages.imprint") };
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
