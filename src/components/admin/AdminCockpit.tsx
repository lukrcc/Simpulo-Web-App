"use client";

// /admin – the overview ("Wie läuft Simpulo?", Pyramide Ebene 1): only tiles – no sentence, no chart (the profit chart lives in Geld ›
// Überblick, ProfitDrill). The admin's period top right, every tile counts by it. Rows by the side list's groups – Heute · Zahlen (two
// rows) · Plattform · Planen –, five equal tiles each (--adm-tile-h), tinted in the row's group; the whole tile opens its page. Every
// number from lib/admin/metrics.ts.
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTallScreen } from "./useTallScreen";
import { shortNameOf } from "@/lib/shortName";
import { FormField } from "@/components/form/FormLayout";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { OVERVIEW_GOALS } from "@/config/policies";
import { OVERVIEW_TARGETS } from "@/config/admin";
import { useAdminPeriod } from "@/lib/admin/period";
import { algorithmMetrics, fastestFull, partnerStepDue, waitlistMetrics, periodEnd, periodStart, growthFunnel, growthRows, installRates, needsHelp, needsHelpChange, openHouses, connectionOverview, statusAgainst, getChange, moneyPeriod, cockpit, companyBalance, getStatus, launchProgress, type CockpitNumber } from "@/lib/admin/metrics";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { taskArea, taskCounts } from "@/lib/admin/tasks";
import { daysToLaunch, isOpenTodo, nextMilestone } from "@/lib/roadmap";
import { LAUNCH, MARKETING_START } from "@/config/roadmap";
import { usePlanTodos } from "./AdminZeitplan";
import { HYPOTHESES } from "@/config/hypotheses";
import { CONTENT_WEEKLY_TARGET } from "@/config/marketing";
import { getHypothesisResults, getLiveVisitors, getPlatformPayouts } from "@/lib/data";
import { useStore } from "@/lib/store";
import { ProgressBar, StatusDot } from "./AdminCharts";
import { AdminButton, AdminDialogFooter, adminButtonStyles } from "./AdminButton";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { KeyNumbers } from "./AdminNumbers";
import { AdminSection, AdminShell, StatRow } from "./AdminShell";
import { TileBoard, type TileRow } from "./AdminTiles";
import { useMilestoneName } from "./AdminRoadmap";
import { day as dayLabel, eur, monthLong, num, pct } from "@/lib/i18n/adminFormat";

function valueText(value: number | null, format: CockpitNumber["format"]): string {
  if (value === null) return "–";
  if (format === "percent") return pct(value);
  if (format === "eur") return eur(value);
  return num(value);
}

