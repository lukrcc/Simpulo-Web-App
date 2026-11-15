"use client";

// /admin – the overview ("Wie läuft Simpulo?"), in this order: title · "Braucht dich" · profit this month (the big number, its change, the months
// in a row) · the four areas · the chart with the milestone ladder. Every main number carries its change "like a stock" (getChange, against
// the same day of the week / month / year before – the switch top right), its target and an ⓘ. The change's colour follows better/worse
// (config/admin.ts CHANGE_RULES): sage better, ember worse, grey ±0. Every number from lib/admin/metrics.ts; the capsules from the task list.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo, useMemo, useState } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input } from "@/components/ui/Input";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { COMPARE_PERIODS, DEFAULT_COMPARE, profitMilestones, type ComparePeriod } from "@/config/admin";
import { monthKpis, monthlySeries, northStar, runway, cockpit, companyBalance, getStatus, launchProgress, money, profitPerMonth, type CockpitNumber, type NeedsYou } from "@/lib/admin/metrics";
import { needsYou } from "@/lib/admin/tasks";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { getBankBalance, getPlatformPayouts } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ColumnChart, CountBars, LinesChart, ProfitChart, ProgressBar, StatusDot, StepMeter } from "./AdminCharts";
import { ChangeLine, InfoTip, KeyNumbers } from "./AdminNumbers";
import { AdminTaxes } from "./AdminTaxes";
import { AREA_BG, AdminSection, AdminShell, StatRow, type AreaColor } from "./AdminShell";

import { day as dayLabel, dec, eur, month as monthLabel, monthLong, num, pct } from "@/lib/i18n/adminFormat";

/** The area each one leads to – its 2px line on top (area colour, never status). */
const GROUP_AREA: Record<"supply" | "demand" | "quality" | "money", AreaColor> = { supply: "market", demand: "growth", quality: "growth", money: "market" };

function valueText(value: number | null, format: CockpitNumber["format"]): string {
  if (value === null) return "–";
  if (format === "percent") return pct(value);
  if (format === "eur") return eur(value);
  return num(value);
}

export function AdminCockpit() {
  const t = useTranslations("admin.cockpit");
  const tAdmin = useTranslations("admin");
  const inputs = useAdminInputs();
  const tasks = useAdminTasks();
  const [period, setPeriod] = useState<ComparePeriod>(DEFAULT_COMPARE);
  const c = cockpit(inputs, period);
  const { move } = c;
  const against =
    period === "week" ? t("against.week") : period === "month" ? t("against.month", { month: monthLong(c.compareDate) }) : t("against.year", { month: monthLong(c.compareDate), year: c.compareDate.slice(0, 4) });
  const star = northStar(inputs, period);
  // The charts' data – built here, the panel itself is memoised: hovering never re-renders the page.
  const chartData = move.rows.map((r) => ({ label: monthLabel(r.month), value: r.profit }));

  return (
    <AdminShell
      title={t("title")}
      aside={
        <span className="flex flex-wrap items-center gap-4">
          <CapsuleGroup size="sm" label={t("compare.label")} value={period} onChange={setPeriod} options={COMPARE_PERIODS.map((value) => ({ value, content: t(`compare.${value}`) }))} />
          <Link href="/admin/money" className="text-body font-semibold text-ink hover:underline">
            {t("moneyLink")}
          </Link>
        </span>
      }
    >
      {/* First what needs you: one row of capsules right under the title. */}
      <NeedsYouRow needs={needsYou(tasks, inputs)} />

      {/* Profit this month: the big number, its change, the months in a row. */}
      <section aria-label={t("move")} className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-eyebrow uppercase text-muted">
            <StatusDot status={move.status} />
            {t("move")}
            <span className="sr-only">· {tAdmin(`status.${move.status ?? "none"}`)}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-display tabular-nums text-ink">{eur(move.current)}</span>
            <span className="text-h3 text-muted">{t("moveTarget", { target: eur(move.target) })}</span>
            <span className="self-center">
              <InfoTip text={t("info.profit")} />
            </span>
          </p>
          <ChangeLine change={move.change} against={against} className="mt-1 block text-body" />
        </div>
        {/* The north star beside the profit: people × nights in full Houses this month. */}
        <div className="min-w-0 border-ink/8 lg:border-l lg:pl-10">
          <p className="text-eyebrow uppercase text-muted">
            {t("northStarEyebrow")} · {t("northStar")}
          </p>
          <p className="mt-1 flex items-baseline gap-x-2">
            <span className="text-display tabular-nums text-ink">{num(star.current)}</span>
            <span className="text-h3 text-muted">{t("chart.nights")}</span>
            <span className="self-center">
              <InfoTip text={t("info.northStar")} />
            </span>
          </p>
          <ChangeLine change={star.change} against={against} className="mt-1 block text-body" />
        </div>
        <div className="min-w-0 lg:ml-auto">
          <p className="text-body text-ink">{t("streak", { streak: move.streak, of: move.streakOf })}</p>
          <StepMeter reached={move.streak} of={move.streakOf} label={t("streak", { streak: move.streak, of: move.streakOf })} className="mt-3 w-60" />
        </div>
      </section>

      <AreaRow areas={c.areas} />

      <ProfitPanel data={chartData} current={move.current} series={star.rows} />
    </AdminShell>
  );
}

