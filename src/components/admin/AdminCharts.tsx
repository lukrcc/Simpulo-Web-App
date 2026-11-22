"use client";

// The admin dashboard's charts: few and thin, always bars – no line charts, no sparklines as a line (only dashed goal and reference lines); in the admin chart colours (Regel „Admin-Diagramme“, styles/admin-tokens.css): one series is
// always violet (--adm-chart-primary); more series primary → chart-2 (turquoise) → chart-3 (rosé), never more than three. Bars, areas and
// rings: a 1.5px edge in primary over a light fill (--adm-chart-fill), hover a stronger fill (--adm-chart-fill-hover) with the edge in hover;
// the running period a dashed edge in hover over the faint --adm-chart-fill-current, the axis says „läuft“ – a day „heute“ (which period
// runs: metrics.ts runningState);
// goals as a dashed amber line (--adm-chart-goal); bars with 5px round tops; bars, rings and progress lines in primary on a grey track. Status
// colours never fill a chart – only the small dot beside a number (StatusDot) and the change arrows. Recessive grid, a tooltip on hover.
import { AdminTooltipBox } from "./AdminTooltip";
import { memo, useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
// Month labels: every one while they fit, on a phone only as many as do (preserveStartEnd + minTickGap) – never on top of each other.
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Status } from "@/lib/admin/metrics";
import { eur, num } from "@/lib/i18n/adminFormat";
import { cn } from "@/lib/utils";
import { niceScale } from "@/lib/admin/scale";

/** A series' colour: primary for one series; chart-2 and chart-3 only for a second and third series in the same chart. */
export type ChartTone = "primary" | "chart-2" | "chart-3";

/** Whole class names (Tailwind finds them only so): the series' colour as `color` (charts draw in currentColor), as a background. */
const TONE_TEXT: Record<ChartTone, string> = { primary: "text-adm-chart-primary", "chart-2": "text-adm-chart-2", "chart-3": "text-adm-chart-3" };
const TONE_BG: Record<ChartTone, string> = { primary: "bg-adm-chart-primary", "chart-2": "bg-adm-chart-2", "chart-3": "bg-adm-chart-3" };
export const STATUS_BG: Record<Status, string> = { good: "bg-adm-good", warning: "bg-adm-warning", critical: "bg-adm-critical" };

/** The one bar shape: 5px round tops on the baseline. */
export const BAR_RADIUS: [number, number, number, number] = [5, 5, 0, 0];
/** A bar: the 1.5px edge in primary over the light fill. */
const BAR = { fill: "var(--adm-chart-fill)", stroke: "var(--adm-chart-primary)", strokeWidth: 1.5 } as const;
/** The running period's bar: a dashed edge in the hover tone over the faint fill. */
const CURRENT_BAR = { fill: "var(--adm-chart-fill-current)", stroke: "var(--adm-chart-hover)", strokeWidth: 1.5, strokeDasharray: "4 3" } as const;
const GRID = "var(--adm-chart-grid)";
/** A goal or the move line: amber, dashed. */
const GOAL_LINE = { stroke: "var(--adm-chart-goal)", strokeDasharray: "5 4", strokeWidth: 1.5 } as const;
const ACTIVE_BAR = { fill: "var(--adm-chart-fill-hover)", stroke: "var(--adm-chart-hover)", strokeWidth: 1.5 } as const;

/** A number's status as a dot 8px (no rule: a quiet ink dot). The status word is the label beside it, so colour is never alone. */
export function StatusDot({ status, className }: { status: Status | null; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", status ? STATUS_BG[status] : "bg-adm-neutral", className)} />;
}

export interface ChartPoint {
  label: string;
  value: number;
  /** The running period on a time axis (metrics.ts runningState): "running" → „läuft“, "today" → „heute“ */
  current?: "running" | "today" | null;
}

const AXIS = { fontSize: 12, fill: "var(--text-muted)" } as const;
/** The value axis as wide as its longest label (12px digits ≈ 7.5px each), so "5000" is never cut. */
const axisWidth = (max: number) => 24 + Math.max(1, num(Math.round(max)).length) * 7.5;

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value?: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <AdminTooltipBox title={label}>
      <span className="admin-tooltip-value">{typeof payload[0].value === "number" ? num(payload[0].value) : payload[0].value}</span>
      {unit && ` ${unit}`}
    </AdminTooltipBox>
  );
}

