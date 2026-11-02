import { ArrowRight, ChevronDown, Link2, MapPin, MessagesSquare, UserCheck, Wallet, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { HostHeroCard, HostHousesRow, HostWays } from "@/components/host/HostShowcase";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SurfaceBand } from "@/components/ui/SurfaceBand";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.host");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/host" });
}

/** The three "How it works" cards' icons, in the order of growth.host.why. */
const HOW_ICONS: LucideIcon[] = [UserCheck, Wallet, MessagesSquare];

/**
 * /host – "Anyone can host": the hero on a surface band with a real House, "Two ways to host" (the page's one sum),
 * Houses people opened (a carousel band), How it works (three cards), Questions and the closing ink band. Sections
 * 96px apart, no lines; "Open a House" only in the hero, the header and the closing band.
 */
export default async function HostPage() {
  const t = await getTranslations("growth.host");
  const messages = await getMessages();
  const { why, faq } = messages.growth.host;
  const points: Array<{ icon: LucideIcon; text: string }> = [
    { icon: MapPin, text: t("points.place") },
    { icon: Link2, text: t("points.link") },
    { icon: Wallet, text: t("points.share") },
  ];

  return (
    <Container>
      {/* Hero: text left, the House card (512 × 640) right, centred on each other. */}
      <SurfaceBand padding="py-20">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{t("eyebrow")}</p>
            <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-ink md:text-[64px]">{t("title")}</h1>
            <p className="mt-6 max-w-140 text-xl leading-relaxed text-muted">{t("intro")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Button href="/create" size="lg">
                {t("openHouse")}
              </Button>
              <Button href="/how-it-works" variant="tertiary" size="lg">
                {t("howItWorks")}
                <ArrowRight aria-hidden />
              </Button>
            </div>
            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-[15px] text-ink">
                  <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <HostHeroCard className="w-full max-w-lg lg:col-span-5 lg:justify-self-end" />
        </section>
      </SurfaceBand>

      <HostWays className="mt-24" />

      <HostHousesRow className="mt-24" />

      <section aria-labelledby="host-how" className="mt-24">
        <SectionHeader id="host-how" title={t("howTitle")} />
        <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {why.map((item, i) => {
            const Icon = HOW_ICONS[i] ?? MessagesSquare;
            return (
              <li key={item.title} className={cn(cardClass, "flex flex-col")}>
                <span className="flex size-14 items-center justify-center rounded-full bg-bg text-ink">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-[22px] font-semibold tracking-tight text-ink">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="host-faq" className="mt-24">
        <SectionHeader id="host-faq" title={t("faqTitle")} />
        <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface px-6">
          {faq.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* The page's one dark block. */}
      <section className="mt-24 flex flex-col items-start gap-6 rounded-3xl bg-ink p-16 text-surface md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[32px] font-semibold leading-tight tracking-tight">{t("ctaTitle")}</h2>
          <p className="mt-2 text-lg text-surface/70">{t("ctaText")}</p>
        </div>
        <Button href="/create" variant="secondary" size="lg" className="border-transparent">
          {t("openHouse")}
        </Button>
      </section>
    </Container>
  );
}
