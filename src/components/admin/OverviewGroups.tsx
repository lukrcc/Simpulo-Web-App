"use client";

// Admin › Übersicht, the group capsules (CLAUDE.md "Übersicht mit Kapseln"): Heute · Richtung · Geld · Nachfrage · Qualität. Each shows its
// group's tiles on top (the tile a click came from marked, ?focus=) and under them the group's details – built from the pages' own parts,
// never copies: Heute the most urgent tasks and Houses in need (Aufgaben, Houses), Richtung the pipeline's stages, the countdown and the
// Market Cap (Marketing, Finanzierung), Geld the profit chart (Geld › Verlauf), Nachfrage the funnel and the channels (Wachstum › Herkunft),
// Qualität full Houses, connection rate and repeat guests per month as bars. Every number from lib/admin/metrics.ts.
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { launchCountdown, monthlySeries, needsHelp } from "@/lib/admin/metrics";
import { taskArea, type AdminTask } from "@/lib/admin/tasks";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { month, num } from "@/lib/i18n/adminFormat";
import type { MarketingContactStatus } from "@/lib/data/adapter";
import type { OverviewGroup } from "@/config/admin/overview";
import { BarList, ColumnChart } from "./AdminCharts";
import { KindDot, useSentence } from "./AdminInbox";
import { AdminMarketCap } from "./AdminMarketCap";
import { PhaseTimeline } from "./AdminMarketing";
import { Origin } from "./AdminGrowth";
import { ProfitDrill } from "./ProfitDrill";
import { TileBoard, type TileSpec } from "./AdminTiles";
import type { AreaColor } from "./AdminShell";

/** The tiles' height on a group capsule: fixed, the details take the rest. */
const GROUP_TILE_H = 150;
/** How many tasks and Houses Heute lists. */
const TODAY_ROWS = 6;
/** The pipeline's stages in order (Marketing › Pipeline). */
const STAGES: readonly MarketingContactStatus[] = ["open", "replied", "demo", "house", "later"];

const heading = "mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)";

export function OverviewGroupView({ group, area, tiles, funnel }: { group: OverviewGroup; area: AreaColor; tiles: readonly TileSpec[]; funnel: { visitors: number; requests: number; bookings: number } }) {
  const t = useTranslations("admin.cockpit");
  return (
    <div data-overview-group={group} className="flex flex-col gap-(--adm-section)">
      <TileBoard label={t(`tabs.${group}`)} rows={[{ key: group, group: area, tiles: tiles.map((tile) => ({ ...tile, href: undefined, onOpen: undefined, focusKey: tile.key })) }]} fixedHeight={GROUP_TILE_H} spacious />
      {group === "today" && <Today />}
      {group === "direction" && <Direction />}
      {group === "money" && <ProfitDrill fill />}
      {group === "demand" && <Demand funnel={funnel} />}
      {group === "quality" && <Quality />}
    </div>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className={heading}>{title}</h2>
      {children}
    </section>
  );
}

