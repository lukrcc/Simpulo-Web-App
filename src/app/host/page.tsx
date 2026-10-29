import { ChevronDown, MessagesSquare, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { HostHeroCard, HostHousesRow } from "@/components/host/HostShowcase";
import { ProHostSection } from "@/components/host/ProHostSection";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.host");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/host" });
}

/**
 * /host – "Anyone can host": hero with a real House, why host (three cards), Houses people opened, the optional host
 * experience (featureFlags.hostPremium only, ProHostSection), a two-question FAQ and a closing CTA. The steps live on
 * /how-it-works.
 */
export default async function HostPage() {
  const t = await getTranslations("growth.host");
  const messages = await getMessages();
  const format = await getFormatter();
  const { why, faq } = messages.growth.host;
  const zero = format.number(0, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <Container page>
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("eyebrow")}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">{t("intro")}</p>
          <Link href="/create" className={buttonClass("dark", "lg", "mt-6")}>
            {t("openHouse")}
          </Link>
        </div>
        <HostHeroCard className="w-full max-w-[440px] lg:col-span-5 lg:justify-self-end" />
      </section>

      <section aria-labelledby="host-why" className="mt-16">
        <h2 id="host-why" className="text-2xl font-bold tracking-tight">
          {t("whyTitle")}
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {why.map((item, i) => (
            <li key={item.title} className="flex flex-col rounded-[24px] bg-white p-6">
              {/* The middle card's "€0" is the section's only accent; the others get a quiet icon. */}
              {i === 1 ? (
                <p className="text-4xl font-bold leading-11 tracking-tight text-accent tabular-nums">{zero}</p>
              ) : (
                <span className="flex size-11 items-center justify-center rounded-full bg-page text-ink">
                  {i === 0 ? <UserCheck className="size-5" aria-hidden /> : <MessagesSquare className="size-5" aria-hidden />}
                </span>
              )}
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <HostHousesRow />

      <ProHostSection />

      <section aria-labelledby="host-faq" className="mt-14 max-w-3xl">
        <h2 id="host-faq" className="text-2xl font-bold tracking-tight">
          {t("faqTitle")}
        </h2>
        <div className="mt-4 divide-y divide-black/5 rounded-[24px] bg-white px-6">
          {faq.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 text-zinc-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14 flex flex-col items-start gap-5 rounded-[28px] bg-ink p-8 text-white md:flex-row md:items-center md:justify-between md:p-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.rich("ctaTitle", { accent: (chunks) => <span className="text-accent">{chunks}</span> })}</h2>
          <p className="mt-1 text-white/70">{t("ctaText")}</p>
        </div>
        <Link href="/create" className={buttonClass("secondary", "lg", "shrink-0 border-transparent")}>
          {t("openHouse")}
        </Link>
      </section>
    </Container>
  );
}