export function AdminCockpit() {
  const t = useTranslations("admin.cockpit");
  const tm = useTranslations("admin.money");
  const tg = useTranslations("admin.growthArea");
  const inputs = useAdminInputs();
  const { events } = useStore();
  const tasks = useAdminTasks();
  const milestoneName = useMilestoneName();
  // Woche · Monat · Quartal · Jahr – the admin's one period (lib/admin/period.ts); every tile counts by it.
  const [period] = useAdminPeriod();
  const c = cockpit(inputs, period);
  const m = moneyPeriod(inputs, period);
  const { profit, nights } = c;
  const against = c.level === "month" ? t("against.month", { month: monthLong(c.compareDate) }) : c.level === "year" ? t("against.year", { year: c.compareDate.slice(0, 4) }) : t(`against.${c.level}`);
  const full = c.areas.find((a) => a.key === "supply")!.number;
  const repeat = c.areas.find((a) => a.key === "quality")!.number;
  const connection = connectionOverview(inputs, c.ranges, c.level);
  const open = openHouses(inputs, c.ranges, period);
  const funnel = growthFunnel(events, period, inputs.today, c.ranges);
  const best = growthRows(events, (e) => e.utmSource ?? "", period, inputs.today, c.ranges).find((r) => r.paid > 0);
  const bestName = best ? (best.key === "" ? tg("channel.direct") : tg.has(`channel.${best.key}` as Parameters<typeof tg>[0]) ? tg(`channel.${best.key}` as Parameters<typeof tg>[0]) : best.key) : null;
  const installs = installRates(inputs);
  const helpCount = needsHelp(inputs).length;
  const launch = launchProgress(inputs);
  const openApplications = inputs.admin.applications.filter((a) => a.status === "new" || a.status === "maybe").length;
  const openReports = inputs.reports.filter((r) => !r.decision).length;
  const next = nextMilestone(inputs.today, inputs.admin);
  const live = useLiveVisitors();
  // Planen: the launch countdown, the pipeline (contacts → Houses opened), active partners, shorts published this week, theses supported.
  const contacts = inputs.admin.marketingContacts ?? [];
  const partnersActive = (inputs.admin.marketingPartners ?? []).filter((p) => p.agreement.status === "active").length;
  const weekFrom = periodStart(inputs.today, "week");
  const weekTo = periodEnd(weekFrom, "week");
  const shorts = (inputs.admin.contentPosts ?? []).filter((p) => p.status === "published" && p.date >= weekFrom && p.date <= weekTo).length;
  const results = getHypothesisResults();
  const supported = HYPOTHESES.filter((h) => results[h.id]?.status === "supported").length;
  const toLaunch = daysToLaunch(inputs.today);
  // Detail lines (CLAUDE.md "Überblick je Seitentyp"): two small lines per tile; on a short window one (the tiles are compact there).
  const td = useTranslations("admin.pageTiles.cockpit");
  const tall = useTallScreen();
  const lines = (...all: (ReactNode | null | undefined | false)[]) => all.filter((l): l is ReactNode => l !== null && l !== undefined && l !== false).slice(0, 2);
  // A tile whose number carries two lines beside it (change + target) or a composite value has room for one detail line only.
  const line = (...all: (ReactNode | null | undefined | false)[]) => lines(...all).slice(0, 1);
  const money = (n: number | null) => (n === null ? td("none") : eur(n));
  const share = (part: number, all: number) => (all > 0 ? pct(Math.round((part / all) * 100)) : td("none"));
  const areaCount = (area: ReturnType<typeof taskArea>) => tasks.filter((task) => taskArea(task) === area).length;
  const help = needsHelp(inputs);
  const appsOpen = inputs.admin.applications.filter((a) => a.status === "new" || a.status === "maybe");
  const oldestApp = appsOpen.map((a) => a.createdAt).toSorted()[0];
  const todos = usePlanTodos();
  const channelRows = growthRows(events, (e) => e.utmSource ?? "", period, inputs.today, c.ranges);
  const channelLabel = (key: string) => (key === "" ? tg("channel.direct") : tg.has(`channel.${key}` as Parameters<typeof tg>[0]) ? tg(`channel.${key}` as Parameters<typeof tg>[0]) : key);
  const byVisits = channelRows.toSorted((a, b) => b.visits - a.visits);
  const secondBest = channelRows.filter((r) => r.paid > 0)[1];
  const wl = waitlistMetrics(inputs);
  const openStays = inputs.stays.filter((st) => !st.isExample && st.status === "published" && st.startDate > inputs.today && st.spotsTotal > 0);
  const avgFill = openStays.length ? Math.round((openStays.reduce((n, st) => n + st.spotsFilled / st.spotsTotal, 0) / openStays.length) * 100) : null;
  const fastest = fastestFull(inputs)[0];
  const reserved = c.areas.find((a) => a.key === "demand")?.number;
  const network = algorithmMetrics(inputs);
  const partners = inputs.admin.marketingPartners ?? [];
  const plannedShorts = (inputs.admin.contentPosts ?? []).filter((p) => p.status === "planned" && p.date >= weekFrom && p.date <= weekTo).length;
  const info = (text: string) => `${text} (${against})`;
  const pct0 = (v: number | null) => (v === null ? "–" : pct(Math.round(v)));
  const of = (value: number, total: number) => (
    <>
      {num(value)} <span className="text-body text-muted">/ {num(total)}</span>
    </>
  );

  const allRows: readonly TileRow[] = [
    {
      key: "today",
      group: "today",
      title: t("rows.today"),
      tiles: [
        {
          key: "inbox",
          label: t("tiles.inbox"),
          info: t("tiles.info.inbox"),
          value: num(taskCounts(tasks).total),
          details: lines(td("inboxKinds", { safety: num(areaCount("safety")), money: num(areaCount("money")), houses: num(areaCount("houses")) }), td("inboxMore", { hosts: num(areaCount("hosts")), questions: num(areaCount("questions")) })),
          href: "/admin/aufgaben",
        },
        {
          key: "needsHelp",
          label: t("tiles.needsHelp"),
          info: t("tiles.info.needsHelp"),
          value: num(helpCount),
          change: c.level === "month" ? needsHelpChange(inputs, helpCount) : undefined,
          details: help[0] ? lines(td("helpTop", { title: shortNameOf(help[0].stay) }), td("helpTopLine", { days: help[0].daysToStart, missing: help[0].missing })) : lines(td("helpNone")),
          href: "/admin/aufgaben?tab=houses",
        },
        {
          key: "applications",
          label: t("tiles.applications"),
          info: t("tiles.info.applications"),
          value: num(openApplications),
          details: lines(
            td("applicationsSplit", { fresh: num(appsOpen.filter((a) => a.status === "new").length), question: num(appsOpen.filter((a) => a.status === "maybe").length) }),
            oldestApp ? td("applicationsOldest", { days: Math.max(0, Math.round((Date.parse(inputs.today) - Date.parse(oldestApp.slice(0, 10))) / 86_400_000)) }) : null,
          ),
          href: "/admin/aufgaben?tab=hosts",
        },
        {
          key: "reports",
          label: t("tiles.reports"),
          info: t("tiles.info.reports"),
          value: num(openReports),
          details: lines(
            td("reportsSplit", { tickets: num(inputs.admin.tickets.filter((tk) => tk.category === "safety" && !tk.mergedInto && (tk.status === "new" || tk.status === "open")).length) }),
            td("reportsAppeals", { appeals: num(inputs.notices.filter((n) => n.appeal && !n.appeal.decision).length) }),
          ),
          href: "/admin/aufgaben?tab=safety",
        },
        {
          key: "milestone",
          label: t("tiles.milestone"),
          info: t("tiles.info.milestone"),
          value: next ? milestoneName(next) : t("tiles.none"),
          small: true,
          details: next ? lines(td("milestoneDate", { inDays: t("tiles.inDays", { days: next.days }), date: dayLabel(next.date) }), td("milestoneTodos", { open: todos.filter((x) => x.milestone === next.id && isOpenTodo(x)).length })) : undefined,
          href: "/admin/zeitplan",
        },
      ],
    },
    {
      key: "money",
      group: "numbers",
      title: t("rows.numbers"),
      tiles: [
        {
          key: "revenue",
          label: tm("terms.revenue.label"),
          info: info(tm("terms.revenue.info")),
          value: eur(m.now.revenue),
          change: m.changes.revenue,
          details: lines(td("revenueSplit", { guests: eur(m.now.serviceFees), hosts: eur(m.now.hostFeeShare) }), td("revenuePer", { per: money(m.now.perGuest), rate: m.now.takeRate === null ? td("none") : pct(Math.round(m.now.takeRate)) })),
          href: "/admin/money",
        },
        {
          key: "profit",
          label: tm("terms.profit.label"),
          info: info(tm("terms.profit.info")),
          value: eur(profit.current),
          change: profit.change,
          details: lines(td("profitSum", { revenue: eur(m.now.revenue), costs: eur(m.now.costs) }), td("profitMargin", { margin: share(m.now.profit, m.now.revenue) })),
          href: "/admin/money?tab=costs",
        },
        {
          key: "bookingVolume",
          label: tm("terms.bookingVolume.label"),
          info: info(tm("terms.bookingVolume.info")),
          value: eur(m.now.bookingVolume),
          change: m.changes.bookingVolume,
          details: lines(td("volumeBookings", { count: m.now.guests, avg: money(m.now.bookingPerGuest) }), td("volumeRefunds", { refunds: eur(m.now.refunds) })),
          href: "/admin/money?tab=guests",
        },
        {
          key: "perBooking",
          label: tm("terms.perBooking.label"),
          info: info(tm("terms.perBooking.info")),
          value: m.now.perGuest === null ? "–" : eur(m.now.perGuest),
          details: line(t("tiles.host", { value: m.now.perHost === null ? "–" : eur(m.now.perHost) }), td("perBookingFees", { fees: eur(m.now.serviceFees) })),
          change: m.changes.perGuest,
          target: { text: t("target", { target: eur(OVERVIEW_GOALS.perBookingGuest) }), status: statusAgainst(m.now.perGuest, OVERVIEW_GOALS.perBookingGuest) },
          href: "/admin/money?tab=guests",
        },
        { key: "bookings", label: t("tiles.bookings"), info: info(t("tiles.info.bookings")), value: num(m.now.guests), change: getChange("paidBookings", m.now.guests, m.prev.guests), details: lines(td("bookingsFull", { full: num(m.now.full) }), td("bookingsPro", { pro: num(m.now.proHosts) })), href: "/admin/money?tab=guests" },
      ],
    },
    {
      key: "growth",
      group: "numbers",
      title: "",
      tiles: [
        {
          key: "visitors",
          label: t("tiles.visitors"),
          info: info(t("tiles.info.visitors")),
          value: num(funnel.visitors.value),
          change: funnel.visitors.change,
          details: lines(
            <span key="live">
              <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-adm-good align-middle" />
              {td("visitorsLive", { live: live === null ? td("none") : num(live), requests: num(funnel.requests.value), rate: share(funnel.requests.value, funnel.visitors.value) })}
            </span>,
            byVisits.length > 0 ? td("visitorsTop", { first: channelLabel(byVisits[0].key), second: byVisits[1] ? channelLabel(byVisits[1].key) : td("none") }) : null,
          ),
          href: "/admin/growth",
        },
        { key: "requests", label: t("tiles.requests"), info: info(t("tiles.info.requests")), value: num(funnel.requests.value), change: funnel.requests.change, details: lines(t("tiles.requestRate", { rate: share(funnel.requests.value, funnel.visitors.value) }), td("requestsPaid", { paid: num(funnel.paid.value), rate: share(funnel.paid.value, funnel.requests.value) })), href: "/admin/growth" },
        { key: "bestChannel", label: t("tiles.bestChannel"), info: info(t("tiles.info.bestChannel")), value: bestName ?? t("tiles.none"), small: true, details: best ? lines(td("channelLine", { paid: best.paid, revenue: eur(best.revenue) }), secondBest ? td("channelNext", { name: channelLabel(secondBest.key), paid: num(secondBest.paid) }) : null) : undefined, href: "/admin/growth?tab=origin" },
        { key: "webApp", label: t("tiles.webApp"), info: t("tiles.info.webApp"), value: pct0(installs.all.value), change: installs.all.change, details: lines(td("webAppSplit", { ios: pct0(installs.ios.value), android: pct0(installs.android.value) }), installs.ios.booked !== null || installs.android.booked !== null ? td("webAppOf", { count: num((installs.ios.booked ?? 0) + (installs.android.booked ?? 0)) }) : null), href: "/admin/growth?tab=usage" },
        { key: "waitlist", label: t("tiles.waitlist"), info: t("tiles.info.waitlist"), value: of(launch.waitlist.value, launch.waitlist.target), details: line(td("waitlistSplit", { pending: num(wl.pending), unsubscribed: num(wl.unsubscribed) }), td("waitlistHost", { count: num(wl.wantsToHost) })), href: "/admin/growth?tab=waitlist" },
      ],
    },
    {
      key: "platform",
      group: "platform",
      title: t("rows.platform"),
      tiles: [
        { key: "openHouses", label: t("growthRow.openHouses"), info: info(t("growthRow.info.openHouses")), value: num(open.value), change: open.change, details: lines(td("openHelp", { count: num(helpCount) }), avgFill === null ? null : td("openFill", { fill: pct(avgFill) })), href: "/admin/houses" },
        { key: "fullHouses", label: t("metric.fullHouses"), info: info(t("info.fullHouses")), value: valueText(full.value, full.format), change: full.change, target: { text: t("target", { target: valueText(full.target, full.format) }), status: full.status }, details: line(fastest ? td("fullFastest", { days: fastest.days }) : null, reserved ? td("fullReserved", { share: valueText(reserved.value, reserved.format) }) : null), href: "/admin/houses" },
        { key: "nights", label: t("northStar"), info: info(t("info.northStar")), value: num(nights.current), change: nights.change, details: lines(full.value ? td("nightsPer", { per: num(Math.round(nights.current / full.value)) }) : null, td("nightsFull", { full: valueText(full.value, full.format) })), href: "/admin/topics" },
        { key: "connection", label: t("metric.connectionRate"), info: info(t("info.connectionRate")), value: connection.value === null ? "–" : pct(connection.value), change: connection.change, target: { text: t("target", { target: pct(OVERVIEW_TARGETS.connectionRate) }), status: getStatus("connectionRate", connection.value) }, details: network.allPairs ? lines(td("connectionPairs", { mutual: num(network.mutualPairs), all: num(network.allPairs) })) : undefined, href: "/admin/data" },
        { key: "repeat", label: t("metric.repeatRate"), info: info(t("info.repeatRate")), value: valueText(repeat.value, repeat.format), change: repeat.change, target: { text: t("target", { target: valueText(repeat.target, repeat.format) }), status: repeat.status }, details: network.guests ? lines(td("repeatGuests", { repeat: num(network.repeatGuests), guests: num(network.guests) })) : undefined, href: "/admin/topics" },
      ],
    },
    {
      key: "plan",
      group: "plan",
      title: t("rows.plan"),
      tiles: [
        { key: "launch", label: t("tiles.launch"), info: t("tiles.info.launch"), value: toLaunch >= 0 ? t("tiles.inDays", { days: toLaunch }) : t("tiles.launched"), small: true, details: lines(td("launchDate", { date: dayLabel(LAUNCH.date), start: dayLabel(MARKETING_START.date) })), href: "/admin/marketing" },
        {
          key: "pipeline",
          label: t("tiles.pipeline"),
          info: t("tiles.info.pipeline"),
          value: (
            <>
              {num(contacts.length)} <span className="text-muted">→</span> {num(contacts.filter((x) => x.status === "house").length)}
            </>
          ),
          details: lines(t("tiles.pipelineLine"), td("pipelineSplit", { replied: num(contacts.filter((x) => x.status === "replied").length), demo: num(contacts.filter((x) => x.status === "demo").length) })),
          href: "/admin/marketing?tab=pipeline",
        },
        { key: "partners", label: t("tiles.partners"), info: t("tiles.info.partners"), value: num(partnersActive), details: lines(td("partnersOf", { all: num(partners.length) }), td("partnersDue", { due: num(partners.filter((p) => partnerStepDue(p, inputs.today)).length) })), href: "/admin/marketing?tab=partners" },
        { key: "shorts", label: t("tiles.shorts"), info: t("tiles.info.shorts"), value: of(shorts, CONTENT_WEEKLY_TARGET), details: lines(td("shortsPlanned", { planned: num(plannedShorts) })), href: "/admin/marketing?tab=content" },
        { key: "theses", label: t("tiles.theses"), info: t("tiles.info.theses"), value: of(supported, HYPOTHESES.length), details: lines(td("thesesSplit", { open: num(HYPOTHESES.filter((h) => (results[h.id]?.status ?? "open") === "open").length), rejected: num(HYPOTHESES.filter((h) => results[h.id]?.status === "rejected").length) })), href: "/admin/data" },
      ],
    },
  ];

  // On a short window (1280 × 720) the 25 tiles are compact: no room for detail lines – the first one stays as the tile's one small line.
  const rows: readonly TileRow[] = tall ? allRows : allRows.map((row) => ({ ...row, tiles: row.tiles.map((tile) => ({ ...tile, extra: tile.extra ?? tile.details?.[0], details: undefined })) }));

  return (
    // Only tiles (CLAUDE.md "Übersicht"): no sentence, no chart (the profit chart lives in Geld › Verlauf). Rows by the side list's groups –
    // Heute · Zahlen (two rows) · Plattform · Planen –, five equal tiles each, tinted in the row's group, over the full height (TileBoard);
    // the period centred above them.
    <AdminShell
      title={t("title")}
      period="center"
      aside={
        <Link href="/admin/market-cap" className={adminButtonStyles("secondary")}>
          <TrendingUp aria-hidden />
          {t("marketCap")}
        </Link>
      }
    >
      <TileBoard label={t("title")} rows={rows} />
    </AdminShell>
  );
}

