"use client";

// The read-only areas of /admin: Waitlist, Topics, Algorithm, Traffic, Log. Every number comes from lib/admin/metrics.ts.
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { LAUNCH_CRITERIA, TOPIC_WEIGHTS } from "@/config/admin";
import { AdminSort, AdminTabs } from "./AdminLayout";
import { StatusDot } from "./AdminCharts";
import { VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { algorithmMetrics, runningState, topicScores, waitlistMetrics } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getTrafficReport } from "@/lib/data";
import { findUser, useStore } from "@/lib/store";
import { waitlistStatus, type Vibe } from "@/lib/types";
import { BarList, ColumnChart } from "./AdminCharts";
import { LaunchCriteria } from "./AdminCockpit";
import type { LegalChecklist } from "@/lib/legal/status";
import { AdminSection, AdminShell, StatRow } from "./AdminShell";

import { day as dayLabel, month as monthLabel, num, share as percent } from "@/lib/i18n/adminFormat";

function VibeLabel({ vibe }: { vibe: Vibe }) {
  const f = useFormat();
  const Icon = VIBE_ICONS[vibe];
  return (
    <>
      <Icon aria-hidden className="size-4 shrink-0 text-ink/60" strokeWidth={1.75} />
      <span className="truncate">{f.vibe(vibe)}</span>
    </>
  );
}

/**
 * Launch checklist › Rechtstexte: a warning while a legal page is a draft (not reviewed by a lawyer – the live build stops on it,
 * scripts/check-legal.ts) or a company field for the imprint is empty (config/company.ts).
 */
function LegalLaunchCheck({ legal }: { legal: LegalChecklist }) {
  const t = useTranslations("admin.overview.legal");
  const drafts = legal.pages.filter((p) => p.draft);
  const ok = drafts.length === 0 && legal.companyGaps.length === 0;
  return (
    <div data-legal-check={ok ? "ok" : "warning"} className="mt-6 border-t border-ink/8 pt-5">
      <div className="flex items-baseline justify-between gap-3 text-body">
        <span className="flex min-w-0 items-center gap-2 text-ink">
          <StatusDot status={ok ? "good" : "warning"} />
          <span>{t("title")}</span>
          <span className="sr-only">{ok ? t("ok") : t("warning")}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted">{t("reviewed", { done: legal.pages.length - drafts.length, total: legal.pages.length })}</span>
      </div>
      {!ok && (
        <ul className="mt-3 flex flex-col gap-1.5 text-small text-muted">
          {drafts.map((p) => (
            <li key={`${p.slug}.${p.lang}`} data-legal-draft-row={p.slug}>
              <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-ink underline-offset-4 hover:underline">
                {p.title}
              </a>{" "}
              · {t("draftRow", { version: p.version, lang: p.lang.toUpperCase() })}
            </li>
          ))}
          {legal.companyGaps.length > 0 && <li data-legal-company-gaps={legal.companyGaps.length}>{t("company", { count: legal.companyGaps.length })}</li>}
          <li>{t("rule")}</li>
        </ul>
      )}
    </div>
  );
}

// ── Waitlist ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Wachstum › Warteliste (/admin/growth?tab=waitlist, AdminNested; /admin/waitlist leitet dorthin): the real sign-ups (double opt-in). Tabs Alle · Bestätigt · Offen · Abgemeldet, filters Ort and Thema
 * on the right; on top the confirmed count against the launch criterion (≥ 1.000 – only confirmed count), the launch criteria, the trend,
 * sources and interests, and the list.
 */
