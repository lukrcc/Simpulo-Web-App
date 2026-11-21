"use client";

// Geld › Steuern › Buchungsjournal: every booking on Simpulo's side for a period (Woche · Monat · Quartal · Jahr) – the service fee of a
// guest, Simpulo's share of a host fee, a refund, Stripe's fee – with House, gross, rate, tax, net, status and its receipt; the period's
// sums, the reserve suggestion, the year in months and quarters, and two exports for the tax advisor (DATEV-compatible CSV, PDF overview).
// Only showing and exporting – no payout button. Every export goes into the log. All rates and accounts from config/tax.ts (placeholders).
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { RESERVE_ACCOUNT } from "@/config/tax";
import { useAdminActions } from "@/lib/admin/actions";
import { datevCsv, JOURNAL_PERIODS, journalLines, journalPeriod, journalReserve, journalSummary, linesIn, yearBreakdown, type JournalLine, type JournalPeriod, type JournalPeriodKind } from "@/lib/admin/bookingJournal";
import { download, periodLabel as ledgerPeriodLabel, PLAIN } from "@/lib/admin/exporters";
import { journalPdf, journalReceiptPdf } from "@/lib/admin/exporters/journalPdf";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day, eurCents } from "@/lib/i18n/adminFormat";
import { cn } from "@/lib/utils";
import { InfoTip } from "./AdminNumbers";
import { AdminSection } from "./AdminShell";

/** Lines shown before "Alle zeigen" */
const SHOWN = 40;
const TH = "py-2 pr-4 text-small font-normal text-muted";
const TD = "py-2.5 pr-4";

const dateStamp = () => new Date().toISOString().replace(/\D/g, "").slice(0, 14);

