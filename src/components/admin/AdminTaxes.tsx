"use client";

// Geld › Steuern – the overview for working with the tax advisor: orientation, no tax advice (the line on top). Everything from the
// bookkeeping journal (lib/admin/ledger.ts) for one period (month · quarter · year): the main numbers with their change against the period
// before, the exports (adapters in lib/admin/exporters/), revenue by country and customer type, costs with their receipts, the tax reserve
// split against the Qonto balance, DAC7, investments, deadlines and the questions for the tax advisor. Calm: no cards, rows on the page.
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAdminActions } from "@/lib/admin/actions";
import { countryName, deadlineLabel, download, EXPORTERS, periodLabel, PLAIN, tableCsv, type ExportContext, type Exporter } from "@/lib/admin/exporters";
import {
  costRows,
  dac7,
  daysUntil,
  DAC7_FIELDS,
  eurOf,
  inPeriod,
  investments,
  ledgerSummary,
  PERIOD_KINDS,
  periodAt,
  previousPeriod,
  revenueByCountry,
  taxDeadlines,
  taxReserve,
  withReceipts,
  type PeriodKind,
} from "@/lib/admin/ledger";
import { getChange } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getBankBalance, getHostTaxData, getLedger, type TaxQuestion } from "@/lib/data";
import { day, eur, num, pct } from "@/lib/i18n/adminFormat";
import { cn } from "@/lib/utils";
import { BarList, ProgressBar, StatusDot } from "./AdminCharts";
import { ChangeLine, InfoTip } from "./AdminNumbers";
import { AdminSection } from "./AdminShell";

/** DAC7: rows shown before "Alle zeigen". */
const DAC7_SHOWN = 10;
/** How far ahead the deadline list looks. */
const DEADLINE_DAYS = 120;