export function AdminWaitlist({ legal }: { legal?: LegalChecklist }) {
  const tOverview = useTranslations("admin.overview");
  const t = useTranslations("admin.waitlist");
  const f = useFormat();
  const inputs = useAdminInputs();
  const w = waitlistMetrics(inputs);
  const [status, setStatus] = useState<"all" | WaitlistStatus>("all");
  const [place, setPlace] = useState("all");
  const [theme, setTheme] = useState<"all" | Vibe>("all");
  const places = [...new Set(inputs.admin.waitlist.map((e) => e.where).filter((x): x is string => Boolean(x)))].toSorted((a, b) => a.localeCompare(b, "de"));
  const themes = [...new Set(inputs.admin.waitlist.flatMap((e) => e.interests))];
  const list = inputs.admin.waitlist
    .filter((e) => status === "all" || waitlistStatus(e) === status)
    .filter((e) => place === "all" || e.where === place)
    .filter((e) => theme === "all" || e.interests.includes(theme))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, 20);
  const count = (s: WaitlistStatus) => inputs.admin.waitlist.filter((e) => waitlistStatus(e) === s).length;

  return (
    <AdminShell
      title={t("title")}
      tabs={
        <AdminTabs
          label={t("statusLabel")}
          value={status}
          onChange={setStatus}
          tabs={[
            { value: "all" as const, label: t("statusAll"), count: inputs.admin.waitlist.length },
            { value: "confirmed" as const, label: t("statusConfirmed"), count: count("confirmed"), tooltip: t("statusConfirmedInfo") },
            { value: "pending" as const, label: t("statusPending"), count: count("pending"), tooltip: t("statusPendingInfo") },
            { value: "unsubscribed" as const, label: t("statusUnsubscribed"), count: count("unsubscribed") },
          ]}
        />
      }
      aside={
        <>
          <AdminSort label={t("place")} value={place} onChange={setPlace} options={[{ value: "all", label: t("anywhere") }, ...places.map((p) => ({ value: p, label: p }))]} />
          <AdminSort label={t("theme")} value={theme} onChange={setTheme} options={[{ value: "all" as const, label: t("allThemes") }, ...themes.map((v) => ({ value: v, label: f.vibe(v) }))]} />
        </>
      }
    >
      <StatRow
        stats={[
          { label: t("confirmed"), value: `${num(w.confirmed)} / ${num(LAUNCH_CRITERIA.waitlist)}`, focus: true },
          { label: t("pending"), value: num(w.pending) },
          { label: t("lastWeek"), value: `+${num(w.lastWeek)}` },
          { label: t("wantsToHost"), value: num(w.wantsToHost) },
        ]}
      />
      {/* The launch criteria live here (no longer on the overview): each against its target. */}
      <AdminSection title={tOverview("launch")}>
        <LaunchCriteria />
        {legal && <LegalLaunchCheck legal={legal} />}
      </AdminSection>
      <AdminSection title={t("latest")}>
        {list.length === 0 ? (
          <p className="text-body text-muted">{t("none")}</p>
        ) : (
          <ul className="divide-y divide-ink/8">
            {shown.map((e) => {
              const s = waitlistStatus(e);
              return (
                <li key={e.id} data-waitlist-entry={s} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-body">
                  <span className="flex min-w-0 items-center gap-2 truncate text-ink">
                    <StatusDot status={s === "confirmed" ? "good" : s === "pending" ? "warning" : null} />
                    {e.email}
                    <span className="text-small text-muted">{t(`state.${s}`)}</span>
                  </span>
                  <span className="text-small text-muted">
                    {[e.where ?? t("anywhere"), e.when ? monthLabel(e.when) : t("anytime"), e.interests.map((v) => f.vibe(v)).join(", "), e.source ?? t("direct"), e.wantsToHost ? t("hostTag") : null, f.day(e.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > shown.length && (
          <button type="button" onClick={() => setAll(true)} className="mt-3 text-small font-semibold text-ink underline-offset-4 hover:underline">
            {t("showAll", { count: list.length })}
          </button>
        )}
      </AdminSection>
      <AdminSection title={t("overTime")}>
        <ColumnChart label={t("overTime")} data={w.overTime.map((p) => ({ label: dayLabel(p.week), value: p.total, current: runningState("week", p.week, inputs.today) }))} />
      </AdminSection>
      <div className="mt-(--adm-section) grid gap-x-16 md:grid-cols-2 [&>section]:mt-0 max-md:[&>section+section]:mt-14">
        <AdminSection title={t("sources")}>
          <BarList rows={w.bySource.map((s) => ({ key: s.key, label: s.key === "direct" ? t("direct") : s.key, value: s.count }))} />
        </AdminSection>
        <AdminSection title={t("interests")}>
          <BarList rows={w.byInterest.map((s) => ({ key: s.key, label: <VibeLabel vibe={s.key} />, value: s.count }))} />
        </AdminSection>
      </div>
    </AdminShell>
  );
}

type WaitlistStatus = ReturnType<typeof waitlistStatus>;

// ── Topics ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Analyse › "Themen-Score": a score per topic from reservations, applications, waitlist interest and host fees (TOPIC_WEIGHTS). */
export function ThemeScore() {
  const t = useTranslations("admin.topics");
  const inputs = useAdminInputs();
  const topics = topicScores(inputs);
  const weight = (w: number) => `${Math.round(w * 100)} %`;

  return (
    <>
      <p className="mb-(--adm-inner) text-small text-muted">
        {t("weights", { reservations: weight(TOPIC_WEIGHTS.reservations), applications: weight(TOPIC_WEIGHTS.applications), waitlist: weight(TOPIC_WEIGHTS.waitlistInterest), hostFee: weight(TOPIC_WEIGHTS.hostFeeShare) })}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-body">
          <thead className="text-small text-muted">
            <tr className="border-b border-ink/8">
              <th className="py-3 pr-4 font-medium">{t("col.topic")}</th>
              <th className="w-[30%] py-3 pr-4 font-medium">{t("col.score")}</th>
              <th className="py-3 pr-4 text-right font-medium">{t("col.reservations")}</th>
              <th className="py-3 pr-4 text-right font-medium">{t("col.applications")}</th>
              <th className="py-3 pr-4 text-right font-medium">{t("col.waitlist")}</th>
              <th className="py-3 text-right font-medium">{t("col.hostFee")}</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.vibe} className="border-b border-ink/8">
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2 text-ink">
                    <VibeLabel vibe={topic.vibe} />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-3">
                    <span className="w-8 shrink-0 tabular-nums font-semibold text-ink">{topic.score}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-adm-chart-track">
                      <span className="block h-full rounded-full bg-adm-chart-primary" style={{ width: `${topic.score}%` }} />
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">{topic.reservations}</td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">{topic.applications}</td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">{topic.waitlistInterest}</td>
                <td className="py-3 text-right tabular-nums text-muted">{percent(topic.hostFeeShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Algorithm ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The network today (Admin › Data & Algorithm, at the bottom): mutual Your people, repeat rate, days until full, and how fast Houses fill. */
export function NetworkToday() {
  const t = useTranslations("admin.algorithm");
  const inputs = useAdminInputs();
  const a = algorithmMetrics(inputs);

  return (
    <AdminSection title={t("title")}>
      <dl className="grid gap-y-8 md:grid-cols-3">
        {[
          { label: t("mutual"), value: percent(a.mutualShare), sub: t("mutualSub", { mutual: a.mutualPairs, all: a.allPairs, people: a.peopleWithMutual }) },
          { label: t("repeat"), value: percent(a.repeatRate), sub: t("repeatSub", { repeat: a.repeatGuests, guests: a.guests }) },
          { label: t("toFull"), value: a.medianDaysToFull === null ? t("none") : a.medianDaysToFull, sub: t("toFullSub", { count: a.fullHouses }) },
        ].map((s, i) => (
          <div key={s.label} className={i > 0 ? "md:border-l md:border-ink/8 md:px-6" : "md:pr-6"}>
            <dt className="text-small text-muted">{s.label}</dt>
            <dd className="mt-1 text-h1 tabular-nums text-ink">{s.value}</dd>
            <dd className="mt-1 text-small text-muted">{s.sub}</dd>
          </div>
        ))}
      </dl>
      <p className="mb-4 mt-(--adm-section) text-small text-muted">{t("toFullChart")}</p>
      <ColumnChart label={t("toFullChart")} data={a.daysToFullBuckets.map((b) => ({ label: b.key, value: b.count }))} unit={t("houses")} />
    </AdminSection>
  );
}

// ── Traffic ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminTraffic() {
  const { today } = useAdminInputs();
  const t = useTranslations("admin.traffic");
  const tAdmin = useTranslations("admin");
  const report = useMemo(() => getTrafficReport(), []);

  return (
    <AdminShell title={t("title")} badge={tAdmin("demoData")}>
      {!report ? (
        <p className="text-body text-muted">{t("unavailable")}</p>
      ) : (
        <>
          <StatRow
            stats={[
              { label: t("visitors"), value: num(report.visitorsPerWeek.at(-1)?.visitors ?? 0) },
              { label: t("countries"), value: report.countries.length },
              { label: t("sources"), value: report.sources.length },
              { label: t("step.signedUp"), value: num(report.funnel.at(-1)?.count ?? 0) },
            ]}
          />
          <AdminSection title={t("visitorsChart")}>
            <ColumnChart label={t("visitorsChart")} data={report.visitorsPerWeek.map((p) => ({ label: dayLabel(p.week), value: p.visitors, current: runningState("week", p.week, today) }))} />
          </AdminSection>
          <div className="mt-(--adm-section) grid gap-x-16 md:grid-cols-2 [&>section]:mt-0 max-md:[&>section+section]:mt-14">
            <AdminSection title={t("countries")}>
              <BarList rows={report.countries.map((c) => ({ key: c.country, label: c.country, value: c.share, display: percent(c.share) }))} />
            </AdminSection>
            <AdminSection title={t("sources")}>
              <BarList rows={report.sources.map((s) => ({ key: s.source, label: s.source, value: s.share, display: percent(s.share) }))} />
            </AdminSection>
          </div>
          <AdminSection title={t("funnel")}>
            <ol className="grid gap-y-6 md:grid-cols-4">
              {report.funnel.map((step, i) => (
                <li key={step.step} className={i > 0 ? "md:border-l md:border-ink/8 md:px-6" : "md:pr-6"}>
                  <p className="text-small text-muted">{t(`step.${step.step}`)}</p>
                  <p className="mt-1 text-h1 tabular-nums text-ink">{num(step.count)}</p>
                  {i > 0 && <p className="mt-1 text-small text-muted">{t("ofPrevious", { percent: Math.round((step.count / report.funnel[i - 1].count) * 100) })}</p>}
                </li>
              ))}
            </ol>
          </AdminSection>
        </>
      )}
    </AdminShell>
  );
}

// ── Log ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminLog() {
  const t = useTranslations("admin.log");
  const tAdmin = useTranslations("admin");
  const f = useFormat();
  const store = useStore();
  const { log } = useAdminData();
  const target = (entry: (typeof log)[number]) => (entry.action === "phase_changed" ? tAdmin(`platform.phases.${entry.target as "prelaunch" | "beta" | "live"}`) : entry.target);

  return (
    <AdminShell title={t("title")}>
      {log.length === 0 ? (
        <p className="text-body text-muted">{tAdmin("empty")}</p>
      ) : (
        <ul className="divide-y divide-ink/8">
          {log.map((entry) => (
            <li key={entry.id} className="grid gap-x-6 gap-y-0.5 py-3 text-body md:grid-cols-[160px_220px_minmax(0,1fr)_auto]">
              <span className="tabular-nums text-muted">
                {f.day(entry.createdAt)} · {f.time(entry.createdAt)}
              </span>
              {/* An entry of an action that no longer exists (saved in this browser) shows its raw name. */}
              <span className="font-semibold text-ink">{t.has(`action.${entry.action}`) ? t(`action.${entry.action}`) : entry.action}</span>
              <span className="min-w-0 truncate text-ink">{target(entry)}</span>
              <span className="text-small text-muted md:text-body">{t("by", { name: entry.by === "system" ? t("system") : (findUser(store, entry.by)?.name ?? entry.by) })}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
