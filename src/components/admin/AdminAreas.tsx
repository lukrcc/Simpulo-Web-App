"use client";

// The areas of /admin that list or change things: Houses, Applications, Platform. Numbers from lib/admin/metrics.ts; every change goes
// through lib/admin/actions.ts (and into the log).
import { ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { TOOL_LINKS } from "@/config/app-links";
import { VIBE_ICONS } from "@/config/explore";
import { examples, launch, phaseRules, PLATFORM_PHASES, usePlatformPhase, type PhaseRules } from "@/config/platform";
import { useFormat } from "@/i18n/format";
import { APP_MODE } from "@/lib/appMode";
import { useAdminActions } from "@/lib/admin/actions";
import { applicationTier, atRiskHouses, fastestFull, hostOverview, waitlistMatches, type HostOverview, type RiskReason } from "@/lib/admin/metrics";
import { HOST_TIERS } from "@/config/admin";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { linkDomain } from "@/lib/links";
import { socialHandle, socialUrl } from "@/lib/socialLinks";
import { findUser, useStore } from "@/lib/store";
import type { ApplicationStatus, HostApplication, HostTier, PlatformPhase, Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { compact, eur as formatEur, share } from "@/lib/i18n/adminFormat";
import { PrepareButton, PreparedList } from "./AdminHouses";
import { AdminSection, AdminShell } from "./AdminShell";

// ── Houses: early warning ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * /admin/houses – "Welche Houses brauchen Hilfe?": an early warning, no table of every House. "Gefährdet": upcoming Houses where a rule
 * holds (config/admin.ts HOUSE_RISK, lib/admin/metrics.ts atRiskHouses), each with its reason in one sentence and the actions that fit;
 * "Läuft gut": the five that filled the fastest; under them a search over all Houses (title, host, place) as a slim list.
 */
export function AdminHouseList() {
  const t = useTranslations("admin.houses");
  const inputs = useAdminInputs();
  const atRisk = atRiskHouses(inputs);
  const fastest = fastestFull(inputs);
  return (
    <AdminShell title={t("title")}>
      <AdminSection title={`${t("atRisk")} · ${atRisk.length}`}>
        {atRisk.length === 0 ? (
          <p className="text-body text-ink">{t("atRiskNone")}</p>
        ) : (
          <ul className="divide-y divide-ink/8 border-y border-ink/8">
            {atRisk.map(({ stay, reasons }) => (
              <AtRiskRow key={stay.id} stay={stay} reasons={reasons} />
            ))}
          </ul>
        )}
      </AdminSection>
      <AdminSection title={t("goingWell")}>
        {fastest.length === 0 ? (
          <p className="text-body text-muted">{t("goingWellNone")}</p>
        ) : (
          <ul className="divide-y divide-ink/8 border-y border-ink/8">
            {fastest.map(({ stay, days }) => (
              <HouseLine key={stay.id} stay={stay} aside={<span className="shrink-0 text-small text-ink">{t("fullIn", { days })}</span>} />
            ))}
          </ul>
        )}
      </AdminSection>
      <HouseSearch />
    </AdminShell>
  );
}

/** A House as a slim line: photo 48px, title (a link to its page), host · place · dates muted; something on the right. */
function HouseLine({ stay, aside, children }: { stay: Stay; aside?: ReactNode; children?: ReactNode }) {
  const store = useStore();
  const f = useFormat();
  const host = findUser(store, stay.hostId);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Img src={housePhotos(stay, host)[0]} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <Link href={`/h/${stay.id}`} className="block truncate text-body font-semibold text-ink hover:underline">
          {stay.title}
        </Link>
        <p className="truncate text-small text-muted">{[host?.name, f.placeName(stay), f.stayDates(stay)].filter(Boolean).join(" · ")}</p>
        {children}
      </div>
      {aside}
    </li>
  );
}

/**
 * An at-risk House: its reason(s) with an ember dot, and the actions that fit – Hervorheben and Warteliste informieren when people are
 * missing, Host erinnern when a request waits. Mock: a toast and a log line.
 */
function AtRiskRow({ stay, reasons }: { stay: Stay; reasons: readonly RiskReason[] }) {
  const t = useTranslations("admin.houses");
  const showToast = useToast();
  const store = useStore();
  const inputs = useAdminInputs();
  const actions = useAdminActions();
  const host = findUser(store, stay.hostId);
  const needsPeople = reasons.some((r) => r.key === "deadline" || r.key === "quiet");
  const waiting = reasons.some((r) => r.key === "unanswered");
  const sentence = (r: RiskReason) =>
    r.key === "deadline" ? t("reason.deadline", { days: r.days, fill: share(r.fill) }) : r.key === "quiet" ? t("reason.quiet", { days: r.days }) : t("reason.unanswered", { hours: r.hours });
  return (
    <HouseLine
      stay={stay}
      aside={
        <span className="flex flex-wrap gap-2">
          {needsPeople && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  actions.highlightHouse(stay);
                  showToast(t("toast.highlight", { title: stay.title }));
                }}
              >
                {t("action.highlight")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const count = waitlistMatches(inputs, stay);
                  actions.notifyWaitlist(stay, count);
                  showToast(t("toast.notify", { count, title: stay.title }));
                }}
              >
                {t("action.notify")}
              </Button>
            </>
          )}
          {waiting && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                actions.remindHost(stay, host?.name ?? "");
                showToast(t("toast.remind", { name: host?.name ?? "" }));
              }}
            >
              {t("action.remind")}
            </Button>
          )}
        </span>
      }
    >
      <ul className="mt-1 flex flex-col gap-0.5">
        {reasons.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-small text-ink">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-adm-critical" />
            {sentence(r)}
          </li>
        ))}
      </ul>
    </HouseLine>
  );
}

