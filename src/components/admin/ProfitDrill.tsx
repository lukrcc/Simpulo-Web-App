"use client";

// The profit chart with its drill-down (moved from the overview to Admin › Geld › Überblick): the admin's period's bars (DrillChart), a
// click opens a bar one level deeper (Jahr → Quartal → Monat → Woche → Tage with what happened); the opened chain in the URL (?zoom=…,
// other parameters kept), so the browser's back works. No goal line (no money targets).
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CHILD_LEVEL, type ChartLevel, type ComparePeriod } from "@/config/admin";
import { useAdminPeriod } from "@/lib/admin/period";
import { chartBuckets, getChange, periodEnd, periodStart, type ChartView } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { chartTick, chartTitle } from "@/lib/i18n/adminFormat";
import { DrillChart, type DrillBar } from "./AdminCharts";
import { ChangeLine } from "./AdminNumbers";

/** The chart's height when it doesn't fill the window. */
const FIXED_HEIGHT = 280;

/** One opened bar in the URL (?zoom=year:2026-01-01,quarter:2026-07-01): its level and first day. */
interface ZoomStep {
  level: ComparePeriod;
  start: string;
}

/** ?zoom= → the chain of opened bars; only a valid chain that starts at the chosen period (Jahr → Quartal → Monat → Woche). */
function parseZoom(raw: string | null, period: ComparePeriod): ZoomStep[] {
  if (!raw) return [];
  const steps: ZoomStep[] = [];
  let expect: ChartLevel = period;
  for (const part of raw.split(",")) {
    const [level, start] = part.split(":");
    if (level !== expect || !/^\d{4}-\d{2}-\d{2}$/.test(start ?? "") || level === "day") return [];
    steps.push({ level: level as ComparePeriod, start: periodStart(start, level as ComparePeriod) });
    expect = CHILD_LEVEL[level as ComparePeriod];
  }
  return steps;
}
const zoomParam = (steps: readonly ZoomStep[]) => steps.map((z) => `${z.level}:${z.start}`).join(",");

