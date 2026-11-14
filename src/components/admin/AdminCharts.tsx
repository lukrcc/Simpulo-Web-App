"use client";

// The admin dashboard's charts: few and thin. One series each (no legend – the heading names it), in the admin colours (styles/admin-tokens.css):
// the page's main line in chart-1 (ocean, the focus), others chart-2 / chart-3 or ink; status colours never fill a chart or a bar – only the
// small dot beside a number (StatusDot). Recessive grid (ink), a tooltip on hover. Lists of shares are plain bars (BarList), not a chart library.
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";

/** "ink": a quiet series in the words' colour at 70 % (on the Ember stage cream, by the tokens) */
export type ChartTone = "chart-1" | "chart-2" | "chart-3" | "ink";

/** Whole class names (Tailwind finds them only so): the series' colour as `color` (charts draw in currentColor), as a fill, as a background. */
const TONE_TEXT: Record<ChartTone, string> = { "chart-1": "text-adm-chart-1", "chart-2": "text-adm-chart-2", "chart-3": "text-adm-chart-3", ink: "text-ink/70" };
const TONE_BG: Record<ChartTone, string> = { "chart-1": "bg-adm-chart-1", "chart-2": "bg-adm-chart-2", "chart-3": "bg-adm-chart-3", ink: "bg-ink/70" };
export const STATUS_BG: Record<Status, string> = { good: "bg-adm-good", warning: "bg-adm-warning", critical: "bg-adm-critical" };

/** A number's status as a dot 8px (no rule: a quiet ink dot). The status word is the label beside it, so colour is never alone. */
export function StatusDot({ status, className }: { status: Status | null; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", status ? STATUS_BG[status] : "bg-adm-neutral", className)} />;
}

export interface ChartPoint {
  label: string;
  value: number;
}

const AXIS = { fontSize: 12, fill: "var(--text-muted)" } as const;
/** The value axis as wide as its longest label (12px digits ≈ 7.5px each), so "5000" is never cut. */
const axisWidth = (max: number) => 24 + Math.max(1, String(Math.round(max)).length) * 7.5;

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
}: {
  data: readonly ChartPoint[];
  target?: number;
  targetLabel?: string;
  unit?: string;
  height?: number;
  label: string;
  tone?: ChartTone;
}) {
  return (
    <div role="img" aria-label={label} className={TONE_TEXT[tone]} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data]} margin={{ top: 12, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={axisWidth(Math.max(target ?? 0, ...data.map((d) => d.value)))} domain={[0, (max: number) => Math.max(max, target ?? 0)]} ticks={target !== undefined ? [0, target] : undefined} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<ChartTooltip unit={unit} />} />
          {target !== undefined && <ReferenceLine y={target} stroke="var(--text-muted)" strokeDasharray="4 4" label={targetLabel ? { value: targetLabel, position: "insideTopLeft", ...AXIS } : undefined} />}
          <Bar dataKey="value" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
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
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={axisWidth(Math.max(...data.map((d) => d.value)))} />
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

/** A progress bar toward a target: ink 70 % on ink 8 % (the status is the dot beside its number, never the bar). */
export function ProgressBar({ ratio, label, className }: { ratio: number; label: string; className?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} className={cn("h-1.5 overflow-hidden rounded-full bg-ink/8", className)}>
      <div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.max(ratio > 0 ? 2 : 0, ratio * 100)}%` }} />
    </div>
  );
}

/** Steps toward a count ("3 of 6 months", "2 of 5 criteria"): one short segment each, the reached ones filled ink. */
export function StepMeter({ reached, of, label, className }: { reached: number; of: number; label: string; className?: string }) {
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={of} aria-valuenow={reached} className={cn("flex gap-1", className)}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < reached ? "bg-ink/70" : "bg-ink/10")} />
      ))}
    </div>
  );
}
