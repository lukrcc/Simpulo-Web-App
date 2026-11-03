import { ArrowRight, ChevronDown, Link2, MapPin, MessagesSquare, UserCheck, Wallet, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { HostHeroCard, HostHousesRow, HostWays } from "@/components/host/HostShowcase";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StageBand } from "@/components/ui/StageBand";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.host");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/host" });
}

/** The three "How it works" cards' icons, in the order of growth.host.why. */
const HOW_ICONS: LucideIcon[] = [UserCheck, Wallet, MessagesSquare];

/**
 * /host – "Anyone can host": the hero on the stage gradient with a real House, "Two ways to host" (the page's one sum),
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
    <>
      {/* Hero, on the stage gradient: text left, the House card (448 × 560) right, centred on each other. */}
      <StageBand from="md" className="pb-16">
        <Container className="pt-16">
          <section className="grid grid-cols-1 items-center gap-10 split:grid-cols-12 split:gap-8">
            <div className="split:col-span-7">
              <p className="text-eyebrow uppercase text-muted">{t("eyebrow")}</p>
              <h1 className="mt-3 text-display text-ink">{t("title")}</h1>
              <p className="mt-6 max-w-140 text-body-lg text-muted">{t("intro")}</p>
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
                  <li key={text} className="flex items-center gap-2 text-body text-ink">
                    <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <HostHeroCard className="w-full max-w-112 split:col-span-5 split:justify-self-end" />
          </section>
        </Container>
      </StageBand>

    <Container>
      {/* 96px from the hero card: the band's 64px below it plus this. */}
      <HostWays className="mt-8" />

      <HostHousesRow className="mt-(--space-section)" />

      <section data-glow-section aria-labelledby="host-how" className="mt-(--space-section)">
        <SectionHeader id="host-how" title={t("howTitle")} />
        <ul className="card-grid mt-6 [--card-cols:3] [--card-min:260px]">
          {why.map((item, i) => {
            const Icon = HOW_ICONS[i] ?? MessagesSquare;
            return (
              <li key={item.title} className={cn(cardClass, "flex flex-col")}>
                <span className="flex size-14 items-center justify-center rounded-full bg-bg text-ink">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-h3 tracking-tight text-ink">{item.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-muted">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section data-glow-section aria-labelledby="host-faq" className="mt-(--space-section)">
        <SectionHeader id="host-faq" title={t("faqTitle")} />
        <div className="mt-6 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-6">
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

      {/* The page's last word: the one main action, on peach. */}
      <section data-glow-section className="mt-(--space-section) flex flex-col items-start gap-6 rounded-3xl bg-(--select-bg) p-16 text-ink md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-h2">{t("ctaTitle")}</h2>
          <p className="mt-2 text-body-lg text-muted">{t("ctaText")}</p>
        </div>
        <Button href="/create" size="lg">
          {t("openHouse")}
        </Button>
      </section>
    </Container>
    </>
  );
}
