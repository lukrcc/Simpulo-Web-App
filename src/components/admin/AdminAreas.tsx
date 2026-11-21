"use client";

// The areas of /admin that list or change things: Houses, Applications, Platform. Numbers from lib/admin/metrics.ts; every change goes
// through lib/admin/actions.ts (and into the log).
import { AdminListDetail, AdminSort, AdminSubTabs, AdminTabs, BackToList } from "./AdminLayout";
import { BACKLOG, BACKLOG_STATUSES, LAUNCH_PLAN_URL, type BacklogStatus } from "@/config/backlog";
import { DUTIES, dutyStatus } from "@/config/obligations";
import { FOUNDING_HOST } from "@/config/policies";
import { isFoundingHost } from "@/lib/founding";
import { StatusDot } from "./AdminCharts";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { InfoTip } from "./AdminNumbers";
import { profileHref } from "@/lib/privacy";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { TOOL_LINKS } from "@/config/app-links";
import { VIBE_ICONS } from "@/config/explore";
import { examples, launch, phaseRules, PLATFORM_PHASES, usePlatformPhase, type PhaseRules } from "@/config/platform";
import { useFormat } from "@/i18n/format";
import { APP_MODE } from "@/lib/appMode";
import { useAdminActions } from "@/lib/admin/actions";
import { applicationTier, hostOverview, type HostOverview } from "@/lib/admin/metrics";
import { HOST_TIERS } from "@/config/admin";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { linkDomain } from "@/lib/links";
import { socialHandle, socialUrl } from "@/lib/socialLinks";
import { findUser, useStore } from "@/lib/store";
import type { ApplicationStatus, HostApplication, HostTier, PlatformPhase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { compact, eur as formatEur, monthYear, share } from "@/lib/i18n/adminFormat";
import { Textarea } from "@/components/ui/Input";
import { PrepareButton, PreparedList } from "./AdminHouses";
import { AdminSection, AdminShell } from "./AdminShell";

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
type HostTab = "all" | HostTier | "founding" | "review" | "prepared";
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
  const [tab, setTab] = useState<HostTab>("all");
  const [sort, setSort] = useState<HostSort>("value");
  // A link from the Posteingang opens one host (?host=…).
  const [selectedId, setSelectedId] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("host")));
  // "Prüfen": new (first House within 30 days) or with a warning – waits for you.
  const isNew = (r: HostOverview) => r.houses.length <= 1 && r.newest !== "" && Date.parse(inputs.today) - Date.parse(r.newest) <= NEW_HOST_DAYS * 86_400_000;
  const review = rows.filter((r) => r.warnings.length > 0 || isNew(r));
  const prepared = store.stays.filter((s) => s.claim).length;
  const inTab = (r: HostOverview) => (tab === "all" ? true : tab === "review" ? review.includes(r) : tab === "founding" ? isFoundingHost(r.user) : r.tier === tab);
  const shown = rows.filter(inTab).toSorted((a, b) => (sort === "houses" ? b.houses.length - a.houses.length : sort === "newest" ? b.newest.localeCompare(a.newest) : b.valuePerYear - a.valuePerYear));
  const selected = shown.find((r) => r.user.id === selectedId) ?? null;

  return (
    <AdminShell
      title={t("title")}
      tabs={
        <AdminTabs
          label={t("tabs.label")}
          value={tab}
          onChange={(next) => (setTab(next), setSelectedId(null))}
          tabs={[
            { value: "all", label: t("tabs.all"), count: rows.length },
            ...HOST_TIERS.map((tier) => ({ value: tier, label: tTier(tier), count: rows.filter((r) => r.tier === tier).length, tooltip: t(`tabInfo.${tier}`) })),
            { value: "founding", label: t("tabs.founding"), count: rows.filter((r) => isFoundingHost(r.user)).length, tooltip: t("tabInfo.founding", { limit: FOUNDING_HOST.limit }) },
            { value: "review", label: t("tabs.review"), count: review.length, tooltip: t("tabInfo.review") },
            { value: "prepared", label: t("tabs.prepared"), count: prepared, tooltip: t("tabInfo.prepared") },
          ]}
        />
      }
      aside={tab === "prepared" ? <PrepareButton label={tGrowth("newHouse")} /> : <AdminSort label={t("sort.label")} value={sort} onChange={setSort} options={(["value", "houses", "newest"] as const).map((value) => ({ value, label: t(`sort.${value}`) }))} />}
    >
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
    </AdminShell>
  );
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
      <span className="text-small tabular-nums text-ink">{share(row.fillRate)}</span>
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
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
        {(user.socials ?? []).map((link) => (
          <a key={link.platform} href={socialUrl(link)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink hover:underline">
            {socialHandle(link)}
            <ExternalLink aria-hidden className="size-3 text-muted" />
          </a>
        ))}
        <Followers count={row.followers} />
      </div>

      <section className="mt-(--adm-inner)">
        <p className="mb-2 text-eyebrow uppercase text-(--adm-label)">{t("tier")}</p>
        <span className="flex flex-wrap items-center gap-2">
          <TierPicker tier={row.tier} manual={row.manual} name={user.name} onChange={(next) => actions.setHostTier(user, next)} />
          {!row.manual && (
            <Button size="sm" variant="tertiary" onClick={() => actions.setHostTier(user, row.tier)}>
              {tTier("confirm")}
            </Button>
          )}
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
        <Link href={profileHref(user.id)} className={buttonStyles("secondary", "sm")}>
          {t("openProfile")}
        </Link>
        {row.warnings.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => (actions.remindHost({ title: row.houses[0]?.title ?? "" }, user.name), showToast(tToday("toast.remindHost", { name: user.name })))}>
            {tToday("action.remind")}
          </Button>
        )}
      </div>

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
 * /admin/applications (Launch › Bewerbungen): list left, detail right (AdminListDetail). Tabs Neu · Rückfrage · Angenommen · Abgelehnt, the
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
            <Link href={`/admin/marketing?tab=contacts&contact=${contact.id}`} className="text-ink hover:underline">
              {t("contactOpen", { name: contact.name })}
            </Link>,
          )}
        {/* Host wirbt Host (vorbereitet): wer diese Bewerbung über seinen Link gebracht hat. */}
        {application.referredBy && row(t("referredBy"), findUser(store, application.referredBy)?.name ?? application.referredBy)}
      </dl>
      {application.pitch && row(t("pitch"), `„${application.pitch}“`)}
      {application.question && <p className="text-small text-muted">{t("questionSent", { date: f.day(application.question.at) })}: „{application.question.text}“</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={application.status === "yes" ? "primary" : "secondary"} aria-pressed={application.status === "yes"} onClick={() => decide(application, "yes")}>
          {t("yes")}
        </Button>
        <Button size="sm" variant="secondary" aria-pressed={asking} onClick={() => setAsking((x) => !x)}>
          {t("maybe")}
        </Button>
        <Button size="sm" variant="tertiary" aria-pressed={application.status === "no"} onClick={() => decide(application, "no")} className={cn(application.status === "no" && "underline")}>
          {t("no")}
        </Button>
      </div>
      {asking && (
        <div className="flex flex-col gap-2">
          <label className="text-eyebrow uppercase text-(--adm-label)" htmlFor={`q-${application.id}`}>
            {t("questionLabel")}
          </label>
          <Textarea id={`q-${application.id}`} value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} maxLength={600} />
          <Button
            size="sm"
            className="self-start"
            disabled={!question.trim()}
            onClick={() => {
              decide(application, "maybe", question.trim());
              setAsking(false);
            }}
          >
            {t("questionSend")}
          </Button>
        </div>
      )}
      <p className="text-small text-muted">{t("mailHint")}</p>
    </div>
  );
}