/** An axis label with a second line for the running period („läuft“ / „heute“). */
function TimeTick({ x, y, payload, points }: { x?: number; y?: number; payload?: { value: string; index: number }; points: readonly ChartPoint[] }) {
  const t = useTranslations("admin.charts");
  if (!payload || x === undefined || y === undefined) return null;
  const current = points[payload.index]?.current;
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        {payload.value}
      </text>
      {current && (
        <text dy={27} textAnchor="middle" fontSize={11} fill="var(--text)" fontWeight={600}>
          {t(current)}
        </text>
      )}
    </g>
  );
}

/** Columns over a time axis or buckets: 5px round tops on the baseline, an optional dashed goal line, the running period in "current". */
export function ColumnChart({
  data,
  target,
  targetLabel,
  unit,
  height = 220,
  label,
}: {
  data: readonly ChartPoint[];
  target?: number;
  targetLabel?: string;
  unit?: string;
  height?: number;
  label: string;
}) {
  const hasCurrent = data.some((d) => d.current);
  const scale = niceScale(data.map((d) => d.value), target);
  return (
    <div role="img" aria-label={label} className={TONE_TEXT.primary} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data]} margin={{ top: 12, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={6} height={hasCurrent ? 36 : 30} tick={<TimeTick points={data} />} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} tickFormatter={(v: number) => num(v)} width={axisWidth(scale.max)} domain={[scale.min, scale.max]} ticks={scale.ticks} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<ChartTooltip unit={unit} />} />
          {target !== undefined && <ReferenceLine y={target} {...GOAL_LINE} label={targetLabel ? { value: targetLabel, position: "insideTopLeft", ...AXIS } : undefined} />}
          <Bar dataKey="value" {...BAR} radius={BAR_RADIUS} maxBarSize={40} isAnimationActive={false} activeBar={ACTIVE_BAR}>
            {data.map((d) => (d.current ? <Cell key={d.label} {...CURRENT_BAR} /> : <Cell key={d.label} {...BAR} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


/** Shares as rows: label left, value right, a 6px bar (primary on the grey track) under each. One list = one series. */
export function BarList({ rows, tone = "primary", className }: { rows: readonly { key: string; label: ReactNode; value: number; display?: ReactNode }[]; tone?: ChartTone; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-body">
            <span className="flex min-w-0 items-center gap-2 truncate text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{r.display ?? r.value}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-adm-chart-track">
            <div className={cn("h-full rounded-full", TONE_BG[tone])} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A progress bar toward a target: primary on the grey track (the status is the dot beside its number, never the bar). */
export function ProgressBar({ ratio, label, className }: { ratio: number; label: string; className?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} className={cn("h-1.5 overflow-hidden rounded-full bg-adm-chart-track", className)}>
      <div className="h-full rounded-full bg-adm-chart-primary" style={{ width: `${Math.max(ratio > 0 ? 2 : 0, Math.min(1, ratio) * 100)}%` }} />
    </div>
  );
}

/** Steps toward a count ("3 of 6 months", "2 of 5 criteria"): one short segment each, the reached ones primary on the grey track. */
export function StepMeter({ reached, of, label, className }: { reached: number; of: number; label: string; className?: string }) {
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={of} aria-valuenow={reached} className={cn("flex gap-1", className)}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < reached ? "bg-adm-chart-primary" : "bg-adm-chart-track")} />
      ))}
    </div>
  );
}

/** A progress ring: the grey track; the progress as an arc of the light fill edged in primary (1.5px each side); optional `due` = a short amber tick where it should stand. */
export function ProgressRing({ ratio, due, size = 80, className }: { ratio: number; due?: number; size?: number; className?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const angle = Math.min(1, Math.max(0, due ?? 0)) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg viewBox="0 0 80 80" aria-hidden className={cn("shrink-0", className)} style={{ width: size, height: size }}>
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-adm-chart-track" />
      {ratio > 0 && (
        <>
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-(--adm-chart-fill)" strokeDasharray={`${Math.min(1, ratio) * c} ${c}`} transform="rotate(-90 40 40)" />
          {[r - 3.5, r + 3.5].map((edge) => (
            <circle key={edge} cx="40" cy="40" r={edge} fill="none" strokeWidth="1.5" className="stroke-adm-chart-primary" strokeDasharray={`${Math.min(1, ratio) * 2 * Math.PI * edge} ${2 * Math.PI * edge}`} transform="rotate(-90 40 40)" />
          ))}
        </>
      )}
      {due !== undefined && due > 0 && <line x1={40 + Math.cos(angle) * 26} y1={40 + Math.sin(angle) * 26} x2={40 + Math.cos(angle) * 42} y2={40 + Math.sin(angle) * 42} strokeWidth="2" className="stroke-adm-chart-goal" />}
    </svg>
  );
}