/** Heute: the most urgent tasks (safety first, then newest – as in Aufgaben) and the Houses in need (most urgent first – as in Houses). */
function Today() {
  const t = useTranslations("admin.cockpit.detail");
  const inputs = useAdminInputs();
  const tasks = useAdminTasks();
  const sentence = useSentence();
  const rank = (x: AdminTask) => (taskArea(x) === "safety" ? 0 : 1);
  const urgent = tasks.toSorted((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt)).slice(0, TODAY_ROWS);
  const help = needsHelp(inputs).slice(0, TODAY_ROWS);
  const row = "flex min-h-(--adm-row-h) items-center gap-3 py-1.5 adm-press";
  return (
    <div className="grid gap-x-(--adm-section) gap-y-(--adm-inner) lg:grid-cols-2">
      <Column title={t("tasks")}>
        {urgent.length === 0 ? (
          <p className="text-body text-muted">{t("tasksNone")}</p>
        ) : (
          <ul className="divide-y divide-(--line) border-y border-(--line)">
            {urgent.map((task) => (
              <li key={task.id}>
                <Link href={`/admin/aufgaben?task=${encodeURIComponent(task.id)}`} data-overview-task={task.id} className={row}>
                  <KindDot area={taskArea(task)} />
                  <span className="min-w-0 flex-1 truncate text-body text-ink">{sentence(task)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {tasks.length > urgent.length && (
          <Link href="/admin/aufgaben" className="mt-3 inline-block text-small font-semibold text-ink underline-offset-4 hover:underline">
            {t("tasksAll", { count: tasks.length })}
          </Link>
        )}
      </Column>
      <Column title={t("houses")}>
        {help.length === 0 ? (
          <p className="text-body text-muted">{t("housesNone")}</p>
        ) : (
          <ul className="divide-y divide-(--line) border-y border-(--line)">
            {help.map((h) => (
              <li key={h.stay.id}>
                <Link href={`/admin/houses?tab=atRisk&house=${encodeURIComponent(h.stay.id)}`} data-overview-house={h.stay.id} className={row}>
                  <span className="min-w-0 flex-1 truncate text-body text-ink">{h.stay.title}</span>
                  <span className="shrink-0 text-small tabular-nums text-muted">{t("houseLine", { days: h.daysToStart, missing: h.missing })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Column>
    </div>
  );
}

/** Richtung: the pipeline's stages and the countdown (Marketing), the Market Cap with its span (Finanzierung › Bewertung). */
function Direction() {
  const t = useTranslations("admin.cockpit.detail");
  const tp = useTranslations("admin.marketing.pipeline");
  const inputs = useAdminInputs();
  const contacts = inputs.admin.marketingContacts ?? [];
  const c = launchCountdown(inputs);
  return (
    <div className="flex flex-col gap-(--adm-section)">
      {/* The countdown over the full width: the phases need it to show their names. */}
      <Column title={t("countdown")}>
        <p className="mb-3 text-body text-ink">
          {c.state === "before" ? `${t("startIn", { days: c.daysToStart })} · ${t("launchIn", { days: c.daysLeft })}` : t("launchIn", { days: Math.max(0, c.daysLeft) })}
        </p>
        <PhaseTimeline today={inputs.today} launchDate={c.launchDate} current={c.phase} phases={c.phases} />
      </Column>
      <div className="grid gap-x-(--adm-section) gap-y-(--adm-section) lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Column title={t("pipeline")}>
          <BarList rows={STAGES.map((s) => ({ key: s, label: tp(`columns.${s}`), value: contacts.filter((x) => x.status === s).length, display: num(contacts.filter((x) => x.status === s).length) }))} />
        </Column>
        <div className="min-w-0">
          <AdminMarketCap embedded />
        </div>
      </div>
    </div>
  );
}

/** Nachfrage: the funnel visitors → requests → bookings (the tiles' numbers) and the channels (Wachstum › Herkunft). */
function Demand({ funnel }: { funnel: { visitors: number; requests: number; bookings: number } }) {
  const t = useTranslations("admin.cockpit.detail");
  return (
    // The funnel above, the channels over the full width under it (their three cards need it).
    <div className="flex flex-col gap-(--adm-section)">
      <Column title={t("funnel")}>
        <BarList
          className="max-w-[640px]"
          rows={[
            { key: "visitors", label: t("funnelVisitors"), value: funnel.visitors, display: num(funnel.visitors) },
            { key: "requests", label: t("funnelRequests"), value: funnel.requests, display: num(funnel.requests) },
            { key: "bookings", label: t("funnelBookings"), value: funnel.bookings, display: num(funnel.bookings) },
          ]}
        />
      </Column>
      <div className="min-w-0">
        <Origin />
      </div>
    </div>
  );
}

/** Qualität: full Houses, connection rate and repeat guests per month (the last 12, this month running) as bars. */
function Quality() {
  const t = useTranslations("admin.cockpit.detail");
  const inputs = useAdminInputs();
  const rows = monthlySeries(inputs);
  const connection = inputs.history?.series?.connectionRate;
  const point = (m: string, value: number, i: number) => ({ label: month(m).replace(".", ""), value, current: i === rows.length - 1 ? ("running" as const) : null });
  const charts = [
    { key: "full", title: t("fullPerMonth"), unit: undefined, data: rows.map((r, i) => point(r.month, r.full, i)) },
    { key: "connection", title: t("connectionPerMonth"), unit: "%", data: connection ? rows.flatMap((r, i) => (connection[i] === undefined ? [] : [point(r.month, connection[i], i)])) : [] },
    { key: "repeat", title: t("repeatPerMonth"), unit: "%", data: rows.flatMap((r, i) => (r.repeatRate === null ? [] : [point(r.month, r.repeatRate, i)])) },
  ];
  return (
    <div className="grid gap-x-(--adm-section) gap-y-(--adm-section) lg:grid-cols-3">
      {charts.map((c) => (
        <Column key={c.key} title={c.title}>
          {c.data.length ? <ColumnChart data={c.data} unit={c.unit} height={260} label={c.title} /> : <p className="text-body text-muted">{t("noSeries")}</p>}
        </Column>
      ))}
    </div>
  );
}