export function AdminTaxes() {
  const t = useTranslations("admin.money.taxes");
  const inputs = useAdminInputs();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [offset, setOffset] = useState(0);
  const journal = useMemo(() => getLedger() ?? [], []);
  const all = useMemo(() => withReceipts(journal, inputs.admin.receipts), [journal, inputs.admin.receipts]);
  const bank = useMemo(() => getBankBalance(), []);
  const taxData = useMemo(() => getHostTaxData(), []);

  const period = periodAt(kind, inputs.today, offset);
  const before = previousPeriod(period);
  const entries = inPeriod(all, period);
  const summary = ledgerSummary(entries);
  const prevSummary = ledgerSummary(inPeriod(all, before));
  const reserve = taxReserve(summary);
  const prevReserve = taxReserve(prevSummary);
  const byCountry = revenueByCountry(entries);
  const deadlines = taxDeadlines(inputs.today, DEADLINE_DAYS);
  const label = periodLabel(period);
  const first = journal[0]?.date ?? inputs.today;
  const ctx: ExportContext = { period, periodLabel: label, entries, summary, reserve, byCountry, deadlines, bank, today: inputs.today };
  const against = t("against", { period: periodLabel(before) });

  const numbers = [
    { key: "revenue", value: summary.revenue, change: getChange("revenue", summary.revenue, prevSummary.revenue) },
    { key: "costs", value: summary.allCosts, change: getChange("costs", summary.allCosts, prevSummary.allCosts) },
    { key: "profit", value: summary.profit, change: getChange("profit", summary.profit, prevSummary.profit) },
    { key: "reserve", value: reserve.total, change: getChange("taxReserve", reserve.total, prevReserve.total) },
  ] as const;

  return (
    <>
      <p className="text-body text-muted">{t("disclaimer")}</p>
      {/* The period: its kind and which one (‹ ›), never past today's. */}
      <div className="mt-(--adm-inner) flex flex-wrap items-center gap-x-4 gap-y-3">
        <CapsuleGroup
          size="sm"
          label={t("periodKind.label")}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setOffset(0);
          }}
          options={PERIOD_KINDS.map((value) => ({ value, content: t(`periodKind.${value}`) }))}
        />
        <span className="flex items-center gap-1">
          <IconButton aria-label={t("prev")} onClick={() => setOffset((o) => o - 1)} disabled={period.from <= first}>
            <ChevronLeft aria-hidden />
          </IconButton>
          <span className="min-w-36 text-center text-h3 tabular-nums text-ink">{label}</span>
          <IconButton aria-label={t("next")} onClick={() => setOffset((o) => o + 1)} disabled={offset >= 0}>
            <ChevronRight aria-hidden />
          </IconButton>
        </span>
        {journal.length > 0 && <span className="text-small text-muted">{t("exampleData")}</span>}
      </div>

      {/* The main numbers: each with ⓘ, its change against the period before; missing receipts against 0. */}
      <dl data-key-numbers className="mt-(--adm-section) grid grid-cols-2 gap-y-8 lg:grid-cols-5">
        {numbers.map((n, i) => (
          <div key={n.key} className={cn("min-w-0 pr-4 lg:px-5 lg:first:pl-0", i > 0 && "lg:border-l lg:border-ink/8", i % 2 === 1 && "max-lg:border-l max-lg:border-ink/8 max-lg:pl-4")}>
            <dt className="flex items-center gap-1 text-small text-muted">
              {t(`numbers.${n.key}`)}
              <InfoTip text={t(`info.${n.key}`)} />
            </dt>
            <dd className="mt-1 text-h1 tabular-nums text-ink">{eur(n.value)}</dd>
            <dd className="mt-1">
              <ChangeLine change={n.change} against={against} className="block" />
            </dd>
          </div>
        ))}
        <div className="min-w-0 pr-4 max-lg:border-l max-lg:border-ink/8 max-lg:pl-4 lg:border-l lg:border-ink/8 lg:px-5">
          <dt className="flex items-center gap-1 text-small text-muted">
            {t("numbers.missing")}
            <InfoTip text={t("info.missing")} />
          </dt>
          <dd className="mt-1 text-h1 tabular-nums text-ink">{num(summary.missingReceipts)}</dd>
          <dd className="mt-1">
            <ChangeLine change={getChange("missingReceipts", summary.missingReceipts, prevSummary.missingReceipts)} against={against} className="block" />
          </dd>
          <dd className="mt-1 flex items-center gap-2 text-small text-muted">
            <StatusDot status={summary.missingReceipts === 0 ? "good" : "warning"} />
            {t("target", { target: "0" })}
          </dd>
        </div>
      </dl>

      <ExportSection ctx={ctx} />
      <CountrySection byCountry={byCountry} />
      <CostsSection entries={entries} missing={summary.missingReceipts} />
      <ReserveSection summary={summary} reserve={reserve} bank={bank} />
      <Dac7Section entries={all} year={period.year} taxData={taxData} />
      <InvestmentsSection entries={all} />
      <DeadlinesSection deadlines={deadlines} today={inputs.today} />
      <QuestionsSection questions={inputs.admin.taxQuestions} />
    </>
  );
}

// ── a) Export ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function ExportSection({ ctx }: { ctx: ExportContext }) {
  const t = useTranslations("admin.money.taxes.export");
  const actions = useAdminActions();
  const showToast = useToast();
  const run = (exporter: Exporter) => {
    download(exporter.fileName(ctx), exporter.build(ctx));
    actions.logExport(`${t(exporter.id)} · ${ctx.periodLabel}`);
    showToast(t("done", { label: t(exporter.id), period: ctx.periodLabel }));
  };
  return (
    <AdminSection title={t("title")} aside={<span className="text-small text-muted">{t("note")}</span>}>
      <div className="flex flex-wrap gap-2">
        {EXPORTERS.map((exporter) =>
          exporter.ready ? (
            <Button key={exporter.id} size="sm" variant="secondary" onClick={() => run(exporter)}>
              {t(exporter.id)}
            </Button>
          ) : (
            <Button key={exporter.id} size="sm" variant="tertiary" disabled>
              {t(exporter.id)} · {t("later")}
            </Button>
          ),
        )}
      </div>
    </AdminSection>
  );
}

