import { Dumbbell, Gamepad2, GraduationCap, Video, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import { StepNumber } from "@/components/GetTheApp";
import { HostApplicationForm } from "@/components/host/HostApplicationForm";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";
import { paymentSplit } from "@/lib/fees";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("host") };
}

/** In the order of growth.host.audiences. */
const AUDIENCE_ICONS: LucideIcon[] = [Video, Gamepad2, Dumbbell, GraduationCap];

/** The worked example: a €500 stay share with a €100 host programme. */
const EXAMPLE = paymentSplit(500, 100);

/** /host – "Host with your community": who it's for, how the host programme pays, three steps, the application. */
export default async function HostPage() {
  const t = await getTranslations("growth.host");
  const messages = await getMessages();
  const format = await getFormatter();
  const { audiences, steps } = messages.growth.host;
  const eur = (amount: number) => format.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const exampleRows = [
    { label: t("exampleStay"), value: eur(EXAMPLE.share) },
    { label: t("exampleProgramme"), value: eur(EXAMPLE.hostFee) },
    { label: t("exampleFee"), value: eur(EXAMPLE.fee) },
  ];

  return (
    <Container page>
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{t("eyebrow")}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">{t("intro")}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href="#apply" className={buttonClass("dark", "lg")}>
            {t("apply")}
          </a>
          <Link href="/create" className={buttonClass("secondary", "lg")}>
            {t("openHouse")}
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">{t("forTitle")}</h2>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((audience, i) => {
            const Icon = AUDIENCE_ICONS[i] ?? Video;
            return (
              <li key={audience.title} className="rounded-[24px] bg-white p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{audience.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{audience.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 className="text-2xl font-bold tracking-tight">{t("premiumTitle")}</h2>
          <p className="mt-3 text-lg leading-relaxed text-zinc-600">{t("premiumText")}</p>
        </div>
        <div className="rounded-[28px] bg-white p-6 lg:col-span-6 lg:p-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("exampleTitle")}</h3>
          <dl className="mt-4 divide-y divide-black/5">
            {exampleRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 text-[15px]">
                <dt className="text-zinc-600">{row.label}</dt>
                <dd className="tabular-nums">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-3 text-[15px] font-semibold">
              <dt>{t("exampleGuestPays")}</dt>
              <dd className="tabular-nums">{eur(EXAMPLE.total)}</dd>
            </div>
          </dl>
          <div className="mt-3 rounded-2xl bg-page p-4">
            <p className="flex items-center justify-between font-semibold">
              <span>{t("exampleYouGet")}</span>
              <span className="text-xl tabular-nums text-ink">{eur(EXAMPLE.hostReceives)}</span>
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">{t("exampleNote")}</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">{t("stepsTitle")}</h2>
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-[24px] bg-white p-6">
              <StepNumber n={i + 1} />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-8">{step.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="apply" className="mt-14 scroll-mt-[calc(var(--header-h)+24px)]">
        <h2 className="text-2xl font-bold tracking-tight">{t("formTitle")}</h2>
        <p className="mt-1 text-zinc-500">{t("formIntro")}</p>
        <HostApplicationForm />
      </section>
    </Container>
  );
}
