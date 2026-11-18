"use client";

// The admin dashboard's charts: few and thin. One series each (no legend – the heading names it), in the admin colours (styles/admin-tokens.css):
// the page's main line in chart-1 (ocean, the focus), others chart-2 / chart-3 or ink; status colours never fill a chart or a bar – only the
// small dot beside a number (StatusDot). Recessive grid (ink), a tooltip on hover. Lists of shares are plain bars (BarList), not a chart library.
import { memo, useMemo, type ReactNode } from "react";
// Month labels: every one while they fit, on a phone only as many as do (preserveStartEnd + minTickGap) – never on top of each other.
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getStatus, type Status } from "@/lib/admin/metrics";
import { eur, num } from "@/lib/i18n/adminFormat";
import { profitMilestones } from "@/config/admin";
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
const axisWidth = (max: number) => 24 + Math.max(1, num(Math.round(max)).length) * 7.5;

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value?: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink/85 px-2.5 py-1.5 text-small text-inverse backdrop-blur-sm">
      <span className="text-inverse/70">{label}</span> · <span className="font-semibold">{typeof payload[0].value === "number" ? num(payload[0].value) : payload[0].value}</span>
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
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={6} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} tickFormatter={(v: number) => num(v)} width={axisWidth(Math.max(target ?? 0, ...data.map((d) => d.value)))} domain={[0, (max: number) => Math.max(max, target ?? 0)]} ticks={target !== undefined ? [0, target] : undefined} />
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
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} tickFormatter={(v: number) => num(v)} width={axisWidth(Math.max(...data.map((d) => d.value)))} />
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

/**
 * The profit axis (config/admin.ts profitMilestones): `fixed` = a chosen top (the switch "Achse": 10k · 25k · 50k · 100k), else the first step
 * whose top holds the highest month ("Aktuell"); its ticks every step (bis 5.000 in 1.000er, 10.000 in 2.500er, 25.000 in 5.000er,
 * 50.000 in 10.000er, 100.000 in 20.000er Schritten).
 */
export function profitAxis(max: number, fixed?: number | null): { top: number; ticks: number[] } {
  const steps = profitMilestones.axis;
  const tier = (fixed ? steps.find((s) => s.max === fixed) : steps.find((s) => max <= s.max)) ?? steps[steps.length - 1];
  return { top: tier.max, ticks: Array.from({ length: tier.max / tier.step + 1 }, (_, i) => i * tier.step) };
}

function ProfitTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length || typeof payload[0].value !== "number") return null;
  return (
    <div className="rounded-lg bg-ink/85 px-2.5 py-1.5 text-small text-inverse">
      {label} · <span className="font-semibold">{eur(payload[0].value)}</span>
    </div>
  );
}

const PROFIT_MARGIN = { top: 12, right: 56, bottom: 0, left: 0 } as const;
const PROFIT_CURSOR = { fill: "var(--text)", fillOpacity: 0.04 } as const;
const PROFIT_TOOLTIP = <ProfitTooltip />;
const formatEur = (v: number) => eur(v);

/**
 * Profit per month on the overview, open on the light page: the value axis in euros (German format) with fine horizontal grid lines (profitAxis;
 * `fixedTop` from the switch "Achse"); no dashed target – the milestone lines (the move at 5.000 €) a little stronger, labelled on the right,
 * only once the axis reaches them. Bars below the move amber, from it sage (getStatus "profitPerMonth"). Tooltip "Okt · 4.900 €".
 * Smooth hover: memoised (the page never re-renders on hover – recharts keeps the hover itself), no animation on bars or tooltip, a plain
 * cursor; the data is built once per change (useMemo in the caller).
 */
