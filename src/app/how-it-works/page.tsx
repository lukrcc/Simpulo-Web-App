import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { HowItWorks } from "@/components/how-it-works/HowItWorks";
import { Container } from "@/components/layout/Container";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.howItWorks");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/how-it-works", type: "article" });
}

/**
 * /how-it-works – the same for visitors (in their nav) and members (from the footer), and the one page about hosting (/host leads here
 * with ?role=host): join or host, three steps, what it costs, Houses people opened, Questions (HowItWorks).
 */
export default async function HowItWorksPage() {
  const t = await getTranslations("howItWorks");
  return (
    <Container page>
      <div className="max-w-[1120px]">
        <h1 className="text-h1 text-ink">{t("title")}</h1>
        <p className="mt-2 text-body-lg text-muted">{t("subline")}</p>
      </div>
      {/* The role comes from ?role= (useSearchParams), which needs its own boundary. */}
      <Suspense fallback={null}>
        <HowItWorks />
      </Suspense>
    </Container>
  );
}