/** The profit chart with its drill-down; `fill` lets it take the rest of the window. */
export function ProfitDrill({ fill = false }: { fill?: boolean }) {
  const t = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [period] = useAdminPeriod();
  const rawZoom = params.get("zoom");
  const zoom = useMemo(() => parseZoom(rawZoom, period), [rawZoom, period]);
  const go = useCallback(
    (steps: readonly ZoomStep[]) => {
      const q = new URLSearchParams(params.toString());
      if (steps.length) q.set("zoom", zoomParam(steps));
      else q.delete("zoom");
      const query = q.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, params],
  );
  // A chain from another period is dropped.
  useEffect(() => {
    if (rawZoom && zoom.length === 0) go([]);
  }, [rawZoom, zoom.length, go]);
  const last = zoom.at(-1) ?? null;
  const view: ChartView = last ? { level: CHILD_LEVEL[last.level], within: { from: last.start, to: periodEnd(last.start, last.level) } } : { level: period, within: null };
  const viewKey = `${view.level}:${view.within?.from ?? "root"}`;
  const bars = useMemo<DrillBar[]>(() => {
    return chartBuckets(inputs, view).map((b) => {
      const tick = chartTick(b.from, b.to, b.level);
      return {
        key: b.from,
        main: tick.main,
        sub: tick.sub,
        title: chartTitle(b.from, b.to, b.level),
        value: b.profit,
        change: <ChangeLine change={b.profit === null ? null : getChange("profit", b.profit, b.previous)} against={t("chart.againstPrev")} />,
        current: b.current,
        events: b.events,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the view is described by viewKey
  }, [inputs, viewKey, t]);
  const title = last ? t(`chart.zoomTitle.${view.level as "day" | "week" | "month" | "quarter"}`, { range: chartTitle(last.start, periodEnd(last.start, last.level), last.level) }) : t(`chart.profitTitle.${period}`);
  const crumbs = [{ label: t(`chart.root.${period}`), steps: [] as ZoomStep[] }, ...zoom.map((z, i) => ({ label: chartTick(z.start, periodEnd(z.start, z.level), z.level).main, steps: zoom.slice(0, i + 1) }))];
  return (
    <ProfitPanel
      title={title}
      bars={bars}
      viewKey={viewKey}
      days={view.level === "day"}
      onOpen={view.level === "day" ? undefined : (key) => go([...zoom, { level: view.level as ComparePeriod, start: periodStart(key, view.level) }])}
      crumbs={zoom.length ? crumbs : null}
      onCrumb={(steps) => go(steps)}
      fill={fill}
    />
  );
}

/**
 * The profit chart (DrillChart) with its own state – hovering never re-renders the page: the root's periods or one opened bar a level deeper;
 * a click on a bar opens it (not on days). Above it, once opened, "‹ {parent}" and the crumbs; under a week's days what happened. No goal
 * line (no money targets). With `fill` its height fills the rest of the window (at least 140px); otherwise a fixed height.
 */
/** What stays free under the chart: the page's bottom padding (admin main, --adm-page-top below) – measured so nothing scrolls. */
const BOTTOM_GAP = 40;

const ProfitPanel = memo(function ProfitPanel({
  title,
  bars,
  viewKey,
  days,
  onOpen,
  crumbs,
  onCrumb,
  fill,
}: {
  title: string;
  bars: readonly (DrillBar & { events?: { requests: number; paid: number; houses: number } })[];
  viewKey: string;
  days: boolean;
  onOpen?: (key: string) => void;
  crumbs: readonly { label: string; steps: ZoomStep[] }[] | null;
  onCrumb: (steps: ZoomStep[]) => void;
  fill: boolean;
}) {
  const t = useTranslations("admin.cockpit");
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(FIXED_HEIGHT);
  useLayoutEffect(() => {
    if (!fill) return;
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      // The rest of the window under the chart's top, less the days' events and the page's bottom padding (the axis' second line is inside
      // the chart); at least 200px.
      setHeight(Math.max(140, Math.floor(window.innerHeight - (top + window.scrollY) - BOTTOM_GAP - (days ? 56 : 0))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewKey, days, crumbs, fill]);
  const parent = crumbs && crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;
  return (
    <section aria-label={title} className="mt-(--adm-section)">
      <div className="mb-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1">
        {parent && (
          <button type="button" onClick={() => onCrumb(parent.steps)} className="inline-flex items-center gap-1 text-small font-semibold text-ink hover:underline">
            <ChevronLeft aria-hidden className="size-4" />
            {parent.label}
          </button>
        )}
        {crumbs && crumbs.length > 2 && (
          <nav aria-label={t("chart.crumbs")} className="flex items-center gap-1 text-small text-muted">
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden>›</span>}
                {i < crumbs.length - 1 ? (
                  <button type="button" onClick={() => onCrumb(c.steps)} className="hover:text-ink hover:underline">
                    {c.label}
                  </button>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h2 className="text-eyebrow uppercase text-(--adm-label)">{title}</h2>
        {onOpen && <span className="text-small text-muted">{t("chart.openHint")}</span>}
      </div>
      <div ref={box}>
        <DrillChart
          bars={bars}
          label={title}
          height={height}
          onOpen={onOpen}
          below={days ? (bar) => <DayEvents events={(bar as { events?: { requests: number; paid: number; houses: number } }).events} /> : undefined}
        />
      </div>
    </section>
  );
});

/** Under a day's bar: what happened – new requests, paid stays, new Houses (only what is above 0; nothing: "–"). */
function DayEvents({ events }: { events?: { requests: number; paid: number; houses: number } }) {
  const t = useTranslations("admin.cockpit.chart.events");
  if (!events) return null;
  const lines = [events.requests > 0 && t("requests", { count: events.requests }), events.paid > 0 && t("paid", { count: events.paid }), events.houses > 0 && t("houses", { count: events.houses })].filter(Boolean);
  return <p className="mt-1 text-small text-muted">{lines.length ? lines.map((l) => <span key={String(l)} className="block truncate">{l}</span>) : "–"}</p>;
}

