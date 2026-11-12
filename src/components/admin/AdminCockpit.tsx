"use client";

// /admin – the Cockpit: the move target on top, then Supply · Demand · Quality · Money (three numbers each, with status, change against last
// week and the last 8 weeks), the launch criteria and the top topics. Every number from lib/admin/metrics.ts (cockpit); status colours only
// from getStatus. Bento tiles (radius 24) on the page – nothing boxed inside them.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { cockpit, getStatus, type CockpitNumber, type Status } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { cn } from "@/lib/utils";
import { BarList, ColumnChart, ProgressBar, Sparkline, STATUS_SOFT, StatusDot } from "./AdminCharts";
import { AdminShell } from "./AdminShell";

const num = (n: number) => n.toLocaleString("en-US");
const eur = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

/** Where each tile leads. Money has no area of its own yet – it goes to the Overview (full Houses per month). */
const GROUP_HREF = { supply: "/admin/houses", demand: "/admin/waitlist", quality: "/admin/algorithm", money: "/admin/overview" } as const;
type Group = keyof typeof GROUP_HREF;

function valueText(n: CockpitNumber): string {
  if (n.value === null) return "–";
  if (n.format === "text") return n.text ?? "–";
  if (n.format === "percent") return `${n.value} %`;
  if (n.format === "days") return `${n.value} d`;
  if (n.format === "eur") return eur(n.value);
  return num(n.value);
}

function deltaText(n: CockpitNumber): string | null {
  if (n.delta === null) return null;
  if (n.delta === 0) return "–";
  const size = Math.abs(n.delta);
  const amount = n.format === "percent" ? `${size} pts` : n.format === "days" ? `${size} d` : n.format === "eur" ? eur(size) : num(size);
  return `${n.delta > 0 ? "▲" : "▼"} ${amount}`;
}

