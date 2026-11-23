"use client";

// Admin › Wachstum (/admin/growth, CLAUDE.md "Admin-Pyramide"): tabs Überblick · Herkunft · Houses · Nutzung, the admin's one period top right
// (not on Nutzung – its numbers are monthly). Our own counting – no Google Analytics.
//   Überblick – only tiles (CLAUDE.md "Überblick zuerst", TileBoard, group Zahlen): the funnel's numbers, the best ways, the Houses, the
//               usage and the waitlist, each opening its tab.
//   Herkunft  – three cards side by side: Deine Posts · Weiterempfohlen (with the top 3 referrers) · Gefunden (config/marketing.ts
//               ORIGIN_GROUPS); each row name · visitors → bookings · revenue, by bookings; a click shows the details (requests, rates, costs,
//               Wert ÷ Kosten). "Link erstellen": channel + target → a link with ?src=, to copy.
//   Houses    – the Houses by the requests they miss ("angesehen, aber nicht angefragt"), a click opens Admin › Houses.
//   Nutzung   – app installs and asking the host, each a number with one sentence.
//   Warteliste – the waitlist page as a tab (AdminNested: its own tabs and filters in the second row).
// Every number from lib/admin/metrics.ts (later from the pre-computed statistics, see there).
import { Link2, MessageCircle, MousePointerClick, Search, Globe, type LucideIcon, MessageSquare, Share, Ticket, QrCode, ImageIcon, Megaphone, UserPlus, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { findUser, useStore } from "@/lib/store";
import { profileHref } from "@/lib/privacy";
import { housePhotos, cn } from "@/lib/utils";
import { SOCIAL_ICONS } from "@/components/ui/socialIcons";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { LINK_CHANNELS, ORIGIN_GROUPS, type OriginGroup } from "@/config/marketing";
import { AdminNested, AdminShell } from "./AdminShell";
import { AdminWaitlist } from "./AdminDashboard";
import type { LegalChecklist } from "@/lib/legal/status";
import { AdminTabs } from "./AdminLayout";
import { AdminButton, AdminDialogFooter } from "./AdminButton";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";
import { routeTiles, withUnits } from "./tileRoutes";
import { useAdminTab } from "@/lib/admin/urlState";
import { InfoTip, MetricCard } from "./AdminNumbers";
import { askingHostMetrics, waitlistMetrics, getChange, growthCosts, growthFunnel, growthRows, installRates, launchProgress, lookedNotAsked, missedRequests, originGroupOf, valueToCost, type GrowthRow, rangesFor, bookingTotals, alignRows, growthSignups, periodRanges } from "@/lib/admin/metrics";
import { useAdminFocus, useAdminPeriod } from "@/lib/admin/period";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { dec, eur, num, pct } from "@/lib/i18n/adminFormat";
import { shortNameOf } from "@/lib/shortName";
import { useLiveVisitors } from "./AdminCockpit";

const DIRECT = "\u0000direct";
const NO_REF = "\u0000none";
/** Houses rows shown before "Alle zeigen" – the page fits 1440 × 900 without scrolling. */
const HOUSES_TOP = 14;
/** Referrers under "Weiterempfohlen". */
const TOP_REFS = 3;

type GrowthTab = "overview" | "origin" | "houses" | "usage" | "waitlist";
const TABS: readonly GrowthTab[] = ["overview", "origin", "houses", "usage", "waitlist"];

/** A channel's icon: the platforms' own marks (monochrome), else a line icon. */
const CHANNEL_ICONS: Record<string, ComponentType<{ className?: string }> | LucideIcon> = {
  instagram: SOCIAL_ICONS.instagram.icon,
  tiktok: SOCIAL_ICONS.tiktok.icon,
  youtube: SOCIAL_ICONS.youtube.icon,
  twitch: SOCIAL_ICONS.twitch.icon,
  whatsapp: MessageCircle,
  copy: Link2,
  messages: MessageSquare,
  story: ImageIcon,
  native: Share,
  invite: Ticket,
  qr: QrCode,
  hostkit: Megaphone,
  hostref: UserPlus,
  newsletter: Mail,
  google: Search,
  [DIRECT]: MousePointerClick,
};

const rateText = (part: number, all: number) => (all > 0 ? pct(Math.round((part / all) * 100)) : "–");

/** The channel's German name ("Direkt", "Link kopiert" …); an unknown source as it is. */
function useChannelName() {
  const t = useTranslations("admin.growthArea");
  return (key: string) =>
    key === DIRECT || key === ""
      ? t("channel.direct")
      : t.has(`channel.${key}` as Parameters<typeof t>[0])
        ? t(`channel.${key}` as Parameters<typeof t>[0])
        : t.has(`origin.link.channels.${key}` as Parameters<typeof t>[0])
          ? t(`origin.link.channels.${key}` as Parameters<typeof t>[0])
          : key;
}

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = CHANNEL_ICONS[channel] ?? Globe;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink/80">
      <Icon className="size-4" />
    </span>
  );
}