/**
 * The four areas in one row, no cards: side by side on the page, split by fine vertical lines, a 2px line in the area's colour on top.
 * Each ONE number with ⓘ, its change (coloured by better/worse) and in grey the label with the target (status dot against it). The whole
 * area leads into its tab (a link laid over it; the ⓘ sits above the link).
 */
function AreaRow({ areas }: { areas: ReturnType<typeof cockpit>["areas"] }) {
  const t = useTranslations("admin.cockpit");
  const tAdmin = useTranslations("admin");
  return (
    <div className="mt-10 grid grid-cols-2 gap-y-8 lg:grid-cols-4">
      {areas.map((area, i) => {
        const n = area.number;
        return (
          <div key={area.key} className={cn("group relative min-w-0 px-5 pb-1 pt-5 first:pl-0", i > 0 && "border-l border-ink/8", i === 2 && "max-lg:border-l-0 max-lg:pl-0")}>
            <span aria-hidden className={cn("absolute left-0 right-5 top-0 h-0.5 rounded-full", i > 0 && "left-5", i === 2 && "max-lg:left-0", AREA_BG[GROUP_AREA[area.key]])} />
            <Link href={area.href} aria-label={t("open", { area: t(`group.${area.key}`) })} data-no-tooltip className="absolute inset-0 rounded-lg" />
            <span className="flex items-center gap-2 text-h3 text-ink">
              {t(`group.${area.key}`)}
              <ArrowRight aria-hidden className="size-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
            <span className="mt-3 flex items-center gap-2">
              <span className="text-h1 tabular-nums text-ink">{valueText(n.value, n.format)}</span>
              <InfoTip text={t(`info.${n.key}`)} />
            </span>
            <ChangeLine change={n.change} className="mt-1 block" />
            <span className="mt-1 flex items-center gap-2 text-small text-muted">
              <StatusDot status={n.status} />
              <span className="min-w-0">
                {t(`metric.${n.key}`)} · {t("target", { target: valueText(n.target, n.format) })}
              </span>
              <span className="sr-only">· {tAdmin(`status.${n.status ?? "none"}`)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The chart with its own state (the axis switch) – hovering or switching never re-renders the page. */
const ProfitPanel = memo(function ProfitPanel({ data, current, series }: { data: readonly { label: string; value: number }[]; current: number; series: ReturnType<typeof monthlySeries> }) {
  const t = useTranslations("admin.cockpit");
  const [axis, setAxis] = useState<"current" | `${number}`>("current");
  const [mode, setMode] = useState<"profit" | "northStar" | "compare">("profit");
  const title = mode === "profit" ? t("move") : mode === "northStar" ? t("chart.northStarTitle") : t("chart.compareTitle");
  return (
    <section aria-label={title} className="mt-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-eyebrow uppercase text-muted">
          {title}
          {mode === "compare" && <span className="ml-2 normal-case tracking-normal">· {t("chart.compareNote")}</span>}
        </h2>
        <CapsuleGroup size="sm" label={t("chart.label")} value={mode} onChange={setMode} options={(["profit", "northStar", "compare"] as const).map((value) => ({ value, content: t(`chart.${value}`) }))} />
      </div>
      {mode === "profit" && (
        <>
          <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_200px]">
            <ProfitChart data={data} label={t("move")} milestoneLabel={t("milestones.move")} fixedTop={axis === "current" ? null : Number(axis)} />
            <MilestoneLadder current={current} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-small text-muted">{t("axis.label")}</span>
            <CapsuleGroup
              size="sm"
              label={t("axis.label")}
              value={axis}
              onChange={setAxis}
              options={[
                { value: "current" as const, content: t("axis.current") },
                ...profitMilestones.fixedAxes.map((v) => ({ value: `${v}` as `${number}`, content: `${v / 1000}k` })),
              ]}
            />
          </div>
        </>
      )}
      {mode === "northStar" && <CountBars data={series.map((r) => ({ label: monthLabel(r.month), value: r.sharedNights }))} label={t("chart.northStarTitle")} unit={t("chart.nights")} />}
      {mode === "compare" && <CompareChart series={series} />}
    </section>
  );
});

type SeriesKey = "bookingVolume" | "sharedNights" | "profit" | "activeUsers" | "repeatRate";
/** Alles im Vergleich: colours chart-1 to chart-3, sage and slate (plum is chart-2 already), each real value in the tooltip. */
const COMPARE: readonly { key: SeriesKey; color: string; format: (v: number) => string }[] = [
  { key: "bookingVolume", color: "var(--adm-chart-1)", format: eur },
  { key: "sharedNights", color: "var(--adm-chart-2)", format: num },
  { key: "profit", color: "var(--adm-chart-3)", format: eur },
  { key: "activeUsers", color: "var(--adm-good)", format: num },
  { key: "repeatRate", color: "var(--adm-area-operate)", format: pct },
];

/** Every series as an index (its first month = 100), so they share one axis; the tooltip shows the real values. */
function CompareChart({ series }: { series: ReturnType<typeof monthlySeries> }) {
  const t = useTranslations("admin.cockpit.chart");
  const bases = Object.fromEntries(COMPARE.map((c) => [c.key, series.find((r) => r[c.key] !== null && r[c.key]! > 0)?.[c.key] ?? null])) as Record<SeriesKey, number | null>;
  const data = series.map((r) => ({
    label: monthLabel(r.month),
    ...Object.fromEntries(COMPARE.map((c) => [c.key, r[c.key] !== null && bases[c.key] ? Math.round((r[c.key]! / bases[c.key]!) * 100) : null])),
  }));
  const raw = (label: string, key: string) => series.find((r) => monthLabel(r.month) === label)?.[key as SeriesKey] ?? null;
  return <LinesChart data={data} series={COMPARE.map((c) => ({ ...c, label: t(`series.${c.key}`) }))} label={t("compareTitle")} yFormat={(v) => num(v)} raw={raw} reference={100} />;
}

/**
 * The milestone ladder beside the chart (config/admin.ts profitMilestones.ladder), top = highest: reached steps a sage circle, the next one a
 * ring with its progress in percent, the rest empty circles; a thin line joins them. Below "Du: X €" (profit this month).
 */
function MilestoneLadder({ current }: { current: number }) {
  const t = useTranslations("admin.cockpit");
  const steps = profitMilestones.ladder;
  const next = steps.find((s) => current < s.value);
  return (
    <div className="flex flex-col lg:h-[320px]">
      <h3 className="text-eyebrow uppercase text-muted">{t("ladder.title")}</h3>
      <ol className="relative mt-4 flex flex-1 flex-col-reverse justify-between gap-3">
        <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-ink/10" />
        {steps.map((s) => {
          const reached = current >= s.value;
          const isNext = s === next;
          return (
            <li key={s.value} className="relative flex items-center gap-3">
              <span
                aria-hidden
                className={cn("size-[15px] shrink-0 rounded-full", reached ? "bg-adm-good" : isNext ? "border-2 border-ink/70 bg-bg" : "border border-ink/20 bg-bg")}
              />
              <span className="min-w-0 text-small">
                <span className={cn("tabular-nums", reached || isNext ? "font-semibold text-ink" : "text-muted")}>{eur(s.value)}</span>
                {s.key && <span className="text-muted"> · {t(`milestones.${s.key}`)}</span>}
                {reached && <span className="sr-only"> · {t("ladder.reached")}</span>}
                {isNext && <span className="block text-muted">{t("ladder.next", { percent: pct(Math.floor((current / s.value) * 100)) })}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-body font-semibold tabular-nums text-ink">{t("ladder.you", { value: eur(current) })}</p>
    </div>
  );
}

/**
 * "Braucht dich" as ONE row right under the title: the label, then a capsule per kind of open task, in the task list's order (Sicherheit ·
 * Zahlungen · Houses in Gefahr · Bewerbungen · Hosts · Tickets; in pre-launch/beta then the launch criteria) – ember dot, number, short text;
 * each leads to "Heute". The same counts as the side list (lib/admin/tasks.ts taskCounts): their sum is the "Heute" badge. None: "✓ Alles
 * erledigt" in sage. More capsules wrap, never scroll.
 */
function NeedsYouRow({ needs }: { needs: readonly NeedsYou[] }) {
  const t = useTranslations("admin.cockpit.needs");
  return (
    <section aria-label={t("title")} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="mr-1 text-eyebrow uppercase text-muted">{t("title")}</h2>
      {needs.length === 0 ? (
        <p className="text-body font-semibold text-adm-good">{t("allDone")}</p>
      ) : (
        needs.map((need) => (
          <Link
            key={need.key}
            href="/admin/today"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/12 px-3.5 text-body text-ink transition-colors duration-150 hover:bg-ink/5"
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-adm-critical" />
            {need.key === "launch" ? (
              t("short.launch", { met: need.met, total: need.total })
            ) : (
              <>
                <span className="font-semibold tabular-nums">{num(need.count)}</span>
                {t(`short.${need.key}`)}
              </>
            )}
          </Link>
        ))
      )}
    </section>
  );
}

/** The launch criteria as bars (Warteliste): each against its target, status dot and "X von Y". */
export function LaunchCriteria() {
  const t = useTranslations("admin.overview");
  const launch = launchProgress(useAdminInputs());
  const items = [
    { key: "houses", label: t("criteria.houses"), progress: launch.houses, status: getStatus("realHouses", launch.houses.value) },
    { key: "hubs", label: t("criteria.hubs", { min: 5 }), progress: launch.hubs, status: getStatus("hubs", launch.hubs.value) },
    { key: "reservedShare", label: t("criteria.reservedShare", { min: 2 }), progress: launch.reservedShare, status: getStatus("reservedShare", launch.reservedShare.value) },
    { key: "waitlist", label: t("criteria.waitlist"), progress: launch.waitlist, status: getStatus("waitlist", launch.waitlist.value) },
  ];
  return (
    <ul className="flex flex-col gap-5">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-body">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <StatusDot status={item.status} />
              <span>{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {item.key === "reservedShare" ? t("ofTargetPercent", { value: item.progress.value, target: item.progress.target }) : t("ofTarget", { value: num(item.progress.value), target: num(item.progress.target) })}
            </span>
          </div>
          <ProgressBar ratio={item.progress.ratio} label={item.label} />
        </li>
      ))}
    </ul>
  );
}

// ── Money ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** /admin/money – what Simpulo keeps: this month against the target, per full House, in all; the last 12 months in their status colours. */
export function AdminMoney({ initialView = "overview" }: { initialView?: "overview" | "taxes" }) {
  const t = useTranslations("admin.money");
  // Two views in one tab: Übersicht · Steuern. /admin/money/taxes opens Steuern (the links from "Heute" and Vision › Standort).
  const [view, setView] = useState<"overview" | "taxes">(initialView);
  return (
    <AdminShell title={t("title")}>
      <CapsuleGroup label={t("views.label")} value={view} onChange={setView} className="mb-10 w-fit" options={(["overview", "taxes"] as const).map((value) => ({ value, content: t(`views.${value}`) }))} />
      {view === "taxes" ? <AdminTaxes /> : <MoneyOverview />}
    </AdminShell>
  );
}

/** Geld › Übersicht: what Simpulo keeps – this month against the target, per full House, in all; the last 12 months; payouts and withdrawals. */
function MoneyOverview() {
  const t = useTranslations("admin.money");
  const tc = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const m = money(inputs);
  const months = profitPerMonth(inputs);
  return (
    <>
      <MoneyKpis />
      <StatRow
        stats={[
          { label: t("profitMonth"), value: eur(m.profitThisMonth), status: m.status, sub: tc("profitTarget", { target: eur(m.target) }), focus: true },
          { label: t("perHouse"), value: m.perHouse === null ? "–" : eur(m.perHouse) },
          { label: t("revenueTotal"), value: eur(m.total) },
        ]}
      />
      <AdminSection title={t("perMonth")} aside={<span className="text-small text-muted">{t("target", { target: eur(m.target) })}</span>}>
        <ColumnChart
          label={t("perMonth")}
          data={months.map((r) => ({ label: monthLabel(r.month), value: r.profit }))}
          target={m.target}
          unit="€"
          height={260}
        />
      </AdminSection>
      <p className="mt-6 max-w-2xl text-small text-muted">{t("note")}</p>
      <PayoutSection />
      <Withdrawals />
    </>
  );
}

/**
 * Geld › Übersicht, on top: booking volume and the revenue run rate of the last full month, and how long the money lasts (runway) – each
 * with its change, target where it has one, and ⓘ.
 */
function MoneyKpis() {
  const t = useTranslations("admin.money.kpis");
  const inputs = useAdminInputs();
  const k = monthKpis(inputs);
  const bank = useMemo(() => getBankBalance(), []);
  const r = runway(inputs, bank?.balance ?? null);
  const month = monthLong(`${k.month}-01`);
  const against = t("against", { month: monthLong(`${k.monthBefore}-01`) });
  return (
    <KeyNumbers
      className="mb-12"
      items={[
        { key: "bookingVolume", label: t("inMonth", { label: t("bookingVolume"), month }), info: t("info.bookingVolume"), value: eur(k.bookingVolume.value), change: k.bookingVolume.change, against },
        { key: "annualRevenue", label: t("annualRevenue"), info: t("info.annualRevenue"), value: eur(k.annualRevenue.value), change: k.annualRevenue.change, against },
        r
          ? {
              key: "runway",
              label: t("runway"),
              info: t("info.runway"),
              value: t("months", { value: dec(r.value ?? 0) }),
              change: r.change,
              against,
              target: { text: t("runwayTarget", { target: r.target }), status: r.status },
              sub: bank ? t("runwaySub", { balance: eur(bank.balance), costs: eur(r.avgCosts) }) : undefined,
            }
          : { key: "runway", label: t("runway"), info: t("info.runway"), value: "–", change: null, sub: t("noBank") },
      ]}
    />
  );
}

/**
 * Simpulo's own payouts at Stripe: schedule, the account on file, the next payout – read only; changed in Stripe ("Manage in Stripe").
 * "Pay out now" only ever to that account (confirmed in a dialog, logged; the real call from phase 5).
 */
function PayoutSection() {
  const t = useTranslations("admin.money");
  const showToast = useToast();
  const { payOutNow } = useAdminActions();
  const payouts = useMemo(() => getPlatformPayouts(), []);
  const [confirming, setConfirming] = useState(false);
  if (!payouts) {
    return (
      <AdminSection title={t("payouts")}>
        <p className="text-body text-muted">{t("noPayouts")}</p>
      </AdminSection>
    );
  }
  const amount = eur(payouts.available);
  return (
    <AdminSection
      title={t("payouts")}
      aside={
        <a href={payouts.manageUrl} target="_blank" rel="noreferrer noopener" className="text-small font-semibold text-ink hover:underline">
          {t("manage")}
        </a>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1 basis-[560px]">
          <StatRow
            size="md"
            stats={[
              { label: t("schedule"), value: t(`schedules.${payouts.schedule as "daily" | "weekly" | "monthly"}`) },
              { label: t("account"), value: payouts.account },
              { label: t("nextPayout"), value: payouts.next ? eur(payouts.next.amount) : "–", sub: payouts.next ? dayLabel(payouts.next.date) : undefined },
              { label: t("available"), value: amount },
            ]}
          />
        </div>
        <Button variant="secondary" disabled={payouts.available <= 0} onClick={() => setConfirming(true)}>
          {t("payNow")}
        </Button>
      </div>
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t("payTitle", { amount })}>
        <p className="text-body text-muted">{t("payText", { amount, account: payouts.account })}</p>
        <ModalFooter onCancel={() => setConfirming(false)} className="mt-6">
          <Button
            onClick={() => {
              payOutNow(payouts.available, payouts.account);
              setConfirming(false);
              showToast(t("paid", { amount, account: payouts.account }));
            }}
          >
            {t("payConfirm", { amount })}
          </Button>
        </ModalFooter>
      </Sheet>
    </AdminSection>
  );
}

/** "My withdrawals": private withdrawals from Qonto entered by hand, and this year's profit − tax reserve − withdrawals = left in the company. */
function Withdrawals() {
  const t = useTranslations("admin.money");
  const f = useFormat();
  const showToast = useToast();
  const inputs = useAdminInputs();
  const { addWithdrawal } = useAdminActions();
  const b = companyBalance(inputs);
  const [date, setDate] = useState(inputs.today);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const value = Number(amount.replace(",", "."));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && value > 0;
  const list = inputs.admin.withdrawals.toSorted((a, z) => z.date.localeCompare(a.date));

  return (
    <AdminSection title={t("withdrawals")}>
      <p className="mb-3 text-small text-muted">{t("balanceYear", { year: b.year })}</p>
      <StatRow
        stats={[
          { label: t("profitYear"), value: eur(b.profit) },
          { label: t("taxReserve", { percent: b.taxPercent }), value: `− ${eur(b.taxReserve)}` },
          { label: t("withdrawn"), value: `− ${eur(b.withdrawals)}` },
          { label: t("left"), value: eur(b.left) },
        ]}
      />
      <p className="mt-3 text-small text-muted">{t("taxNote")}</p>

      <form
        className="mt-8 grid items-end gap-3 sm:grid-cols-[180px_160px_minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          addWithdrawal(date, Math.round(value * 100) / 100, note.trim() || undefined);
          setAmount("");
          setNote("");
          showToast(t("added"));
        }}
      >
        <FormField label={t("date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label={t("amount")}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" />
        </FormField>
        <FormField label={t("noteLabel")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <Button type="submit" variant="secondary" disabled={!valid}>
          {t("addWithdrawal")}
        </Button>
      </form>

      {list.length === 0 ? (
        <p className="mt-6 text-body text-muted">{t("none")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-ink/8 border-y border-ink/8">
          {list.map((w) => (
            <li key={w.id} className="flex items-baseline justify-between gap-4 py-3 text-body">
              <span className="text-ink">
                {f.day(w.date)}
                {w.note && <span className="text-muted"> · {w.note}</span>}
              </span>
              <span className="tabular-nums text-ink">{eur(w.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}
