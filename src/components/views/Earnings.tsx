"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { useFormat } from "@/i18n/format";
import { earningsCsv, type Earnings } from "@/lib/earnings";
import { manageHref } from "@/lib/houseTasks";
import { cn } from "@/lib/utils";
import { PayoutStatusCard } from "@/components/payouts/PayoutSetup";
import { useStore } from "@/lib/store";
import { useBalance, usePayouts } from "@/lib/payments/usePayouts";

const SECTION_TITLE = "text-eyebrow uppercase text-ink/55";
const CHART_HEIGHT = 160;

/**
 * Your houses › Earnings: four numbers, the payouts per month over the last 12 (one series: bars ink 70 %, a tooltip on each), the table per House,
 * the payout history, a CSV for the tax return. Amounts in the House's currency – that's what is paid out.
 */
export function EarningsView({ earnings }: { earnings: Earnings }) {
  const t = useTranslations("houses.earnings");
  const f = useFormat();
  const me = useStore().currentUserId;
  // The history and the next payout come from the payment provider (getPayouts / getBalance).
  const records = usePayouts(me, earnings) ?? [];
  const balance = useBalance(me, earnings);
  const money = (amount: number) => f.price(amount, earnings.currency);

  function exportCsv() {
    const blob = new Blob([earningsCsv(earnings)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpulo-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tiles = [
    { label: t("allTime"), value: money(earnings.allTime) },
    { label: t("thisYear"), value: money(earnings.thisYear) },
    { label: t("pending"), value: balance ? money(balance.pending) : "…" },
    { label: t("next"), value: balance?.next ? money(balance.next.amount) : balance ? "–" : "…", sub: balance?.next ? f.day(balance.next.date) : undefined },
  ];

  return (
    <div className="flex flex-col gap-(--space-section)">
      <div className="flex flex-col gap-4">
      <PayoutStatusCard />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card-soft flex min-w-0 flex-col gap-1 rounded-3xl p-5">
            <span className="text-small text-muted">{tile.label}</span>
            <span className="text-h2 tabular-nums text-ink">{tile.value}</span>
            {tile.sub && <span className="text-small text-muted">{tile.sub}</span>}
          </div>
        ))}
      </div>
      </div>

      <section aria-labelledby="earnings-months">
        <h2 id="earnings-months" className={SECTION_TITLE}>
          {t("perMonth")}
        </h2>
        {earnings.months.some((m) => m.amount > 0) ? <MonthBars months={earnings.months} money={money} /> : <p className="mt-3 text-body text-muted">{t("noMonths")}</p>}
      </section>

      <section aria-labelledby="earnings-houses">
        <h2 id="earnings-houses" className={SECTION_TITLE}>
          {t("perHouse")}
        </h2>
        <div className="-mx-3 mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-small text-muted">
                {(["house", "dates", "guests", "gross", "fee", "payout", "status"] as const).map((key, i) => (
                  <th key={key} scope="col" className={cn("px-3 pb-2 font-medium", i >= 2 && i <= 5 && "text-right")}>
                    {t(`columns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body text-ink">
              {earnings.rows.map((row) => (
                <tr key={row.id} className="[&>td]:px-3 [&>td]:py-3 hover:[&>td]:bg-(--chip-bg) [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl">
                  <td className="max-w-64 truncate font-semibold">{row.stay ? <Link href={manageHref(row.stay)} className="hover:underline">{row.title}</Link> : row.title}</td>
                  <td className="whitespace-nowrap text-muted">{f.stayDatesLong({ startDate: row.startDate, endDate: row.endDate })}</td>
                  <td className="text-right tabular-nums">{row.guests}</td>
                  <td className="text-right tabular-nums">{money(row.gross)}</td>
                  <td className="text-right tabular-nums text-muted">{row.fee > 0 ? `−${money(row.fee)}` : money(0)}</td>
                  <td className="text-right font-semibold tabular-nums">{money(row.payout)}</td>
                  <td>
                    <Badge className="bg-ink/6">{t(`status.${row.status}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="earnings-payouts">
        <h2 id="earnings-payouts" className={SECTION_TITLE}>
          {t("payouts")}
        </h2>
        {records.length === 0 && <p className="mt-3 text-body text-muted">{t("noPayouts")}</p>}
        <ul className="-mx-3 mt-3 flex flex-col">
          {records.map((payout) => (
            <li key={payout.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 rounded-2xl px-3 py-3 sm:grid-cols-[120px_120px_minmax(0,1fr)_auto]">
              <span className="text-body text-ink">{f.day(payout.date)}</span>
              <span className="text-body font-semibold tabular-nums text-ink sm:text-right">{money(payout.amount)}</span>
              <span className="text-small text-muted">{t("account", { account: payout.account })}</span>
              <span className="justify-self-end sm:justify-self-start">
                <Badge className="bg-ink/6">{t(`status.${payout.status}`)}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col items-start gap-2">
        <Button variant="secondary" onClick={exportCsv}>
          <Download aria-hidden />
          {t("export")}
        </Button>
        <p className="text-small text-muted">{t("taxNote")}</p>
      </div>
    </div>
  );
}

/** One bar per month, ink 70 % with a 4px round top on the baseline; hover or focus shows "March 2026 · €1,240". Month names, the year only before a January. */
function MonthBars({ months, money }: { months: Earnings["months"]; money: (amount: number) => string }) {
  const formatter = useFormatter();
  const max = Math.max(1, ...months.map((m) => m.amount));
  return (
    <div className="mt-4">
      <div className="flex items-end gap-2 border-b border-ink/10" style={{ height: CHART_HEIGHT }}>
        {months.map(({ month, amount }) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          const label = `${formatter.dateTime(date, { month: "long", year: "numeric", timeZone: "UTC" })} · ${money(amount)}`;
          return (
            <button key={month} type="button" aria-label={label} data-tooltip={label} className="group flex h-full min-w-0 flex-1 items-end justify-center rounded-t-md outline-none">
              {/* A thin bar (at most 36px) in its month's column; the whole column takes the hover. */}
              <span
                className="block w-full max-w-9 rounded-t-[4px] bg-ink/70 transition-colors duration-150 group-hover:bg-ink group-focus-visible:bg-ink"
                style={{ height: amount > 0 ? Math.max(4, Math.round((amount / max) * CHART_HEIGHT)) : 0 }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {months.map(({ month }) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          return (
            <span key={month} className="min-w-0 flex-1 truncate text-center text-small text-muted">
              {month.endsWith("-01") && <span className="mr-1 text-ink/55">{month.slice(0, 4)}</span>}
              {formatter.dateTime(date, { month: "short", timeZone: "UTC" })}
            </span>
          );
        })}
      </div>
    </div>
  );
}