export function AdminGrowth({ legal }: { legal?: LegalChecklist }) {
  const t = useTranslations("admin.growthArea");
  const tAdmin = useTranslations("admin");
  // The capsule in ?tab= (pushed – back works; a tile adds ?focus=, config/admin-tiles.ts).
  const { tab, open } = useAdminTab<GrowthTab>(TABS, "overview");
  const setTab = (next: GrowthTab) => open(next);

  const tabs = <AdminTabs label={t("tabsLabel")} value={tab} onChange={setTab} tabs={withUnits("growth", TABS.map((key) => ({ value: key, label: t(`tab.${key}`), tooltip: key === "origin" ? t("channelsInfo") : undefined })))} />;
  // Warteliste: the whole page as a tab (its own tabs and filters in the second row).
  if (tab === "waitlist")
    return (
      <AdminNested tabs={tabs}>
        <AdminWaitlist legal={legal} />
      </AdminNested>
    );
  return (
    <AdminShell
      title={tAdmin("growthTitle")}
      tabs={tabs}
      aside={tab === "origin" ? <CreateLink /> : undefined}
      period={tab !== "usage"}
    >
      {tab === "overview" ? <Overview onOpen={setTab} /> : tab === "origin" ? <Origin /> : tab === "houses" ? <Houses /> : <Usage />}
    </AdminShell>
  );
}

/** The period's rows by channel ("" → DIRECT), referrer and House – one place for all tabs. */
function useGrowthData() {
  const { events } = useStore();
  const inputs = useAdminInputs();
  const { today, admin } = inputs;
  const [period] = useAdminPeriod();
  // "Woche" with a day chosen: that day against the same weekday a week before.
  const focus = useAdminFocus(today);
  const focusDay = focus?.from ?? null;
  return useMemo(() => {
    const within = focusDay ? rangesFor("day", focusDay, focusDay, today) : undefined;
    const ranges = within ?? periodRanges(today, period);
    // ONE source (CLAUDE.md "Admin: eine Datenquelle"): bookings and revenue from the day rows – the same as Geld and Übersicht; the events
    // split them by channel (exact), referrer and House.
    const source = bookingTotals(inputs, ranges);
    const totals = { paid: source.paid.now, revenue: source.revenue.now };
    const share = (rows: GrowthRow[]) => {
      const all = growthRows(events, (e) => e.utmSource ?? DIRECT, period, today, within);
      const eventPaid = all.reduce((n, r) => n + r.paid, 0);
      const factor = eventPaid > 0 ? totals.paid / eventPaid : 0;
      const eventRevenue = all.reduce((n, r) => n + r.revenue, 0);
      const rFactor = eventRevenue > 0 ? totals.revenue / eventRevenue : 0;
      return rows.map((r) => ({ ...r, paid: Math.round(r.paid * factor), revenue: r.revenue * rFactor }));
    };
    const byChannel = alignRows(growthRows(events, (e) => e.utmSource ?? DIRECT, period, today, within), totals, true, DIRECT);
    const byRef = share(growthRows(events, (e) => e.refUserId ?? NO_REF, period, today, within).filter((r) => r.key !== NO_REF));
    const byHouse = share(growthRows(events, (e) => e.houseId, period, today, within));
    const funnel = growthFunnel(events, period, today, within, source);
    const signups = growthSignups(events, period, today, within);
    const costs = growthCosts(admin.costEntries ?? [], period, today);
    return { byChannel, byRef, byHouse, funnel, signups, costs, period, source, ranges };
  }, [events, period, today, admin.costEntries, focusDay, inputs]);
}

// ── Überblick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Wachstum › Überblick: only tiles (group Zahlen), each leading to its tab – Besucher · Anfragen · Buchungen · Wert ÷ Kosten (the funnel and
 * the money) · Bester Kanal · Top-Empfehler · Marketing-Kosten · Über eigene Posts · Weiterempfohlen · Gefunden (Herkunft) · Kaum angefragt · Meistgesehenes House
 * (Houses) · App installiert · Fragen → Anfrage · Anfragen mit Notiz (Nutzung) · Warteliste.
 */