/** A search over all Houses – title, host, place –, the results as a slim list with a link to the House page (at most 20). */
function HouseSearch() {
  const t = useTranslations("admin.houses");
  const store = useStore();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits =
    q.length < 2
      ? []
      : store.stays
          .filter((s) => s.status !== "draft" && s.status !== "draft_unclaimed")
          .filter((s) => [s.title, findUser(store, s.hostId)?.name ?? "", s.city, s.region, s.location?.city ?? ""].some((v) => v.toLowerCase().includes(q)));
  return (
    <AdminSection title={t("search")}>
      <Input type="text" inputMode="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("search")} className="max-w-xl" />
      {q.length >= 2 &&
        (hits.length === 0 ? (
          <p className="mt-4 text-body text-muted">{t("searchEmpty")}</p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-ink/8 border-y border-ink/8">
              {hits.slice(0, 20).map((stay) => (
                <HouseLine key={stay.id} stay={stay} />
              ))}
            </ul>
            {hits.length > 20 && <p className="mt-3 text-small text-muted">{t("searchMore", { count: hits.length - 20 })}</p>}
          </>
        ))}
    </AdminSection>
  );
}

// ── Host tiers (Applications, Houses › Hosts) ─────────────────────────────────────────────────────────────────────────────────────


/** "All 41 · Share 30 · Pro 9 · Anchor 2" – the tier filter. */
function TierFilter({ value, onChange, tiers }: { value: HostTier | "all"; onChange: (tier: HostTier | "all") => void; tiers: readonly HostTier[] }) {
  const t = useTranslations("admin.tiers");
  return (
    <ScrollRow label={t("filter")} className="max-w-full">
      <CapsuleGroup
        size="sm"
        label={t("filter")}
        value={value}
        onChange={onChange}
        options={(["all", ...HOST_TIERS] as const).map((tier) => ({ value: tier, content: `${t(tier)} ${tier === "all" ? tiers.length : tiers.filter((x) => x === tier).length}` }))}
      />
    </ScrollRow>
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
 * /admin/hosts – "Wer hostet?": three tabs – Alle (every host with a real House, sorted by value per year, Houses or newest) · Review (live
 * hosts are let in automatically; only cases with a warning land here) · Prepared (Houses prepared for a host). Calm cards: the tier as a
 * small capsule ("vorgeschlagen" while nobody set it), three numbers – Houses · Füllrate · Wert pro Jahr (lib/admin/metrics.ts hostOverview,
 * the same outcomes as Analyse). The tier changes only in the host's detail (a click on the card), logged.
 */
export function AdminHosts() {
  const tAdmin = useTranslations("admin");
  const t = useTranslations("admin.hosts");
  const tGrowth = useTranslations("admin.growthArea");
  const rows = hostOverview(useAdminInputs());
  const [tab, setTab] = useState<"all" | "review" | "prepared">("all");
  const review = rows.filter((r) => r.warnings.length > 0);
  return (
    <AdminShell title={tAdmin("hostsTitle")} aside={tab === "prepared" ? <PrepareButton label={tGrowth("newHouse")} /> : undefined}>
      <CapsuleGroup
        label={t("tabs.label")}
        value={tab}
        onChange={setTab}
        className="mb-8 w-fit"
        options={[
          { value: "all", content: `${t("tabs.all")} ${rows.length}` },
          { value: "review", content: `${t("tabs.review")} ${review.length}` },
          { value: "prepared", content: t("tabs.prepared") },
        ]}
      />
      {tab === "all" && <HostList rows={rows} />}
      {tab === "review" && (
        <>
          <p className="mb-6 max-w-2xl text-body text-muted">{t("reviewNote")}</p>
          {review.length === 0 ? <p className="text-body text-ink">{t("reviewEmpty")}</p> : <HostGrid rows={review} />}
        </>
      )}
      {tab === "prepared" && <PreparedList />}
    </AdminShell>
  );
}

type HostSort = "value" | "houses" | "newest";

function HostList({ rows }: { rows: readonly HostOverview[] }) {
  const t = useTranslations("admin.hosts");
  const [tier, setTier] = useState<HostTier | "all">("all");
  const [sort, setSort] = useState<HostSort>("value");
  const shown = rows
    .filter((r) => tier === "all" || r.tier === tier)
    .toSorted((a, b) => (sort === "houses" ? b.houses.length - a.houses.length : sort === "newest" ? b.newest.localeCompare(a.newest) : b.valuePerYear - a.valuePerYear));
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <TierFilter value={tier} onChange={setTier} tiers={rows.map((r) => r.tier)} />
        <CapsuleGroup size="sm" label={t("sort.label")} value={sort} onChange={setSort} options={(["value", "houses", "newest"] as const).map((value) => ({ value, content: t(`sort.${value}`) }))} />
      </div>
      <HostGrid rows={shown} />
      <p className="mt-6 text-small text-muted">{t("rule")}</p>
    </>
  );
}

function HostGrid({ rows }: { rows: readonly HostOverview[] }) {
  const tAdmin = useTranslations("admin");
  const [open, setOpen] = useState<string | null>(null);
  const opened = rows.find((r) => r.user.id === open);
  if (rows.length === 0) return <p className="text-body text-muted">{tAdmin("empty")}</p>;
  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((row) => (
          <HostCard key={row.user.id} row={row} onOpen={() => setOpen(row.user.id)} />
        ))}
      </ul>
      {opened && <HostSheet row={opened} onClose={() => setOpen(null)} />}
    </>
  );
}

