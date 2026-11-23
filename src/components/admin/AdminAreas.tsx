"use client";
import { numberPool, TopicCards, TopicHeader } from "./AdminTopics";
import { AdminCapsuleView } from "./AdminCapsuleView";
import { AdminButton, AdminDialogFooter, adminButtonStyles } from "./AdminButton";

// The areas of /admin that list or change things: Houses, Applications, Platform. Numbers from lib/admin/metrics.ts; every change goes
// through lib/admin/actions.ts (and into the log).
import { AdminListDetail, AdminSort, AdminSubTabs, AdminTabs, BackToList, DirectLink } from "./AdminLayout";
import { BACKLOG, BACKLOG_PHASES, BACKLOG_STATUSES, LAUNCH_PLAN_URL, type BacklogPhase, type BacklogStatus } from "@/config/backlog";
import type { LaunchFacts } from "@/lib/launchChecks";
import { AdminLaunch } from "./AdminLaunch";
import { TODO_DUES } from "@/config/roadmap";
import { useRouter } from "next/navigation";
import { DUTIES, dutyStatus } from "@/config/obligations";
import { ADDRESS_FIELDS, hasBusinessAddress } from "@/config/company";
import { FOUNDING_HOST } from "@/config/policies";
import { isFoundingHost } from "@/lib/founding";
import { ProgressBar, StatusDot } from "./AdminCharts";
import { ArrowUpRight, ChartColumn, Code, CreditCard, Database, ExternalLink, Eye, Flame, Globe, HardDrive, Landmark, Mail, ScrollText, Server, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { InfoTip } from "./AdminNumbers";
import { TileValue } from "./AdminTiles";
import { profileHref } from "@/lib/privacy";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { TOOLS, TOOL_GROUPS, errorLogUrl, firebaseDocUrl, stripeUrl, type ToolIcon } from "@/config/tools";
import { VIBE_ICONS } from "@/config/explore";
import { examples, launch, phaseRules, PLATFORM_PHASES, usePlatformPhase, type PhaseRules } from "@/config/platform";
import { useFormat } from "@/i18n/format";
import { APP_MODE } from "@/lib/appMode";
import { useAdminActions } from "@/lib/admin/actions";
import { applicationTier, hostMix, hostOverview, launchProgress, type HostOverview } from "@/lib/admin/metrics";
import { HOST_TIERS } from "@/config/admin";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { linkDomain } from "@/lib/links";
import { socialHandle, socialUrl } from "@/lib/socialLinks";
import { findUser, useStore } from "@/lib/store";
import { shortNameOf } from "@/lib/shortName";
import type { ApplicationStatus, HostApplication, HostTier, PlatformPhase, Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { compact, dec, eur as formatEur, monthYear, num, share } from "@/lib/i18n/adminFormat";
import { Textarea } from "@/components/ui/Input";
import { PrepareButton, PreparedList } from "./AdminHouses";
import { AdminNested, AdminSection, AdminShell } from "./AdminShell";
import { OpenTasksHint } from "./OpenTasksHint";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";
import { useFillHeight } from "./useFillHeight";
import { routeTiles, withUnits } from "./tileRoutes";
import { unitColorOf } from "@/config/admin-tiles";
import { setAdminSearch, useAdminTab } from "@/lib/admin/urlState";

// ── Houses: early warning – components/admin/AdminHouseWatch.tsx (AdminHouseList) ──────────────────────────────────────────

// ── Host tiers (Applications, Houses › Hosts) ─────────────────────────────────────────────────────────────────────────────────────


/** "Alle 41 · Share 30 · Pro 9 · Anchor 2" – the tier filter (AdminSubTabs, under the status tabs). */
function TierFilter({ value, onChange, tiers }: { value: HostTier | "all"; onChange: (tier: HostTier | "all") => void; tiers: readonly HostTier[] }) {
  const t = useTranslations("admin.tiers");
  return (
    <AdminSubTabs
      label={t("filter")}
      value={value}
      onChange={onChange}
      tabs={(["all", ...HOST_TIERS] as const).map((tier) => ({ value: tier, label: t(tier), count: tier === "all" ? tiers.length : tiers.filter((x) => x === tier).length }))}
    />
  );
}

/** The tier as a small capsule group (the chosen one is the tier; a click sets it by hand, logged); "suggested" while nobody set it. */
function TierPicker({ tier, manual, onChange, name }: { tier: HostTier; manual: boolean; onChange: (tier: HostTier) => void; name: string }) {
  const t = useTranslations("admin.tiers");
  return (
    <span className="flex flex-wrap items-center gap-2">
      <CapsuleGroup size="sm" label={t("of", { name })} value={tier} onChange={onChange} options={HOST_TIERS.map((value) => ({ value, content: t(value) }))} />
      {!manual && <span className="text-small text-muted">{t("suggested")}</span>}
    </span>
  );
}

/** "48.2K followers" beside the links; nothing without links. */
function Followers({ count }: { count: number }) {
  const t = useTranslations("admin.tiers");
  return count > 0 ? <span className="text-small tabular-nums text-muted">{t("followers", { count: compact(count) })}</span> : null;
}

/**
 * /admin/hosts (AdminPageHeader + AdminListDetail): ONE tab row – Alle · Share · Pro · Anchor · Prüfen · Vorbereitet (each with its count,
 * each with an ⓘ); right Sortieren ▾ (Wert pro Jahr · Houses · Neueste). A compact list (rows 52px): photo · name · places · tier · Houses ·
 * fill rate · value per year · a signal dot (a warning); the column heads carry an ⓘ ("Wert pro Jahr = …"). The detail right: a short
 * profile, the tier (confirm or change – logged; "vorgeschlagen" only here), the numbers, the warnings, the actions. Vorbereitet: the
 * prepared Houses.
 */
/** "Überblick" first and by default (CLAUDE.md "Überblick zuerst"), then the lists. */
type HostTab = "overview" | "all" | "review" | "applications" | "prepared";
/** "Alle" narrowed by tier (Share · Pro · Anchor · Founding) and by activity (a House in the next 90 days or not). */
type TierFilterValue = "all" | HostTier | "founding";
type ActivityFilter = "all" | "active" | "inactive" | "dormant";
/** Active: a House running or starting within this many days; dormant: the last House ended longer ago than this. */
const ACTIVE_DAYS = 90;
const DORMANT_DAYS = 182;
export function hostActivity(r: HostOverview, today: string): "active" | "inactive" {
  const until = new Date(Date.parse(`${today}T12:00:00Z`) + ACTIVE_DAYS * 86_400_000).toISOString().slice(0, 10);
  return r.houses.some((h) => h.endDate >= today && h.startDate <= until && h.status !== "closed") ? "active" : "inactive";
}
function isDormant(r: HostOverview, today: string): boolean {
  if (hostActivity(r, today) === "active") return false;
  const lastEnd = r.houses.map((h) => h.endDate).toSorted().at(-1);
  return !lastEnd || Date.parse(lastEnd) < Date.parse(`${today}T12:00:00Z`) - DORMANT_DAYS * 86_400_000;
}
type HostSort = "value" | "houses" | "newest";
const NEW_HOST_DAYS = 30;

export function AdminHosts() {
  const t = useTranslations("admin.hosts");
  const tTier = useTranslations("admin.tiers");
  const tGrowth = useTranslations("admin.growthArea");
  const tAdmin = useTranslations("admin");
  const inputs = useAdminInputs();
  const rows = hostOverview(inputs);
  const store = useStore();
  // The capsule in ?tab= (pushed – back works); ?host= alone opens "Alle". A tile's ?focus= (config/admin-tiles.ts) sets the tier filter
  // (share · pro · anchor · founding), "Aktivität: Inaktiv" (inactive) or the sort (value · fill · recurring); a menu choice lifts it.
  const url = useAdminTab<HostTab>(["overview", "all", "review", "applications", "prepared"], "overview");
  const hostParam = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("host");
  const tab: HostTab = url.tab === "overview" && hostParam ? "all" : url.tab;
  const setTab = (next: HostTab) => url.open(next);
  const focus = url.focus;
  const liftFocus = () => focus && setAdminSearch({ focus: null }, { replace: true });
  const [chosenSort, setChosenSort] = useState<HostSort>("value");
  const [chosenTier, setChosenTier] = useState<TierFilterValue>("all");
  const [chosenActivity, setChosenActivity] = useState<ActivityFilter>("all");
  const focusTier = focus === "share" || focus === "pro" || focus === "anchor" || focus === "founding" ? focus : null;
  const tierFilter: TierFilterValue = focusTier ?? chosenTier;
  const activity: ActivityFilter = focus === "inactive" ? "inactive" : chosenActivity;
  const sort: HostSort = focus === "recurring" ? "houses" : chosenSort;
  const setSort = (next: HostSort) => (setChosenSort(next), liftFocus());
  const setTierFilter = (next: TierFilterValue) => (setChosenTier(next), liftFocus());
  const setActivity = (next: ActivityFilter) => (setChosenActivity(next), liftFocus());
  // A link from the Posteingang opens one host (?host=…).
  const [selectedId, setSelectedId] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("host")));
  // "Prüfen": new (first House within 30 days) or with a warning – waits for you.
  const isNew = (r: HostOverview) => r.houses.length <= 1 && r.newest !== "" && Date.parse(inputs.today) - Date.parse(r.newest) <= NEW_HOST_DAYS * 86_400_000;
  const review = rows.filter((r) => r.warnings.length > 0 || isNew(r));
  const prepared = store.stays.filter((s) => s.claim).length;
  const applicationsOpen = useAdminData().applications.filter((a) => a.status === "new" || a.status === "maybe").length;
  const tierOk = (r: HostOverview) => (tierFilter === "all" ? true : tierFilter === "founding" ? isFoundingHost(r.user) : r.tier === tierFilter);
  const activityOk = (r: HostOverview) => (activity === "all" ? true : activity === "dormant" ? isDormant(r, inputs.today) : hostActivity(r, inputs.today) === activity);
  const inTab = (r: HostOverview) => (tab === "all" ? tierOk(r) && activityOk(r) : review.includes(r));
  const tTierF = useTranslations("admin.hosts.tierFilter");
  const tAct = useTranslations("admin.hosts.activityFilter");
  const shown = rows.filter(inTab).toSorted((a, b) => (sort === "houses" ? b.houses.length - a.houses.length : sort === "newest" ? b.newest.localeCompare(a.newest) : b.valuePerYear - a.valuePerYear));
  const selected = shown.find((r) => r.user.id === selectedId) ?? null;

  // "Acht Karten" (CLAUDE.md): the overview's eight cards; a card opens its topic (the head's bar).
  const tabs = <TopicHeader page="hosts" title={t("title")} />;
  if (tab === "overview")
    return (
      <AdminShell title={t("title")} tabs={tabs}>
        <HostsOverview
          rows={rows}
          review={review}
          onOpen={(next) => (setTab(next), setSelectedId(null))}
        />
      </AdminShell>
    );
  // Bewerbungen: the whole applications page as a tab (its status tabs and tier filter in the second row).
  if (tab === "applications")
    return (
      <AdminNested tabs={tabs}>
        <HostsOverview rows={rows} review={review} onOpen={(next) => (setTab(next), setSelectedId(null))} render={(tiles) => <AdminCapsuleView page="hosts" capsule="applications" tiles={tiles} fallback={<AdminApplications />} />} />
      </AdminNested>
    );

  return (
    <AdminShell
      title={t("title")}
      tabs={tabs}
      aside={
        tab === "prepared" ? (
          <PrepareButton label={tGrowth("newHouse")} />
        ) : (
          <>
            {tab === "all" && (
              <>
                <AdminSort
                  label={tTierF("label")}
                  trigger={tierFilter === "all" ? tTierF("label") : tTierF(tierFilter)}
                  value={tierFilter}
                  onChange={(v) => (setTierFilter(v), setSelectedId(null))}
                  options={(["all", ...HOST_TIERS, "founding"] as const).map((value) => ({ value, label: `${tTierF(value)} ${num(value === "all" ? rows.length : value === "founding" ? rows.filter((r) => isFoundingHost(r.user)).length : rows.filter((r) => r.tier === value).length)}` }))}
                />
                <AdminSort
                  label={tAct("label")}
                  trigger={activity === "all" ? tAct("label") : tAct(activity)}
                  value={activity}
                  onChange={(v) => (setActivity(v), setSelectedId(null))}
                  options={(["all", "active", "inactive", "dormant"] as const).map((value) => ({ value, label: tAct(value) }))}
                />
              </>
            )}
            <AdminSort label={t("sort.label")} value={sort} onChange={setSort} options={(["value", "houses", "newest"] as const).map((value) => ({ value, label: t(`sort.${value}`) }))} />
          </>
        )
      }
    >
      {/* Every capsule but Überblick: its mini tiles on top, the chosen tile's detail under them (CLAUDE.md "Kapsel-Ansicht"). */}
      <HostsOverview rows={rows} review={review} onOpen={(next) => (setTab(next), setSelectedId(null))}  render={(tiles) => (
        <AdminCapsuleView page="hosts" capsule={tab} tiles={tiles} fallback={<>
      <OpenTasksHint area="hosts" />
      {tab === "prepared" ? (
        <PreparedList />
      ) : (
        <AdminListDetail
          label={t("title")}
          rowHeight="h-13"
          head={
            <div className="max-md:hidden">
              <HostColumnsHead />
            </div>
          }
          rows={shown.map((row) => ({
            id: row.user.id,
            media: <Avatar user={row.user} size="sm" />,
            title: row.user.name,
            // Phones: the columns don't fit beside the name – one line under it instead ("Pro · 2 Houses · 75 % · 5.240 €", a dot for a warning).
            meta: (
              <>
                <span className="max-md:hidden">{row.hubs.join(", ")}</span>
                <span className="md:hidden">
                  {row.warnings.length > 0 && <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-adm-critical" />}
                  {[tTier(row.tier), `${row.houses.length} ${t("housesShort")}`, share(row.fillRate), formatEur(row.valuePerYear)].join(" · ")}
                </span>
              </>
            ),
            aside: (
              <span className="max-md:hidden">
                <HostColumns row={row} />
              </span>
            ),
          }))}
          selectedId={selected?.user.id ?? null}
          onSelect={setSelectedId}
          empty={<p className="text-body text-muted">{tab === "review" ? t("reviewEmpty") : tAdmin("empty")}</p>}
          detail={selected ? <HostDetail key={selected.user.id} row={selected} onBack={() => setSelectedId(null)} /> : <p className="py-2 text-body text-muted">{tAdmin("inbox.pick")}</p>}
        />
      )}
        </>} />
      )} />
    </AdminShell>
  );
}

/**
 * Hosts › Überblick (CLAUDE.md "Überblick zuerst"): only tiles, tinted in Plattform's lilac – one per list (Alle · Share · Pro · Anchor ·
 * Founding · Prüfen · Bewerbungen · Vorbereitet) and the numbers behind them: average value per year and fill rate, hosts with a warning,
 * anchors against their target. Each tile opens its list (sorted where that helps).
 */
function HostsOverview({ rows, review, onOpen, render }: { rows: readonly HostOverview[]; review: readonly HostOverview[]; onOpen: (tab: HostTab, sort?: HostSort, filter?: { tier?: TierFilterValue; activity?: ActivityFilter }) => void ; /** A capsule's view of these tiles (AdminCapsuleView) instead of the board */ render?: (tiles: TileSpec[]) => ReactNode }) {
  const t = useTranslations("admin.pageTiles.hosts");
  const tHosts = useTranslations("admin.hosts");
  const inputs = useAdminInputs();
  const store = useStore();
  const { applications } = useAdminData();
  const mix = hostMix(inputs);
  const avg = (values: readonly number[]) => (values.length ? values.reduce((n, v) => n + v, 0) / values.length : null);
  const eurOr = (v: number | null) => (v === null ? "–" : formatEur(Math.round(v)));
  const shareOr = (v: number | null) => (v === null ? "–" : share(v));
  const value = avg(rows.map((r) => r.valuePerYear));
  const fill = avg(rows.map((r) => r.fillRate));
  const of = (tier: HostTier) => rows.filter((r) => r.tier === tier);
  const month = inputs.today.slice(0, 7);
  // New this month: hosts whose first real House was created this month.
  const newThisMonth = rows.filter((r) => r.houses.map((h) => h.createdAt).toSorted()[0]?.startsWith(month)).length;
  const tierLine = (list: readonly HostOverview[]) => t("d.valueFill", { value: eurOr(avg(list.map((r) => r.valuePerYear))), fill: shareOr(avg(list.map((r) => r.fillRate))) });
  const housesLine = (list: readonly HostOverview[]) => t("d.houses", { houses: num(list.reduce((n, r) => n + r.houses.length, 0)), hubs: num(new Set(list.flatMap((r) => r.hubs)).size) });
  const founding = rows.filter((r) => isFoundingHost(r.user));
  const open = applications.filter((a) => a.status === "new" || a.status === "maybe");
  const oldest = open.map((a) => a.createdAt).toSorted()[0];
  const daysSince = (iso: string | undefined) => (iso ? Math.max(0, Math.round((Date.parse(`${inputs.today}T12:00:00Z`) - Date.parse(iso)) / 86_400_000)) : null);
  const preparedStays = store.stays.filter((s) => s.claim);
  const claimed = preparedStays.filter((s) => s.claim?.claimedBy || s.status !== "draft_unclaimed").length;
  const byValue = rows.toSorted((a, b) => b.valuePerYear - a.valuePerYear);
  const median = byValue.length ? byValue[Math.floor(byValue.length / 2)].valuePerYear : null;
  const warn = (w: HostOverview["warnings"][number]) => rows.filter((r) => r.warnings.includes(w)).length;
  const isNewHost = (r: HostOverview) => r.warnings.length === 0;
  const anchorPending = rows.filter((r) => r.suggested === "anchor" && r.user.hostTier !== "anchor").length;
  const tile = (key: "all" | "share" | "pro" | "anchor" | "founding" | "review" | "applications" | "prepared" | "value" | "fill" | "recurring" | "active", shown: string, details: string[], tab: HostTab, sort?: HostSort, filter?: { tier?: TierFilterValue; activity?: ActivityFilter }): TileSpec => ({
    key,
    label: t(`${key}.label`),
    info: key === "founding" ? t("founding.info", { limit: String(FOUNDING_HOST.limit) }) : key === "active" ? t("active.info", { days: String(ACTIVE_DAYS) }) : t(`${key}.info`),
    value: shown,
    details,
    onOpen: () => onOpen(tab, sort, filter),
  });
  // Wiederkehrende Hosts: 2+ Houses over Simpulo; the average gap between a host's House starts; the same share three months ago.
  const real = (r: HostOverview) => r.houses.filter((h) => h.status !== "closed");
  const recurringNow = rows.filter((r) => real(r).length >= 2);
  const before = new Date(Date.parse(`${inputs.today}T12:00:00Z`) - 91 * 86_400_000).toISOString().slice(0, 10);
  // Three months ago: the Houses that had started by then (their start date – the creation dates of the demo data are all recent).
  const hostsBefore = rows.filter((r) => real(r).some((h) => h.startDate <= before));
  const recurringBefore = hostsBefore.filter((r) => real(r).filter((h) => h.startDate <= before).length >= 2);
  const gaps = recurringNow.flatMap((r) => {
    const starts = real(r).map((h) => Date.parse(h.startDate)).toSorted((a, b) => a - b);
    return starts.slice(1).map((s, i) => (s - starts[i]) / 86_400_000);
  });
  const avgGap = avg(gaps);
  const active = rows.filter((r) => hostActivity(r, inputs.today) === "active");
  // Names in tiles are never cut: the short name when whole, a short title, else the place.
  const nameOf = (s: Stay) => (!shortNameOf(s).endsWith("…") ? shortNameOf(s) : s.title.length <= 28 ? s.title : s.location.city);
  const dormant = rows.filter((r) => isDormant(r, inputs.today));
  // More lines where the tile has room (ordered by importance; the tile shows as many as fit).
  const verified = (list: readonly HostOverview[]) => t("d.verified", { count: num(list.filter((r) => r.user.verified).length), all: num(list.length) });
  const warned = (list: readonly HostOverview[]) => t("d.warned", { count: num(list.filter((r) => r.warnings.length > 0).length) });
  const upcoming = (list: readonly HostOverview[]) => t("d.upcoming", { count: num(list.reduce((n, r) => n + r.houses.filter((h) => h.startDate > inputs.today).length, 0)) });
  const topOf = (list: readonly HostOverview[]) => {
    const top = list.toSorted((a, b) => b.valuePerYear - a.valuePerYear)[0];
    return top ? t("d.top", { name: top.user.name.split(" ")[0], value: formatEur(top.valuePerYear) }) : null;
  };
  const perHost = rows.length ? Math.round((rows.reduce((n, r) => n + r.houses.length, 0) / rows.length) * 10) / 10 : null;
  const hubCount = new Map<string, number>();
  for (const r of rows) for (const h of r.hubs) hubCount.set(h, (hubCount.get(h) ?? 0) + 1);
  const topHub = [...hubCount.entries()].toSorted((a, b) => b[1] - a[1])[0];
  const appHub = new Map<string, number>();
  for (const a of open) appHub.set(a.hub, (appHub.get(a.hub) ?? 0) + 1);
  const topAppHub = [...appHub.entries()].toSorted((a, b) => b[1] - a[1])[0];
  const appFollowers = avg(open.map((a) => a.audienceSize).filter((n) => n > 0));
  const fillOf = (tier: HostTier) => shareOr(avg(of(tier).map((r) => r.fillRate)));
  const fills = rows.map((r) => r.fillRate).toSorted((a, b) => a - b);
  const fillMedian = fills.length ? fills[Math.floor(fills.length / 2)] : null;
  const firstWarned = rows.find((r) => r.warnings.length > 0);
  const preparedCities = new Set(preparedStays.map((s) => s.location.city)).size;
  const lines = (...all: (string | null)[]) => all.filter((l): l is string => l !== null);
  const tiles: TileSpec[] = [
    tile("all", num(rows.length), lines(t("d.mix", { share: num(of("share").length), pro: num(of("pro").length), anchor: num(of("anchor").length) }), t("d.newMonth", { count: num(newThisMonth) }), housesLine(rows), perHost === null ? null : t("d.perHost", { value: dec(perHost) }), verified(rows), topHub ? t("d.topHub", { hub: topHub[0], count: num(topHub[1]) }) : null), "all"),
    tile("share", num(of("share").length), lines(tierLine(of("share")), housesLine(of("share")), upcoming(of("share")), topOf(of("share")), verified(of("share")), warned(of("share"))), "all", undefined, { tier: "share" }),
    tile("pro", num(of("pro").length), lines(tierLine(of("pro")), housesLine(of("pro")), upcoming(of("pro")), topOf(of("pro")), verified(of("pro")), warned(of("pro"))), "all", undefined, { tier: "pro" }),
    tile("anchor", num(of("anchor").length), lines(t("d.anchorGoal", { min: num(mix.target.min), max: num(mix.target.max) }), t("d.followers", { count: compact(avg(of("anchor").map((r) => r.followers)) ?? 0) }), t("d.anchorPending", { count: num(anchorPending) }), tierLine(of("anchor")), housesLine(of("anchor")), topOf(of("anchor"))), "all", undefined, { tier: "anchor" }),
    tile("founding", num(founding.length), lines(t("d.foundingFree", { free: num(Math.max(0, FOUNDING_HOST.limit - founding.length)), limit: num(FOUNDING_HOST.limit) }), tierLine(founding), housesLine(founding), upcoming(founding), verified(founding), warned(founding)), "all", undefined, { tier: "founding" }),
    tile("review", num(review.length), lines(t("d.review", { fresh: num(review.filter(isNewHost).length), warned: num(review.length - review.filter(isNewHost).length) }), t("d.warnA", { slow: num(warn("slowAnswers")), low: num(warn("lowFill")) }), t("d.warnB", { reported: num(warn("reported")), safety: num(warn("safety")) }), firstWarned ? t("d.first", { name: firstWarned.user.name.split(" ")[0] }) : review[0] ? t("d.first", { name: review[0].user.name.split(" ")[0] }) : null, rows.length ? t("d.ofHosts", { value: share(rows.filter((r) => r.warnings.length > 0).length / rows.length) }) : null), "review"),
    tile("applications", num(open.length), lines(t("d.applications", { fresh: num(open.filter((a) => a.status === "new").length), question: num(open.filter((a) => a.status === "maybe").length) }), oldest ? t("d.oldest", { days: num(daysSince(oldest) ?? 0) }) : null, open.length ? t("d.appTypes", { share: num(open.filter((a) => a.hostType === "share").length), pro: num(open.filter((a) => a.hostType === "pro").length) }) : null, topAppHub ? t("d.topHub", { hub: topAppHub[0], count: num(topAppHub[1]) }) : null, appFollowers === null ? null : t("d.followers", { count: compact(Math.round(appFollowers)) }), t("d.accepted", { count: num(applications.filter((a) => a.status === "yes").length) })), "applications"),
    tile("prepared", num(preparedStays.length), lines(t("d.prepared", { claimed: num(claimed), open: num(preparedStays.length - claimed) }), preparedStays[0] ? t("d.latest", { title: nameOf(preparedStays.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]) }) : null, preparedStays.length ? t("d.cities", { count: preparedCities }) : null), "prepared"),
    tile("value", eurOr(value), lines(byValue[0] ? t("d.top", { name: byValue[0].user.name.split(" ")[0], value: formatEur(byValue[0].valuePerYear) }) : null, byValue[1] ? t("d.second", { name: byValue[1].user.name.split(" ")[0], value: formatEur(byValue[1].valuePerYear) }) : null, t("d.median", { value: eurOr(median) }), t("d.sum", { value: formatEur(rows.reduce((n, r) => n + r.valuePerYear, 0)) }), t("d.noValue", { count: num(rows.filter((r) => r.valuePerYear === 0).length) })), "all", "value"),
    tile("fill", shareOr(fill), lines(t("d.fillHigh", { count: num(rows.filter((r) => r.fillRate >= 0.7).length) }), t("d.fillLow", { count: num(rows.filter((r) => r.fillRate < 0.5).length) }), fillMedian === null ? null : t("d.median", { value: share(fillMedian) }), t("d.fillTiers", { share: fillOf("share"), pro: fillOf("pro") }), of("anchor").length ? t("d.fillAnchor", { value: fillOf("anchor") }) : null), "all"),
    tile("recurring", rows.length ? share(recurringNow.length / rows.length) : "–", lines(t("d.recurringCount", { count: num(recurringNow.length), all: num(rows.length) }), avgGap === null ? t("d.noGap") : t("d.avgGap", { days: num(Math.round(avgGap)) }), hostsBefore.length ? t("d.before", { value: share(recurringBefore.length / hostsBefore.length) }) : t("d.noBefore")), "all", "houses"),
    tile("active", `${num(active.length)} / ${num(rows.length - active.length)}`, lines(t("d.activeSplit", { active: num(active.length), inactive: num(rows.length - active.length) }), t("d.dormant", { count: num(dormant.length) }), rows.length ? t("d.activeShare", { value: share(active.length / rows.length) }) : null), "all", undefined, { activity: dormant.length ? "dormant" : "inactive" }),
  ];
  // The page's numbers (CLAUDE.md "Karten-Inhalte als Konfiguration"): which of them a card shows is config/admin/cards/hosts.ts.
  const ts = useTranslations("admin.topicCards.sub");
  const pool = numberPool(tiles, {
    tiers: { label: ts("tiersMix"), info: tiles.find((x) => x.key === "pro")?.info, value: `${num(of("share").length)} · ${num(of("pro").length)} · ${num(of("anchor").length)}` },
    activeCount: { label: ts("activeCount"), value: num(active.length) },
    newMonth: { label: ts("newMonth"), value: num(newThisMonth) },
    foundingFree: { label: ts("foundingFree"), value: num(Math.max(0, FOUNDING_HOST.limit - founding.length)) },
    warned: { label: ts("warned"), value: num(rows.filter((r) => r.warnings.length > 0).length) },
    anchorPending: { label: ts("anchorPending"), value: num(anchorPending) },
    oldestDays: oldest ? { label: ts("oldestDays"), value: num(daysSince(oldest) ?? 0) } : null,
    accepted: { label: ts("accepted"), value: num(applications.filter((a) => a.status === "yes").length) },
    claimed: { label: ts("claimed"), value: num(claimed) },
    preparedCities: { label: ts("preparedCities"), value: num(preparedCities) },
    recurringCount: { label: ts("recurringCount"), value: num(recurringNow.length) },
    avgGap: avgGap === null ? null : { label: ts("avgGap"), value: num(Math.round(avgGap)) },
    dormant: { label: ts("dormant"), value: num(dormant.length) },
  });
  if (render) return render(tiles);
  return <TopicCards page="hosts" pool={pool} />;
}

