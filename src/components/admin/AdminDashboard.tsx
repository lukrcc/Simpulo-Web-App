"use client";

// The read-only areas of /admin: Overview, Waitlist, Topics, Algorithm, Traffic, Log. Every number comes from lib/admin/metrics.ts.
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { LAUNCH_CRITERIA, TOPIC_WEIGHTS } from "@/config/admin";
import { VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { algorithmMetrics, fullHousesPerMonth, getStatus, launchProgress, overview, topicScores, waitlistMetrics } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getTrafficReport } from "@/lib/data";
import { findUser, useStore } from "@/lib/store";
import type { Vibe } from "@/lib/types";
import { BarList, ColumnChart, ProgressBar, TrendChart } from "./AdminCharts";
import { AdminSection, AdminShell, StatRow } from "./AdminShell";

const percent = (ratio: number | null) => (ratio === null ? "–" : `${Math.round(ratio * 100)} %`);
const num = (n: number) => n.toLocaleString("en-US");
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

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

// ── Overview ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminOverview() {
  const t = useTranslations("admin.overview");
  const tNav = useTranslations("admin.nav");
  const inputs = useAdminInputs();
  const o = overview(inputs);
  const launch = launchProgress(inputs);
  const move = fullHousesPerMonth(inputs);

  const criteria = [
    { key: "houses", status: getStatus("realHouses", launch.houses.value), label: t("criteria.houses"), p: launch.houses, text: t("ofTarget", { value: num(launch.houses.value), target: num(launch.houses.target) }) },
    { key: "hubs", status: getStatus("hubs", launch.hubs.value), label: t("criteria.hubs", { min: LAUNCH_CRITERIA.hubMinHouses }), p: launch.hubs, text: t("hubsTarget", { value: launch.hubs.value, min: LAUNCH_CRITERIA.hubs.min, max: LAUNCH_CRITERIA.hubs.max }) },
    { key: "reserved", status: getStatus("reservedShare", launch.reservedShare.value), label: t("criteria.reservedShare", { min: LAUNCH_CRITERIA.reservationsMin }), p: launch.reservedShare, text: t("ofTargetPercent", { value: launch.reservedShare.value, target: launch.reservedShare.target }) },
    { key: "waitlist", status: getStatus("waitlist", launch.waitlist.value), label: t("criteria.waitlist"), p: launch.waitlist, text: t("ofTarget", { value: num(launch.waitlist.value), target: num(launch.waitlist.target) }) },
  ];

  return (
    <AdminShell title={tNav("overview")} intro={t("intro")}>
      <StatRow
        stats={[
          { label: t("realHouses"), value: num(o.realHouses) },
          { label: t("reservedShare"), value: percent(o.reservedShare) },
          { label: t("waitlist"), value: num(o.waitlist) },
          { label: t("openApplications"), value: num(o.openApplications) },
        ]}
      />
      <AdminSection title={t("launch")}>
        <ul className="grid gap-x-12 gap-y-6 md:grid-cols-2">
          {criteria.map((c) => (
            <li key={c.key}>
              <div className="mb-2 flex items-baseline justify-between gap-3 text-body">
                <span className="text-ink">{c.label}</span>
                <span className="shrink-0 tabular-nums text-muted">{c.text}</span>
              </div>
              <ProgressBar ratio={c.p.ratio} label={c.label} status={c.status} />
            </li>
          ))}
        </ul>
      </AdminSection>
      <AdminSection title={t("move")} aside={<span className="text-small text-muted">{t("moveSub", { target: move.target, current: move.current })}</span>}>
        <ColumnChart label={t("move")} data={move.rows.map((r) => ({ label: monthLabel(r.month), value: r.full }))}
          target={move.target}
          statusOf={(value) => getStatus("fullHousesPerMonth", value)}
          height={240}
        />
      </AdminSection>
    </AdminShell>
  );
}