/** The tier as a small capsule; "vorgeschlagen" in grey behind it while nobody set it by hand. */
function TierCapsule({ tier, manual }: { tier: HostTier; manual: boolean }) {
  const t = useTranslations("admin.tiers");
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-6 items-center rounded-full border border-ink/12 px-2.5 text-small font-medium text-ink">{t(tier)}</span>
      {!manual && <span className="text-small text-muted">{t("suggested")}</span>}
    </span>
  );
}

/** Houses · Füllrate · Wert pro Jahr – three numbers side by side, split by fine lines. */
function HostNumbers({ row }: { row: HostOverview }) {
  const t = useTranslations("admin.hosts");
  return (
    <dl className="grid grid-cols-3">
      {[
        { label: t("houses"), value: String(row.houses.length) },
        { label: t("fill"), value: share(row.fillRate) },
        { label: t("value"), value: formatEur(row.valuePerYear) },
      ].map((n, i) => (
        <div key={n.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-4")}>
          <dt className="truncate text-small text-muted">{n.label}</dt>
          <dd className="mt-0.5 text-h3 tabular-nums text-ink">{n.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A host as a calm card (a clickable object): name, hubs, the tier capsule, the three numbers; warnings (Review) as ember-dot lines. */
function HostCard({ row, onOpen }: { row: HostOverview; onOpen: () => void }) {
  const t = useTranslations("admin.hosts");
  const { user } = row;
  return (
    <li>
      <button type="button" onClick={onOpen} aria-label={t("open", { name: user.name })} className="flex h-full w-full flex-col gap-4 rounded-[20px] bg-(--surface) p-5 text-left transition-colors duration-150 hover:bg-surface-2">
        <span className="flex items-center gap-3">
          <Avatar user={user} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-h3 text-ink">{user.name}</span>
            <span className="block truncate text-small text-muted">{row.hubs.join(", ")}</span>
          </span>
        </span>
        <TierCapsule tier={row.tier} manual={row.manual} />
        <HostNumbers row={row} />
        {row.warnings.length > 0 && (
          <span className="flex flex-col gap-1">
            {row.warnings.map((w) => (
              <span key={w} className="flex items-center gap-2 text-small text-ink">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-adm-critical" />
                {t(`warning.${w}`)}
              </span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
}

/** The host's detail: the numbers, the tier – changed only here (logged) –, their links with followers and their Houses. */
function HostSheet({ row, onClose }: { row: HostOverview; onClose: () => void }) {
  const t = useTranslations("admin.hosts");
  const tTier = useTranslations("admin.tiers");
  const f = useFormat();
  const { setHostTier } = useAdminActions();
  const { user } = row;
  return (
    <Sheet variant="panel" open onClose={onClose} title={user.name}>
      <div className="flex flex-col gap-8 px-6 pb-8">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="md" />
          <p className="text-small text-muted">{row.hubs.join(", ")}</p>
        </div>
        <HostNumbers row={row} />
        <div>
          <p className="mb-2 text-small text-muted">{t("tier")}</p>
          <TierPicker tier={row.tier} manual={row.manual} name={user.name} onChange={(next) => setHostTier(user, next)} />
          <p className="mt-2 text-small text-muted">{tTier("rule")}</p>
        </div>
        <div>
          <p className="mb-2 text-small text-muted">{t("links")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
            {(user.socials ?? []).length === 0 ? (
              <span className="text-muted">{tTier("noLinks")}</span>
            ) : (
              (user.socials ?? []).map((link) => (
                <a key={link.platform} href={socialUrl(link)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink hover:underline">
                  {socialHandle(link)}
                  <ExternalLink aria-hidden className="size-3 text-muted" />
                </a>
              ))
            )}
            <Followers count={row.followers} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-small text-muted">{t("housesList")}</p>
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
        </div>
      </div>
    </Sheet>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

const STATUSES: readonly ApplicationStatus[] = ["new", "maybe", "yes", "no"];

/** Founding host applications as cards, decided like the swipe review of pro Houses: Yes · Maybe · No (keys → ↓ ← on the first open one). */
export function AdminApplications() {
  const t = useTranslations("admin.applications");
  const tAdmin = useTranslations("admin");
  const { applications } = useAdminData();
  const { decide } = useAdminActions();
  const [status, setStatus] = useState<ApplicationStatus>("new");
  const [tier, setTier] = useState<HostTier | "all">("all");
  const inStatus = applications.filter((a) => a.status === status);
  const shown = inStatus
    .filter((a) => tier === "all" || applicationTier(a).tier === tier)
    .toSorted((a, b) => (status === "new" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const first = status === "new" ? shown[0] : undefined;

  // The swipe review's keys: → Yes, ↓ Maybe, ← No – on the oldest open application, never while typing.
  useEffect(() => {
    if (!first) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || target?.closest("input, textarea, select, [contenteditable]")) return;
      const next = ({ ArrowRight: "yes", ArrowDown: "maybe", ArrowLeft: "no" } as const)[e.key as "ArrowRight" | "ArrowDown" | "ArrowLeft"];
      if (!next) return;
      e.preventDefault();
      decide(first, next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [first, decide]);

  return (
    <AdminShell title={t("title")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <CapsuleGroup
          label={t("filter")}
          value={status}
          onChange={setStatus}
          options={STATUSES.map((value) => ({
            value,
            content: (
              <span className="inline-flex items-center gap-2">
                {t(`status.${value}`)} {applications.filter((a) => a.status === value).length}
                {/* Orange only as the signal: open applications waiting. */}
                {value === "new" && applications.some((a) => a.status === "new") && <span aria-hidden className="size-2 rounded-full bg-signal" />}
              </span>
            ),
          }))}
        />
        {first && <span className="text-small text-muted max-md:hidden">{t("keys")}</span>}
      </div>
      <div className="mb-6">
        <TierFilter value={tier} onChange={setTier} tiers={inStatus.map((a) => applicationTier(a).tier)} />
      </div>
      {shown.length === 0 ? (
        <p className="text-body text-muted">{tAdmin("empty")}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((application) => (
            <ApplicationCard key={application.id} application={application} onDecide={(next) => decide(application, next)} highlighted={application === first} />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function ApplicationCard({ application, onDecide, highlighted }: { application: HostApplication; onDecide: (status: ApplicationStatus) => void; highlighted: boolean }) {
  const t = useTranslations("admin.applications");
  const f = useFormat();
  const store = useStore();
  const user = application.userId ? findUser(store, application.userId) : undefined;
  const { setApplicationTier } = useAdminActions();
  const tier = applicationTier(application);
  const Icon = VIBE_ICONS[application.topic];
  return (
    // One light surface on the page (--card, radius 20) – nothing boxed inside it.
    <li className={cn("flex flex-col rounded-[20px] bg-(--surface) p-5", highlighted && "ring-2 ring-ink/25")}>
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
            {t(`hostType.${application.hostType}`)} · {application.hub} · {t("applied", { date: f.day(application.createdAt) })}
          </p>
        </div>
        {user?.foundingHost && <span className="shrink-0 rounded-full border border-ink/12 px-2.5 py-0.5 text-small font-medium text-ink">{t("foundingHost")}</span>}
      </div>
      <div className="mt-4">
        <TierPicker tier={tier.tier} manual={tier.manual} name={application.name} onChange={(next) => setApplicationTier(application, next)} />
      </div>
      <p className="mt-4 flex items-center gap-2 text-body font-semibold text-ink">
        <Icon aria-hidden className="size-4 text-ink/60" strokeWidth={1.75} />
        {f.vibe(application.topic)}
      </p>
      {application.pitch && <p className="mt-1 line-clamp-3 text-body text-muted">{application.pitch}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
        {application.audienceLinks.length === 0 ? (
          <span className="text-muted">{t("noLinks")}</span>
        ) : (
          application.audienceLinks.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-ink hover:underline">
              {linkDomain(url)}
              {url.split("/").filter(Boolean).at(-1) && <span className="text-muted">/{url.split("/").filter(Boolean).at(-1)}</span>}
              <ExternalLink aria-hidden className="size-3 text-muted" />
            </a>
          ))
        )}
        <Followers count={application.audienceSize ?? 0} />
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button size="sm" variant={application.status === "yes" ? "primary" : "secondary"} aria-pressed={application.status === "yes"} onClick={() => onDecide("yes")}>
          {t("yes")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={application.status === "maybe"}
          onClick={() => onDecide("maybe")}
          className={cn(application.status === "maybe" && "border-ink")}
        >
          {t("maybe")}
        </Button>
        <Button size="sm" variant="tertiary" aria-pressed={application.status === "no"} onClick={() => onDecide("no")} className={cn(application.status === "no" && "underline")}>
          {t("no")}
        </Button>
      </div>
    </li>
  );
}

// ── Platform ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const RULE_KEYS: readonly (keyof PhaseRules)[] = ["request", "reserve", "pay", "openHouse", "applyAsHost"];

export function AdminPlatform() {
  const t = useTranslations("admin.platform");
  const phase = usePlatformPhase();
  const { changePhase } = useAdminActions();
  const [pending, setPending] = useState<PlatformPhase | null>(null);

  return (
    <AdminShell
      title={t("title")}
      aside={
        <Link href="/admin/log" className="text-body font-semibold text-ink hover:underline">
          {t("logLink")}
        </Link>
      }
    >
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
      <Sheet open={pending !== null} onClose={() => setPending(null)} title={pending ? t("confirmTitle", { phase: t(`phases.${pending}`) }) : ""}>
        {pending && (
          <>
            <p className="text-body text-muted">{t("confirmText", { phase: t(`phases.${pending}`) })}</p>
            <ModalFooter onCancel={() => setPending(null)} className="mt-6">
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
