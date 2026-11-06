import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, LEGAL_UPDATED, LegalSection, TodoNote } from "@/components/layout/ContentPage";
import { CANCELLATION_POLICY, POLICY_RULES } from "@/config/policies";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("policy");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/cancellation", type: "article" });
}

/** The cancellation rules in full (config/policies.ts) – a draft until the legal review. */
export default async function CancellationPage() {
  const t = await getTranslations("policy");
  return (
    <ContentPage title={t("title")} intro={t("intro")} updated={LEGAL_UPDATED}>
      {CANCELLATION_POLICY.draft && <TodoNote>{t("draft")}</TodoNote>}
      {POLICY_RULES.map((key) => (
        <LegalSection key={key} id={key} title={t(`rules.${key}.title`)}>
          <p>{t(`rules.${key}.body`, { hours: CANCELLATION_POLICY.bookingWindowHours })}</p>
        </LegalSection>
      ))}
    </ContentPage>
  );
}