/** The columns right in a host's row: tier · Houses · fill rate · value per year · the signal dot (a warning). */
const HOST_COLS = "grid grid-cols-[52px_52px_52px_76px_8px] items-center gap-x-3.5 text-right";
function HostColumns({ row }: { row: HostOverview }) {
  const tTier = useTranslations("admin.tiers");
  const tAdmin = useTranslations("admin");
  return (
    <span className={HOST_COLS}>
      <span className="truncate text-left text-small text-muted">{tTier(row.tier)}</span>
      <span className="text-small tabular-nums text-ink">{row.houses.length}</span>
      <span className="flex items-center gap-2 text-small tabular-nums text-ink">
        <ProgressBar ratio={row.fillRate ?? 0} label={share(row.fillRate)} className="w-8 shrink-0" />
        <span className="whitespace-nowrap">{share(row.fillRate)}</span>
      </span>
      <span className="text-small tabular-nums text-ink">{formatEur(row.valuePerYear)}</span>
      <span className="flex justify-end">
        {row.warnings.length > 0 && (
          <>
            <span aria-hidden className="size-2 rounded-full bg-adm-critical" />
            <span className="sr-only">{tAdmin("status.critical")}</span>
          </>
        )}
      </span>
    </span>
  );
}

/** The column heads over the host list; "Wert/Jahr" with its ⓘ instead of a sentence under the list. */
function HostColumnsHead() {
  const t = useTranslations("admin.hosts");
  return (
    // Small words, not caps: the narrow columns keep the list's name column wide.
    <div className="flex h-8 items-center justify-end gap-3 px-2 text-small text-(--adm-label)">
      <span className={HOST_COLS}>
        <span className="text-left">{t("tier")}</span>
        <span>{t("housesShort")}</span>
        <span>{t("fillShort")}</span>
        <span className="inline-flex items-center justify-end gap-0.5">
          {t("valueShort")}
          <InfoTip text={t("rule")} />
        </span>
        <span />
      </span>
    </div>
  );
}

