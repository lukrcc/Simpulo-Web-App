"use client";

import { ArrowLeft, Download, Landmark, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { PayoutSetupSheet, useStartOnboarding } from "@/components/payouts/PayoutSetup";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { useFormat } from "@/i18n/format";
import { earningsCsv, earningsFor, type Earnings } from "@/lib/earnings";
import { manageHref } from "@/lib/houseTasks";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useBalance, usePayouts } from "@/lib/payments/usePayouts";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SECTION_TITLE = "text-eyebrow uppercase text-ink/55";
const CHART_HEIGHT = 200;

/** /your-houses/earnings – everything in cards, the same container as Explore. */
export function EarningsPage() {
  const t = useTranslations("houses.earnings");
  return (
    <RequireLogin title={t("loginTitle")}>
      <EarningsContent />
    </RequireLogin>
  );
}

function EarningsContent() {
  const t = useTranslations("houses.earnings");
  const tHouses = useTranslations("houses");
  const store = useStore();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const earnings = earningsFor(store, store.currentUserId, today);
  return (
    <Container className="pb-(--space-section) pt-6 md:pt-8">
      <Link href="/your-houses" className={buttonStyles("tertiary", "sm", "-ml-4")}>
        <ArrowLeft aria-hidden />
        {tHouses("title")}
      </Link>
      <h1 className="sr-only">{t("title")}</h1>
      <div className="mt-6 flex flex-col gap-5">
        <PayoutAccountCard />
        <HeadCard earnings={earnings} />
        {earnings.months.some((m) => m.amount > 0) && <ChartCard earnings={earnings} />}
        <PayoutsCard earnings={earnings} />
      </div>
      <p className="mt-4 text-small text-muted">{t("taxNote")}</p>
    </Container>
  );
}

/** One card: "Payouts not set up" + Set up, or "Payouts to ****1234 · Edit" (and the in-between states). */
function PayoutAccountCard() {
  const tE = useTranslations("houses.earnings");
  const tPayouts = useTranslations("payouts");
  const { status, last4 } = usePayoutAccount();
  const { start, busy } = useStartOnboarding();
  const [setup, setSetup] = useState(false);
  if (status === null) return <div className="card-soft h-20 animate-pulse rounded-3xl" />;
  const line = status === "active" ? tE("accountActive", { last4: last4 ?? "1234" }) : status === "pending" ? tPayouts("pendingTitle") : status === "action_required" ? tPayouts("actionTitle") : tE("accountNone");
  return (
    <section className="card-soft flex flex-wrap items-center gap-4 rounded-3xl px-6 py-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
        {status === "pending" ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : <Landmark className="size-4.5" aria-hidden />}
      </span>
      <p className="min-w-0 flex-1 text-body font-semibold text-ink">{line}</p>
      {status === "active" && (
        <Button variant="tertiary" size="sm" onClick={start} disabled={busy}>
          {tE("accountEdit")}
        </Button>
      )}
      {status === "none" && (
        <Button variant="secondary" size="sm" onClick={() => setSetup(true)}>
          {tE("accountSetUp")}
        </Button>
      )}
      {status === "action_required" && (
        <Button variant="secondary" size="sm" onClick={start} disabled={busy}>
          {tPayouts("actionAction")}
        </Button>
      )}
      <PayoutSetupSheet open={setup} onClose={() => setSetup(false)} />
    </section>
  );
}

