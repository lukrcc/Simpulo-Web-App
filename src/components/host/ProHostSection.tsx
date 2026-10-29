"use client";

import { useFormatter, useTranslations } from "next-intl";
import { paymentSplit } from "@/lib/fees";
import { useFeatureFlag } from "@/lib/featureFlags";

/** The worked example: a €500 stay share with a €100 host experience. */
const EXAMPLE = paymentSplit(500, 100);

/**
 * "Add what only you can bring" on /host – the optional host experience (up to 30 % of the share) as a step up from a
 * normal House, with a compact per-person example. Only with featureFlags.hostPremium; off, it isn't rendered at all.
 */
export function ProHostSection() {
  const t = useTranslations("growth.host");
  const format = useFormatter();
  const premium = useFeatureFlag("hostPremium");
  if (!premium) return null;

  const eur = (amount: number) => format.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const rows = [
    { label: t("exampleStay"), value: eur(EXAMPLE.share) },
    { label: t("exampleProgramme"), value: eur(EXAMPLE.hostFee) },
    { label: t("exampleFee"), value: eur(EXAMPLE.fee) },
  ];

  return (
    <section id="pro-hosts" aria-labelledby="pro-hosts-title" className="mt-14 grid scroll-mt-[calc(var(--header-h)+24px)] grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-7">
        <h2 id="pro-hosts-title" className="text-2xl font-bold tracking-tight">
          {t("proTitle")}
        </h2>
        <p className="mt-2 max-w-xl leading-relaxed text-zinc-600">{t("proText")}</p>
      </div>
      <div className="rounded-[24px] bg-white p-5 lg:col-span-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("exampleTitle")}</h3>
        <dl className="mt-2 divide-y divide-black/5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 text-sm">
              <dt className="text-zinc-600">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 text-sm font-semibold">
            <dt>{t("exampleGuestPays")}</dt>
            <dd className="tabular-nums">{eur(EXAMPLE.total)}</dd>
          </div>
        </dl>
        <div className="mt-2 rounded-2xl bg-page px-4 py-3">
          <p className="flex items-center justify-between text-sm font-semibold">
            <span>{t("exampleYouGet")}</span>
            <span className="tabular-nums text-ink">{eur(EXAMPLE.hostReceives)}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{t("exampleNote")}</p>
        </div>
      </div>
    </section>
  );
}

/** Renders its children only with featureFlags.hostPremium – e.g. the footer's "Pro hosts" link. */
export function IfHostPremium({ children }: { children: React.ReactNode }) {
  return useFeatureFlag("hostPremium") ? children : null;
}