function Overview({ onOpen }: { onOpen: (tab: GrowthTab) => void }) {
  const t = useTranslations("admin.growthArea");
  const tt = useTranslations("admin.pageTiles.growth");
  const tc = useTranslations("admin.cockpit");
  const store = useStore();
  const inputs = useAdminInputs();
  const channelName = useChannelName();
  const { byChannel, byRef, byHouse, funnel, signups, costs, period, source, ranges } = useGrowthData();
  const against = tc(`compare.info.${period}`);
  const rate = (part: number, all: number) => (all > 0 ? pct(Math.round((part / all) * 100)) : tt("none"));
  const best = byChannel.find((r) => r.paid > 0);
  const topRef = byRef.find((r) => r.paid > 0);
  const paidAll = byChannel.reduce((n, r) => n + r.paid, 0);
  const paidIn = (group: "posts" | "shared" | "found") => byChannel.filter((r) => originGroupOf(r.key === DIRECT ? "" : r.key) === group).reduce((n, r) => n + r.paid, 0);
  const cold = lookedNotAsked(byHouse).houses;
  const topHouse = byHouse.toSorted((a, b) => b.visits - a.visits)[0];
  const topStay = topHouse ? store.stays.find((s) => s.id === topHouse.key) : undefined;
  const ratio = valueToCost(funnel.revenue.now, costs.now.total);
  const ratioBefore = valueToCost(funnel.revenue.before, costs.before.total);
  const installs = installRates(inputs);
  const asking = askingHostMetrics(inputs);
  const waitlist = launchProgress(inputs).waitlist;
  const p0 = (v: number | null) => (v === null ? tt("none") : pct(Math.round(v)));
  type Key = "visitors" | "requests" | "paid" | "valueToCost" | "bestChannel" | "topRef" | "costs" | "origin" | "costPerBooking" | "signups" | "lookedNotAsked" | "topHouse" | "installs" | "askToRequest" | "askNote" | "waitlist";
  const tile = (key: Key, value: TileSpec["value"], tab: GrowthTab, extra: Partial<TileSpec> = {}, periodic = true): TileSpec => ({ key, label: tt(`${key}.label`), info: periodic ? `${tt(`${key}.info`)} ${against}` : tt(`${key}.info`), value, onOpen: () => onOpen(tab), ...extra });
  // The detail lines, most important first – the tile shows as many as fit (measured, CLAUDE.md "fester Kachel-Bauplan").
  const lines = (...all: (string | null)[]) => ({ details: all.filter((l): l is string => l !== null) });
  const byRequests = byChannel.filter((r) => r.requests > 0).toSorted((a, b) => b.requests - a.requests);
  const visitsIn = (group: "posts" | "shared" | "found") => byChannel.filter((r) => originGroupOf(r.key === DIRECT ? "" : r.key) === group).reduce((n, r) => n + r.visits, 0);
  const refName = (key: string) => findUser(store, key)?.name ?? key;
  const viewedHouses = byHouse.filter((r) => r.visits > 0).length;
  const live = useLiveVisitors();
  const byVisits = byChannel.filter((r) => r.visits > 0).toSorted((a, b) => b.visits - a.visits);
  const byPaid = byChannel.filter((r) => r.paid > 0);
  const runnerUp = byPaid[1];
  const topIn = (group: "posts" | "shared" | "found") => byPaid.find((r) => originGroupOf(r.key === DIRECT ? "" : r.key) === group);
  const costRows = [...costs.now.byChannel].filter(([, amount]) => amount > 0).toSorted((a, b) => b[1] - a[1]);
  // Kosten pro Buchung: marketing costs ÷ bookings (the one source), now and before; the priciest channel per booking.
  const days = Math.max(1, Math.round((Date.parse(`${ranges.current.to}T00:00:00Z`) - Date.parse(`${ranges.current.from}T00:00:00Z`)) / 86_400_000) + 1);
  const perBooking = source.paid.now > 0 && costs.now.total > 0 ? costs.now.total / source.paid.now : null;
  const perBookingBefore = source.paid.prev > 0 && costs.before.total > 0 ? costs.before.total / source.paid.prev : null;
  const priciest = costRows
    .map(([key, amount]) => ({ key, per: (byChannel.find((r) => r.key === (key === "" ? DIRECT : key))?.paid ?? 0) > 0 ? amount / byChannel.find((r) => r.key === (key === "" ? DIRECT : key))!.paid : null }))
    .filter((x): x is { key: string; per: number } => x.per !== null)
    .toSorted((a, b) => b.per - a.per)[0];
  const coldStay = cold[0] ? store.stays.find((s) => s.id === cold[0].key) : undefined;
  const wl = waitlistMetrics(inputs);
  const booked = (installs.ios.booked ?? 0) + (installs.android.booked ?? 0);

  const tiles: TileSpec[] = [
    tile("visitors", num(funnel.visitors.value), "origin", {
      change: funnel.visitors.change,
      ...lines(live === null ? null : tt("detail.live", { live: num(live) }), byVisits[0] ? tt("detail.top", { first: channelName(byVisits[0].key), second: byVisits[1] ? channelName(byVisits[1].key) : tt("none") }) : null, tt("detail.toRequests", { count: num(funnel.requests.value), rate: rate(funnel.requests.value, funnel.visitors.value) })),
    }),
    tile("requests", num(funnel.requests.value), "origin", {
      change: funnel.requests.change,
      ...lines(tt("requestRate", { rate: rate(funnel.requests.value, funnel.visitors.value) }), tt("detail.paidOf", { paid: num(funnel.paid.value), rate: rate(funnel.paid.value, funnel.requests.value) }), byRequests[0] ? tt("detail.topChannel", { name: channelName(byRequests[0].key), count: num(byRequests[0].requests) }) : null),
    }),
    tile("paid", num(funnel.paid.value), "origin", {
      change: funnel.paid.change,
      ...lines(tt("paidRate", { rate: rate(funnel.paid.value, funnel.requests.value) }), tt("detail.revenue", { revenue: eur(Math.round(funnel.revenue.now)), per: funnel.paid.value > 0 ? eur(Math.round(funnel.revenue.now / funnel.paid.value)) : tt("none") }), best ? tt("detail.topChannel", { name: channelName(best.key), count: num(best.paid) }) : null),
    }),
    tile("valueToCost", ratio === null ? "–" : `${dec(ratio)} ×`, "origin", {
      change: getChange("valueToCost", ratio, ratioBefore),
      ...lines(
        ratio === null ? tt(costs.now.total > 0 ? "detail.noRevenue" : "detail.noCosts") : null,tt("detail.moneySplit", { revenue: eur(Math.round(funnel.revenue.now)), costs: eur(Math.round(costs.now.total)) }), funnel.paid.value > 0 && costs.now.total > 0 ? tt("detail.costPer", { per: eur(Math.round(costs.now.total / funnel.paid.value)) }) : null, ratioBefore === null ? null : tt("detail.before", { value: `${dec(ratioBefore)} ×` })),
    }),
    // Without a booking: the channel with the most visitors and "noch keine Buchung" – never a bare "–".
    tile("bestChannel", best ? channelName(best.key) : byVisits[0] ? channelName(byVisits[0].key) : "–", "origin", {
      small: true,
      ...(best
        ? lines(tt("bestLine", { count: best.paid, revenue: eur(Math.round(best.revenue)) }), tt("detail.channelVisits", { visits: num(best.visits), rate: rate(best.requests, best.visits) }), runnerUp ? tt("detail.next", { name: channelName(runnerUp.key), count: num(runnerUp.paid) }) : null)
        : lines(tt(byVisits[0] ? "detail.noBookingMostVisits" : "detail.noVisits"))),
    }),
    tile("topRef", topRef ? (findUser(store, topRef.key)?.name ?? topRef.key) : "–", "origin", {
      small: true,
      ...(!topRef ? lines(tt("detail.noRefBooking")) : {}),
      ...(topRef ? lines(tt("refLine", { count: topRef.paid }), tt("detail.refVisits", { visits: num(topRef.visits), revenue: eur(Math.round(topRef.revenue)) }), byRef.filter((r) => r.paid > 0)[1] ? tt("detail.next", { name: refName(byRef.filter((r) => r.paid > 0)[1].key), count: num(byRef.filter((r) => r.paid > 0)[1].paid) }) : null, tt("detail.refRequests", { count: topRef.requests })) : {}),
    }),
    tile("costs", eur(Math.round(costs.now.total)), "origin", {
      ...lines(costRows[0] ? tt("detail.costTop", { name: channelName(costRows[0][0] === "" ? DIRECT : costRows[0][0]), amount: eur(Math.round(costRows[0][1])) }) : null, funnel.paid.value > 0 && costs.now.total > 0 ? tt("detail.costPer", { per: eur(Math.round(costs.now.total / funnel.paid.value)) }) : null, tt("detail.before", { value: eur(Math.round(costs.before.total)) })),
    }),
    // Herkunft: the three origin groups in one tile – bookings in all, then "Posts x · Empfohlen y · Gefunden z".
    tile("origin", num(paidAll), "origin", {
      ...lines(
        tt("detail.originSplit", { posts: num(paidIn("posts")), shared: num(paidIn("shared")), found: num(paidIn("found")) }),
        tt("detail.originShares", { posts: rate(paidIn("posts"), paidAll), shared: rate(paidIn("shared"), paidAll), found: rate(paidIn("found"), paidAll) }),
        tt("detail.originVisits", { posts: num(visitsIn("posts")), shared: num(visitsIn("shared")), found: num(visitsIn("found")) }),
        topIn("shared") ? tt("detail.originTopShared", { name: channelName(topIn("shared")!.key) }) : null,
      ),
    }),
    tile("costPerBooking", perBooking === null ? "–" : eur(Math.round(perBooking)), "origin", {
      change: getChange("costPerBooking", perBooking === null ? null : Math.round(perBooking), perBookingBefore === null ? null : Math.round(perBookingBefore)),
      ...lines(
        perBooking === null ? tt(costs.now.total > 0 ? "detail.noBookingYet" : "detail.noCosts") : null,
        perBookingBefore === null ? null : tt("detail.before", { value: eur(Math.round(perBookingBefore)) }),
        priciest ? tt("detail.priciest", { name: channelName(priciest.key === "" ? DIRECT : priciest.key), per: eur(Math.round(priciest.per)) }) : null,
        tt("detail.moneySplit", { revenue: eur(Math.round(funnel.revenue.now)), costs: eur(Math.round(costs.now.total)) }),
      ),
    }),
    tile("signups", num(signups.value), "origin", {
      change: signups.change,
      ...lines(
        tt("detail.signupRate", { rate: rate(signups.value, funnel.visitors.value) }),
        tt("detail.signupAsked", { count: num(signups.withRequest), rate: rate(signups.withRequest, signups.value) }),
        tt("detail.signupPerDay", { value: dec(Math.round((signups.value / Math.max(1, days)) * 10) / 10) }),
      ),
    }),
    tile("lookedNotAsked", num(cold.length), "houses", {
      ...lines(coldStay ? tt("detail.coldTop", { title: shortNameOf(coldStay) }) : null, tt("detail.coldRate", { rate: pct(Math.round(lookedNotAsked(byHouse).rate * 100)) }), tt("detail.viewedHouses", { count: viewedHouses }), tt("detail.totalViews", { count: num(byHouse.reduce((n, r) => n + r.visits, 0)) })),
    }),
    tile("topHouse", topStay?.title ?? tt("none"), "houses", {
      small: true,
      ...(topHouse ? lines(tt("viewsLine", { views: num(topHouse.visits), requests: num(topHouse.requests) }), tt("detail.houseRate", { rate: rate(topHouse.requests, topHouse.visits), paid: topHouse.paid }), topHouse.revenue > 0 ? tt("detail.houseRevenue", { revenue: eur(Math.round(topHouse.revenue)) }) : null, tt("detail.viewedHouses", { count: viewedHouses })) : {}),
    }),
    tile("installs", p0(installs.all.value), "usage", { change: installs.all.change, ...lines(tt("installsLine", { ios: p0(installs.ios.value), android: p0(installs.android.value) }), booked > 0 ? tt("detail.installsOf", { count: num(booked) }) : null, tt("detail.lastMonth")) }, false),
    tile("askToRequest", p0(asking.askedToRequest), "usage", { change: asking.change.askToRequest, ...lines(tt("detail.chats", { count: asking.chats }), asking.askedToRequest === null ? null : tt("detail.askedCount", { count: Math.round((asking.chats * asking.askedToRequest) / 100) }), asking.messagesBeforeRequest === null ? null : tt("detail.messagesBefore", { count: dec(asking.messagesBeforeRequest) })) }, false),
    tile("askNote", p0(asking.requestsWithNote), "usage", { change: asking.change.askNote, ...lines(tt("detail.requestsCount", { count: asking.requests }), asking.requestsWithNote === null ? null : tt("detail.noteCount", { count: Math.round((asking.requests * asking.requestsWithNote) / 100) }), tt("detail.lastMonth")) }, false),
    tile(
      "waitlist",
      <>
        {num(waitlist.value)} <span className="text-body text-muted">/ {num(waitlist.target)}</span>
      </>,
      "waitlist",
      lines(tt("detail.waitSplit", { pending: num(wl.pending), unsubscribed: num(wl.unsubscribed) }), tt("detail.waitHost", { hosts: num(wl.wantsToHost), week: num(wl.lastWeek) }), waitlist.target > waitlist.value ? tt("detail.waitMissing", { count: num(waitlist.target - waitlist.value) }) : null),
      false,
    ),
  ];
  // Four columns × four rows: wide enough for the numbers beside their change.
  return <TileBoard label={t("tab.overview")} columns={4} rows={chunkRows(routeTiles("growth", tiles), "numbers", 4)} />;
}