/** A host's detail: a short profile, the tier (confirm or change, logged), the numbers, the warnings, the actions. */
function HostDetail({ row, onBack }: { row: HostOverview; onBack: () => void }) {
  const t = useTranslations("admin.hosts");
  const tTier = useTranslations("admin.tiers");
  const tToday = useTranslations("admin.today");
  const f = useFormat();
  const actions = useAdminActions();
  const showToast = useToast();
  const { user } = row;
  const first = user.name.split(" ")[0];
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  // The tier as one line: the confirmed one (or "noch nicht bestätigt"), and – when the rules suggest another – the suggestion with why.
  const current = user.hostTier ?? null;
  const differs = current !== row.suggested;
  const reason = row.suggestedBy === "followers" ? tTier("reason.followers", { count: num(row.followers) }) : tTier(`reason.${row.suggestedBy}`);
  return (
    <article data-host-detail>
      <BackToList onBack={onBack} />
      <div className="flex items-center gap-4">
        <Avatar user={user} size="md" />
        <div className="min-w-0">
          <Link href={profileHref(user.id)} className="block text-h3 text-ink hover:underline">
            {user.name}
          </Link>
          <p className="text-small text-muted">{row.hubs.join(", ")}</p>
        </div>
      </div>
      {/* Only with real ids in production (config/tools.ts) – in the mock nothing. */}
      <div className="mt-1 flex flex-wrap gap-x-4 empty:hidden">
        <DirectLink href={stripeUrl("account", user.stripeAccountId)}>{t("stripeAccount")}</DirectLink>
        <DirectLink href={firebaseDocUrl("users", user.id)}>{t("openFirebase")}</DirectLink>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
        {(user.socials ?? []).map((link) => (
          <a key={link.platform} href={socialUrl(link)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink hover:underline">
            {socialHandle(link)}
            <ExternalLink aria-hidden className="size-3 text-muted" />
          </a>
        ))}
        <Followers count={row.followers} />
      </div>

      <section data-host-tier className="mt-(--adm-inner) flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-body text-ink">
          <span className="inline-flex items-center gap-1 font-semibold">
            {current ? tTier("current", { tier: tTier(current) }) : tTier("unconfirmed")}
            <InfoTip text={tTier("explain")} />
          </span>
          {differs && <span className="text-small text-muted">{tTier("proposal", { tier: tTier(row.suggested), reason })}</span>}
        </p>
        <span className="flex shrink-0 items-center gap-2">
          {differs && (
            <AdminButton variant="primary" onClick={() => actions.setHostTier(user, row.suggested)}>
              {tTier("confirmAs", { tier: tTier(row.suggested) })}
            </AdminButton>
          )}
          <AdminSort label={tTier("of", { name: user.name })} trigger={tTier("change")} value={row.tier} onChange={(next: HostTier) => next !== current && actions.setHostTier(user, next)} options={HOST_TIERS.map((value) => ({ value, label: tTier(value) }))} />
        </span>
      </section>

      <dl className="mt-(--adm-inner) grid grid-cols-3 border-y border-ink/8 py-3">
        {[
          { label: t("houses"), value: String(row.houses.length) },
          { label: t("fill"), value: share(row.fillRate) },
          { label: t("value"), value: formatEur(row.valuePerYear) },
        ].map((n, i) => (
          <div key={n.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-4")}>
            <dt className="truncate text-eyebrow uppercase text-(--adm-label)">{n.label}</dt>
            <dd className="mt-1 text-adm-figure tabular-nums text-ink">{n.value}</dd>
          </div>
        ))}
      </dl>

      {row.warnings.length > 0 && (
        <ul className="mt-(--adm-inner) flex flex-col gap-1">
          {row.warnings.map((w) => (
            <li key={w} className="flex items-center gap-2 text-small text-ink">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-adm-critical" />
              {t(`warning.${w}`)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-(--adm-inner) flex flex-wrap gap-2">
        <AdminButton onClick={() => (setMessage(`Hi ${first}, `), setWriting(true))}>{t("message")}</AdminButton>
        <a href={profileHref(user.id)} target="_blank" rel="noreferrer noopener" className={adminButtonStyles("secondary")}>
          {t("openProfile")}
        </a>
        {row.warnings.length > 0 && (
          <AdminButton variant="secondary" onClick={() => (actions.remindHost({ title: row.houses[0]?.title ?? "" }, user.name), showToast(tToday("toast.remindHost", { name: user.name })))}>
            {tToday("action.remind")}
          </AdminButton>
        )}
      </div>

      <Sheet open={writing} onClose={() => setWriting(false)} title={t("messageTitle", { name: first })}>
        <div className="flex flex-col gap-(--adm-inner)" data-host-message>
          <p className="text-small text-muted">
            <span className="text-eyebrow uppercase text-(--adm-label)">{t("messageTo")}</span> <span className="text-ink">{t("messageFrom", { name: user.name })}</span>
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-eyebrow uppercase text-(--adm-label)">{t("messageText")}</span>
            <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <AdminDialogFooter onCancel={() => setWriting(false)}>
            <AdminButton
              variant="primary"
              disabled={message.trim().length < 8}
              onClick={() => {
                actions.messageHost(user, message.trim());
                showToast(t("messageSent", { name: first }));
                setWriting(false);
              }}
            >
              {t("send")}
            </AdminButton>
          </AdminDialogFooter>
        </div>
      </Sheet>

      <section className="mt-(--adm-section)">
        <p className="mb-2 text-eyebrow uppercase text-(--adm-label)">{t("housesList")}</p>
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {row.houses.map((house) => (
            <li key={house.id}>
              <Link href={`/h/${house.id}`} className="flex items-baseline justify-between gap-4 py-2.5 text-body hover:underline">
                <span className="min-w-0 truncate text-ink">{house.title}</span>
                <span className="shrink-0 text-small text-muted">{f.stayDates(house)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

const STATUSES: readonly ApplicationStatus[] = ["new", "maybe", "yes", "no"];

/**
 * Hosts › Bewerbungen (/admin/hosts?tab=applications, AdminNested; /admin/applications leitet dorthin): list left, detail right (AdminListDetail). Tabs Neu · Rückfrage · Angenommen · Abgelehnt, the
 * tier filter under them. The detail: everything the applicant sent, the tier, the linked Marketing contact and account, and the actions
 * Annehmen · Ablehnen · Rückfrage (with a template) – each logged and mailed (lib/admin/actions.ts decide). ?app= opens one.
 */
export function AdminApplications() {
  const t = useTranslations("admin.applications");
  const tAdmin = useTranslations("admin");
  const f = useFormat();
  const { applications } = useAdminData();
  const { decide } = useAdminActions();
  const [status, setStatus] = useState<ApplicationStatus>("new");
  const [tier, setTier] = useState<HostTier | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // ?app=… (from Marketing › Kontakte, the Posteingang): that application, in its tab – read once on arrival.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("app");
    const app = id ? applications.find((a) => a.id === id) : undefined;
    if (!app) return;
    requestAnimationFrame(() => {
      setStatus(app.status);
      setSelectedId(app.id);
    });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const inStatus = applications.filter((a) => a.status === status);
  const shown = inStatus
    .filter((a) => tier === "all" || applicationTier(a).tier === tier)
    .toSorted((a, b) => (status === "new" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const selected = shown.find((a) => a.id === selectedId) ?? (status === "new" ? shown[0] : undefined) ?? null;

  // Keys on the chosen application: → Annehmen, ← Ablehnen – never while typing.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || target?.closest("input, textarea, select, [contenteditable]")) return;
      const next = ({ ArrowRight: "yes", ArrowLeft: "no" } as const)[e.key as "ArrowRight" | "ArrowLeft"];
      if (!next) return;
      e.preventDefault();
      decide(selected, next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, decide]);

  return (
    <AdminShell
      title={t("title")}
      tabs={<AdminTabs label={t("filter")} value={status} onChange={(next) => { setStatus(next); setSelectedId(null); }} tabs={STATUSES.map((value) => ({ value, label: t(`status.${value}`), count: applications.filter((a) => a.status === value).length }))} />}
      aside={selected ? <span className="text-small text-muted max-md:hidden">{t("keys")}</span> : undefined}
      subTabs={<TierFilter value={tier} onChange={setTier} tiers={inStatus.map((a) => applicationTier(a).tier)} />}
    >
      <AdminListDetail
        label={t("list")}
        rows={shown.map((a) => ({
          id: a.id,
          status: a.status === "new" ? "critical" : null,
          media: (
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-ink/6 text-body font-semibold text-ink">
              {a.name.slice(0, 1)}
            </span>
          ),
          title: a.name,
          meta: `${f.vibe(a.topic)} · ${a.hub}`,
          aside: f.day(a.createdAt),
        }))}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        detail={selected ? <ApplicationDetail key={selected.id} application={selected} onBack={() => setSelectedId(null)} /> : <p className="text-body text-muted">{t("pick")}</p>}
        empty={<p className="text-body text-muted">{tAdmin("empty")}</p>}
      />
    </AdminShell>
  );
}

function ApplicationDetail({ application, onBack }: { application: HostApplication; onBack: () => void }) {
  const t = useTranslations("admin.applications");
  const f = useFormat();
  const store = useStore();
  const { marketingContacts } = useAdminData();
  const { decide, setApplicationTier } = useAdminActions();
  const user = application.userId ? findUser(store, application.userId) : undefined;
  const contact = marketingContacts.find((c) => c.id === application.contactId || (c.email && application.email && c.email.toLowerCase() === application.email.toLowerCase()));
  const tier = applicationTier(application);
  const Icon = VIBE_ICONS[application.topic];
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState(() => t("questionTemplate", { name: application.name.split(" ")[0] }));
  const row = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-eyebrow uppercase text-(--adm-label)">{label}</dt>
      <dd className="mt-1 text-body text-ink">{value}</dd>
    </div>
  );
  return (
    <div data-application={application.id} className="flex flex-col gap-6">
      <BackToList onBack={onBack} />
      <div className="flex items-center gap-3">
        {user ? (
          <Avatar user={user} size="md" />
        ) : (
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-body font-semibold text-ink">
            {application.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-h3 text-ink">{application.name}</p>
          <p className="truncate text-small text-muted">
            {t(`status.${application.status}`)} · {t("applied", { date: f.day(application.createdAt) })}
            {application.decidedAt && ` · ${t("decided", { date: f.day(application.decidedAt) })}`}
          </p>
        </div>
        {user?.foundingHost && <span className="shrink-0 rounded-full border border-ink/12 px-2.5 py-0.5 text-small font-medium text-ink">{t("foundingHost")}</span>}
      </div>
      <TierPicker tier={tier.tier} manual={tier.manual} name={application.name} onChange={(next) => setApplicationTier(application, next)} />
      <dl className="grid gap-4 sm:grid-cols-2">
        {row(
          t("topicPlace"),
          <span className="inline-flex items-center gap-2">
            <Icon aria-hidden className="size-4 text-ink/60" strokeWidth={1.75} />
            {f.vibe(application.topic)} · {application.hub}
          </span>,
        )}
        {row(t("when"), application.when ? monthYear(application.when) : t("whenOpen"))}
        {application.email && row(t("email"), application.email)}
        {row(
          t("links"),
          application.audienceLinks.length === 0 ? (
            <span className="text-muted">{t("noLinks")}</span>
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {application.audienceLinks.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink hover:underline">
                  {linkDomain(url)}
                  <ExternalLink aria-hidden className="size-3 text-muted" />
                </a>
              ))}
              <Followers count={application.audienceSize ?? 0} />
            </span>
          ),
        )}
        {row(t("account"), user ? user.name : <span className="text-muted">{t("accountNone")}</span>)}
        {contact &&
          row(
            t("contact"),
            <Link href={`/admin/marketing?tab=pipeline&contact=${contact.id}`} className="text-ink hover:underline">
              {t("contactOpen", { name: contact.name })}
            </Link>,
          )}
        {/* Host wirbt Host (vorbereitet): wer diese Bewerbung über seinen Link gebracht hat. */}
        {application.referredBy && row(t("referredBy"), findUser(store, application.referredBy)?.name ?? application.referredBy)}
      </dl>
      {application.pitch && row(t("pitch"), `„${application.pitch}“`)}
      {application.question && <p className="text-small text-muted">{t("questionSent", { date: f.day(application.question.at) })}: „{application.question.text}“</p>}
      <div className="flex flex-wrap gap-2">
        <AdminButton variant={application.status === "yes" ? "primary" : "secondary"} aria-pressed={application.status === "yes"} onClick={() => decide(application, "yes")}>
          {t("yes")}
        </AdminButton>
        <AdminButton variant="secondary" aria-pressed={asking} onClick={() => setAsking((x) => !x)}>
          {t("maybe")}
        </AdminButton>
        <AdminButton variant="secondary" aria-pressed={application.status === "no"} onClick={() => decide(application, "no")} className={cn(application.status === "no" && "bg-ink/10")}>
          {t("no")}
        </AdminButton>
      </div>
      {asking && (
        <div className="flex flex-col gap-2">
          <label className="text-eyebrow uppercase text-(--adm-label)" htmlFor={`q-${application.id}`}>
            {t("questionLabel")}
          </label>
          <Textarea id={`q-${application.id}`} value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} maxLength={600} />
          <AdminButton
            className="self-start"
            disabled={!question.trim()}
            onClick={() => {
              decide(application, "maybe", question.trim());
              setAsking(false);
            }}
          >
            {t("questionSend")}
          </AdminButton>
        </div>
      )}
      <p className="text-small text-muted">{t("mailHint")}</p>
    </div>
  );
}

// ── Platform ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Every rule of the table – "Jetzt erlaubt" lists the ones the phase has on. */
const ALL_RULES: readonly (keyof PhaseRules)[] = ["request", "reserve", "pay", "openHouse", "applyAsHost", "waitlist", "foundingHosts"];
type SystemView = "overview" | "settings" | "tools" | "prepare";

export function AdminPlatform({ facts = null }: { /** What only the server sees (lib/launchChecks.ts) – for the launch checklist */ facts?: LaunchFacts | null }) {
  const t = useTranslations("admin.platform");
  const phase = usePlatformPhase();
  const { changePhase } = useAdminActions();
  const [pending, setPending] = useState<PlatformPhase | null>(null);
  // Going public without a business address in the imprint: blocked (config/company.ts; the server's facts know it).
  const addressMissing = facts ? facts.legal.companyGaps.some((g) => (ADDRESS_FIELDS as readonly string[]).includes(g)) : !hasBusinessAddress();
  const blockedLive = pending === "live" && addressMissing;
  // Überblick (four tiles, no scrolling) · Einstellungen (phase, values, rules) · Tools (?view=tools) · Launch-Vorbereitung with its Unterreiter:
  // Backlog (config/backlog.ts) · Launch (the checklist, config/launch.ts) · Plattform-Pflichten (config/obligations.ts).
  // The capsule in ?tab= (pushed – back works); the old ?view=tools leads to ?tab=tools.
  const systemUrl = useAdminTab<SystemView>(["overview", "settings", "tools", "prepare"], "overview");
  const view = systemUrl.tab;
  const setView = (next: SystemView) => systemUrl.open(next);
  const [prepChosen, setPrepChosen] = useState<"backlog" | "launch" | "duties">("backlog");
  // The card "Launch-Checkliste" opens Launch-Vorbereitung on its Launch point (?focus=launch); a pick in the sub-tabs lifts that.
  const prep = systemUrl.focus === "launch" ? "launch" : prepChosen;
  const setPrep = (next: "backlog" | "launch" | "duties") => {
    setPrepChosen(next);
    if (systemUrl.focus) setAdminSearch({ focus: null }, { replace: true });
  };
  const router = useRouter();
  // ?view=tools opens Tools; the old „Zeitplan & Vorbereitung“ links (?view=roadmap[&sub=todos][&due=…]) go to Admin › Zeitplan.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "tools") return void setAdminSearch({ tab: "tools", view: null }, { replace: true });
    if (params.get("view") !== "roadmap") return;
    const due = params.get("due");
    const todos = params.get("sub") === "todos";
    router.replace(todos ? `/admin/zeitplan?tab=prep${due && TODO_DUES.some((d) => d.id === due) ? `&focus=${due}` : ""}` : "/admin/zeitplan");
  }, [router]);

  return (
    <AdminShell
      title={t("title")}
      tabs={<TopicHeader page="system" title={t("title")} />}
      subTabs={
        view === "prepare" ? (
          <AdminSubTabs label={t("prepViews.label")} value={prep} onChange={setPrep} tabs={(["backlog", "launch", "duties"] as const).map((value) => ({ value, label: t(`prepViews.${value}`) }))} />
        ) : undefined
      }
      aside={
        <Link href="/admin/log" className="text-body font-semibold text-ink hover:underline">
          {t("logLink")}
        </Link>
      }
    >
      {view === "overview" ? (
        <SystemOverview phase={phase} />
      ) : view === "tools" ? (
        <Tools />
      ) : view === "prepare" && prep === "duties" ? (
        <Duties />
      ) : view === "prepare" && prep === "launch" ? (
        <AdminLaunch facts={facts} />
      ) : view === "prepare" ? (
        <Backlog />
      ) : (
      <>
      <AdminSection title={t("phase")}>
        <CapsuleGroup
          label={t("phase")}
          value={phase}
          onChange={(next) => next !== phase && setPending(next)}
          options={PLATFORM_PHASES.map((value) => ({
            value,
            content: t(`phases.${value}`),
          }))}
        />
        <p className="mt-3 text-small text-muted">{t("current", { phase: t(`phases.${phase}`) })}</p>
      </AdminSection>
      <AdminSection title={t("values")}>
        <dl className="grid gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("hideCategory"),
              value: t("realHouses", {
                count: examples.hideCategoryAtRealCount,
              }),
            },
            {
              label: t("removeAll"),
              value: t("realHouses", { count: examples.removeAllAtRealCount }),
            },
            { label: t("launchLabel"), value: launch.targetLabel },
            { label: t("launchMonth"), value: launch.targetMonth },
          ].map((v, i) => (
            <div key={v.label} className={cn("min-w-0", i > 0 && "lg:border-l lg:border-ink/8 lg:pl-6")}>
              <dt className="text-small text-muted">{v.label}</dt>
              <dd className="mt-1 text-h3 text-ink">{v.value}</dd>
            </div>
          ))}
        </dl>
      </AdminSection>
      <AdminSection title={t("rules")}>
        <div className="overflow-x-auto">
          <table data-compact-table className="w-full max-w-3xl min-w-[520px] text-left text-body">
            <thead className="text-small text-muted">
              <tr className="border-b border-ink/8">
                <th className="py-1.5 pr-4 font-medium" />
                {PLATFORM_PHASES.map((p) => (
                  <th key={p} className={cn("py-1.5 pr-4 font-medium", p === phase && "font-semibold text-ink")}>
                    {t(`phases.${p}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_RULES.map((rule) => (
                <tr key={rule} className="border-b border-ink/8">
                  <td className="py-1.5 pr-4 text-ink">{t(`rule.${rule}`)}</td>
                  {PLATFORM_PHASES.map((p) => (
                    <td key={p} className={cn("py-1.5 pr-4", phaseRules[p][rule] ? "text-ink" : "text-muted")}>
                      {phaseRules[p][rule] ? t("on") : t("off")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
      </>
      )}
      <Sheet open={pending !== null} onClose={() => setPending(null)} title={pending ? t("confirmTitle", { phase: t(`phases.${pending}`) }) : ""}>
        {pending && (
          <>
            <p className="text-body text-muted">{t(`confirmText.${pending}`)}</p>
            {/* Public (Live) needs the imprint's real business address – until then the switch is blocked (Launch checklist). */}
            {blockedLive && (
              <p role="alert" data-live-blocked className="mt-3 flex items-start gap-2 text-body text-ink">
                <StatusDot status="critical" />
                {t("liveBlocked")}
              </p>
            )}
            <AdminDialogFooter onCancel={() => setPending(null)}>
              <AdminButton variant="primary" disabled={blockedLive} onClick={() => changePhase(pending)}>
                {t("confirm", { phase: t(`phases.${pending}`) })}
              </AdminButton>
            </AdminDialogFooter>
          </>
        )}
      </Sheet>
    </AdminShell>
  );
}


/** The six services on the overview, each with its brand colour as a light tint (admin-tokens.css --adm-brand-*). */
const OVERVIEW_TOOLS = [
  { id: "console", brand: "firebase" },
  { id: "stripeLive", brand: "stripe" },
  { id: "qonto", brand: "qonto" },
  { id: "github", brand: "github" },
  { id: "preview", brand: "preview" },
  { id: "mail", brand: "mail" },
] as const;

/**
 * System › Überblick (CLAUDE.md "Admin › System"): four neutral tiles on one screen (1440 × 900 without scrolling) – the phase (capsules,
 * switching only with a confirmation, logged; under it what the phase allows), the tools as link tiles in their brand colour (new tab),
 * the launch criteria (x of 4, a click opens the checklist) and the values of config/platform.ts.
 */
function SystemOverview({ phase }: { phase: PlatformPhase }) {
  // "Acht Karten" (CLAUDE.md): five cards – Phase, Tools, Launch-Checkliste, Werte, Log; fewer cards get larger.
  const t = useTranslations("admin.platform");
  const ts = useTranslations("admin.topicCards.sub");
  const inputs = useAdminInputs();
  const progress = launchProgress(inputs);
  const crit = [progress.houses, progress.hubs, progress.reservedShare, progress.waitlist];
  const met = crit.filter((p) => p.value >= p.target).length;
  const allowed = ALL_RULES.filter((rule) => phaseRules[phase][rule]);
  const tools = OVERVIEW_TOOLS.map((o) => ({ ...o, tool: TOOLS.find((x) => x.id === o.id) })).filter((o) => o.tool?.url);
  const today = inputs.today;
  const log = inputs.admin.log ?? [];
  // The page's numbers (CLAUDE.md "Karten-Inhalte als Konfiguration"): which of them a card shows is config/admin/cards/system.ts.
  const pool = numberPool([], {
    phase: { label: t("phase"), info: t("overview.allowed"), value: t(`phases.${phase}`) },
    allowed: { label: ts("allowed"), value: `${num(allowed.length)} / ${num(ALL_RULES.length)}` },
    tools: { label: t("views.tools"), info: t("views.tools"), value: num(tools.length) },
    toolsAll: { label: ts("toolsAll"), value: num(TOOLS.filter((x) => x.url).length) },
    toolGroups: { label: ts("toolGroups"), value: num(TOOL_GROUPS.length) },
    criteria: { label: ts("criteria"), info: t("overview.launch"), value: `${num(met)} / ${num(crit.length)}` },
    realHouses: { label: ts("realHouses"), value: `${num(progress.houses.value)} / ${num(progress.houses.target)}` },
    waitlistConfirmed: { label: ts("waitlistConfirmed"), value: `${num(progress.waitlist.value)} / ${num(progress.waitlist.target)}` },
    values: { label: t("launchLabel"), info: t("launchLabel"), value: launch.targetLabel },
    hideCategory: { label: ts("hideCategory"), value: num(examples.hideCategoryAtRealCount) },
    removeAll: { label: ts("removeAll"), value: num(examples.removeAllAtRealCount) },
    log: { label: t("logLink"), info: t("logLink"), value: num(log.length) },
    today: { label: ts("today"), value: num(log.filter((e) => e.createdAt.startsWith(today)).length) },
  });
  return <TopicCards page="system" pool={pool} />;
}

function Duties() {
  const t = useTranslations("admin.platform.duties");
  const items = DUTIES.map((d) => ({ ...d, status: dutyStatus(d) }));
  const dot = { prepared: "warning", active: null, reviewed: "good" } as const;
  return (
    <>
      <p className="text-h3 text-ink tabular-nums">{t("count", { reviewed: items.filter((i) => i.status === "reviewed").length, total: items.length, active: items.filter((i) => i.status !== "prepared").length })}</p>
      <p className="mt-2 text-small text-muted">{t("note")}</p>
      <ul className="mt-(--adm-inner) divide-y divide-ink/8 border-y border-ink/8">
        {items.map((item) => (
          <li key={item.id} data-duty={item.id} data-duty-status={item.status} className="flex min-h-(--adm-row-h) flex-wrap items-center gap-x-6 gap-y-2 py-3">
            <div className="min-w-0 flex-1 basis-[320px]">
              <p className="text-body font-semibold text-ink">{t(`items.${item.id}.title`)}</p>
              <p className="text-small text-muted">{t(`items.${item.id}.text`)}</p>
            </div>
            <span className="flex w-44 shrink-0 items-center gap-2 text-small text-ink">
              <StatusDot status={dot[item.status]} />
              {t(`status.${item.status}`)}
            </span>
            <Link href={item.href} target="_blank" className="shrink-0 text-small font-semibold text-ink hover:underline">
              {t("open")} ↗
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Backlog() {
  const t = useTranslations("admin.platform.backlog");
  const data = useAdminData();
  const { setBacklogStatus } = useAdminActions();
  const [filter, setFilter] = useState<BacklogStatus | "all">("all");
  const [phase, setPhase] = useState<BacklogPhase | "all">("all");
  const items = BACKLOG.map((item) => ({ ...item, status: data.backlog?.[item.id] ?? item.status }));
  const open = items.filter((i) => i.status === "open" || i.status === "inProgress").length;
  // Done and parked at the end, otherwise the config's order.
  const [listBox, listH] = useFillHeight<HTMLUListElement>(240);
  const shown = items.filter((i) => (filter === "all" || i.status === filter) && (phase === "all" || i.phase === phase)).toSorted((a, b) => Number(a.status === "done" || a.status === "parked") - Number(b.status === "done" || b.status === "parked"));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-h3 text-ink tabular-nums">{t("open", { count: open })}</p>
        <span className="flex flex-wrap items-center gap-3">
          <AdminSort label={t("phaseLabel")} value={phase} onChange={setPhase} options={(["all", ...BACKLOG_PHASES] as const).map((value) => ({ value, label: value === "all" ? t("allPhases") : t(`phase.${value}`) }))} />
          <CapsuleGroup size="sm" label={t("filterLabel")} value={filter} onChange={setFilter} options={(["all", ...BACKLOG_STATUSES] as const).map((value) => ({ value, content: value === "all" ? t("all") : t(`status.${value}`) }))} />
        </span>
      </div>
      <p className="mt-2 text-small text-muted">
        {t("note")}
        {LAUNCH_PLAN_URL && (
          <>
            {" · "}
            <a href={LAUNCH_PLAN_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-ink hover:underline">
              {t("noteLink")}
            </a>
          </>
        )}
      </p>
      {shown.length === 0 ? (
        <p className="mt-(--adm-section) text-body text-muted">{t("empty")}</p>
      ) : (
        // The list scrolls in its own box – the page stays put (CLAUDE.md "Admin › System").
        <ul ref={listBox} data-backlog-list style={listH ? { maxHeight: listH } : undefined} className="mt-(--adm-inner) divide-y divide-ink/8 overflow-y-auto overscroll-contain border-y border-ink/8">
          {shown.map((item) => (
            <li key={item.id} data-backlog-item={item.id} className={cn("flex min-h-(--adm-row-h) flex-wrap items-center gap-x-6 gap-y-2 py-2.5", (item.status === "done" || item.status === "parked") && "opacity-45")}>
              <div className="min-w-0 flex-1 basis-[320px]">
                <p className="truncate text-body font-semibold text-ink">{item.title}</p>
                <p className="truncate text-small text-muted">{item.description}</p>
              </div>
              <span className="w-28 shrink-0 text-small text-muted">{t(`phase.${item.phase}`)}</span>
              <CapsuleGroup size="sm" label={t("statusOf", { title: item.title })} value={item.status} onChange={(next) => next !== item.status && setBacklogStatus(item.id, item.title, next, t(`status.${next}`))} options={BACKLOG_STATUSES.map((value) => ({ value, content: t(`status.${value}`) }))} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const TOOL_ICON: Record<ToolIcon, LucideIcon> = { flame: Flame, database: Database, users: Users, storage: HardDrive, logs: ScrollText, server: Server, card: CreditCard, bank: Landmark, code: Code, eye: Eye, mail: Mail, globe: Globe, chart: ChartColumn };

/**
 * System › Tools: the status line (environment, errors in 24h – with „Protokoll öffnen“ in production –, cost this month; the last two
 * before phase 4 „–“) and the external services grouped (config/tools.ts TOOLS: Firebase · Geld · Code · Versand & Domain · Später), each
 * its symbol, name and one line, opening in a new tab. Unknown services (no address yet) are not shown; links only, never credentials.
 */
function Tools() {
  const t = useTranslations("admin.platform.tools");
  const status = [
    { label: t("environment"), value: t(`env.${APP_MODE}`), link: null },
    { label: t("errors"), value: "–", link: errorLogUrl() },
    { label: t("cost"), value: "–", link: null },
  ];
  return (
    <>
      <AdminSection title={t("title")} aside={<Badge>{t("later")}</Badge>}>
        <dl className="grid grid-cols-3">
          {status.map((s, i) => (
            <div key={s.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-6")}>
              <dt className="text-small text-muted">{s.label}</dt>
              <dd className={cn("mt-1 text-h3", i === 0 ? "text-ink" : "text-muted")}>{s.value}</dd>
              <dd>
                <DirectLink href={s.link}>{t("openLog")}</DirectLink>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-small text-muted">{t("note")}</p>
      </AdminSection>
      <div className="mt-(--adm-section) grid gap-x-12 gap-y-(--adm-section) md:grid-cols-2 xl:grid-cols-3">
        {TOOL_GROUPS.map((group) => {
          const tools = TOOLS.filter((tool) => tool.group === group && tool.url);
          if (tools.length === 0) return null;
          return (
            <section key={group} data-tool-group={group} aria-labelledby={`tools-${group}`}>
              <h2 id={`tools-${group}`} className="mb-2 text-eyebrow uppercase text-(--adm-label)">
                {t(`groups.${group}`)}
              </h2>
              <ul className="divide-y divide-ink/8 border-y border-ink/8">
                {tools.map((tool) => {
                  const Icon = TOOL_ICON[tool.icon];
                  return (
                    <li key={tool.id}>
                      <a href={tool.url!} target="_blank" rel="noreferrer noopener" data-tool={tool.id} className="group flex min-h-(--adm-row-h) items-center gap-3 py-2 transition-colors duration-150 hover:bg-ink/4">
                        <Icon aria-hidden className="size-5 shrink-0 text-muted group-hover:text-ink" strokeWidth={1.75} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-body font-semibold text-ink">{t(`items.${tool.id}.name`)}</span>
                          <span className="block truncate text-small text-muted">{t(`items.${tool.id}.purpose`)}</span>
                        </span>
                        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted group-hover:text-ink" />
                        <span className="sr-only">{t("newTab")}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
