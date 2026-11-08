import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FaqView } from "@/components/faq/FaqView";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ } from "@/config/faq";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.faq");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/faq", type: "article" });
}

/**
 * /faq – the one page that explains Simpulo (/how-it-works leads here; ?role=host opens Hosting): "Questions", Joining · Hosting, the
 * answers from config/faq.ts – plus both sides as FAQPage structured data.
 */
export default function FaqPage() {
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQ.join, ...FAQ.host].map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };
  return (
    <Container page>
      <JsonLd data={faqPage} />
      {/* ?role= comes from useSearchParams, which needs its own boundary. */}
      <Suspense fallback={null}>
        <FaqView />
      </Suspense>
    </Container>
  );
}
