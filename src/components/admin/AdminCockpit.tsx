"use client";

// /admin – the overview ("Wie läuft Simpulo?"), simple: the click row (period Woche · Monat · Jahr) · ONE row of four numbers (Gewinn with
// "Monate in Folge", Volle Houses, Gemeinsame Nächte, Wiederkehrer) · the profit chart (12 months, line "Umzug 5.000 €") · the milestone bar. Every main number carries its change "like a stock" (getChange, against
// the same day of the week / month / year before – the switch top right), its target and an ⓘ. The change's colour follows better/worse
// (config/admin.ts CHANGE_RULES): sage better, ember worse, grey ±0. Every number from lib/admin/metrics.ts.
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { CHILD_LEVEL, MOVE_TARGET, profitMilestones, type ChartLevel, type ComparePeriod } from "@/config/admin";
import { useAdminPeriod } from "@/lib/admin/period";
import { chartBuckets, getChange, monthKpis, periodEnd, periodStart, runway, cockpit, type ChartView, companyBalance, getStatus, launchProgress, money, profitPerMonth, type CockpitNumber } from "@/lib/admin/metrics";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getBankBalance, getPlatformPayouts } from "@/lib/data";
import { ColumnChart, DrillChart, ProgressBar, StatusDot, type DrillBar } from "./AdminCharts";
import { ChangeLine, KeyNumbers } from "./AdminNumbers";
import { RoadmapHeadline } from "./AdminRoadmap";
import { AdminSubTabs, AdminTabs, PeriodTabs } from "./AdminLayout";
import { AdminTaxes } from "./AdminTaxes";
import { AdminTaxJournal } from "./AdminTaxJournal";
import { AdminSection, AdminShell, StatRow } from "./AdminShell";

import { chartTick, chartTitle, day as dayLabel, dec, eur, month as monthLabel, monthLong, num, pct } from "@/lib/i18n/adminFormat";

function valueText(value: number | null, format: CockpitNumber["format"]): string {
  if (value === null) return "–";
  if (format === "percent") return pct(value);
  if (format === "eur") return eur(value);
  return num(value);
}

/** One opened bar in the URL (?zoom=year:2026-01-01,quarter:2026-07-01): its level and first day. */
interface ZoomStep {
  level: ComparePeriod;
  start: string;
}

/** ?zoom= → the chain of opened bars; only a valid chain that starts at the chosen period (Jahr → Quartal → Monat → Woche). */
function parseZoom(raw: string | null, period: ComparePeriod): ZoomStep[] {
  if (!raw) return [];
  const steps: ZoomStep[] = [];
  let expect: ChartLevel = period;
  for (const part of raw.split(",")) {
    const [level, start] = part.split(":");
    if (level !== expect || !/^\d{4}-\d{2}-\d{2}$/.test(start ?? "") || level === "day") return [];
    steps.push({ level: level as ComparePeriod, start: periodStart(start, level as ComparePeriod) });
    expect = CHILD_LEVEL[level as ComparePeriod];
  }
  return steps;
}
const zoomParam = (steps: readonly ZoomStep[]) => steps.map((z) => `${z.level}:${z.start}`).join(",");