// ── Herkunft ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the detail window shows: a channel or a referrer. */
type Picked = { kind: "channel" | "ref"; key: string } | null;

export function Origin() {
  const t = useTranslations("admin.growthArea.origin");
  const store = useStore();
  const channelName = useChannelName();
  const { byChannel, byRef, costs } = useGrowthData();
  const [picked, setPicked] = useState<Picked>(null);
  const groups = (Object.keys(ORIGIN_GROUPS) as OriginGroup[]).map((group) => ({ group, rows: byChannel.filter((r) => originGroupOf(r.key === DIRECT ? "" : r.key) === group && r.visits > 0) }));
  const refs = byRef.filter((r) => r.visits > 0).slice(0, TOP_REFS);
  const costOf = (key: string) => costs.now.byChannel.get(key === DIRECT ? "" : key) ?? 0;
  const pickedRow = picked ? (picked.kind === "channel" ? byChannel : byRef).find((r) => r.key === picked.key) : undefined;
  const pickedName = picked ? (picked.kind === "channel" ? channelName(picked.key) : (findUser(store, picked.key)?.name ?? picked.key)) : "";

  const row = (r: GrowthRow, kind: "channel" | "ref") => {
    const user = kind === "ref" ? findUser(store, r.key) : undefined;
    const name = kind === "channel" ? channelName(r.key) : (user?.name ?? r.key);
    return (
      <li key={`${kind}-${r.key}`}>
        <button
          type="button"
          onClick={() => setPicked({ kind, key: r.key })}
          aria-label={t("open", { name })}
          className="grid h-10 w-full grid-cols-[minmax(0,1fr)_auto_5.5rem] items-center gap-4 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-(--adm-block-hover)"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {kind === "channel" ? <ChannelIcon channel={r.key} /> : user?.photos[0] ? <Img src={user.photos[0]} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-full object-cover" /> : <span className="size-8 shrink-0 rounded-full bg-ink/6" />}
            <span className="truncate text-body font-semibold text-ink">{name}</span>
          </span>
          <span className="text-small tabular-nums text-muted">
            {num(r.visits)} → <span className="text-body font-semibold text-ink">{num(r.paid)}</span>
          </span>
          <span className="text-right text-small tabular-nums text-ink">{eur(Math.round(r.revenue))}</span>
        </button>
      </li>
    );
  };

  const head = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_5.5rem] gap-4 px-2 pb-1 text-eyebrow uppercase text-(--adm-label)">
      <span />
      <span className="inline-flex items-center gap-1">
        {t("cols.flow")}
        <InfoTip text={t("colInfo.flow")} />
      </span>
      <span className="inline-flex items-center justify-end gap-1">
        {t("cols.revenue")}
        <InfoTip text={t("colInfo.revenue")} />
      </span>
    </div>
  );

  return (
    <>
      <div data-growth-origin className="grid gap-3 lg:grid-cols-3">
        {groups.map(({ group, rows }) => (
          <section key={group} aria-label={t(`groups.${group}`)} className="min-w-0 rounded-xl border border-ink/8 bg-(--adm-block) px-2 pt-3.5 pb-2">
            <h2 className="mb-2 flex items-center gap-1 px-2 text-eyebrow uppercase text-(--adm-label)">
              {t(`groups.${group}`)}
              <InfoTip text={t(`groupInfo.${group}`)} />
            </h2>
            {head}
            {rows.length === 0 ? <p className="px-2 py-2 text-small text-muted">{t("empty")}</p> : <ul className="divide-y divide-ink/6">{rows.map((r) => row(r, "channel"))}</ul>}
            {group === "shared" && refs.length > 0 && (
              <>
                <h3 className="mt-3 mb-1 flex items-center gap-1 px-2 text-eyebrow uppercase text-(--adm-label)">
                  {t("referrers")}
                  <InfoTip text={t("colInfo.referrers")} />
                </h3>
                <ul className="divide-y divide-ink/6">{refs.map((r) => row(r, "ref"))}</ul>
              </>
            )}
          </section>
        ))}
      </div>
      <Sheet open={pickedRow !== undefined} onClose={() => setPicked(null)} title={pickedName}>
        {pickedRow && <OriginDetail row={pickedRow} cost={picked?.kind === "channel" ? costOf(pickedRow.key) : null} />}
      </Sheet>
    </>
  );
}