export function AdminCockpit() {
  const t = useTranslations("admin.cockpit");
  const tAdmin = useTranslations("admin");
  const c = cockpit(useAdminInputs());
  const { move } = c;

  return (
    <AdminShell title={tAdmin("nav.cockpit")} intro={t("intro")}>
      {/* The move target, full width – the tile takes its status's soft surface. */}
      <Link
        href="/admin/overview"
        className={cn("group grid gap-8 rounded-[24px] p-6 transition-opacity hover:opacity-90 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end", move.status ? STATUS_SOFT[move.status] : "bg-surface")}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-eyebrow uppercase text-muted">
            <StatusDot status={move.status} />
            {t("move")}
            <span className="sr-only">· {tAdmin(`status.${move.status ?? "none"}`)}</span>
          </p>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-display tabular-nums text-ink">{num(move.current)}</span>
            <span className="text-h3 text-muted">{t("moveTarget", { target: move.target })}</span>
            <span className="text-small text-muted">· {tAdmin(`status.${move.status ?? "none"}`)}</span>
          </p>
          <div className="mt-5 max-w-xl">
            <ProgressBar ratio={move.progress.ratio} label={t("move")} status={move.status} />
          </div>
          <p className="mt-3 text-body text-ink">{t("streak", { streak: move.streak, of: move.streakOf })}</p>
        </div>
        <ColumnChart
          label={t("move")}
          data={move.rows.slice(-6).map((r) => ({ label: monthLabel(r.month), value: r.full }))}
          target={move.target}
          statusOf={(value) => getStatus("fullHousesPerMonth", value)}
          height={150}
        />
      </Link>

      <div className="mt-4 grid gap-4 md:grid-cols-2 min-[90rem]:grid-cols-4">
        {(Object.keys(c.groups) as Group[]).map((group) => (
          <GroupTile key={group} group={group} numbers={c.groups[group]} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] bg-surface p-6">
          <h2 className="text-eyebrow uppercase text-muted">{t("launch")}</h2>
          <LaunchList items={c.launch} />
        </section>
        <section className="rounded-[24px] bg-surface p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-eyebrow uppercase text-muted">{t("topics")}</h2>
            <Link href="/admin/topics" className="text-small font-semibold text-ink hover:underline">
              {t("allTopics")}
            </Link>
          </div>
          <TopicBars topics={c.topics} />
        </section>
      </div>
    </AdminShell>
  );
}

/** One area as a tile (the whole tile leads into its tab): its name, then three numbers – status dot, value, change, the last 8 weeks. */
function GroupTile({ group, numbers }: { group: Group; numbers: readonly CockpitNumber[] }) {
  const t = useTranslations("admin.cockpit");
  const tAdmin = useTranslations("admin");
  return (
    <Link href={GROUP_HREF[group]} aria-label={t("open", { area: t(`group.${group}`) })} className="group flex flex-col rounded-[24px] bg-surface p-6 transition-colors duration-150 hover:bg-surface-2">
      <span className="flex items-center justify-between">
        <span className="text-h3 text-ink">{t(`group.${group}`)}</span>
        <ArrowRight aria-hidden className="size-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
      <span className="mt-5 flex flex-col gap-5">
        {numbers.map((n) => (
          // The label across the tile (never cut), below it the value and its change, the last 8 weeks beside them.
          <span key={n.key} className="block">
            <span className="flex items-center gap-2 text-small text-muted">
              <StatusDot status={n.status} />
              <span>{t(`metric.${n.key}`)}</span>
              <span className="sr-only">· {tAdmin(`status.${n.status ?? "none"}`)}</span>
            </span>
            <span className="mt-1 flex items-end justify-between gap-3">
              <span className="min-w-0">
                {/* A word (the best source) one step smaller than a number, so it fits beside the sparkline at every width. */}
                <span className={cn("block truncate tabular-nums text-ink", n.format === "text" ? "text-h3" : "text-h2")}>{valueText(n)}</span>
                <span className="mt-0.5 block text-small tabular-nums text-muted">
                  {n.format === "text" && n.value !== null ? `${t("signups", { count: n.value })} · ` : ""}
                  {deltaText(n) ?? ""}
                </span>
              </span>
              <Sparkline values={n.spark} width={64} label={`${t(`metric.${n.key}`)} · ${t("weeks")}`} />
            </span>
          </span>
        ))}
      </span>
    </Link>
  );
}

function LaunchList({ items }: { items: ReturnType<typeof cockpit>["launch"] }) {
  const t = useTranslations("admin.overview");
  const label = (key: string) => (key === "houses" ? t("criteria.houses") : key === "hubs" ? t("criteria.hubs", { min: 5 }) : key === "reservedShare" ? t("criteria.reservedShare", { min: 2 }) : t("criteria.waitlist"));
  const text = (item: (typeof items)[number]) =>
    item.key === "reservedShare" ? t("ofTargetPercent", { value: item.progress.value, target: item.progress.target }) : t("ofTarget", { value: num(item.progress.value), target: num(item.progress.target) });
  return (
    <ul className="mt-5 flex flex-col gap-5">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-body">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <StatusDot status={item.status as Status | null} />
              <span>{label(item.key)}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">{text(item)}</span>
          </div>
          <ProgressBar ratio={item.progress.ratio} label={label(item.key)} status={item.status} />
        </li>
      ))}
    </ul>
  );
}

function TopicBars({ topics }: { topics: ReturnType<typeof cockpit>["topics"] }) {
  const f = useFormat();
  return (
    <BarList
      className="mt-5"
      tone="chart-1"
      rows={topics.map((topic) => {
        const Icon = VIBE_ICONS[topic.vibe];
        return {
          key: topic.vibe,
          value: topic.score,
          label: (
            <>
              <Icon aria-hidden className="size-4 shrink-0 text-ink/60" strokeWidth={1.75} />
              <span className="truncate">{f.vibe(topic.vibe)}</span>
            </>
          ),
        };
      })}
    />
  );
}
