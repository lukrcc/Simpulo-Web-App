"use client";

// The admin dashboard's charts: few and thin. One series each (no legend – the heading names it), in the admin colours (styles/admin-tokens.css):
// chart-1 … 3 for plain series, good / warning / critical only where a value has a target (getStatus). Recessive grid (ink), a tooltip on
// hover. Lists of shares are plain bars (BarList), the sparklines a small SVG – not a chart library.
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";

export type ChartTone = "chart-1" | "chart-2" | "chart-3";

/** Whole class names (Tailwind finds them only so): the series' colour as `color` (charts draw in currentColor), as a fill, as a background. */
const TONE_TEXT: Record<ChartTone, string> = { "chart-1": "text-adm-chart-1", "chart-2": "text-adm-chart-2", "chart-3": "text-adm-chart-3" };
const TONE_BG: Record<ChartTone, string> = { "chart-1": "bg-adm-chart-1", "chart-2": "bg-adm-chart-2", "chart-3": "bg-adm-chart-3" };
export const STATUS_BG: Record<Status, string> = { good: "bg-adm-good", warning: "bg-adm-warning", critical: "bg-adm-critical" };
const STATUS_FILL: Record<Status, string> = { good: "fill-adm-good", warning: "fill-adm-warning", critical: "fill-adm-critical" };
export const STATUS_SOFT: Record<Status, string> = { good: "bg-adm-good-soft", warning: "bg-adm-warning-soft", critical: "bg-adm-critical-soft" };

/** A number's status as a dot 8px (no rule: a quiet ink dot). The status word is the label beside it, so colour is never alone. */
export function StatusDot({ status, className }: { status: Status | null; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", status ? STATUS_BG[status] : "bg-adm-neutral", className)} />;
}

/** The last weeks as a thin line (chart-1, 1.5px), the last point marked. No axes – the number beside it says the value. */
export function Sparkline({ values, width = 72, height = 24, label }: { values: readonly number[]; width?: number; height?: number; label: string }) {
  if (values.length < 2) return <span style={{ width, height }} className="inline-block" aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => 2 + (i / (values.length - 1)) * (width - 4);
  const y = (v: number) => 2 + (1 - (v - min) / span) * (height - 4);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 text-adm-chart-1">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1)!)} r={2.5} fill="currentColor" />
    </svg>
  );
}

export interface ChartPoint {
  label: string;
  value: number;
}

const AXIS = { fontSize: 12, fill: "var(--text-muted)" } as const;

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value?: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink/85 px-2.5 py-1.5 text-small text-inverse backdrop-blur-sm">
      <span className="text-inverse/70">{label}</span> · <span className="font-semibold">{payload[0].value}</span>
      {unit && ` ${unit}`}
    </div>
  );
}

/** Columns over a time axis or buckets: 4px rounded tops on the baseline, an optional dashed target line. */
export function ColumnChart({
  data,
  target,
  targetLabel,
  unit,
  height = 220,
  label,
  tone = "chart-1",
  statusOf,
}: {
  data: readonly ChartPoint[];
  target?: number;
  targetLabel?: string;
  unit?: string;
  height?: number;
  label: string;
  tone?: ChartTone;
  /** A value with a target: each column in its status colour (getStatus) instead of the tone */
  statusOf?: (value: number) => Status | null;
}) {
  return (
    <div role="img" aria-label={label} className={TONE_TEXT[tone]} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data]} margin={{ top: 12, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={40} domain={[0, (max: number) => Math.max(max, target ?? 0)]} ticks={target !== undefined ? [0, target] : undefined} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<ChartTooltip unit={unit} />} />
          {target !== undefined && <ReferenceLine y={target} stroke="var(--text-muted)" strokeDasharray="4 4" label={targetLabel ? { value: targetLabel, position: "insideTopLeft", ...AXIS } : undefined} />}
          <Bar dataKey="value" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
            {statusOf &&
              data.map((point) => {
                const status = statusOf(point.value);
                return <Cell key={point.label} className={status ? STATUS_FILL[status] : undefined} />;
              })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A running total or a count over time: a 2px line over a faint area. */
export function TrendChart({ data, unit, height = 220, label, tone = "chart-1" }: { data: readonly ChartPoint[]; unit?: string; height?: number; label: string; tone?: ChartTone }) {
  return (
    <div role="img" aria-label={label} className={TONE_TEXT[tone]} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]} margin={{ top: 12, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} minTickGap={24} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={40} />
          <Tooltip cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }} content={<ChartTooltip unit={unit} />} />
          <Area type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} fill="currentColor" fillOpacity={0.12} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Shares as rows: label left, value right, a 6px bar (the tone on ink 8 %) under each. */
export function BarList({ rows, tone = "chart-1", className }: { rows: readonly { key: string; label: ReactNode; value: number; display?: ReactNode }[]; tone?: ChartTone; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-body">
            <span className="flex min-w-0 items-center gap-2 truncate text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{r.display ?? r.value}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div className={cn("h-full rounded-full", TONE_BG[tone])} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A progress bar toward a target, in its status colour (getStatus) on ink 8 %; without a status chart-1. */
export function ProgressBar({ ratio, label, status = null }: { ratio: number; label: string; status?: Status | null }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} className="h-1.5 overflow-hidden rounded-full bg-ink/8">
      <div className={cn("h-full rounded-full", status ? STATUS_BG[status] : "bg-adm-chart-1")} style={{ width: `${Math.max(ratio > 0 ? 2 : 0, ratio * 100)}%` }} />
    </div>
  );
}
