import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ } from "@/lib/faq";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.faq");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/faq", type: "article" });
}

/** Questions and answers from src/lib/faq.ts, grouped in sections – plus the same list as FAQPage structured data. */
export default async function FaqPage() {
  const t = await getTranslations("seo.faq");
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.flatMap((section) =>
      section.items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
    ),
  };
  return (
    <ContentPage title={t("title")} intro={t("intro")}>
      <JsonLd data={faqPage} />
      <TodoNote>{t("todo")}</TodoNote>
      {FAQ.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`faq-${section.id}`} className="pt-4">
          <h2 id={`faq-${section.id}`} className="text-xl font-semibold tracking-tight text-ink">
            {section.title}
          </h2>
          <dl className="mt-4 space-y-5">
            {section.items.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-ink">{item.question}</dt>
                <dd className="mt-1">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </ContentPage>
  );
}