/** A series of a combined chart: its key, label and colour slot (primary → chart-2 → chart-3, never more than three). */
export interface ComboSeries {
  key: string;
  label: string;
  tone: ChartTone;
}
const TONE_VAR: Record<ChartTone, string> = { primary: "var(--adm-chart-primary)", "chart-2": "var(--adm-chart-2)", "chart-3": "var(--adm-chart-3)" };
/** A tone's light fill (22 %), hover (45 %) and running fill (8 %) – the same steps as --adm-chart-fill*, mixed from the tone's colour. */
const toneFill = (tone: ChartTone, percent: 22 | 45 | 8) => (tone === "primary" ? `var(${percent === 22 ? "--adm-chart-fill" : percent === 45 ? "--adm-chart-fill-hover" : "--adm-chart-fill-current"})` : `color-mix(in srgb, ${TONE_VAR[tone]} ${percent}%, transparent)`);

function ComboTooltip({ active, payload, label, series, format }: { active?: boolean; payload?: { dataKey?: string | number; value?: number }[]; label?: string; series: readonly ComboSeries[]; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <AdminTooltipBox title={label}>
      <span className="flex flex-col gap-1">
        {series.map((s) => {
          const v = payload.find((p) => p.dataKey === s.key)?.value;
          return typeof v === "number" ? (
            <span key={s.key} className="flex items-center gap-2">
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: TONE_VAR[s.tone] }} />
              {s.label} · <span className="admin-tooltip-value">{format(v)}</span>
            </span>
          ) : null;
        })}
      </span>
    </AdminTooltipBox>
  );
}

/**
 * Grouped bars over a time axis (Geld › Überblick: Umsatz, Kosten and Gewinn side by side – never a line, Regel „Admin-Diagramme“): each
 * series in its slot, the edge over the light fill, the running period in the "current" style (dashed edge, faint fill) with „läuft“ under the axis; a legend under it.
 */
export function ComboChart({ data, series, label, height = 260, format }: { data: readonly (Record<string, number | string | null | undefined> & { label: string; current?: "running" | "today" | null })[]; series: readonly ComboSeries[]; label: string; height?: number; format: (v: number) => string }) {
  const points: ChartPoint[] = data.map((d) => ({ label: d.label, value: 0, current: d.current ?? null }));
  const hasCurrent = points.some((p) => p.current);
  const scale = niceScale(data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0))));
  return (
    <div>
      <div role="img" aria-label={label} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={[...data]} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={6} height={hasCurrent ? 36 : 30} tick={<TimeTick points={points} />} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS} tickFormatter={format} width={24 + Math.max(format(scale.max).length, format(scale.min).length) * 7.5} domain={[scale.min, scale.max]} ticks={scale.ticks} />
            <Tooltip cursor={{ fill: "var(--text)", fillOpacity: 0.04 }} content={<ComboTooltip series={series} format={format} />} isAnimationActive={false} />
            {scale.min < 0 && <ReferenceLine y={0} stroke="var(--adm-chart-compare)" />}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} radius={BAR_RADIUS} maxBarSize={22} isAnimationActive={false} activeBar={{ fill: toneFill(s.tone, 45), stroke: TONE_VAR[s.tone], strokeWidth: 1.5 }}>
                {data.map((d) =>
                  d.current ? (
                    <Cell key={d.label} fill={toneFill(s.tone, 8)} stroke={TONE_VAR[s.tone]} strokeWidth={1.5} strokeDasharray="4 3" />
                  ) : (
                    <Cell key={d.label} fill={toneFill(s.tone, 22)} stroke={TONE_VAR[s.tone]} strokeWidth={1.5} />
                  ),
                )}
              </Bar>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-small text-ink">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: TONE_VAR[s.tone] }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}


const PROFIT_CURSOR = { fill: "var(--text)", fillOpacity: 0.04 } as const;
const formatEur = (v: number) => eur(v);

// ── The overview's chart with drill-down ──────────────────────────────────────────────────────────────────────────────────────