/** „● live“: the simulated (demo) or – later – counted visitors right now, read again every few seconds; null until known (never in the first render). */
export function useLiveVisitors(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setCount(getLiveVisitors());
    read();
    const id = window.setInterval(read, LIVE_EVERY_MS);
    return () => window.clearInterval(id);
  }, []);
  return count;
}
/** How often „● live“ is read again. */
const LIVE_EVERY_MS = 5000;

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
      items={[{ key: metric, label: t(`metric.${metric}`), info: `${t(`info.${metric}`)} (${against})`, value: valueText(n.value, n.format), change: n.change, ...(n.format === "eur" ? {} : { target: { text: t("target", { target: valueText(n.target, n.format) }), status: n.status } }) }]}
    />
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

/**
 * Simpulo's own payouts at Stripe: schedule, the account on file, the next payout – read only; changed in Stripe ("Manage in Stripe").
 * "Pay out now" only ever to that account (confirmed in a dialog, logged; the real call from phase 5).
 */
export function PayoutSection() {
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
        <AdminButton variant="secondary" disabled={payouts.available <= 0} onClick={() => setConfirming(true)}>
          {t("payNow")}
        </AdminButton>
      </div>
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t("payTitle", { amount })}>
        <p className="text-body text-muted">{t("payText", { amount, account: payouts.account })}</p>
        <AdminDialogFooter onCancel={() => setConfirming(false)}>
          <AdminButton
          variant="primary"
            onClick={() => {
              payOutNow(payouts.available, payouts.account);
              setConfirming(false);
              showToast(t("paid", { amount, account: payouts.account }));
            }}
          >
            {t("payConfirm", { amount })}
          </AdminButton>
        </AdminDialogFooter>
      </Sheet>
    </AdminSection>
  );
}

/** "My withdrawals": private withdrawals from Qonto entered by hand, and this year's profit − tax reserve − withdrawals = left in the company. */
export function Withdrawals() {
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
        <AdminButton type="submit" variant="secondary" disabled={!valid}>
          {t("addWithdrawal")}
        </AdminButton>
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