// ── Waitlist ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminWaitlist() {
  const t = useTranslations("admin.waitlist");
  const tNav = useTranslations("admin.nav");
  const f = useFormat();
  const inputs = useAdminInputs();
  const w = waitlistMetrics(inputs);
  const latest = inputs.admin.waitlist.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  return (
    <AdminShell title={tNav("waitlist")} intro={t("intro")}>
      <StatRow
        stats={[
          { label: t("total"), value: num(w.total) },
          { label: t("lastWeek"), value: `+${num(w.lastWeek)}` },
          { label: t("wantsToHost"), value: num(w.wantsToHost) },
          { label: t("referred"), value: num(w.referred) },
        ]}
      />
      <AdminSection title={t("overTime")}>
        <TrendChart label={t("overTime")} data={w.overTime.map((p) => ({ label: dayLabel(p.week), value: p.total }))} />
      </AdminSection>
      <div className="grid gap-x-16 md:grid-cols-2">
        <AdminSection title={t("sources")}>
          <BarList tone="chart-2" rows={w.bySource.map((s) => ({ key: s.key, label: s.key === "direct" ? t("direct") : s.key, value: s.count }))} />
        </AdminSection>
        <AdminSection title={t("interests")}>
          <BarList tone="chart-3" rows={w.byInterest.map((s) => ({ key: s.key, label: <VibeLabel vibe={s.key} />, value: s.count }))} />
        </AdminSection>
      </div>
      <AdminSection title={t("latest")}>
        <ul className="divide-y divide-ink/8">
          {latest.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-body">
              <span className="min-w-0 truncate text-ink">{e.email}</span>
              <span className="text-small text-muted">
                {[e.where ?? t("anywhere"), e.when ? monthLabel(e.when) : t("anytime"), e.interests.map((v) => f.vibe(v)).join(", "), e.source ?? t("direct"), e.wantsToHost ? t("hostTag") : null, f.day(e.createdAt)].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </AdminSection>
    </AdminShell>
  );
}

// ── Topics ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminTopics() {
  const t = useTranslations("admin.topics");
  const tNav = useTranslations("admin.nav");
  const inputs = useAdminInputs();
  const topics = topicScores(inputs);
  const weight = (w: number) => `${Math.round(w * 100)} %`;

  return (
    <AdminShell title={tNav("topics")} intro={t("intro")}>
      <p className="mb-6 text-small text-muted">
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
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                      <span className="block h-full rounded-full bg-adm-chart-1" style={{ width: `${topic.score}%` }} />
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
    </AdminShell>
  );
}

// ── Algorithm ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminAlgorithm() {
  const t = useTranslations("admin.algorithm");
  const tNav = useTranslations("admin.nav");
  const inputs = useAdminInputs();
  const a = algorithmMetrics(inputs);

  return (
    <AdminShell title={tNav("algorithm")} intro={t("intro")}>
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
      <AdminSection title={t("toFullChart")}>
        <ColumnChart label={t("toFullChart")} data={a.daysToFullBuckets.map((b) => ({ label: b.key, value: b.count }))} unit={t("houses")} tone="chart-2" />
      </AdminSection>
    </AdminShell>
  );
}

// ── Traffic ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function AdminTraffic() {
  const t = useTranslations("admin.traffic");
  const tAdmin = useTranslations("admin");
  const report = useMemo(() => getTrafficReport(), []);

  return (
    <AdminShell title={tAdmin("nav.traffic")} intro={t("intro")} badge={tAdmin("demoData")}>
      {!report ? (
        <p className="text-body text-muted">{t("unavailable")}</p>
      ) : (
        <>
          <p className="-mt-4 mb-8 text-small text-muted">{t("note")}</p>
          <StatRow
            stats={[
              { label: t("visitors"), value: num(report.visitorsPerWeek.at(-1)?.visitors ?? 0) },
              { label: t("countries"), value: report.countries.length },
              { label: t("sources"), value: report.sources.length },
              { label: t("step.signedUp"), value: num(report.funnel.at(-1)?.count ?? 0) },
            ]}
          />
          <AdminSection title={t("visitorsChart")}>
            <TrendChart label={t("visitorsChart")} data={report.visitorsPerWeek.map((p) => ({ label: dayLabel(p.week), value: p.visitors }))} />
          </AdminSection>
          <div className="grid gap-x-16 md:grid-cols-2">
            <AdminSection title={t("countries")}>
              <BarList tone="chart-2" rows={report.countries.map((c) => ({ key: c.country, label: c.country, value: c.share, display: percent(c.share) }))} />
            </AdminSection>
            <AdminSection title={t("sources")}>
              <BarList tone="chart-3" rows={report.sources.map((s) => ({ key: s.source, label: s.source, value: s.share, display: percent(s.share) }))} />
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
    <AdminShell title={tAdmin("nav.log")} intro={t("intro")}>
      {log.length === 0 ? (
        <p className="text-body text-muted">{tAdmin("empty")}</p>
      ) : (
        <ul className="divide-y divide-ink/8">
          {log.map((entry) => (
            <li key={entry.id} className="grid gap-x-6 gap-y-0.5 py-3 text-body md:grid-cols-[160px_220px_minmax(0,1fr)_auto]">
              <span className="tabular-nums text-muted">
                {f.day(entry.createdAt)} · {f.time(entry.createdAt)}
              </span>
              <span className="font-semibold text-ink">{t(`action.${entry.action}`)}</span>
              <span className="min-w-0 truncate text-ink">{target(entry)}</span>
              <span className="text-small text-muted md:text-body">{t("by", { name: findUser(store, entry.by)?.name ?? entry.by })}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
