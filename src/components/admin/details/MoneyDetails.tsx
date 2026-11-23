"use client";

// The money tiles' details (CLAUDE.md "Kapsel-Ansicht"): what a chosen mini tile shows under the row – on Geld's capsules and on Übersicht ›
// Geld (the same keys, the same parts). Every number from lib/admin/metrics.ts (moneySeries: the same day rows as everything else); the
// charts are the admin's (bars only, violet, the running period dashed). A key without a detail of its own returns null – the capsule then
// shows its content.
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useAdminPeriod } from "@/lib/admin/period";
import { moneySeries, moneyTotals } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { chartTick, dec, eur, num } from "@/lib/i18n/adminFormat";
import { ColumnChart, ComboChart } from "../AdminCharts";
import { PayoutSection, Withdrawals } from "../AdminCockpit";
import { ProfitDrill } from "../ProfitDrill";

const H = 300;

function Chart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className="mb-2 text-eyebrow uppercase text-(--adm-label)">{title}</h2>
      {children}
    </section>
  );
}

/** The detail of a money tile by its key – null when it has none of its own. */
export function useMoneyDetail(): (key: string) => ReactNode | null {
  const t = useTranslations("admin.capsuleDetail.money");
  const inputs = useAdminInputs();
  const [period] = useAdminPeriod();
  const series = moneySeries(inputs, period);
  const label = (r: (typeof series)[number]) => chartTick(r.from, r.to, r.level).main;
  const point = (r: (typeof series)[number], value: number) => ({ label: label(r), value, current: r.current });
  const per = t(`per.${period}`);
  function detailOf(key: string): ReactNode | null {
    switch (key) {
      case "bookingVolume":
        return (
          <div className="grid gap-(--adm-section) lg:grid-cols-2">
            <Chart title={t("volume", { per })}>
              <ColumnChart data={series.map((r) => point(r, r.bookingVolume))} unit="€" height={H} label={t("volume", { per })} />
            </Chart>
            <Chart title={t("bookings", { per })}>
              <ColumnChart data={series.map((r) => point(r, r.guests))} height={H} label={t("bookings", { per })} />
            </Chart>
          </div>
        );
      case "bookings":
        return (
          <Chart title={t("bookings", { per })}>
            <ColumnChart data={series.map((r) => point(r, r.guests))} height={H} label={t("bookings", { per })} />
          </Chart>
        );
      case "revenue":
        return (
          <Chart title={t("revenueSplit", { per })}>
            <ComboChart
              data={series.map((r) => ({ label: label(r), current: r.current, guests: r.serviceFees, hosts: r.hostFeeShare }))}
              series={[
                { key: "guests", label: t("guests"), tone: "primary" },
                { key: "hosts", label: t("hosts"), tone: "chart-2" },
              ]}
              format={(v) => eur(v)}
              height={H}
              label={t("revenueSplit", { per })}
            />
          </Chart>
        );
      case "costs":
        return (
          <Chart title={t("costsSplit", { per })}>
            <ComboChart
              data={series.map((r) => ({ label: label(r), current: r.current, stripe: r.stripeFees, other: r.otherCosts }))}
              series={[
                { key: "stripe", label: t("stripe"), tone: "primary" },
                { key: "other", label: t("other"), tone: "chart-2" },
              ]}
              format={(v) => eur(v)}
              height={H}
              label={t("costsSplit", { per })}
            />
          </Chart>
        );
      case "stripeFees":
        return (
          <Chart title={t("stripePer", { per })}>
            <ColumnChart data={series.map((r) => point(r, r.stripeFees))} unit="€" height={H} label={t("stripePer", { per })} />
          </Chart>
        );
      case "profit":
        return (
          <div className="flex flex-col gap-(--adm-section)">
            <ProfitDrill />
            <Chart title={t("margin", { per })}>
              <ColumnChart data={series.map((r) => point(r, r.revenue > 0 ? Math.round((r.profit / r.revenue) * 100) : 0))} unit="%" height={220} label={t("margin", { per })} />
            </Chart>
          </div>
        );
      case "takeRate":
        return (
          <Chart title={t("takeRate", { per })}>
            <ColumnChart data={series.map((r) => point(r, r.takeRate ?? 0))} unit="%" height={H} label={t("takeRate", { per })} />
          </Chart>
        );
      case "perGuest":
      case "perBooking":
        return (
          <Chart title={t("perGuest", { per })}>
            <ColumnChart data={series.map((r) => point(r, r.perGuest ?? 0))} unit="€" height={H} label={t("perGuest", { per })} />
          </Chart>
        );
      case "refunds":
        return (
          <Chart title={t("refunds", { per })}>
            <ColumnChart data={series.map((r) => point(r, r.refunds))} unit="€" height={H} label={t("refunds", { per })} />
          </Chart>
        );
      case "monthForecast": {
        // This month so far against the same pace to the month's end – revenue and profit.
        const monthStart = `${inputs.today.slice(0, 7)}-01`;
        const soFar = moneyTotals(inputs, monthStart, inputs.today);
        const done = Number(inputs.today.slice(8, 10));
        const all = new Date(Date.UTC(Number(inputs.today.slice(0, 4)), Number(inputs.today.slice(5, 7)), 0)).getUTCDate();
        const scale = (v: number) => Math.round((v / done) * all);
        return (
          <Chart title={t("forecast", { done: num(done), all: num(all) })}>
            <ComboChart
              data={[
                { label: t("revenue"), soFar: soFar.revenue, forecast: scale(soFar.revenue) },
                { label: t("profit"), soFar: soFar.profit, forecast: scale(soFar.profit) },
              ]}
              series={[
                { key: "soFar", label: t("soFar"), tone: "primary" },
                { key: "forecast", label: t("forecastBar"), tone: "chart-2" },
              ]}
              format={(v) => eur(v)}
              height={H}
              label={t("forecast", { done: num(done), all: num(all) })}
            />
            <p className="mt-2 text-small text-muted">{t("perDay", { value: eur(Math.round(soFar.revenue / done)), rate: soFar.takeRate === null ? "–" : `${dec(soFar.takeRate)} %` })}</p>
          </Chart>
        );
      }
      case "openPayouts":
        return null;
      case "withdrawals":
        return <Withdrawals />;
      default:
        return null;
    }
  }
  return detailOf;
}

/** Zahlungen › Auszahlungen offen: Simpulo's own payouts (Stripe: rhythm, account, next payout, „Jetzt auszahlen“) above the hosts' payouts. */
export function PayoutsDetail({ hosts }: { hosts: ReactNode }) {
  return (
    <div className="flex flex-col gap-(--adm-section)">
      <PayoutSection />
      {hosts}
    </div>
  );
}