/** This year large on the left; pending and the next payout small on the right; all time only when it says something else. */
function HeadCard({ earnings }: { earnings: Earnings }) {
  const t = useTranslations("houses.earnings");
  const f = useFormat();
  const me = useStore().currentUserId;
  const balance = useBalance(me, earnings);
  const money = (amount: number) => f.price(amount, earnings.currency);
  const small = "flex flex-col gap-0.5";
  return (
    <section className="card-soft flex flex-wrap items-end justify-between gap-6 rounded-3xl p-6">
      <div>
        <p className={SECTION_TITLE}>{t("thisYear")}</p>
        <p className="mt-2 text-display tabular-nums text-ink">{money(earnings.thisYear)}</p>
        {earnings.allTime !== earnings.thisYear && <p className="mt-1 text-small text-muted">{t("allTimeLine", { amount: money(earnings.allTime) })}</p>}
      </div>
      <div className="flex gap-10">
        <div className={small}>
          <span className="text-small text-muted">{t("pending")}</span>
          <span className="text-h3 tabular-nums text-ink">{balance ? money(balance.pending) : "…"}</span>
        </div>
        <div className={small}>
          <span className="text-small text-muted">{t("next")}</span>
          <span className="text-h3 tabular-nums text-ink">{balance?.next ? `${money(balance.next.amount)} · ${f.day(balance.next.date)}` : balance ? "—" : "…"}</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Payouts per month, the last 12 (one series): bars in muted with rounded corners, the current month in ink, the amount as a tooltip. Under them
 * the month, the year small under a January.
 */
function ChartCard({ earnings }: { earnings: Earnings }) {
  const t = useTranslations("houses.earnings");
  const f = useFormat();
  const formatter = useFormatter();
  const { months } = earnings;
  const max = Math.max(1, ...months.map((m) => m.amount));
  // The current month in ink – or, while it has nothing yet, the latest month that paid out.
  const latest = months.findLastIndex((m) => m.amount > 0);
  const current = months[months.length - 1].amount > 0 || latest < 0 ? months.length - 1 : latest;
  return (
    <section aria-labelledby="earnings-months" className="card-soft rounded-3xl p-6">
      <h2 id="earnings-months" className={SECTION_TITLE}>
        {t("perMonth")}
      </h2>
      <div className="mt-5 flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {months.map(({ month, amount }, i) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          const label = `${formatter.dateTime(date, { month: "long", year: "numeric", timeZone: "UTC" })} · ${f.price(amount, earnings.currency)}`;
          return (
            <button key={month} type="button" aria-label={label} data-tooltip={label} className="group flex h-full min-w-0 flex-1 items-end justify-center rounded-lg outline-none">
              <span
                className={cn("block w-full max-w-10 rounded-md transition-colors duration-150", i === current ? "bg-ink" : "bg-ink/20 group-hover:bg-ink/35 group-focus-visible:bg-ink/35")}
                style={{ height: amount > 0 ? Math.max(6, Math.round((amount / max) * CHART_HEIGHT)) : 3 }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {months.map(({ month }) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          return (
            <span key={month} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span className="truncate text-small text-muted">{formatter.dateTime(date, { month: "short", timeZone: "UTC" })}</span>
              {month.endsWith("-01") && <span className="text-eyebrow text-ink/40">{month.slice(0, 4)}</span>}
            </span>
          );
        })}
      </div>
    </section>
  );
}

/** One table for every payout: House · Dates · Guests · Gross · Fee · Payout · Paid on · Status; "Export CSV" in its head. */
function PayoutsCard({ earnings }: { earnings: Earnings }) {
  const t = useTranslations("houses.earnings");
  const f = useFormat();
  const me = useStore().currentUserId;
  // The provider's payout records (dates, status) next to each House's figures.
  const records = usePayouts(me, earnings) ?? [];
  const money = (amount: number) => f.price(amount, earnings.currency);
  const recordOf = (rowId: string) => records.find((r) => r.id === `po-${rowId}`);

  function exportCsv() {
    const blob = new Blob([earningsCsv(earnings)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpulo-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = ["house", "dates", "guests", "gross", "fee", "payout", "paidOn", "status"] as const;
  const right = new Set<string>(["guests", "gross", "fee", "payout"]);
  return (
    <section aria-labelledby="earnings-payouts" className="card-soft overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between gap-4 px-6 pt-5">
        <h2 id="earnings-payouts" className={SECTION_TITLE}>
          {t("payouts")}
        </h2>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={earnings.rows.length === 0}>
          <Download aria-hidden />
          {t("export")}
        </Button>
      </div>
      {earnings.rows.length === 0 ? (
        <p className="px-6 pb-6 pt-4 text-body text-muted">{t("noPayouts")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto px-6 pb-2">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="text-small text-muted">
                {columns.map((key) => (
                  <th key={key} scope="col" className={cn("pb-2 pr-4 font-medium last:pr-0", right.has(key) && "text-right")}>
                    {t(`columns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8 border-t border-ink/8 text-body text-ink">
              {earnings.rows.map((row) => {
                const record = recordOf(row.id);
                return (
                  <tr key={row.id} className="[&>td]:py-3.5 [&>td]:pr-4 [&>td:last-child]:pr-0">
                    <td className="max-w-64 truncate font-semibold">{row.stay ? <Link href={manageHref(row.stay)} className="hover:underline">{row.title}</Link> : row.title}</td>
                    <td className="whitespace-nowrap text-muted">{f.stayDatesLong({ startDate: row.startDate, endDate: row.endDate })}</td>
                    <td className="text-right tabular-nums">{row.guests}</td>
                    <td className="text-right tabular-nums">{money(row.gross)}</td>
                    <td className="text-right tabular-nums text-muted">
                      {row.fee > 0 ? (
                        `−${money(row.fee)}`
                      ) : (
                        <span tabIndex={0} data-tooltip={t("freeReason")} className="cursor-help underline decoration-dotted underline-offset-4 outline-none">
                          {t("free")}
                        </span>
                      )}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{money(row.payout)}</td>
                    <td className="whitespace-nowrap text-muted">{row.status === "pending" ? "—" : f.day(record?.date ?? row.payoutDate)}</td>
                    <td>
                      <Badge className="bg-ink/6">{t(`status.${row.status}`)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