// ── Platform ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const RULE_KEYS: readonly (keyof PhaseRules)[] = ["request", "reserve", "pay", "openHouse", "applyAsHost"];

export function AdminPlatform() {
  const t = useTranslations("admin.platform");
  const phase = usePlatformPhase();
  const { changePhase } = useAdminActions();
  const [pending, setPending] = useState<PlatformPhase | null>(null);
  // Unterreiter: Einstellungen (phase, tools, values) · Backlog (decided building blocks, config/backlog.ts).
  const [view, setView] = useState<"settings" | "backlog" | "duties">("settings");

  return (
    <AdminShell
      title={t("title")}
      tabs={<AdminTabs label={t("views.label")} value={view} onChange={setView} tabs={(["settings", "backlog", "duties"] as const).map((value) => ({ value, label: t(`views.${value}`) }))} />}
      aside={
        <Link href="/admin/log" className="text-body font-semibold text-ink hover:underline">
          {t("logLink")}
        </Link>
      }
    >
      {view === "duties" ? (
        <Duties />
      ) : view === "backlog" ? (
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
      <Tools />
      <AdminSection title={t("values")}>
        <dl className="grid gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
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
          <table className="w-full min-w-[520px] text-left text-body">
            <thead className="text-small text-muted">
              <tr className="border-b border-ink/8">
                <th className="py-3 pr-4 font-medium" />
                {PLATFORM_PHASES.map((p) => (
                  <th key={p} className={cn("py-3 pr-4 font-medium", p === phase && "font-semibold text-ink")}>
                    {t(`phases.${p}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RULE_KEYS.map((rule) => (
                <tr key={rule} className="border-b border-ink/8">
                  <td className="py-3 pr-4 text-ink">{t(`rule.${rule}`)}</td>
                  {PLATFORM_PHASES.map((p) => (
                    <td key={p} className={cn("py-3 pr-4", phaseRules[p][rule] ? "text-ink" : "text-muted")}>
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
            <p className="text-body text-muted">{t("confirmText", { phase: t(`phases.${pending}`) })}</p>
            <ModalFooter onCancel={() => setPending(null)} className="mt-(--adm-inner)">
              <Button variant="primary" onClick={() => changePhase(pending)}>
                {t("confirm", { phase: t(`phases.${pending}`) })}
              </Button>
            </ModalFooter>
          </>
        )}
      </Sheet>
    </AdminShell>
  );
}

/**
 * System › Backlog: the decided building blocks (config/backlog.ts) – title, one line, phase, status. The status switches in the row and is
 * stored through the adapter (AdminData.backlog, logged); a filter by status; "X offen" on top; done items grey and at the end.
 */
/**
 * System › Pflichten: what's prepared for a platform's duties (config/obligations.ts) – each with its status: vorbereitet · aktiv · vom
 * Anwalt geprüft, and where it lives.
 */
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
  const items = BACKLOG.map((item) => ({ ...item, status: data.backlog?.[item.id] ?? item.status }));
  const open = items.filter((i) => i.status !== "done").length;
  // Done at the end, otherwise the config's order.
  const shown = items.filter((i) => filter === "all" || i.status === filter).toSorted((a, b) => Number(a.status === "done") - Number(b.status === "done"));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-h3 text-ink tabular-nums">{t("open", { count: open })}</p>
        <CapsuleGroup size="sm" label={t("filterLabel")} value={filter} onChange={setFilter} options={(["all", ...BACKLOG_STATUSES] as const).map((value) => ({ value, content: value === "all" ? t("all") : t(`status.${value}`) }))} />
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
        <ul className="mt-(--adm-inner) divide-y divide-ink/8 border-y border-ink/8">
          {shown.map((item) => (
            <li key={item.id} data-backlog-item={item.id} className={cn("flex min-h-(--adm-row-h) flex-wrap items-center gap-x-6 gap-y-2 py-2.5", item.status === "done" && "opacity-45")}>
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

/**
 * "Tools": the status line (environment, errors in 24h, cost this month – only the environment is known before phase 4, the rest marked)
 * and quick links to the consoles (config/app-links.ts TOOL_LINKS), each in a new tab.
 */
function Tools() {
  const t = useTranslations("admin.platform.tools");
  const status = [
    { label: t("environment"), value: t(`env.${APP_MODE}`) },
    { label: t("errors"), value: "–" },
    { label: t("cost"), value: "–" },
  ];
  return (
    <AdminSection title={t("title")} aside={<Badge>{t("later")}</Badge>}>
      <dl className="grid grid-cols-3">
        {status.map((s, i) => (
          <div key={s.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-6")}>
            <dt className="text-small text-muted">{s.label}</dt>
            <dd className={cn("mt-1 text-h3", i === 0 ? "text-ink" : "text-muted")}>{s.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-8 flex flex-wrap gap-2">
        {TOOL_LINKS.map((tool) => (
          <li key={tool.key}>
            <a href={tool.url} target="_blank" rel="noreferrer noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/12 px-4 text-nav-main text-ink transition-colors duration-150 hover:bg-ink/5">
              {t(`links.${tool.key}`)}
              <ArrowUpRight aria-hidden className="size-4 text-muted" />
              <span className="sr-only">{t("newTab")}</span>
            </a>
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}
