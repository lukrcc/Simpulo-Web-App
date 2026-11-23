"use client";

// Admin › Houses › Themen (CLAUDE.md "Houses › Themen"): the supply per theme – horizontal bars per top theme (Houses opened in the period,
// opening to their sub themes), supply against demand (open Houses vs. saved searches, hearts, waitlist) with "Nachfrage ohne Angebot" at
// the strongest gaps, the trend against the period before, and the hosts' own labels no keyword knows ("Sonstige", to sort in at
// config/themes.ts). Every number from lib/admin/themeStats.ts; the themes from config/themes.ts.
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormat } from "@/i18n/format";
import { periodRanges } from "@/lib/admin/metrics";
import { useAdminPeriod } from "@/lib/admin/period";
import { themeStats } from "@/lib/admin/themeStats";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { num } from "@/lib/i18n/adminFormat";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { StatusDot } from "./AdminCharts";

/** The theme numbers for the period (the card and the view share them). */
export function useHouseThemes() {
  const inputs = useAdminInputs();
  const { savedSearches } = useStore();
  const [period] = useAdminPeriod();
  const f = useFormat();
  const stats = useMemo(
    () => themeStats({ stays: inputs.stays, users: inputs.users, savedSearches, waitlist: inputs.admin.waitlist, today: inputs.today, ranges: periodRanges(inputs.today, period) }),
    [inputs, savedSearches, period],
  );
  const name = (id: string) => f.vibe(id as Parameters<typeof f.vibe>[0]);
  return {
    ...stats,
    name,
    top: stats.top && { name: name(stats.top.id), count: stats.top.total },
    low: stats.low && { name: name(stats.low.id), count: stats.low.total },
    gaps: stats.gaps.map((g) => ({ ...g, name: name(g.id) })),
  };
}

const head = "mb-(--adm-inner) flex items-baseline justify-between gap-3 text-eyebrow uppercase text-(--adm-label)";

export function HouseThemesView() {
  const t = useTranslations("admin.houseThemes");
  const ts = useTranslations("admin.themes.sub");
  const data = useHouseThemes();
  const [openId, setOpenId] = useState<string | null>(null);
  const max = Math.max(1, ...data.rows.map((r) => r.opened));
  const gapIds = new Set(data.gaps.slice(0, 3).map((g) => g.id));
  const subName = (id: string) => (id ? (ts.has(id as "running") ? ts(id as "running") : id) : t("noSub"));
  return (
    <div data-house-themes className="flex flex-col gap-(--adm-section)">
      <div className="flex justify-end">
        <Link href="/admin/topics?topic=topic&tab=topic" className="text-small font-semibold text-ink underline-offset-4 hover:underline">
          {t("analysisLink")}
        </Link>
      </div>

      {/* Opened in the period per top theme – a click opens its sub themes. */}
      <section aria-label={t("opened")}>
        <h2 className={head}>{t("opened")}</h2>
        <ul className="flex flex-col gap-1">
          {data.rows.map((r) => {
            const expanded = openId === r.id;
            return (
              <li key={r.id} data-theme-row={r.id}>
                <button type="button" onClick={() => setOpenId(expanded ? null : r.id)} aria-expanded={expanded} className="adm-press grid w-full grid-cols-[minmax(0,180px)_minmax(0,1fr)_64px_20px] items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-(--adm-block)">
                  <span className="truncate text-body text-ink">{data.name(r.id)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-adm-chart-track">
                    <span className="block h-full rounded-full bg-adm-chart-primary" style={{ width: `${(r.opened / max) * 100}%` }} />
                  </span>
                  <span className="text-right text-body font-semibold tabular-nums text-ink">{num(r.opened)}</span>
                  <ChevronDown aria-hidden className={cn("size-4 text-muted transition-transform", expanded && "rotate-180", r.subs.length === 0 && "opacity-0")} />
                </button>
                {expanded && r.subs.length > 0 && (
                  <ul className="mb-2 ml-6 flex flex-col gap-1 border-l border-(--line) pl-4">
                    {r.subs.map((x) => (
                      <li key={x.id || "none"} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_150px] items-center gap-3 py-0.5 text-small">
                        <span className="truncate text-ink">{subName(x.id)}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-adm-chart-track">
                          <span className="block h-full rounded-full bg-adm-chart-primary opacity-70" style={{ width: `${(x.opened / max) * 100}%` }} />
                        </span>
                        <span className="text-right whitespace-nowrap tabular-nums text-muted">{t("subLine", { opened: num(x.opened), open: num(x.open) })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Supply against demand, the trend beside it; the strongest gaps marked. */}
      <section aria-label={t("supplyDemand")}>
        <h2 className={head}>
          {t("supplyDemand")}
          <span className="normal-case tracking-normal">{t("demandNote")}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-body">
            <thead>
              <tr className="text-left text-small text-muted">
                <th className="py-2 font-normal">{t("col.theme")}</th>
                <th className="py-2 text-right font-normal">{t("col.open")}</th>
                <th className="py-2 text-right font-normal">{t("col.searches")}</th>
                <th className="py-2 text-right font-normal">{t("col.saved")}</th>
                <th className="py-2 text-right font-normal">{t("col.waitlist")}</th>
                <th className="py-2 text-right font-normal">{t("col.trend")}</th>
                <th className="py-2 pl-4 font-normal">{t("col.hint")}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows
                .toSorted((a, b) => b.demand - a.demand || b.open - a.open)
                .map((r) => {
                  const diff = r.opened - r.openedBefore;
                  return (
                    <tr key={r.id} data-theme-demand={r.id} className="border-t border-(--line)">
                      <td className="py-2 text-ink">{data.name(r.id)}</td>
                      <td className="py-2 text-right tabular-nums text-ink">{num(r.open)}</td>
                      <td className="py-2 text-right tabular-nums text-ink">{num(r.searches)}</td>
                      <td className="py-2 text-right tabular-nums text-ink">{num(r.saved)}</td>
                      <td className="py-2 text-right tabular-nums text-ink">{num(r.waitlist)}</td>
                      <td className="py-2 text-right tabular-nums">
                        <span className={diff > 0 ? "text-(--adm-trend-up)" : diff < 0 ? "text-(--adm-trend-down)" : "text-muted"}>{diff > 0 ? t("growing", { n: num(diff) }) : diff < 0 ? t("shrinking", { n: num(-diff) }) : t("same")}</span>
                      </td>
                      <td className="py-2 pl-4">
                        {gapIds.has(r.id) && (
                          <span data-theme-gap className="inline-flex items-center gap-1.5 text-small font-semibold text-ink">
                            <StatusDot status="warning" />
                            {t("gap")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* "Sonstige": hosts' own labels no keyword knows – to sort in at config/themes.ts. */}
      <section aria-label={t("other")}>
        <h2 className={head}>
          {t("other")}
          <span className="normal-case tracking-normal">{t("otherNote")}</span>
        </h2>
        {data.unknown.length === 0 ? (
          <p className="text-body text-muted">{t("otherNone")}</p>
        ) : (
          <ul className="divide-y divide-(--line) border-y border-(--line)">
            {data.unknown.map((u) => (
              <li key={u.stay.id} className="flex items-center justify-between gap-3 py-2 text-body">
                <span className="font-semibold text-ink">„{u.label}“</span>
                <span className="truncate text-small text-muted">{u.stay.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