// ── b) Revenue by country and customer type ───────────────────────────────────────────────────────────────────────────────────────

const TH = "py-2 pr-6 text-small font-normal text-muted";
const TD = "py-2.5 pr-6";

function CountrySection({ byCountry }: { byCountry: ReturnType<typeof revenueByCountry> }) {
  const t = useTranslations("admin.money.taxes.byCountry");
  return (
    <AdminSection title={t("title")}>
      {byCountry.rows.length === 0 ? (
        <p className="text-body text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-body tabular-nums">
            <thead>
              <tr className="border-b border-ink/8">
                <th scope="col" className={TH}>{t("country")}</th>
                <th scope="col" className={cn(TH, "text-right")}>{t("private")}</th>
                <th scope="col" className={cn(TH, "text-right")}>{t("business")}</th>
                <th scope="col" className={cn(TH, "text-right")}>{t("total")}</th>
                <th scope="col" className={cn(TH, "w-48")}>{t("share")}</th>
              </tr>
            </thead>
            <tbody>
              {byCountry.rows.map((r) => (
                <tr key={r.country} className="border-b border-ink/8">
                  <th scope="row" className={cn(TD, "font-normal text-ink")}>{countryName(r.country)}</th>
                  <td className={cn(TD, "text-right text-ink")}>{eur(r.private)}</td>
                  <td className={cn(TD, "text-right text-ink")}>{eur(r.business)}</td>
                  <td className={cn(TD, "text-right font-semibold text-ink")}>{eur(r.total)}</td>
                  <td className={TD}>
                    <span className="flex items-center gap-3">
                      <ProgressBar ratio={r.share} label={countryName(r.country)} className="w-24" />
                      <span className="text-small text-muted">{pct(Math.round(r.share * 100))}</span>
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" className={cn(TD, "font-semibold text-ink")}>{t("sum")}</th>
                <td className={cn(TD, "text-right font-semibold text-ink")}>{eur(byCountry.total.private)}</td>
                <td className={cn(TD, "text-right font-semibold text-ink")}>{eur(byCountry.total.business)}</td>
                <td className={cn(TD, "text-right font-semibold text-ink")}>{eur(byCountry.total.total)}</td>
                <td className={TD} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  );
}

// ── c) Costs with receipts ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function CostsSection({ entries, missing }: { entries: ReturnType<typeof inPeriod>; missing: number }) {
  const t = useTranslations("admin.money.taxes.costs");
  const actions = useAdminActions();
  const showToast = useToast();
  const rows = costRows(entries);
  return (
    <AdminSection
      title={t("title")}
      aside={
        <span className={cn("flex items-center gap-2 text-small font-semibold", missing ? "text-adm-warning" : "text-adm-good")}>
          <StatusDot status={missing ? "warning" : "good"} />
          {t("missing", { count: missing })}
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="text-body text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-ink/8">
                <th scope="col" className={TH}>{t("date")}</th>
                <th scope="col" className={TH}>{t("receiptNo")}</th>
                <th scope="col" className={TH}>{t("description")}</th>
                <th scope="col" className={TH}>{t("category")}</th>
                <th scope="col" className={cn(TH, "text-right")}>{t("amount")}</th>
                <th scope="col" className={TH}>{t("receipt")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.receiptNo} className="border-b border-ink/8 align-middle">
                  <td className={cn(TD, "whitespace-nowrap text-muted")}>{day(e.date)}</td>
                  <td className={cn(TD, "whitespace-nowrap tabular-nums text-muted")}>{e.receiptNo}</td>
                  <th scope="row" className={cn(TD, "font-normal text-ink")}>{e.description}</th>
                  <td className={cn(TD, "text-muted")}>{e.category}</td>
                  <td className={cn(TD, "whitespace-nowrap text-right tabular-nums text-ink")}>{eur(eurOf(e, "gross"))}</td>
                  <td className="py-2">
                    {e.receipt ? (
                      <span className="block max-w-56 truncate text-small text-muted" title={undefined}>
                        {e.receipt}
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-small font-semibold text-adm-warning">
                          <StatusDot status="warning" />
                          {t("missingReceipt")}
                        </span>
                        <label className={cn(buttonStyles("secondary", "sm"), "relative cursor-pointer")}>
                          <Upload aria-hidden />
                          {t("upload")}
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            aria-label={t("uploadFor", { receiptNo: e.receiptNo })}
                            className="sr-only"
                            onChange={(ev) => {
                              const file = ev.target.files?.[0];
                              if (!file) return;
                              actions.attachReceipt(e.receiptNo, file.name);
                              showToast(t("uploaded", { name: file.name }));
                            }}
                          />
                        </label>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  );
}

// ── d) Tax reserve ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function ReserveSection({ summary, reserve, bank }: { summary: ReturnType<typeof ledgerSummary>; reserve: ReturnType<typeof taxReserve>; bank: ReturnType<typeof getBankBalance> }) {
  const t = useTranslations("admin.money.taxes.reserve");
  const parts = [
    { key: "incomeTax", value: reserve.incomeTax, sub: t("rateOfProfit", { percent: reserve.rates.incomeTaxPercent }) },
    { key: "tradeTax", value: reserve.tradeTax, sub: t("rateOfProfit", { percent: reserve.rates.tradeTaxPercent }) },
    { key: "vat", value: reserve.vat, sub: t("vatOwed", { out: eur(summary.vatOut), in: eur(summary.vatIn) }) },
    { key: "total", value: reserve.total, sub: undefined },
  ] as const;
  const covered = bank ? bank.balance >= reserve.total : null;
  return (
    <AdminSection title={t("title")}>
      <dl data-key-numbers className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
        {parts.map((p, i) => (
          <div key={p.key} className={cn("min-w-0 pr-4 md:px-6 md:first:pl-0", i > 0 && "md:border-l md:border-ink/8", i % 2 === 1 && "max-md:border-l max-md:border-ink/8 max-md:pl-4")}>
            <dt className="text-small text-muted">{t(p.key)}</dt>
            <dd className={cn("mt-1 tabular-nums text-ink", p.key === "total" ? "text-h1" : "text-h2")}>{eur(p.value)}</dd>
            {p.sub && <dd className="mt-1 text-small text-muted">{p.sub}</dd>}
          </div>
        ))}
      </dl>
      <div className="mt-8 max-w-xl">
        {bank ? (
          <>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink">
              <StatusDot status={covered ? "good" : "critical"} />
              <span>
                {t("bank", { account: bank.account })}: <span className="font-semibold tabular-nums">{eur(bank.balance)}</span>
              </span>
              <span className="text-muted">· {covered ? t("covered") : t("notCovered")}</span>
              <InfoTip text={t("info")} />
            </p>
            <ProgressBar ratio={bank.balance > 0 ? Math.min(1, reserve.total / bank.balance) : 1} label={t("ofBalance", { reserve: eur(reserve.total), balance: eur(bank.balance) })} className="mt-3" />
            <p className="mt-2 text-small text-muted">{t("ofBalance", { reserve: eur(reserve.total), balance: eur(bank.balance) })}</p>
          </>
        ) : (
          <p className="text-body text-muted">{t("noBank")}</p>
        )}
      </div>
    </AdminSection>
  );
}

// ── e) DAC7 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Dac7Section({ entries, year, taxData }: { entries: ReturnType<typeof inPeriod>; year: number; taxData: ReturnType<typeof getHostTaxData> }) {
  const t = useTranslations("admin.money.taxes.dac7");
  const { users } = useAdminInputs();
  // The incomplete ones come first; the rest behind "Alle zeigen" – the list stays short.
  const [showAll, setShowAll] = useState(false);
  const actions = useAdminActions();
  const d = dac7(
    entries,
    year,
    users.map((u) => ({ id: u.id, name: u.name })),
    taxData,
  );
  const exportCsv = () => {
    const c = PLAIN.dac7Columns;
    const blob = tableCsv(
      [c.host, c.hostId, c.amount, c.count, c.taxId, c.address, c.birthDate, c.complete, c.missing],
      d.rows.map((r) => [r.name, r.id, r.amount, r.count, r.data.taxId ?? "", r.data.address ?? "", r.data.birthDate ?? "", r.complete ? PLAIN.yes : PLAIN.no, r.missing.map((f) => PLAIN.dac7Columns[f]).join(", ")]),
    );
    download(`simpulo-dac7-vorbereitung-${year}.csv`, blob);
    actions.logExport(`DAC7-Vorbereitung · ${year}`);
  };
  return (
    <AdminSection
      title={`${t("title")} · ${t("year", { year })}`}
      aside={
        d.rows.length > 0 && (
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            {t("export")}
          </Button>
        )
      }
    >
      {d.rows.length === 0 ? (
        <p className="text-body text-muted">{t("empty")}</p>
      ) : (
        <>
          <dl className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <dt className="flex items-center gap-2 text-small text-muted">
                <StatusDot status="good" />
                {t("complete")}
                <InfoTip text={t("info")} />
              </dt>
              <dd className="mt-1 text-h1 tabular-nums text-ink">{num(d.complete)}</dd>
            </div>
            <div className="border-l border-ink/8 pl-12">
              <dt className="flex items-center gap-2 text-small text-muted">
                <StatusDot status={d.incomplete ? "warning" : "good"} />
                {t("incomplete")}
              </dt>
              <dd className="mt-1 text-h1 tabular-nums text-ink">{num(d.incomplete)}</dd>
            </div>
          </dl>
          <div className="mt-(--adm-inner) overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-body">
              <thead>
                <tr className="border-b border-ink/8">
                  <th scope="col" className={TH}>{t("host")}</th>
                  {DAC7_FIELDS.map((f) => (
                    <th key={f} scope="col" className={TH}>{t(f)}</th>
                  ))}
                  <th scope="col" className={cn(TH, "text-right")}>{t("amount")}</th>
                  <th scope="col" className={cn(TH, "text-right")}>{t("count")}</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? d.rows : d.rows.slice(0, DAC7_SHOWN)).map((r) => (
                  <tr key={r.id} className="border-b border-ink/8">
                    <th scope="row" className={cn(TD, "font-normal text-ink")}>{r.name}</th>
                    {DAC7_FIELDS.map((f) => (
                      <td key={f} className={TD}>
                        {r.data[f] ? <span className="text-ink">✓</span> : <span className="text-small font-semibold text-adm-warning">{t("missing")}</span>}
                      </td>
                    ))}
                    <td className={cn(TD, "text-right tabular-nums text-ink")}>{eur(r.amount)}</td>
                    <td className={cn(TD, "text-right tabular-nums text-muted")}>{num(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.rows.length > DAC7_SHOWN && (
            <Button size="sm" variant="tertiary" className="mt-3" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? t("showLess") : t("showAll", { count: d.rows.length })}
            </Button>
          )}
        </>
      )}
    </AdminSection>
  );
}

// ── f) Investments ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function InvestmentsSection({ entries }: { entries: ReturnType<typeof inPeriod> }) {
  const t = useTranslations("admin.money.taxes.investments");
  const actions = useAdminActions();
  const inv = investments(entries);
  const exportCsv = () => {
    const c = PLAIN.investmentColumns;
    download("simpulo-investitionen.csv", tableCsv([c.date, c.receiptNo, c.category, c.description, c.net], inv.rows.map((e) => [e.date, e.receiptNo, e.category, e.description, eurOf(e, "net")])));
    actions.logExport("Investitionen");
  };
  return (
    <AdminSection
      title={t("title")}
      aside={
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={inv.rows.length === 0}>
          {t("export")}
        </Button>
      }
    >
      <div className="grid gap-x-12 gap-y-6 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div>
          <p className="flex items-center gap-1 text-small text-muted">
            {t("total")}
            {inv.since && <span>· {t("since", { date: day(inv.since) })}</span>}
            <InfoTip text={t("info")} />
          </p>
          <p className="mt-1 text-h1 tabular-nums text-ink">{eur(inv.total)}</p>
          <p className="mt-2 text-body text-ink">{t("sentence")}</p>
        </div>
        <BarList tone="ink" rows={inv.byCategory.map((c) => ({ key: c.category, label: c.category, value: c.total, display: eur(c.total) }))} />
      </div>
    </AdminSection>
  );
}

// ── g) Deadlines ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function DeadlinesSection({ deadlines, today }: { deadlines: ReturnType<typeof taxDeadlines>; today: string }) {
  const t = useTranslations("admin.money.taxes.deadlines");
  return (
    <AdminSection title={t("title")}>
      {deadlines.length === 0 ? (
        <p className="text-body text-muted">{t("empty")}</p>
      ) : (
        <ol className="divide-y divide-ink/8 border-y border-ink/8">
          {deadlines.map((d, i) => (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3">
              <span className="flex w-28 shrink-0 items-center gap-2 text-body tabular-nums text-ink">
                <span aria-hidden className={cn("size-2 shrink-0 self-center rounded-full", i === 0 ? "bg-adm-critical" : "bg-transparent")} />
                <span className={cn(i === 0 && "font-semibold")}>{day(d.date)}</span>
              </span>
              <span className={cn("min-w-0 flex-1 text-body text-ink", i === 0 && "font-semibold")}>{deadlineLabel(d)}</span>
              <span className="text-small text-muted">{t("inDays", { days: daysUntil(today, d.date) })}</span>
            </li>
          ))}
        </ol>
      )}
    </AdminSection>
  );
}

// ── h) Questions for the tax advisor ──────────────────────────────────────────────────────────────────────────────────────────────

const QUESTION_STATUSES = ["open", "discussed", "settled"] as const;

function QuestionsSection({ questions }: { questions: readonly TaxQuestion[] }) {
  const t = useTranslations("admin.money.taxes.questions");
  const open = questions.filter((q) => q.status === "open").length;
  // Vision › Standort links here (#fragen): the list renders after the admin check, so the browser's own jump comes too early.
  useEffect(() => {
    if (window.location.hash === "#fragen") document.getElementById("fragen")?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <AdminSection title={t("title")} aside={<span className="text-small text-muted">{t("open", { open, total: questions.length })}</span>}>
      <span id="fragen" className="block scroll-mt-28" />
      <ul className="divide-y divide-ink/8 border-y border-ink/8">
        {questions.map((q) => (
          <QuestionRow key={q.id} question={q} />
        ))}
      </ul>
    </AdminSection>
  );
}

function QuestionRow({ question }: { question: TaxQuestion }) {
  const t = useTranslations("admin.money.taxes.questions");
  const actions = useAdminActions();
  const [note, setNote] = useState(question.note);
  return (
    <li className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-8">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-body font-semibold text-ink">
          <StatusDot status={question.status === "settled" ? "good" : question.status === "discussed" ? "warning" : null} />
          {question.text}
        </p>
        <Textarea
          aria-label={`${t("note")} · ${question.text}`}
          placeholder={t("notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => actions.updateTaxQuestion(question, { note: note.trim() })}
          className="mt-3 min-h-16"
        />
      </div>
      <CapsuleGroup
        size="sm"
        label={`${t("statusLabel")} · ${question.text}`}
        value={question.status}
        onChange={(status) => actions.updateTaxQuestion(question, { status })}
        options={QUESTION_STATUSES.map((value) => ({ value, content: t(`status.${value}`) }))}
      />
    </li>
  );
}
