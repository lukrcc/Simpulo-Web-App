"use client";

// /admin – the overview ("Wie läuft Simpulo?", Pyramide Ebene 1, CLAUDE.md "Übersicht mit Kapseln"): capsules Überblick · Heute · Richtung ·
// Geld · Nachfrage · Qualität, the period a menu right. Überblick: 20 tiles in four rows (config/admin/overview.ts), each in its group
// capsule's colour; a click opens that capsule with the tile marked – its details from the pages' own parts (OverviewGroups.tsx). Every
// number from lib/admin/metrics.ts.
import { numberPool, TopicCards, TopicHeader } from "./AdminTopics";
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
import { useAdminDay, useAdminFocus, useAdminPeriod } from "@/lib/admin/period";
import { algorithmMetrics, fastestFull, waitlistMetrics, growthFunnel, growthRows, installRates, installRateOver, needsHelp, needsHelpChange, openHouses, moneyTotals, marketCap, bookingTotals, alignRows, periodEnd, rangesFor, rankByMeasure, analysisRows, connectionOverview, statusAgainst, getChange, moneyPeriod, cockpit, companyBalance, getStatus, launchProgress, sweetSpot, hostOverview, fundingReadiness, marketingFunnel, type CockpitNumber } from "@/lib/admin/metrics";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { taskArea, taskCounts } from "@/lib/admin/tasks";
import { daysToLaunch, nextMilestone } from "@/lib/roadmap";
import { LAUNCH, MARKETING_START } from "@/config/roadmap";
import { getLiveVisitors, getPlatformPayouts } from "@/lib/data";
import { useStore } from "@/lib/store";
import { ProgressBar, StatusDot } from "./AdminCharts";
import { AdminButton, AdminDialogFooter } from "./AdminButton";
import { KeyNumbers } from "./AdminNumbers";
import { AdminSection, AdminShell, StatRow } from "./AdminShell";
import { TileBoard, type TileRow } from "./AdminTiles";
import { routeTiles, withUnits } from "./tileRoutes";
import { OVERVIEW_GROUP_AREA, OVERVIEW_GROUP_PAGE, OVERVIEW_GROUPS, OVERVIEW_ROWS, type OverviewGroup } from "@/config/admin/overview";
import { useAdminTab } from "@/lib/admin/urlState";
import Link from "next/link";
import { AdminTabs } from "./AdminLayout";
import { hostActivity } from "./AdminAreas";
import { useMilestoneName } from "./AdminRoadmap";
import { day as dayLabel, dec, eur, monthLong, num, pct } from "@/lib/i18n/adminFormat";

function valueText(value: number | null, format: CockpitNumber["format"]): string {
  if (value === null) return "–";
  if (format === "percent") return pct(value);
  if (format === "eur") return eur(value);
  return num(value);
}

type Tab = "overview" | OverviewGroup;
const TABS: readonly Tab[] = ["overview", ...OVERVIEW_GROUPS];