/** A channel's or referrer's details: visitors · requests (rate) · bookings (rate) · revenue; for channels also costs · Wert ÷ Kosten. */
function OriginDetail({ row, cost }: { row: GrowthRow; cost: number | null }) {
  const t = useTranslations("admin.growthArea.origin.detail");
  const tk = useTranslations("admin.growthArea.kpis");
  const ratio = cost === null ? null : valueToCost(row.revenue, cost);
  const items: { key: string; label: string; value: string; sub?: string; info?: string }[] = [
    { key: "visitors", label: t("visitors"), value: num(row.visits) },
    { key: "requests", label: t("requests"), value: num(row.requests), sub: t("requestRate", { rate: rateText(row.requests, row.visits) }) },
    { key: "paid", label: t("paid"), value: num(row.paid), sub: t("paidRate", { rate: rateText(row.paid, row.requests) }) },
    { key: "revenue", label: t("revenue"), value: eur(Math.round(row.revenue)) },
    ...(cost === null
      ? []
      : [
          { key: "costs", label: t("costs"), value: eur(Math.round(cost)), sub: cost > 0 ? undefined : t("costsNone") },
          { key: "ratio", label: t("valueToCost"), value: ratio === null ? "–" : `${dec(ratio)} ×`, info: tk("info.valueToCost") },
        ]),
  ];
  return (
    <dl data-origin-detail className="grid grid-cols-2 gap-x-6 gap-y-(--adm-inner)">
      {items.map((it) => (
        <div key={it.key} className="min-w-0">
          <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
            {it.label}
            {it.info && <InfoTip text={it.info} />}
          </dt>
          <dd className="mt-1 text-h2 tabular-nums text-ink">{it.value}</dd>
          {it.sub && <dd className="text-small text-muted">{it.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** "Link erstellen": a channel and a target (Startseite, a House, a host's page) → the link with ?src=, to copy. Nothing is stored. */
function CreateLink() {
  const t = useTranslations("admin.growthArea.origin");
  const store = useStore();
  const showToast = useToast();
  const channelName = useChannelName();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<string>(LINK_CHANNELS[0]);
  const [target, setTarget] = useState<"home" | "house" | "host">("home");
  const houses = useMemo(() => store.stays.filter((s) => ["published", "booked"].includes(s.status) && !s.isExample).toSorted((a, b) => a.title.localeCompare(b.title)), [store.stays]);
  const hosts = useMemo(() => [...new Set(houses.map((s) => s.hostId))].map((id) => findUser(store, id)).filter((u) => u !== undefined).toSorted((a, b) => a.name.localeCompare(b.name)), [houses, store]);
  const [houseId, setHouseId] = useState("");
  const [hostId, setHostId] = useState("");
  const house = houses.find((s) => s.id === houseId) ?? houses[0];
  const host = hosts.find((u) => u.id === hostId) ?? hosts[0];
  const path = target === "house" && house ? `/house/${house.slug}` : target === "host" && host ? profileHref(host.id) : "/";
  // The address of this site, read only when the window is open (never in the first render).
  const link = open ? `${window.location.origin}${path}${path.includes("?") ? "&" : "?"}src=${encodeURIComponent(channel)}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // the field stays selectable by hand
    }
    showToast(t("link.copied"));
  };
  return (
    <>
      <AdminButton variant="primary" onClick={() => setOpen(true)}>
        {t("createLink")}
      </AdminButton>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("link.title")}>
        <div data-create-link className="flex flex-col gap-(--adm-inner)">
          <label className="flex flex-col gap-1.5">
            <span className="text-eyebrow uppercase text-(--adm-label)">{t("link.channel")}</span>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {LINK_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {channelName(c)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-eyebrow uppercase text-(--adm-label)">{t("link.target")}</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
              {(["home", "house", "host"] as const).map((k) => (
                <option key={k} value={k}>
                  {t(`link.targets.${k}`)}
                </option>
              ))}
            </Select>
          </label>
          {target === "house" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-eyebrow uppercase text-(--adm-label)">{t("link.house")}</span>
              <Select value={house?.id ?? ""} onChange={(e) => setHouseId(e.target.value)}>
                {houses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {target === "host" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-eyebrow uppercase text-(--adm-label)">{t("link.host")}</span>
              <Select value={host?.id ?? ""} onChange={(e) => setHostId(e.target.value)}>
                {hosts.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-eyebrow uppercase text-(--adm-label)">{t("link.result")}</span>
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <AdminDialogFooter onCancel={() => setOpen(false)}>
            <AdminButton variant="primary" onClick={copy}>
              {t("link.copy")}
            </AdminButton>
          </AdminDialogFooter>
        </div>
      </Sheet>
    </>
  );
}

// ── Houses ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Houses() {
  const t = useTranslations("admin.growthArea");
  const store = useStore();
  const router = useRouter();
  const { byHouse } = useGrowthData();
  const [all, setAll] = useState(false);
  const { rate, houses: cold } = lookedNotAsked(byHouse);
  const flagged = new Set(cold.map((r) => r.key));
  const rows = byHouse.filter((r) => r.visits > 0).toSorted((a, b) => missedRequests(b, rate) - missedRequests(a, rate) || b.visits - a.visits);
  const shown = all ? rows : rows.slice(0, HOUSES_TOP);
  if (rows.length === 0) return <p className="text-body text-muted">{t("none")}</p>;
  const num2 = "w-32 pl-6 text-right";
  const th = (key: "views" | "requests" | "paid") => (
    <th scope="col" className={cn(num2, "font-semibold")}>
      <span className="inline-flex items-center justify-end gap-1">
        {t(`housesTab.cols.${key}`)}
        <InfoTip text={t(`housesTab.colInfo.${key}`)} />
      </span>
    </th>
  );
  return (
    <>
      <table data-growth-houses className="w-full text-body tabular-nums">
        <thead>
          <tr className="whitespace-nowrap border-b border-ink/8 text-left text-eyebrow uppercase text-(--adm-label)">
            <th scope="col" className="py-2 font-semibold">
              <span className="inline-flex items-center gap-1">
                {t("housesTab.cols.house")}
                <InfoTip text={t("housesTab.colInfo.house")} />
              </span>
            </th>
            {th("views")}
            {th("requests")}
            {th("paid")}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/8">
          {shown.map((r) => {
            const stay = store.stays.find((s) => s.id === r.key);
            const photo = stay ? housePhotos(stay, findUser(store, stay.hostId))[0] : undefined;
            const open = () => router.push(`/admin/houses?house=${r.key}`);
            return (
              <tr key={r.key} onClick={open} className="cursor-pointer transition-colors duration-150 hover:bg-(--adm-block-hover)">
                <td className="py-1">
                  <button type="button" onClick={open} aria-label={t("housesTab.open", { title: stay?.title ?? r.key })} className="flex min-w-0 items-center gap-3 text-left">
                    {photo ? <Img src={photo} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-lg object-cover" /> : <span className="size-8 shrink-0 rounded-lg bg-ink/6" />}
                    <span className="truncate font-semibold text-ink">{stay?.title ?? r.key}</span>
                    {flagged.has(r.key) && <span className="shrink-0 text-small text-muted">· {t("housesTab.flag")}</span>}
                  </button>
                </td>
                <td className={cn(num2, "text-ink")}>{num(r.visits)}</td>
                <td className={cn(num2, "text-ink")}>
                  {num(r.requests)} <span className="text-small text-muted">({rateText(r.requests, r.visits)})</span>
                </td>
                <td className={cn(num2, "text-ink")}>{num(r.paid)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > HOUSES_TOP && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 text-small font-semibold text-ink hover:underline">
          {all ? t("showLess") : t("showAll", { count: rows.length })}
        </button>
      )}
    </>
  );
}

// ── Nutzung ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * App installs (guests with a booking, iPhone and Android apart, lib/admin/metrics.ts installRates) and asking the host (askingHostMetrics):
 * each a card with the number, its change against the month before, ⓘ (meaning + a good value) and one sentence what it means. Monthly – the
 * last full month, so no period switch on this tab.
 */
function Usage() {
  const t = useTranslations("admin.growthArea");
  const inputs = useAdminInputs();
  const k = installRates(inputs);
  const a = askingHostMetrics(inputs);
  const card = (key: "installIos" | "installAndroid" | "askBefore" | "askToRequest" | "askNote", value: string, change: Parameters<typeof MetricCard>[0]["change"], sub?: ReactNode) => (
    <MetricCard
      key={key}
      accent="primary"
      label={t(`kpis.${key}`)}
      info={t(`kpis.info.${key}`)}
      value={value}
      change={change}
      footer={
        <>
          {t(`usage.say.${key}`)}
          {sub && <span className="block">{sub}</span>}
        </>
      }
    />
  );
  const p = (v: number | null) => (v === null ? "–" : pct(Math.round(v)));
  return (
    <div className="flex flex-col gap-(--adm-section)">
      <section aria-label={t("usage.app")}>
        <h2 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{t("usage.app")}</h2>
        <dl data-key-numbers className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {card("installIos", p(k.ios.value), k.ios.change, k.ios.value === null ? t("kpis.notMeasurable") : t("kpis.installSub", { count: num(k.ios.booked ?? 0) }))}
          {card("installAndroid", p(k.android.value), k.android.change, k.android.value === null ? t("kpis.notMeasurable") : t("kpis.installSub", { count: num(k.android.booked ?? 0) }))}
        </dl>
      </section>
      <section aria-label={t("usage.ask")}>
        <h2 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{t("usage.ask")}</h2>
        <dl data-key-numbers className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {card("askBefore", a.messagesBeforeRequest === null ? "–" : dec(a.messagesBeforeRequest), a.change.askBefore, t("kpis.askChats", { count: num(a.chats) }))}
          {card("askToRequest", p(a.askedToRequest), a.change.askToRequest, t("kpis.askChats", { count: num(a.chats) }))}
          {card("askNote", p(a.requestsWithNote), a.change.askNote, t("kpis.askRequests", { count: num(a.requests) }))}
        </dl>
      </section>
    </div>
  );
}