export function AdminCockpit() {
  const t = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Woche · Monat · Quartal · Jahr – the last choice remembered (lib/admin/period.ts), the default Woche.
  const [period] = useAdminPeriod();
  // The drill-down: the opened bars in the URL (?zoom=…), so the browser's back works; a chain from another period is dropped.
  const rawZoom = params.get("zoom");
  const zoom = useMemo(() => parseZoom(rawZoom, period), [rawZoom, period]);
  useEffect(() => {
    if (rawZoom && zoom.length === 0) router.replace(pathname, { scroll: false });
  }, [rawZoom, zoom.length, router, pathname]);
  const go = useCallback((steps: readonly ZoomStep[]) => router.push(steps.length ? `${pathname}?zoom=${zoomParam(steps)}` : pathname, { scroll: false }), [router, pathname]);

  const last = zoom.at(-1) ?? null;
  // The numbers follow the opened bar (its stretch against the one before), else the running period.
  const c = cockpit(inputs, period, last ? { level: last.level, from: last.start } : null);
  const { move, profit, nights } = c;
  const against = c.level === "month" ? t("against.month", { month: monthLong(c.compareDate) }) : c.level === "year" ? t("against.year", { year: c.compareDate.slice(0, 4) }) : t(`against.${c.level}`);
  const full = c.areas.find((a) => a.key === "supply")!.number;
  const repeat = c.areas.find((a) => a.key === "quality")!.number;

  // The chart: the root's periods, or one level deeper inside the opened bar.
  const view: ChartView = last ? { level: CHILD_LEVEL[last.level], within: { from: last.start, to: periodEnd(last.start, last.level) } } : { level: period, within: null };
  const viewKey = `${view.level}:${view.within?.from ?? "root"}`;
  const bars = useMemo<DrillBar[]>(() => {
    const months = view.level === "month";
    return chartBuckets(inputs, view).map((b) => {
      const tick = chartTick(b.from, b.to, b.level);
      return {
        key: b.from,
        main: tick.main,
        sub: tick.sub,
        title: chartTitle(b.from, b.to, b.level),
        value: b.profit,
        change: <ChangeLine change={b.profit === null ? null : getChange("profit", b.profit, b.previous)} against={t("chart.againstPrev")} />,
        current: b.current,
        tone: months && b.profit !== null ? (b.profit >= MOVE_TARGET.profitPerMonth ? "good" : "warning") : "neutral",
        events: b.events,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the view is described by viewKey
  }, [inputs, viewKey, t]);

  const title = last ? t(`chart.zoomTitle.${view.level as "day" | "week" | "month" | "quarter"}`, { range: chartTitle(last.start, periodEnd(last.start, last.level), last.level) }) : t(`chart.profitTitle.${period}`);
  const crumbs = [{ label: t(`chart.root.${period}`), steps: [] as ZoomStep[] }, ...zoom.map((z, i) => ({ label: chartTick(z.start, periodEnd(z.start, z.level), z.level).main, steps: zoom.slice(0, i + 1) }))];

  return (
    // Left in the click row, above the numbers: the next milestone and the departure (System › Zeitplan & Vorbereitung) as one link.
    <AdminShell title={t("title")} tabs={<RoadmapHeadline href="/admin/platform?view=roadmap" />} aside={<PeriodTabs />}>
      {/* ONE row of four numbers for the period (or the opened bar), each with its change (the same span of the period before), target
          (monthly, scaled) and ⓘ: Gewinn (under it "Monate in Folge 0/6" – always monthly) · Volle Houses · Gemeinsame Nächte · Wiederkehrer. */}
      <KeyNumbers
        className="lg:grid-cols-4"
        items={[
          {
            key: "profit",
            label: t("move"),
            info: `${t("info.profit")} (${against})`,
            value: eur(profit.current),
            change: profit.change,
            target: { text: t("target", { target: eur(profit.target) }), status: profit.status },
            sub: <span className="tabular-nums">{t("streakShort", { streak: move.streak, of: move.streakOf })}</span>,
          },
          { key: "fullHouses", label: t("metric.fullHouses"), info: `${t("info.fullHouses")} (${against})`, value: valueText(full.value, full.format), change: full.change, target: { text: t("target", { target: valueText(full.target, full.format) }), status: full.status } },
          // No target for the shared nights (CLAUDE.md: "kein Ziel").
          { key: "northStar", label: t("northStar"), info: `${t("info.northStar")} (${against})`, value: num(nights.current), change: nights.change },
          { key: "repeatRate", label: t("metric.repeatRate"), info: `${t("info.repeatRate")} (${against})`, value: valueText(repeat.value, repeat.format), change: repeat.change, target: { text: t("target", { target: valueText(repeat.target, repeat.format) }), status: repeat.status } },
        ]}
      />

      <ProfitPanel
        title={title}
        bars={bars}
        viewKey={viewKey}
        months={view.level === "month"}
        days={view.level === "day"}
        current={move.current}
        onOpen={view.level === "day" ? undefined : (key) => go([...zoom, { level: view.level as ComparePeriod, start: periodStart(key, view.level) }])}
        crumbs={zoom.length ? crumbs : null}
        onCrumb={(steps) => go(steps)}
      />
    </AdminShell>
  );
}

/**
 * One of the cockpit's numbers on another page ("2+ Vormerkungen" in Houses, "Pro vollem House" in Analyse): its label, value, change against
 * the same day of the month before (always monthly), target and ⓘ – the same KeyNumbers row as everywhere.
 */
export function CockpitKeyNumber({ metric, className }: { metric: "reservedShare" | "perHouse"; className?: string }) {
  const t = useTranslations("admin.cockpit");
  const c = cockpit(useAdminInputs(), "month");
  const n = c.areas.find((a) => a.number.key === metric)!.number;
  const against = t("against.month", { month: monthLong(c.compareDate) });
  return (
    <KeyNumbers
      className={className}
      items={[{ key: metric, label: t(`metric.${metric}`), info: `${t(`info.${metric}`)} (${against})`, value: valueText(n.value, n.format), change: n.change, target: { text: t("target", { target: valueText(n.target, n.format) }), status: n.status } }]}
    />
  );
}

/**
 * The profit chart (DrillChart) with its own state – hovering never re-renders the page: the root's periods or one opened bar a level deeper;
 * a click on a bar opens it (not on days). Above it, once opened, "‹ {parent}" and the crumbs; the line "Umzug 5.000 €" only where the bars
 * are months; under a week's days what happened. Under it the milestone bar (always the running month). The chart's height fills the rest of
 * the window (at least 200px), so the overview fits without scrolling (1440 × 900).
 */
const ProfitPanel = memo(function ProfitPanel({
  title,
  bars,
  viewKey,
  months,
  days,
  current,
  onOpen,
  crumbs,
  onCrumb,
}: {
  title: string;
  bars: readonly (DrillBar & { events?: { requests: number; paid: number; houses: number } })[];
  viewKey: string;
  months: boolean;
  days: boolean;
  current: number;
  onOpen?: (key: string) => void;
  crumbs: readonly { label: string; steps: ZoomStep[] }[] | null;
  onCrumb: (steps: ZoomStep[]) => void;
}) {
  const t = useTranslations("admin.cockpit");
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(260);
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      // The rest of the window under the chart's top, less the axis' second line, the days' events, the milestone bar (≈ 72px) and the
      // page's bottom padding; at least 200px.
      setHeight(Math.max(200, Math.floor(window.innerHeight - (top + window.scrollY) - 72 - 40 - (days ? 56 : 0))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewKey, days, crumbs]);
  const parent = crumbs && crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;
  return (
    <section aria-label={title} className="mt-(--adm-section)">
      <div className="mb-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1">
        {parent && (
          <button type="button" onClick={() => onCrumb(parent.steps)} className="inline-flex items-center gap-1 text-small font-semibold text-ink hover:underline">
            <ChevronLeft aria-hidden className="size-4" />
            {parent.label}
          </button>
        )}
        {crumbs && crumbs.length > 2 && (
          <nav aria-label={t("chart.crumbs")} className="flex items-center gap-1 text-small text-muted">
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden>›</span>}
                {i < crumbs.length - 1 ? (
                  <button type="button" onClick={() => onCrumb(c.steps)} className="hover:text-ink hover:underline">
                    {c.label}
                  </button>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h2 className="text-eyebrow uppercase text-(--adm-label)">{title}</h2>
        {onOpen && <span className="text-small text-muted">{t("chart.openHint")}</span>}
      </div>
      <div ref={box}>
        <DrillChart
          bars={bars}
          label={title}
          height={height}
          running={t("chart.running")}
          line={months ? { value: MOVE_TARGET.profitPerMonth, label: `${t("milestones.move")} ${eur(MOVE_TARGET.profitPerMonth)}` } : null}
          onOpen={onOpen}
          below={days ? (bar) => <DayEvents events={(bar as { events?: { requests: number; paid: number; houses: number } }).events} /> : undefined}
        />
      </div>
      <MilestoneBar current={current} />
    </section>
  );
});

/** Under a day's bar: what happened – new requests, paid stays, new Houses (only what is above 0; nothing: "–"). */
function DayEvents({ events }: { events?: { requests: number; paid: number; houses: number } }) {
  const t = useTranslations("admin.cockpit.chart.events");
  if (!events) return null;
  const lines = [events.requests > 0 && t("requests", { count: events.requests }), events.paid > 0 && t("paid", { count: events.paid }), events.houses > 0 && t("houses", { count: events.houses })].filter(Boolean);
  return <p className="mt-1 text-small text-muted">{lines.length ? lines.map((l) => <span key={String(l)} className="block truncate">{l}</span>) : "–"}</p>;
}

/**
 * The milestones as one slim bar under the chart (config/admin.ts profitMilestones.ladder): the next step "Umzug 5.000 € · 88 %" with its
 * progress bar, beside it the step after that, muted ("10.000 €").
 */
function MilestoneBar({ current }: { current: number }) {
  const t = useTranslations("admin.cockpit");
  const steps = profitMilestones.ladder;
  const i = steps.findIndex((s) => current < s.value);
  const next = i >= 0 ? steps[i] : null;
  const after = i >= 0 ? steps[i + 1] : null;
  if (!next) return <p className="mt-(--adm-inner) text-small font-semibold text-ink">{t("ladder.allReached", { value: eur(steps.at(-1)!.value) })}</p>;
  const ratio = Math.min(1, current / next.value);
  const name = next.key ? `${t(`milestones.${next.key}`)} ` : "";
  return (
    <div className="mt-(--adm-inner) flex items-center gap-x-6 gap-y-2 max-md:flex-wrap">
      <span className="shrink-0 text-small font-semibold tabular-nums text-ink">
        {name}
        {eur(next.value)} · {pct(Math.floor(ratio * 100))}
      </span>
      <ProgressBar ratio={ratio} label={`${name}${eur(next.value)}`} className="min-w-40 flex-1" />
      {after && <span className="shrink-0 text-small tabular-nums text-muted">{t("ladder.after", { value: `${after.key ? `${t(`milestones.${after.key}`)} ` : ""}${eur(after.value)}` })}</span>}
    </div>
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
  // Steuern has a second level: Buchungsjournal (the bookings, sums, reserve, DATEV and PDF) · Überblick (the ledger: countries, receipts, DAC7 …).
  const [taxView, setTaxView] = useState<"journal" | "overview">("journal");
  return (
    <AdminShell
      title={t("title")}
      tabs={<AdminTabs label={t("views.label")} value={view} onChange={setView} tabs={(["overview", "taxes"] as const).map((value) => ({ value, label: t(`views.${value}`) }))} />}
      subTabs={view === "taxes" ? <AdminSubTabs label={t("taxViews.label")} value={taxView} onChange={setTaxView} tabs={(["journal", "overview"] as const).map((value) => ({ value, label: t(`taxViews.${value}`) }))} /> : undefined}
    >
      {view === "taxes" ? taxView === "journal" ? <AdminTaxJournal /> : <AdminTaxes /> : <MoneyOverview />}
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
      <p className="mt-(--adm-inner) max-w-2xl text-small text-muted">{t("note")}</p>
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
        <ModalFooter onCancel={() => setConfirming(false)} className="mt-(--adm-inner)">
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
        <p className="mt-(--adm-inner) text-body text-muted">{t("none")}</p>
      ) : (
        <ul className="mt-(--adm-inner) divide-y divide-ink/8 border-y border-ink/8">
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
