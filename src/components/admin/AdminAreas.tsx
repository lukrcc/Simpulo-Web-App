"use client";

// The areas of /admin that list or change things: Houses, Applications, Platform. Numbers from lib/admin/metrics.ts; every change goes
// through lib/admin/actions.ts (and into the log).
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { Img } from "@/components/ui/Img";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { VIBE_ICONS } from "@/config/explore";
import { examples, launch, phaseRules, PLATFORM_PHASES, usePlatformPhase, type PhaseRules } from "@/config/platform";
import { useFormat } from "@/i18n/format";
import { useAdminActions } from "@/lib/admin/actions";
import { houseKindCounts, houseRows, type HouseKind } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { manageHref } from "@/lib/houseTasks";
import { linkDomain } from "@/lib/links";
import { findUser, useStore } from "@/lib/store";
import type { ApplicationStatus, HostApplication, PlatformPhase } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { AdminSection, AdminShell } from "./AdminShell";

// ── Houses ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type KindFilter = "all" | HouseKind;

export function AdminHouseList() {
  const t = useTranslations("admin.houses");
  const f = useFormat();
  const store = useStore();
  const inputs = useAdminInputs();
  const rows = houseRows(inputs);
  const counts = houseKindCounts(rows);
  const [kind, setKind] = useState<KindFilter>("all");
  const shown = kind === "all" ? rows : rows.filter((r) => r.kind === kind);

  return (
    <AdminShell
      title={t("title")}
      aside={
        <Link href="/admin/houses/prepared" className="text-body font-semibold text-ink hover:underline">
          {t("preparedLink")}
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <ScrollRow label={t("filter")} className="max-w-full">
          <CapsuleGroup
            label={t("filter")}
            value={kind}
            onChange={setKind}
            options={(["all", "real", "founding", "example"] as const).map((value) => ({
              value,
              content: value === "all" ? `${t("all")} ${rows.length}` : `${t(`kind.${value}`)} ${counts[value]}`,
            }))}
          />
        </ScrollRow>
        <span className="text-small text-muted">{t("count", { count: shown.length })}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-body">
          <thead className="text-small text-muted">
            <tr className="border-b border-ink/8">
              <th className="py-3 pr-4 font-medium">{t("col.house")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.kind")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.category")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.hub")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.dates")}</th>
              <th className="w-40 py-3 pr-4 font-medium">{t("col.fill")}</th>
              <th className="py-3 text-right font-medium">{t("col.reservations")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ stay, kind: k, hub, fillRate, reservations }) => {
              const Icon = VIBE_ICONS[stay.vibe];
              return (
                <tr key={stay.id} className="border-b border-ink/8">
                  <td className="py-2.5 pr-4">
                    <Link href={manageHref(stay)} className="flex min-w-0 items-center gap-3 hover:underline">
                      <Img src={housePhotos(stay, findUser(store, stay.hostId))[0]} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
                      <span className="max-w-64 truncate text-ink">{stay.title}</span>
                    </Link>
                  </td>
                  <td className={cn("py-2.5 pr-4", k === "example" ? "text-muted" : "text-ink")}>{t(`kind.${k}`)}</td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2 whitespace-nowrap text-ink">
                      <Icon aria-hidden className="size-4 text-ink/60" strokeWidth={1.75} />
                      {f.vibe(stay.vibe)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-ink">{hub}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-muted">{f.stayDates(stay)}</td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                        <span className="block h-full rounded-full bg-adm-chart-1" style={{ width: `${fillRate * 100}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-right tabular-nums text-muted">{Math.round(fillRate * 100)} %</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-ink">{reservations}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
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
  const shown = applications
    .filter((a) => a.status === status)
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
      <p className="mt-4 flex items-center gap-2 text-body font-semibold text-ink">
        <Icon aria-hidden className="size-4 text-ink/60" strokeWidth={1.75} />
        {f.vibe(application.topic)}
      </p>
      {application.pitch && <p className="mt-1 line-clamp-3 text-body text-muted">{application.pitch}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small">
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
    <AdminShell title={t("title")}>
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