export const ProfitChart = memo(function ProfitChart({
  data,
  label,
  milestoneLabel,
  fixedTop = null,
  height = 320,
}: {
  data: readonly ChartPoint[];
  label: string;
  /** The move line's label ("Umzug") */
  milestoneLabel: string;
  /** A fixed top for the value axis; null = it grows with the data */
  fixedTop?: number | null;
  height?: number;
}) {
  const rows = useMemo(() => data.map((d) => ({ ...d, good: getStatus("profitPerMonth", d.value) === "good" })), [data]);
  const { top, ticks } = useMemo(() => profitAxis(Math.max(0, ...data.map((d) => d.value)), fixedTop), [data, fixedTop]);
  const lines = profitMilestones.lines.filter((m) => m.value <= top);
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={PROFIT_MARGIN} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={24 + eur(top).length * 7.5} domain={[0, top]} ticks={ticks} tickFormatter={formatEur} allowDataOverflow />
          <Tooltip cursor={PROFIT_CURSOR} content={PROFIT_TOOLTIP} isAnimationActive={false} />
          {lines.map((m) => (
            <ReferenceLine key={m.key} y={m.value} stroke="var(--text-muted)" strokeWidth={1.5} label={{ value: milestoneLabel, position: "right", fontSize: 12, fill: "var(--text-muted)" }} />
          ))}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
            {rows.map((d) => (
              <Cell key={d.label} className={d.good ? "fill-adm-good" : "fill-adm-warning"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

/** A calm value axis for any count: a top of 1 · 2 · 2,5 · 5 × 10ⁿ above the highest value, about five ticks. */
export function niceAxis(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

/** Bars per month in ocean (the north star), the same axis logic as the profit (a calm top, fine grid lines), no animation, a plain cursor. */
export const CountBars = memo(function CountBars({ data, label, unit, height = 320 }: { data: readonly ChartPoint[]; label: string; unit?: string; height?: number }) {
  const { top, ticks } = useMemo(() => niceAxis(Math.max(0, ...data.map((d) => d.value))), [data]);
  const rows = useMemo(() => [...data], [data]);
  return (
    <div role="img" aria-label={label} className="text-adm-chart-1" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={PROFIT_MARGIN} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={6} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={axisWidth(top)} domain={[0, top]} ticks={ticks} tickFormatter={(v: number) => num(v)} />
          <Tooltip cursor={PROFIT_CURSOR} content={<ChartTooltip unit={unit} />} isAnimationActive={false} />
          <Bar dataKey="value" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export interface LineSeries {
  key: string;
  label: string;
  /** A CSS colour (an admin token, var(--adm-…)) */
  color: string;
  /** How a real value reads in the tooltip */
  format: (value: number) => string;
}

function LinesTooltip({ active, payload, label, series, raw }: { active?: boolean; payload?: { dataKey?: string | number; value?: number }[]; label?: string; series: readonly LineSeries[]; raw?: (label: string, key: string) => number | null }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink/85 px-3 py-2 text-small text-inverse">
      <p className="mb-1 text-inverse/70">{label}</p>
      {series.map((s) => {
        const point = payload.find((p) => p.dataKey === s.key);
        const value = raw && label ? raw(label, s.key) : (point?.value ?? null);
        if (value === null || value === undefined) return null;
        return (
          <p key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: s.color }} />
            {s.label} · <span className="font-semibold">{s.format(value)}</span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * Several 2px lines over months (Alles im Vergleich, the cohorts): one colour each, the legend under the chart (ink text, a coloured dash
 * beside it), the tooltip with every line's real value (`raw`, else the plotted one). No animation.
 */
export const LinesChart = memo(function LinesChart({
  data,
  series,
  label,
  yFormat,
  raw,
  reference,
  height = 320,
}: {
  data: readonly Record<string, string | number | null>[];
  series: readonly LineSeries[];
  label: string;
  yFormat: (v: number) => string;
  raw?: (label: string, key: string) => number | null;
  /** A thin line across (e.g. index 100) */
  reference?: number;
  height?: number;
}) {
  const rows = useMemo(() => [...data], [data]);
  return (
    <div>
      <div role="img" aria-label={label} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={6} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS} width={56} tickFormatter={yFormat} />
            <Tooltip cursor={{ stroke: "var(--text)", strokeOpacity: 0.15 }} content={<LinesTooltip series={series} raw={raw} />} isAnimationActive={false} />
            {reference !== undefined && <ReferenceLine y={reference} stroke="var(--text-muted)" strokeDasharray="3 3" />}
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small text-ink">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
});
