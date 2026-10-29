import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GetTheApp, StepNumber } from "@/components/GetTheApp";
import { Container } from "@/components/layout/Container";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.howItWorks");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/how-it-works", type: "article" });
}

/** Step copy: keys under howItWorks.steps. */
const STEPS = ["open", "share", "requests", "crew", "live"] as const;

/** One screen on desktop (fits 1440×900 under the sticky header): two equal-height cards. */
export default async function HowItWorksPage() {
  const t = await getTranslations("howItWorks");
  return (
    <Container page>
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-lg text-zinc-500">
        {t.rich("intro", { b: (chunks) => <span className="font-semibold text-ink">{chunks}</span> })}
      </p>

      {/* Grid items stretch, so both cards share the taller one's height. */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="rounded-[28px] bg-white p-8 lg:col-span-7">
          <h2 className="text-xl font-semibold tracking-tight text-ink">{t("stepsTitle")}</h2>
          <ol className="mt-6 space-y-5">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-4">
                <StepNumber n={i + 1} />
                <div className="min-w-0">
                  {/* leading-8 centres the title on the 32px number circle */}
                  <h3 className="text-lg font-semibold leading-8 text-ink">{t(`steps.${step}.title`)}</h3>
                  <p className="text-base leading-normal text-zinc-600">{t(`steps.${step}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <GetTheApp className="lg:col-span-5" />
      </div>
    </Container>
  );
}
