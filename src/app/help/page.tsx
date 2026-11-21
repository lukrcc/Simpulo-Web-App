import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { HelpCenter } from "@/components/help/HelpCenter";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { HELP, HELP_CATEGORIES } from "@/config/help";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.faq");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/help", type: "article" });
}

/** /help – the help center (replaces /faq, which leads here): every question as FAQPage structured data too. */
export default async function HelpPage() {
  const t = await getTranslations("faq.items");
  const text = (key: string, values?: Record<string, number>) => t(key as Parameters<typeof t>[0], values);
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HELP_CATEGORIES.flatMap((c) => HELP[c]).map((item) => ({ "@type": "Question", name: text(`${item.id}.question`), acceptedAnswer: { "@type": "Answer", text: text(`${item.id}.answer`, item.values) } })),
  };
  return (
    <Container page>
      <JsonLd data={faqPage} />
      {/* ?cat= comes from useSearchParams, which needs its own boundary. */}
      <Suspense>
        <HelpCenter />
      </Suspense>
    </Container>
  );
}