export function AdminTaxJournal() {
  const t = useTranslations("admin.money.journal");
  const inputs = useAdminInputs();
  const actions = useAdminActions();
  const showToast = useToast();
  // Starts with the year: the mock bookings lie in the months before, a current week or month is often still empty.
  const [kind, setKind] = useState<JournalPeriodKind>("year");
  const [offset, setOffset] = useState(0);
  const [all, setAll] = useState(false);
  // The journal from the payments in the data (mock: the store's seeded payments).
  const lines = useMemo(() => journalLines(inputs.payments, inputs.stays), [inputs.payments, inputs.stays]);
  const period = journalPeriod(kind, inputs.today, offset);
  const inside = linesIn(lines, period);
  const summary = journalSummary(inside);
  const reserve = journalReserve(summary);
  const year = yearBreakdown(lines, period.year);
  const first = lines[0]?.date ?? inputs.today;
  const label = labelOf(period, t);
  const shown = all ? inside.toReversed() : inside.toReversed().slice(0, SHOWN);

  const kindLabel = (k: JournalLine["kind"]) => PLAIN.journal.kind[k];
  const exportDatev = () => {
    const text = datevCsv(inside, period, dateStamp(), kindLabel);
    download(`simpulo-datev-${period.key}.csv`, new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
    actions.logExport(`${t("datev")} · ${label}`);
    showToast(t("exported", { label: t("datev"), period: label }));
  };
  const exportPdf = () => {
    download(`simpulo-buchungsjournal-${period.key}.pdf`, new Blob([journalPdf({ period, periodLabel: label, lines: inside, summary, reserve, today: inputs.today })], { type: "application/pdf" }));
    actions.logExport(`${t("pdf")} · ${label}`);
    showToast(t("exported", { label: t("pdf"), period: label }));
  };
  const exportReceipt = (line: JournalLine) => {
    download(`simpulo-beleg-${line.receiptNo}.pdf`, new Blob([journalReceiptPdf(line, inputs.today)], { type: "application/pdf" }));
    actions.logExport(`${t("receipt")} ${line.receiptNo}`);
  };

  const numbers = [
    { key: "income", value: summary.income },
    { key: "refunds", value: summary.refunds },
    { key: "fees", value: summary.fees },
    { key: "profit", value: summary.profit },
    { key: "vat", value: summary.vat },
  ] as const;

  return (
    <>
      <p className="text-body text-muted">{t("disclaimer")}</p>
      {/* The period: its kind and which one (‹ ›), never past today's. */}
      <div className="mt-(--adm-inner) flex flex-wrap items-center gap-x-4 gap-y-3">
        <CapsuleGroup
          size="sm"
          label={t("periodLabel")}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setOffset(0);
          }}
          options={JOURNAL_PERIODS.map((value) => ({ value, content: t(`periods.${value}`) }))}
        />
        <span className="flex items-center gap-1">
          <IconButton aria-label={t("prev")} onClick={() => setOffset((o) => o - 1)} disabled={period.from <= first}>
            <ChevronLeft aria-hidden />
          </IconButton>
          <span data-journal-period className="min-w-40 text-center text-h3 tabular-nums text-ink">
            {label}
          </span>
          <IconButton aria-label={t("next")} onClick={() => setOffset((o) => o + 1)} disabled={offset >= 0}>
            <ChevronRight aria-hidden />
          </IconButton>
        </span>
        <span className="text-small text-muted">{t("exampleData")}</span>
      </div>

      {/* The period's numbers: income, refunds, fees, profit before taxes, VAT contained (only while on in config/tax.ts). */}
      <dl data-key-numbers className="mt-(--adm-section) grid grid-cols-2 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
        {numbers.map((n, i) => (
          <div key={n.key} className={cn("min-w-0 pr-4 md:px-5 lg:first:pl-0", i > 0 && "lg:border-l lg:border-ink/8", i % 2 === 1 && "max-md:border-l max-md:border-ink/8 max-md:pl-4")}>
            <dt className="flex items-center gap-1 text-small text-muted">
              {t(`numbers.${n.key}`)}
              <InfoTip text={t(`info.${n.key}`)} />
            </dt>
            <dd className="mt-1 text-h1 tabular-nums text-ink">{n.value === null ? t("vatOff") : eurCents(n.value)}</dd>
          </div>
        ))}
      </dl>

      {/* The reserve: a suggestion, nothing is moved. */}
      <AdminSection title={t("reserveTitle")}>
        <div data-journal-reserve className="flex flex-col gap-1">
          <p className="text-h2 tabular-nums text-ink">{t("reserve", { amount: eurCents(reserve.total) })}</p>
          <p className="text-small text-muted">{reserve.vat > 0 ? t("reserveHowVat", { percent: reserve.percent, vat: eurCents(reserve.vat) }) : t("reserveHow", { percent: reserve.percent })}</p>
          <p className="text-small text-muted">{RESERVE_ACCOUNT ? t("reserveAccount", { account: RESERVE_ACCOUNT.name }) : t("reserveNoAccount")}</p>
          <p className="text-small text-muted">{t("reserveNote")}</p>
        </div>
      </AdminSection>

      <AdminSection title={t("exportTitle")} aside={<span className="text-small text-muted">{t("exportNote")}</span>}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={exportDatev} data-export="datev">
            {t("datev")}
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPdf} data-export="pdf">
            {t("pdf")}
          </Button>
        </div>
        <p className="mt-3 max-w-2xl text-small text-muted">{t("datevNote")}</p>
      </AdminSection>

      <AdminSection title={t("journalTitle")} aside={<span className="text-small text-muted">{t("count", { count: inside.length })}</span>}>
        {inside.length === 0 ? (
          <p className="text-body text-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table data-journal className="w-full min-w-[880px] border-collapse text-left text-body tabular-nums">
              <thead>
                <tr className="border-b border-ink/8">
                  {(["date", "kind", "house", "gross", "rate", "tax", "net", "status", "receipt"] as const).map((c) => (
                    <th key={c} scope="col" className={cn(TH, ["gross", "rate", "tax", "net"].includes(c) && "text-right")}>
                      {PLAIN.journal.columns[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id} className="border-b border-ink/8">
                    <td className={cn(TD, "whitespace-nowrap")}>{day(l.date)}</td>
                    <td className={cn(TD, "whitespace-nowrap")}>{PLAIN.journal.kind[l.kind]}</td>
                    <td className={cn(TD, "max-w-56 truncate")} title={undefined}>
                      {l.house}
                    </td>
                    <td className={cn(TD, "text-right", l.gross < 0 && "text-muted")}>{eurCents(l.gross)}</td>
                    <td className={cn(TD, "text-right text-muted")}>{l.taxRate} %</td>
                    <td className={cn(TD, "text-right")}>{eurCents(l.tax)}</td>
                    <td className={cn(TD, "text-right")}>{eurCents(l.net)}</td>
                    <td className={cn(TD, "whitespace-nowrap text-muted")}>{PLAIN.journal.status[l.status]}</td>
                    <td className={TD}>
                      <button type="button" onClick={() => exportReceipt(l)} aria-label={t("receiptLabel", { no: l.receiptNo })} className="inline-flex items-center gap-1.5 whitespace-nowrap text-small text-ink underline-offset-4 hover:underline">
                        <FileDown className="size-4" aria-hidden />
                        {l.receiptNo}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!all && inside.length > SHOWN && (
              <Button size="sm" variant="tertiary" className="mt-3" onClick={() => setAll(true)}>
                {t("showAll", { count: inside.length })}
              </Button>
            )}
          </div>
        )}
      </AdminSection>

      {/* The year in months and quarters. */}
      <AdminSection title={t("summaryTitle", { year: period.year })}>
        <div className="overflow-x-auto">
          <table data-journal-year className="w-full min-w-[640px] border-collapse text-left text-body tabular-nums">
            <thead>
              <tr className="border-b border-ink/8">
                <th scope="col" className={TH} />
                {(["income", "refunds", "fees", "profit", "vat"] as const).map((k) => (
                  <th key={k} scope="col" className={cn(TH, "text-right")}>
                    {t(`numbers.${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...year.months.map((m) => ({ ...m, group: "month" as const })), ...year.quarters.map((q) => ({ ...q, group: "quarter" as const })), { ...year.year, group: "year" as const }].map(({ period: p, summary: s, group }, i) => (
                <tr key={p.key} className={cn("border-b border-ink/8", (group === "quarter" && p.index === 1) || group === "year" ? "border-t-2 border-t-ink/15" : "", group !== "month" && "font-semibold")}>
                  <th scope="row" className={cn(TD, "text-left font-normal text-muted", group !== "month" && "font-semibold text-ink")}>
                    {group === "year" ? `${t("yearTotal")} ${p.year}` : ledgerPeriodLabel({ kind: group, year: p.year, index: p.index, from: p.from })}
                  </th>
                  <td className={cn(TD, "text-right")}>{eurCents(s.income)}</td>
                  <td className={cn(TD, "text-right")}>{eurCents(s.refunds)}</td>
                  <td className={cn(TD, "text-right")}>{eurCents(s.fees)}</td>
                  <td className={cn(TD, "text-right")}>{eurCents(s.profit)}</td>
                  <td className={cn(TD, "text-right text-muted")} data-row={i}>
                    {s.vat === null ? t("vatOff") : eurCents(s.vat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </>
  );
}

/** "KW 47 · 16.–22. Nov." · "November 2026" · "Q4 2026" · "2026" */
function labelOf(p: JournalPeriod, t: ReturnType<typeof useTranslations<"admin.money.journal">>): string {
  if (p.kind === "week") return t("week", { week: p.index, from: day(p.from), to: day(p.to) });
  return ledgerPeriodLabel({ kind: p.kind, year: p.year, index: p.index, from: p.from });
}
