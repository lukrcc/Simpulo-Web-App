import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, LEGAL_UPDATED, LegalList, LegalSection, TodoNote } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("pages.terms") };
}

// Cancellations and prohibited content add bullet points under their body.
const SECTIONS = ["role", "hosts", "payments", "cancellations", "prohibited", "safety", "deletion"] as const;

export default async function TermsPage() {
  const tp = await getTranslations("footer.pages");
  const t = await getTranslations("legal");
  const points: Partial<Record<(typeof SECTIONS)[number], string[]>> = {
    cancellations: [t("terms.cancellations.hostCancels"), t("terms.cancellations.guestLeaves"), t("terms.cancellations.bookingProof")],
    prohibited: [t("terms.prohibited.courses"), t("terms.prohibited.commercial"), t("terms.prohibited.other")],
  };
  return (
    <ContentPage title={tp("terms.title")} intro={t("terms.intro")} updated={LEGAL_UPDATED}>
      <TodoNote>{t("draftNotice")}</TodoNote>
      {SECTIONS.map((key) => {
        const items = points[key];
        return (
          <LegalSection key={key} id={key} title={t(`terms.${key}.title`)}>
            <p>{t(`terms.${key}.body`)}</p>
            {items && <LegalList items={items} />}
          </LegalSection>
        );
      })}
    </ContentPage>
  );
}