/** One bar of the overview's chart: its axis label (and a small second line), the tooltip's title and change. */
export interface DrillBar {
  key: string;
  main: string;
  sub: string | null;
  /** The tooltip's title with full dates ("KW 36 · 1.–7. September 2026") */
  title: string;
  /** null: still ahead – no bar */
  value: number | null;
  /** The change against the period before, rendered by the caller (ChangeLine) */
  change: ReactNode;
  /** The running period (metrics.ts runningState): "current" style, its axis says „läuft“ (a day „heute“) */
  current: "running" | "today" | null;
}

const DRILL_MARGIN = { top: 12, right: 56, bottom: 0, left: 0 } as const;

function DrillTick({ x, y, payload, bars }: { x?: number; y?: number; payload?: { index: number }; bars: readonly DrillBar[] }) {
  const t = useTranslations("admin.charts");
  const bar = payload ? bars[payload.index] : undefined;
  if (!bar || x === undefined || y === undefined) return null;
  const sub = bar.current ? (bar.sub ? `${bar.sub} · ${t(bar.current)}` : t(bar.current)) : bar.sub;
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        {bar.main}
      </text>
      {sub && (
        <text dy={27} textAnchor="middle" fontSize={11} fill={bar.current ? "var(--text)" : "var(--adm-label)"} fontWeight={bar.current ? 600 : 400}>
          {sub}
        </text>
      )}
    </g>
  );
}

function DrillTooltip({ active, payload, bars }: { active?: boolean; payload?: { payload?: { index: number } }[]; bars: readonly DrillBar[] }) {
  const bar = active && payload?.[0]?.payload ? bars[payload[0].payload.index] : undefined;
  if (!bar || bar.value === null) return null;
  return (
    <AdminTooltipBox title={bar.title}>
      <span className="flex flex-col gap-1">
        <span className="admin-tooltip-value">{eur(bar.value)}</span>
        <span>{bar.change}</span>
      </span>
    </AdminTooltipBox>
  );
}

/**
 * The overview chart's bars: recharts leaves `gap` on EACH side of a column, so 19 % leaves the bar ~62 % of its column; at most 80px wide –
 * the same ratio in every period.
 */
const DRILL_BAR = { gap: "19%", max: 80 } as const;

/**
 * The overview's profit chart: one bar per period in primary, the running one in "current" with „läuft“ (a day „heute“) under it; a calm axis
 * (niceScale, lib/admin/scale.ts); no goal line (no money targets). Bars ~62 % of their column, at most 80px, the same ratio in every period
 * (DRILL_BAR). A click on a bar opens it one level deeper
 * (`onOpen`, the caller keeps the state in the URL). `below`: one cell under each bar (the week's days: what happened). Memoised – hovering
 * never re-renders the page.
 */
export const DrillChart = memo(function DrillChart({
  bars,
  label,
  height,
  onOpen,
  below,
}: {
  bars: readonly DrillBar[];
  label: string;
  height: number;
  onOpen?: (key: string) => void;
  below?: (bar: DrillBar) => ReactNode;
}) {
  const rows = useMemo(() => bars.map((b, index) => ({ index, label: b.key, value: b.value })), [bars]);
  const scale = useMemo(() => niceScale(bars.map((b) => b.value ?? 0)), [bars]);
  const yWidth = 24 + Math.max(eur(scale.max).length, eur(scale.min).length) * 7.5;
  return (
    <div>
      <div role="img" aria-label={label} style={{ height }} className={cn(onOpen && "[&_.recharts-bar-rectangle]:cursor-pointer")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={DRILL_MARGIN} barCategoryGap={DRILL_BAR.gap}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={36} tick={<DrillTick bars={bars} />} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS} width={yWidth} domain={[scale.min, scale.max]} ticks={scale.ticks} tickFormatter={formatEur} />
            {scale.min < 0 && <ReferenceLine y={0} stroke="var(--adm-chart-compare)" />}
            <Tooltip cursor={PROFIT_CURSOR} content={<DrillTooltip bars={bars} />} isAnimationActive={false} />
            <Bar dataKey="value" radius={BAR_RADIUS} maxBarSize={DRILL_BAR.max} isAnimationActive={false} activeBar={ACTIVE_BAR} onClick={onOpen ? (d: { label?: string }) => d.label && onOpen(d.label) : undefined}>
              {bars.map((b) => (b.current ? <Cell key={b.key} {...CURRENT_BAR} /> : <Cell key={b.key} {...BAR} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {below && (
        <div className="grid" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`, paddingLeft: yWidth, paddingRight: DRILL_MARGIN.right }}>
          {bars.map((b) => (
            <div key={b.key} className="min-w-0 px-1 text-center">
              {below(b)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