export function AdminCockpit() {
  const t = useTranslations("admin.cockpit");
  // The capsule (?tab=) and the tile it was opened from (?focus=, marked by the admin frame).
  const { tab, open: openTab } = useAdminTab<Tab>(TABS, "overview");
  const tm = useTranslations("admin.money");
  const tg = useTranslations("admin.growthArea");
  const inputs = useAdminInputs();
  const { events } = useStore();
  const tasks = useAdminTasks();
  const milestoneName = useMilestoneName();
  // Woche · Monat · Quartal · Jahr – the admin's one period (lib/admin/period.ts); every tile counts by it.
  const [period, setPeriod] = useAdminPeriod();
  // Opening the overview: Woche and "Ganze Woche" (CLAUDE.md) – days can be picked one by one from there.
  const [, setDay] = useAdminDay();
  useEffect(() => {
    setPeriod("week");
    setDay(null);
  }, [setPeriod, setDay]);
  // "Woche" with a day chosen: every tile shows that day, compared with the same weekday a week before (lib/admin/period.ts).
  const focus = useAdminFocus(inputs.today);
  const c = cockpit(inputs, period, focus);
  const m = moneyPeriod(inputs, period, focus);
  const { profit, nights } = c;
  const against = c.level === "month" ? t("against.month", { month: monthLong(c.compareDate) }) : c.level === "year" ? t("against.year", { year: c.compareDate.slice(0, 4) }) : t(`against.${c.level}`);
  const full = c.areas.find((a) => a.key === "supply")!.number;
  const repeat = c.areas.find((a) => a.key === "quality")!.number;
  const connection = connectionOverview(inputs, c.ranges, c.level);
  const open = openHouses(inputs, c.ranges, period);
  // ONE source: bookings and revenue from the day rows (the same as Geld); the events only split them by channel.
  const source = bookingTotals(inputs, c.ranges);
  const funnel = growthFunnel(events, period, inputs.today, c.ranges, source);
  const channelRows = alignRows(growthRows(events, (e) => e.utmSource ?? "", period, inputs.today, c.ranges), { paid: source.paid.now, revenue: source.revenue.now }, true);
  const best = channelRows.find((r) => r.paid > 0);
  const bestName = best ? (best.key === "" ? tg("channel.direct") : tg.has(`channel.${best.key}` as Parameters<typeof tg>[0]) ? tg(`channel.${best.key}` as Parameters<typeof tg>[0]) : best.key) : null;
  const installs = installRates(inputs);
  // Web-App installiert follows the period: the last full months it covers, against as many before.
  const webApp = installRateOver(inputs, c.level);
  const helpCount = needsHelp(inputs).length;
  const launch = launchProgress(inputs);
  const openApplications = inputs.admin.applications.filter((a) => a.status === "new" || a.status === "maybe").length;
  const openReports = inputs.reports.filter((r) => !r.decision).length;
  const next = nextMilestone(inputs.today, inputs.admin);
  const live = useLiveVisitors();
  // Planen: the launch countdown, the pipeline (contacts → Houses opened), active partners, shorts published this week, theses supported.
  const contacts = inputs.admin.marketingContacts ?? [];
  const partnersActive = (inputs.admin.marketingPartners ?? []).filter((p) => p.agreement.status === "active").length;
  const toLaunch = daysToLaunch(inputs.today);
  // Detail lines (CLAUDE.md "Überblick je Seitentyp"): two small lines per tile; on a short window one (the tiles are compact there).
  const td = useTranslations("admin.pageTiles.cockpit");
  const tall = useTallScreen();
  // 3–4 small lines under the number (CLAUDE.md "Zeitraum mit Tagen"); a line whose value is empty ("Host –") is left out.
  const lines = (...all: (ReactNode | null | undefined | false)[]) => all.filter((l): l is ReactNode => l !== null && l !== undefined && l !== false && !(typeof l === "string" && /–$/.test(l.trim())));
  const money = (n: number | null) => (n === null ? td("none") : eur(n));
  const share = (part: number, all: number) => (all > 0 ? pct(Math.round((part / all) * 100)) : td("none"));
  const areaCount = (area: ReturnType<typeof taskArea>) => tasks.filter((task) => taskArea(task) === area).length;
  const help = needsHelp(inputs);
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
  const info = (text: string) => `${text} (${against})`;
  // Days: the stretch shown, today, the average per day and the forecast to the period's end (not for a single day).
  const DAY = 86_400_000;
  const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const from = c.ranges.current.from;
  const to = c.ranges.current.to;
  const daysSoFar = Math.max(1, Math.round((dayMs(to) - dayMs(from)) / DAY) + 1);
  const daysInPeriod = focus ? 1 : Math.round((dayMs(periodEnd(from, period)) - dayMs(from)) / DAY) + 1;
  const todayMoney = moneyTotals(inputs, inputs.today, inputs.today);
  const forecast = (n: number) => (focus || daysInPeriod <= daysSoFar ? null : Math.round((n / daysSoFar) * daysInPeriod));
  const perDay = (n: number) => n / daysSoFar;
  // The strongest day of the stretch (paying guests).
  const strongest = (() => {
    if (focus) return null;
    let best: { date: string; guests: number } | null = null;
    for (let ms = dayMs(from); ms <= dayMs(to); ms += DAY) {
      const date = isoOf(ms);
      const g = moneyTotals(inputs, date, date).guests;
      if (!best || g > best.guests) best = { date, guests: g };
    }
    return best && best.guests > 0 ? best : null;
  })();
  const visitorsToday = growthFunnel(events, period, inputs.today, rangesFor("day", inputs.today, inputs.today, inputs.today)).visitors.value;
  const requestsToday = growthFunnel(events, period, inputs.today, rangesFor("day", inputs.today, inputs.today, inputs.today)).requests.value;
  const startsSoon = openStays.filter((st) => dayMs(st.startDate) - dayMs(inputs.today) <= 7 * DAY).length;
  const bestHub = rankByMeasure(analysisRows(inputs, "hub", "12m"), "connection").find((r) => !r.tooFew && r.againMutual !== null);
  const vsTarget = (value: number | null, target: number) => (value === null ? null : value >= target ? td("aboveTarget", { points: num(value - target) }) : td("belowTarget", { points: num(target - value) }));
  // Short euros for the small lines: from 10.000 € in thousands.
  const short = (n: number) => (Math.abs(n) >= 10_000 ? td("thousandEur", { value: dec(Math.round(n / 100) / 10) }) : eur(n));
  const isToday = !focus;
  const mc = useMemo(() => marketCap(inputs), [inputs]);
  // "Gäste 130 € · Hosts 13 €" – with large amounts both in thousands ("Gäste 30,6 · Hosts 3,1 Tsd. €"), so it stays one line.
  const split = (guests: number, hosts: number) =>
    Math.max(guests, hosts) >= 10_000 ? td("splitK", { guests: dec(Math.round(guests / 100) / 10), hosts: dec(Math.round(hosts / 100) / 10) }) : td("revenueSplitShort", { guests: eur(guests), hosts: eur(hosts) });
  const pct0 = (v: number | null) => (v === null ? "–" : pct(Math.round(v)));
  const of = (value: number, total: number) => (
    <>
      {num(value)} <span className="text-body text-muted">/ {num(total)}</span>
    </>
  );

  const allRows: readonly TileRow[] = [
    // R1 – Heute and Planen: what needs doing and what's next (no row headings: the group shows in each tile's tint and title).
    {
      key: "today",
      group: "today",
      tiles: [
        {
          key: "inbox",
          label: t("tiles.inbox"),
          info: t("tiles.info.inbox"),
          value: num(taskCounts(tasks).total),
          details: lines(td("inboxSplitA", { safety: num(areaCount("safety")), reports: num(openReports) }), td("inboxSplitB", { applications: num(openApplications), questions: num(areaCount("questions")) }), td("inboxSplitC", { houses: num(areaCount("houses")), money: num(areaCount("money")) })),
          href: "/admin/aufgaben",
        },
        {
          key: "needsHelp",
          label: t("tiles.needsHelp"),
          info: t("tiles.info.needsHelp"),
          value: num(helpCount),
          change: c.level === "month" ? needsHelpChange(inputs, helpCount) : undefined,
          details: help[0] ? lines(td("helpTop", { title: shortNameOf(help[0].stay) }), td("helpTopLine", { days: help[0].daysToStart, missing: help[0].missing }), help[1] ? td("helpNext", { title: shortNameOf(help[1].stay) }) : null) : lines(td("helpNone")),
          href: "/admin/aufgaben?tab=houses",
        },
        // Market Cap instead of the next milestone: the estimate (median of three methods), its change against a month ago, the span and the
        // growth per month; Planen's colour in the title; a click opens Market Cap.
        {
          key: "marketCap",
          group: "plan",
          label: t("tiles.marketCap"),
          info: t("tiles.info.marketCap"),
          // In thousands ("228 Tsd. €"), so the number stays whole beside its change.
          value: td("thousandEurValue", { value: num(Math.round(mc.estimate / 1000)) }),
          change: mc.change,
          details: lines(
            td("mcSpanK", { low: num(Math.round(mc.span.low / 1000)), high: num(Math.round(mc.span.high / 1000)) }),
            mc.drivers.growth === null ? null : td("mcGrowth", { value: `${dec(mc.drivers.growth)} %` }),
            td("mcMean", { value: short(mc.mean) }),
            next ? td("milestoneShort", { name: milestoneName(next), days: String(next.days) }) : null,
          ),
          href: "/admin/market-cap",
        },
        { key: "launch", group: "plan", label: t("tiles.launch"), info: t("tiles.info.launch"), value: toLaunch >= 0 ? t("tiles.inDays", { days: toLaunch }) : t("tiles.launched"), small: true, details: lines(td("launchOn", { date: dayLabel(LAUNCH.date) }), td("marketingOn", { date: dayLabel(MARKETING_START.date) }), td("criteriaMet", { met: num([launch.houses, launch.hubs, launch.reservedShare, launch.waitlist].filter((x) => x.value >= x.target).length), total: num(4) })), href: "/admin/marketing" },
        {
          key: "pipeline",
          group: "plan",
          label: t("tiles.pipeline"),
          info: t("tiles.info.pipeline"),
          value: (
            <>
              {num(contacts.length)} <span className="text-muted">→</span> {num(contacts.filter((x) => x.status === "house").length)}
            </>
          ),
          details: lines(td("partnersActive", { active: num(partnersActive), all: num(partners.length) }), td("pipelineSplit", { replied: num(contacts.filter((x) => x.status === "replied").length), demo: num(contacts.filter((x) => x.status === "demo").length) }), contacts.length ? td("pipelineRate", { rate: share(contacts.filter((x) => x.status === "house").length, contacts.length) }) : null),
          href: "/admin/marketing?tab=pipeline",
        },
      ],
    },
    // R2 – Zahlen: money in the chosen period.
    {
      key: "money",
      group: "numbers",
      tiles: [
        {
          key: "revenue",
          label: tm("terms.revenue.label"),
          info: info(tm("terms.revenue.info")),
          value: eur(m.now.revenue),
          change: m.changes.revenue,
          details: lines(split(m.now.serviceFees, m.now.hostFeeShare), isToday ? td("todayPerDay", { today: eur(todayMoney.revenue), perDay: eur(Math.round(perDay(m.now.revenue))) }) : null, forecast(m.now.revenue) !== null ? td("forecast", { value: short(forecast(m.now.revenue)!) }) : null),
          href: "/admin/money",
        },
        {
          key: "profit",
          label: tm("terms.profit.label"),
          info: info(tm("terms.profit.info")),
          value: eur(profit.current),
          change: profit.change,
          details: lines(td("profitCosts", { costs: short(m.now.costs) }), td("profitMargin", { margin: share(m.now.profit, m.now.revenue) }), forecast(m.now.profit) !== null ? td("forecast", { value: short(forecast(m.now.profit)!) }) : null),
          href: "/admin/money?tab=costs",
        },
        {
          key: "bookingVolume",
          label: tm("terms.bookingVolume.label"),
          info: info(tm("terms.bookingVolume.info")),
          value: eur(m.now.bookingVolume),
          change: m.changes.bookingVolume,
          details: lines(td("volumeAvg", { avg: money(m.now.bookingPerGuest) }), isToday ? td("todayValue", { value: short(todayMoney.bookingVolume) }) : null, forecast(m.now.bookingVolume) !== null ? td("forecast", { value: short(forecast(m.now.bookingVolume)!) }) : null, td("volumeRefunds", { refunds: short(m.now.refunds) })),
          href: "/admin/money?tab=guests",
        },
        {
          key: "perBooking",
          label: tm("terms.perBooking.label"),
          info: info(tm("terms.perBooking.info")),
          value: m.now.perGuest === null ? "–" : eur(m.now.perGuest),
          details: lines(m.now.perHost === null ? null : t("tiles.host", { value: eur(m.now.perHost) }), td("perBookingFeesShort", { fees: short(m.now.serviceFees) }), m.valuePerGuestYear === null ? null : td("guestYear", { value: eur(m.valuePerGuestYear) }), td("perBookingCountShort", { count: num(m.now.guests) })),
          change: m.changes.perGuest,
          target: { text: t("target", { target: eur(OVERVIEW_GOALS.perBookingGuest) }), status: statusAgainst(m.now.perGuest, OVERVIEW_GOALS.perBookingGuest) },
          href: "/admin/money?tab=guests",
        },
        { key: "bookings", label: t("tiles.bookings"), info: info(t("tiles.info.bookings")), value: num(m.now.guests), change: getChange("paidBookings", m.now.guests, m.prev.guests), details: lines(td("bookingsFull", { full: num(m.now.full) }), isToday ? td("todayCount", { count: num(Math.round(todayMoney.guests)) }) : null, strongest ? td("strongestDay", { day: dayLabel(strongest.date), count: num(Math.round(strongest.guests)) }) : null, td("bookingsPro", { pro: num(m.now.proHosts) })), href: "/admin/money?tab=guests" },
      ],
    },
    // R3 – Zahlen: growth in the chosen period.
    {
      key: "growth",
      group: "numbers",
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
              {isToday ? td("liveToday", { live: live === null ? td("none") : num(live), today: num(visitorsToday) }) : td("visitorsLiveShort", { live: live === null ? td("none") : num(live) })}
            </span>,
            byVisits.length > 0 ? td("topChannel", { name: channelLabel(byVisits[0].key) }) : null,
            td("requestRate", { rate: share(funnel.requests.value, funnel.visitors.value) }),
          ),
          href: "/admin/growth",
        },
        { key: "requests", label: t("tiles.requests"), info: info(t("tiles.info.requests")), value: num(funnel.requests.value), change: funnel.requests.change, details: lines(t("tiles.requestRate", { rate: share(funnel.requests.value, funnel.visitors.value) }), td("requestsPaidShort", { paid: num(funnel.paid.value), rate: share(funnel.paid.value, funnel.requests.value) }), isToday ? td("todayCount", { count: num(requestsToday) }) : null), href: "/admin/growth" },
        {
          key: "bestChannel",
          label: t("tiles.bestChannel"),
          info: info(t("tiles.info.bestChannel")),
          // Without a booking in the stretch: the channel with the most visitors and "noch keine Buchung" – never "–".
          value: bestName ?? (byVisits[0] ? channelLabel(byVisits[0].key) : t("tiles.none")),
          small: true,
          details: best
            ? lines(td("channelLine", { paid: best.paid, revenue: eur(best.revenue) }), td("channelVisits", { visits: num(best.visits) }), secondBest ? td("channelNext", { name: channelLabel(secondBest.key), paid: num(secondBest.paid) }) : null)
            : byVisits[0]
              ? lines(td("noBooking"), td("mostVisitors", { visits: num(byVisits[0].visits) }))
              : undefined,
          href: "/admin/growth?tab=origin",
        },
        { key: "webApp", label: t("tiles.webApp"), info: info(t("tiles.info.webApp")), value: pct0(webApp.value), change: webApp.change, details: lines(td("webAppSplit", { ios: pct0(installs.ios.value), android: pct0(installs.android.value) }), installs.ios.booked !== null || installs.android.booked !== null ? td("webAppOf", { count: num((installs.ios.booked ?? 0) + (installs.android.booked ?? 0)) }) : null, td("webAppMonth")), href: "/admin/growth?tab=usage" },
        { key: "waitlist", label: t("tiles.waitlist"), info: t("tiles.info.waitlist"), value: of(launch.waitlist.value, launch.waitlist.target), details: lines(td("waitlistLeft", { left: num(Math.max(0, launch.waitlist.target - launch.waitlist.value)) }), td("waitlistSplit", { pending: num(wl.pending), unsubscribed: num(wl.unsubscribed) }), td("waitlistHost", { count: num(wl.wantsToHost) })), href: "/admin/growth?tab=waitlist" },
      ],
    },
    // R4 – Plattform.
    {
      key: "platform",
      group: "platform",
      tiles: [
        { key: "openHouses", label: t("growthRow.openHouses"), info: info(t("growthRow.info.openHouses")), value: num(open.value), change: open.change, details: lines(td("openHelp", { count: num(helpCount) }), td("startsSoon", { count: num(startsSoon) }), avgFill === null ? null : td("openFill", { fill: pct(avgFill) })), href: "/admin/houses" },
        { key: "fullHouses", label: t("metric.fullHouses"), info: info(t("info.fullHouses")), value: valueText(full.value, full.format), change: full.change, target: { text: t("target", { target: valueText(full.target, full.format) }), status: full.status }, details: lines(fastest ? td("fullFastest", { days: fastest.days }) : null, reserved ? td("fullReserved", { share: valueText(reserved.value, reserved.format) }) : null, forecast(full.value ?? 0) !== null && full.value ? td("forecastCount", { value: num(forecast(full.value)!) }) : null), href: "/admin/houses" },
        { key: "nights", group: "numbers", label: t("northStar"), info: info(t("info.northStar")), value: num(nights.current), change: nights.change, details: lines(full.value ? td("nightsPer", { per: num(Math.round(nights.current / full.value)) }) : null, td("perDayValue", { value: num(Math.round(perDay(nights.current))) }), forecast(nights.current) !== null ? td("forecastCount", { value: num(forecast(nights.current)!) }) : null), href: "/admin/topics" },
        { key: "connection", group: "plan", label: t("metric.connectionRate"), info: info(t("info.connectionRate")), value: connection.value === null ? "–" : pct(connection.value), change: connection.change, target: { text: t("target", { target: pct(OVERVIEW_TARGETS.connectionRate) }), status: getStatus("connectionRate", connection.value) }, details: lines(network.allPairs ? td("connectionPairsShort", { mutual: num(network.mutualPairs), all: num(network.allPairs) }) : null, bestHub ? td("bestHub", { hub: bestHub.key }) : null, vsTarget(connection.value, OVERVIEW_TARGETS.connectionRate)), href: "/admin/data" },
        { key: "repeat", group: "numbers", label: t("metric.repeatRate"), info: info(t("info.repeatRate")), value: valueText(repeat.value, repeat.format), change: repeat.change, target: { text: t("target", { target: valueText(repeat.target, repeat.format) }), status: repeat.status }, details: lines(network.guests ? td("repeatGuests", { repeat: num(network.repeatGuests), guests: num(network.guests) }) : null, td("payingGuests", { count: num(Math.round(m.now.guests)) }), vsTarget(repeat.value, repeat.target ?? 0)), href: "/admin/topics" },
      ],
    },
  ];

  // "Acht Karten" (CLAUDE.md): one card per page, each leading to that page's overview – nothing twice, no topics of its own.
  const ts = useTranslations("admin.topicCards.sub");
  const fmt = useFormat();
  const spot = sweetSpot(inputs, "12m", "value");
  const hostList = hostOverview(inputs);
  const month = inputs.today.slice(0, 7);
  const ready = fundingReadiness(inputs);
  const crit = launchProgress(inputs);
  const critMet = [crit.houses, crit.hubs, crit.reservedShare, crit.waitlist].filter((p) => p.value >= p.target).length;
  const nextMs = nextMilestone(inputs.today, inputs.admin);
  const msName = useMilestoneName();
  const funnelM = marketingFunnel(inputs.admin.marketingContacts ?? [], inputs.today);
  const fullNow = inputs.stays.filter((x) => !x.isExample && x.spotsTotal > 0 && x.spotsFilled >= x.spotsTotal && x.endDate >= inputs.today && x.status !== "closed").length;
  // The numbers (CLAUDE.md "Karten-Inhalte als Konfiguration"): which of them a card shows is config/admin/cards/overview.ts.
  const tiles = allRows.flatMap((r) => r.tiles);
  const pool = numberPool(tiles, {
    sweetSpot: spot ? { label: ts("sweetSpot"), value: fmt.vibe(spot.topic) } : null,
    fullNow: { label: ts("fullNow"), value: num(fullNow) },
    activeHosts: { label: ts("activeHosts"), info: ts("hostsInfo"), value: num(hostList.filter((r) => hostActivity(r, inputs.today) === "active").length) },
    newHosts: { label: ts("newMonth"), value: num(hostList.filter((r) => r.houses.map((h) => h.createdAt).toSorted()[0]?.startsWith(month)).length) },
    applicationsOpen: { label: ts("applicationsOpen"), value: num(inputs.admin.applications.filter((a) => a.status === "new" || a.status === "maybe").length) },
    replyRate: { label: ts("replyRate"), value: funnelM.all.replyRate === null ? "–" : pct(Math.round(funnelM.all.replyRate * 100)) },
    readiness: { label: ts("readiness"), value: `${num(ready.met)} / ${num(ready.total)}` },
    criteria: { label: ts("criteria"), value: `${num(critMet)} / 4` },
    nextMilestone: nextMs ? { label: ts("nextMilestone"), value: msName(nextMs) } : null,
  });

  return (
    // Eight cards, one per page; the period a menu right like on every page.
    <AdminShell title={t("title")} tabs={<TopicHeader page="overview" title={t("title")} />} period>
      <TopicCards page="overview" pool={pool} />
    </AdminShell>
  );
}

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
