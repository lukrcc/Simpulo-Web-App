"use client";

// /admin/vision – "Where is Simpulo going?": the strategy as graphics in five capsule tabs (Path · T-Model · Breadth & Depth · Continuum ·
// Roadmap). Every text from config/vision.ts (nothing invented here); the numbers from lib/admin/metrics.ts. Graphic before text, short
// labels; "You are here" is the page's one ocean focus; no boxes in boxes – the T is two bars, everything else lines on the page.
import { Check, ChevronLeft } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ScrollRow } from "@/components/ui/ScrollRow";
import {
  BREADTH_DEPTH,
  CONTINUUM,
  NOT_MEASURABLE,
  PATH,
  ROADMAP,
  SOURCE_STATUS_LABEL,
  sourceCount,
  SOURCE_STATUSES,
  T_MODEL,
  VISION_TABS,
  VISION_TITLE,
  YOU_ARE_HERE,
  type Source,
  type SourceStatus,
  type UnlockKey,
  type VisionTab,
} from "@/config/vision";
import { depthUnlockValue, moveProgress, revenueBySource, visionPhase, type AdminInputs } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { cn } from "@/lib/utils";
import { ColumnChart, ProgressBar, StatusDot, StepMeter } from "./AdminCharts";
import { AdminSection, AdminShell } from "./AdminShell";

const eur = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

export function AdminVision() {
  const inputs = useAdminInputs();
  const [tab, setTab] = useState<VisionTab>("path");
  return (
    <AdminShell title={VISION_TITLE}>
      <ScrollRow label={VISION_TITLE} className="mb-12">
        <CapsuleGroup label={VISION_TITLE} value={tab} onChange={setTab} options={VISION_TABS.map((t) => ({ value: t.key, content: t.label }))} />
      </ScrollRow>
      {tab === "path" && <PathView inputs={inputs} />}
      {tab === "tModel" && <TModelView inputs={inputs} />}
      {tab === "breadthDepth" && <BreadthDepthView inputs={inputs} />}
      {tab === "continuum" && <ContinuumView inputs={inputs} />}
      {tab === "roadmap" && <RoadmapView />}
    </AdminShell>
  );
}

// ── Shared pieces ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "You are here" – the one ocean focus of a view. */
function Here({ className }: { className?: string }) {
  return <span className={cn("text-eyebrow uppercase text-adm-chart-1", className)}>{YOU_ARE_HERE}</span>;
}

/** live: a filled dot · prepared: half filled · idea: a hollow dashed ring – ink only (status colours are for numbers with a target). */
function SourceGlyph({ status }: { status: SourceStatus }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-ink">
      {status === "live" && <circle cx="6" cy="6" r="5.25" fill="currentColor" />}
      {status === "prepared" && (
        <>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.25a4.75 4.75 0 0 1 0 9.5z" fill="currentColor" />
        </>
      )}
      {status === "idea" && <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="2 1.75" />}
    </svg>
  );
}

/** "● 2 live · ◌ 9 idea" for a list of sources (statuses with none are left out). */
function Legend({ sources }: { sources: readonly Source[] }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body text-ink">
      {SOURCE_STATUSES.map((status) => {
        const count = sources.filter((s) => s.status === status).length;
        return count === 0 ? null : (
          <li key={status} className="inline-flex items-center gap-2">
            <SourceGlyph status={status} />
            {sourceCount(count, status)}
          </li>
        );
      })}
    </ul>
  );
}

/** One source: its status glyph and name; a live one with this month's revenue and a thin bar of its share. */
function SourceRow({ source, number, revenue }: { source: Source; number?: number; revenue: ReturnType<typeof revenueBySource> }) {
  const value = source.measure ? revenue[source.measure] : null;
  const total = revenue.serviceFee + revenue.hostFeeShare;
  return (
    <li className={cn("grid items-baseline gap-x-3", number ? "grid-cols-[20px_14px_minmax(0,1fr)_auto]" : "grid-cols-[14px_minmax(0,1fr)_auto]")}>
      {number !== undefined && <span className="text-small tabular-nums text-muted">{number}</span>}
      <span className="flex translate-y-0.5 justify-center">
        <SourceGlyph status={source.status} />
        <span className="sr-only">{SOURCE_STATUS_LABEL[source.status]}</span>
      </span>
      <span className={cn("min-w-0 text-body", source.status === "idea" ? "text-ink/70" : "font-semibold text-ink")}>{source.name}</span>
      {value !== null ? <span className="text-body tabular-nums text-ink">{eur(value)}</span> : <span />}
      {value !== null && total > 0 && (
        <span aria-hidden className={cn("col-end-[-1] mt-2 h-1 overflow-hidden rounded-full bg-ink/8", number ? "col-start-3" : "col-start-2")}>
          <span className="block h-full rounded-full bg-ink/70" style={{ width: `${(value / total) * 100}%` }} />
        </span>
      )}
    </li>
  );
}

// ── Path ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Three stages on one rail (open filled, "you are here" ocean, locked hollow), the line to the next stage filled as far as its unlock is; then the two unlocks. */
function PathView({ inputs }: { inputs: AdminInputs }) {
  const revenue = revenueBySource(inputs);
  const move = moveProgress(inputs);
  // The round can't be measured yet: its stage opens only when it's marked reached (never now).
  const reached: Record<UnlockKey, boolean> = { move: move.reached, round: false };
  const progressOf: Record<UnlockKey, number> = { move: move.streak / move.streakOf, round: 0 };
  const open = PATH.stages.map((s) => s.unlock === null || reached[s.unlock]);
  const here = open.lastIndexOf(true);
  const all = PATH.stages.flatMap((s) => [...s.sources]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="text-small text-muted">{PATH.earned}</p>
          <p className="mt-1 text-display tabular-nums text-ink">{eur(revenue.serviceFee + revenue.hostFeeShare)}</p>
        </div>
        <Legend sources={all} />
      </div>

      <ol className="mt-12 grid gap-x-10 gap-y-12 lg:grid-cols-3">
        {PATH.stages.map((stage, i) => {
          const next = PATH.stages[i + 1];
          return (
            <li key={stage.key} className="min-w-0">
              <div className="flex h-5 items-center" aria-hidden>
                <span className={cn("size-4 shrink-0 rounded-full", i === here ? "bg-adm-chart-1 ring-4 ring-adm-chart-1-soft" : open[i] ? "bg-ink" : "border-[1.5px] border-ink/25")} />
                {next && (
                  <span className="relative ml-2 h-0.5 flex-1 overflow-hidden rounded-full bg-ink/10 max-lg:hidden lg:-mr-10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-ink/70" style={{ width: `${(next.unlock ? progressOf[next.unlock] : 1) * 100}%` }} />
                  </span>
                )}
              </div>
              <p className="mt-4 text-eyebrow uppercase text-muted">
                {i + 1} · {stage.where}
                {i === here && <Here className="ml-2" />}
              </p>
              <h2 className="mt-1 text-h2 text-ink">{stage.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-small text-muted">
                {stage.unlock ? (
                  <>
                    {open[i] ? <Check aria-hidden className="size-4 text-ink" /> : <StatusDot status={null} />}
                    {PATH.opensWith[stage.unlock]}
                  </>
                ) : (
                  PATH.now
                )}
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {stage.sources.map((source) => (
                  <SourceRow key={source.name} source={source} revenue={revenue} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <AdminSection title={PATH.unlocksTitle} className="mt-16">
        <div className="grid gap-y-12 lg:grid-cols-2">
          <div className="min-w-0 lg:pr-10">
            <p className="text-h3 text-ink">{PATH.unlocks.move.title}</p>
            <p className="mt-1 text-small text-muted">{PATH.unlocks.move.condition}</p>
            <StepMeter reached={move.streak} of={move.streakOf} label={PATH.monthsInRow(move.streak, move.streakOf)} className="mt-5" />
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-ink">
              <span className="tabular-nums">{PATH.monthsInRow(move.streak, move.streakOf)}</span>
              <span className="inline-flex items-center gap-2 text-muted">
                <StatusDot status={move.status} />
                {PATH.thisMonth(eur(move.current), eur(move.target))}
              </span>
            </p>
            <ColumnChart label={PATH.unlocks.move.title} data={move.rows.map((r) => ({ label: monthLabel(r.month), value: r.profit }))} target={move.target} tone="ink" unit="€" height={160} />
          </div>
          <div className="min-w-0 lg:border-l lg:border-ink/8 lg:pl-10">
            <p className="text-h3 text-ink">{PATH.unlocks.round.title}</p>
            <p className="mt-1 text-small text-muted">{PATH.unlocks.round.condition}</p>
            <ProgressBar ratio={0} label={PATH.unlocks.round.title} className="mt-5" />
            <p className="mt-3 text-body text-muted">{NOT_MEASURABLE}</p>
          </div>
        </div>
      </AdminSection>
    </>
  );
}

// ── T-Model ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const STEP_H = 64;

/** The T: breadth as the top bar (5 fields), depth as the bar down its middle (7 steps, 1–3 active); the arrow from breadth to step 6. Then the matrix. */
function TModelView({ inputs }: { inputs: AdminInputs }) {
  const { breadth, depth, arrow, matrix } = T_MODEL;
  const phase = visionPhase(inputs);
  return (
    <>
      <p className="text-eyebrow uppercase text-muted">{breadth.title}</p>
      {/* The top bar: one surface, its five fields split by 1px lines. */}
      <ol className="mt-3 grid rounded-[24px] bg-surface max-md:divide-y max-md:divide-ink/8 md:grid-cols-5 md:divide-x md:divide-ink/8">
        {breadth.fields.map((field) => (
          <li key={field.title} className="min-w-0 px-5 py-5">
            <p className="text-body font-semibold text-ink">{field.title}</p>
            <p className="mt-1 text-small text-muted">{field.text}</p>
          </li>
        ))}
      </ol>

      {/* The stem: the same surface straight down from the bar's middle; the arrow on its right. */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px_minmax(0,1fr)]">
        <div className="relative lg:col-start-2">
          <ol className="rounded-b-[24px] bg-surface max-lg:mt-2 max-lg:rounded-t-[24px]">
            {depth.steps.map((step, i) => (
              <li key={step.title} className={cn("flex items-center gap-3 px-5", i > 0 && "border-t border-ink/8")} style={{ minHeight: STEP_H }}>
                <span
                  className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-small tabular-nums", step.active ? "bg-ink text-inverse" : "border-[1.5px] border-ink/25 text-muted")}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-body", step.active ? "font-semibold text-ink" : "text-ink/70")}>{step.title}</span>
                  <span className="block truncate text-small text-muted">
                    {step.text}
                    {i + 1 === arrow.toStep && <span className="xl:hidden"> · ← {arrow.text}</span>}
                  </span>
                </span>
                {step.active && <span className="text-small text-muted">{depth.active}</span>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-center text-eyebrow uppercase text-muted">{depth.title}</p>
          {/* From the bar down the stem's right side, then left into step 6. */}
          <div aria-hidden className="absolute left-full top-0 ml-6 max-xl:hidden" style={{ height: STEP_H * (arrow.toStep - 0.5) }}>
            <div className="relative h-full w-10 rounded-br-xl border-b-[1.5px] border-r-[1.5px] border-dashed border-ink/40">
              <ChevronLeft className="absolute -bottom-[9px] -left-2 size-4 text-ink/60" strokeWidth={2} />
            </div>
            <p className="absolute left-14 top-1/2 w-32 -translate-y-1/2 text-small font-semibold text-ink">{arrow.text}</p>
          </div>
        </div>
      </div>

      {/* The matrix: five phases × five rows; the current phase's column in ocean 12 % under "You are here". */}
      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-left">
          <thead>
            <tr>
              <th className="w-28" />
              {matrix.phases.map((p, i) => (
                <th key={p} className={cn("px-3 pb-3 align-bottom font-normal", i === phase && "rounded-t-[16px] bg-adm-chart-1-soft pt-3")}>
                  {i === phase && <Here className="block" />}
                  <span className={cn("block text-body", i === phase ? "font-semibold text-ink" : "text-muted")}>{p}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, r) => (
              <tr key={row.title} className="border-t border-ink/8">
                <th className="py-3 pr-3 text-small font-semibold text-ink">{row.title}</th>
                {row.cells.map((cell, i) => (
                  <td key={i} className={cn("px-3 py-3 align-top text-small", i === phase ? "bg-adm-chart-1-soft text-ink" : "text-ink/70", i === phase && r === matrix.rows.length - 1 && "rounded-b-[16px]")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Breadth & Depth ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Two rows in step: breadth H1–H6 on top, depth V1–V6 offset half a step below; a diamond before V2–V6 with its criterion and progress. */
function BreadthDepthView({ inputs }: { inputs: AdminInputs }) {
  return (
    <>
      <div className="lg:grid lg:grid-cols-13 lg:gap-x-3">
        <p className="text-eyebrow uppercase text-muted lg:col-span-13">{BREADTH_DEPTH.breadthTitle}</p>
        {BREADTH_DEPTH.breadth.map((step, i) => (
          <Step key={step.key} code={step.key} title={step.title} here={i === 0} className="mt-3 lg:col-span-2 lg:row-start-2" style={{ gridColumnStart: i * 2 + 1 }} />
        ))}
        <p className="mt-12 text-eyebrow uppercase text-muted lg:col-span-13">{BREADTH_DEPTH.depthTitle}</p>
        {BREADTH_DEPTH.depth.map((step, i) => {
          const value = step.unlock ? depthUnlockValue(step.unlock.measure, inputs) : null;
          return (
            <Step key={step.key} code={step.key} title={step.title} here={false} active={i === 0} className="mt-3 lg:col-span-2 lg:row-start-4" style={{ gridColumnStart: i * 2 + 2 }}>
              {step.unlock && (
                <div className="mt-3 flex gap-2">
                  <span aria-hidden className={cn("mt-1 size-2.5 shrink-0 rotate-45 border-[1.5px] border-ink", value !== null && step.unlock.target !== null && value >= step.unlock.target && "bg-ink")} />
                  <div className="min-w-0">
                    <p className="text-small text-ink">{step.unlock.criterion}</p>
                    {value !== null && step.unlock.target !== null ? (
                      <>
                        <ProgressBar ratio={Math.min(1, value / step.unlock.target)} label={step.unlock.criterion} className="mt-2" />
                        <p className="mt-1 text-small tabular-nums text-muted">{BREADTH_DEPTH.progress(value, step.unlock.target)}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-small text-muted">{NOT_MEASURABLE}</p>
                    )}
                  </div>
                </div>
              )}
            </Step>
          );
        })}
      </div>
      <p className="mt-14 max-w-2xl text-body-lg text-ink">{BREADTH_DEPTH.closing}</p>
    </>
  );
}

/** A step on a track: its node and a line to the next, the code small, the title; "You are here" in ocean (only H1), done today in ink (V1). */
function Step({ code, title, here, active = false, className, style, children }: { code: string; title: string; here: boolean; /** Done today, but not the focus */ active?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)} style={style}>
      <div aria-hidden className="flex h-4 items-center">
        <span className={cn("size-3 shrink-0 rounded-full", here ? "bg-adm-chart-1 ring-4 ring-adm-chart-1-soft" : active ? "bg-ink" : "border-[1.5px] border-ink/30")} />
        <span className="ml-2 h-0.5 flex-1 rounded-full bg-ink/10" />
      </div>
      <p className="mt-3 text-small text-muted">
        {code}
        {here && <Here className="ml-2" />}
      </p>
      <p className={cn("text-body text-ink", (here || active) && "font-semibold")}>{title}</p>
      {children}
    </div>
  );
}

// ── Continuum ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Three columns of numbered sources (1–15) with their status, the live ones with this month's revenue; two arrows under them. */
function ContinuumView({ inputs }: { inputs: AdminInputs }) {
  const revenue = revenueBySource(inputs);
  const all = CONTINUUM.groups.flatMap((g) => [...g.sources]);
  let n = 0;
  return (
    <>
      <Legend sources={all} />
      <div className="mt-10 grid gap-y-10 lg:grid-cols-3">
        {CONTINUUM.groups.map((group, i) => (
          <section key={group.title} className={cn("min-w-0", i > 0 && "lg:border-l lg:border-ink/8 lg:pl-8", i < 2 && "lg:pr-8")}>
            <h2 className="text-h3 text-ink">{group.title}</h2>
            <ul className="mt-5 flex flex-col gap-4">
              {group.sources.map((source) => (
                <SourceRow key={source.name} source={source} number={++n} revenue={revenue} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-col gap-4 text-small font-semibold text-ink">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/30" />
          <span className="shrink-0">{CONTINUUM.arrows.right}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="shrink-0">{CONTINUUM.arrows.left}</span>
          <span className="h-px flex-1 bg-ink/30" />
        </div>
      </div>
    </>
  );
}

// ── Roadmap ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A staircase of six stages, each with its new revenue; stage 1 "You are here". Under it the parallel lane "Partner ecosystem", each area under the stage it starts at. */
function RoadmapView() {
  const cols = ROADMAP.stages.length;
  return (
    <>
      <ol className="grid gap-y-8 lg:grid-cols-6 lg:items-end lg:gap-x-3">
        {ROADMAP.stages.map((stage, i) => {
          const here = i + 1 === ROADMAP.current;
          return (
            <li key={stage.title} className="flex min-w-0 flex-col">
              <div className="pb-4">
                {here && <Here className="mb-1 block" />}
                <p className="text-small tabular-nums text-muted">{i + 1}</p>
                <p className="text-h3 text-ink">{stage.title}</p>
                <p className="mt-1 text-small text-muted">{stage.text}</p>
                <p className="mt-3 text-eyebrow uppercase text-muted">{ROADMAP.revenueLabel}</p>
                <p className="mt-0.5 text-small font-semibold text-ink">{stage.revenue}</p>
              </div>
              {/* The step itself: each one higher than the last. */}
              <span aria-hidden className={cn("block rounded-t-[12px] max-lg:hidden", here ? "bg-adm-chart-1-soft" : "bg-ink/8")} style={{ height: 24 + i * 28 }} />
            </li>
          );
        })}
      </ol>

      <AdminSection title={ROADMAP.partnerTitle} className="mt-14">
        <div className="relative lg:grid lg:grid-cols-6 lg:gap-x-3">
          <span aria-hidden className="absolute inset-x-0 top-1.5 h-px bg-ink/15 max-lg:hidden" />
          {Array.from({ length: cols }, (_, c) => {
            const areas = ROADMAP.partners.filter((p) => p.from === c + 1);
            return (
              <div key={c} className="min-w-0">
                {areas.length > 0 && <span aria-hidden className="relative block size-3 rounded-full border-[1.5px] border-ink/40 bg-bg max-lg:hidden" />}
                <ul className="flex flex-col gap-4 lg:mt-4">
                  {areas.map((area) => (
                    <li key={area.title} className="max-lg:mt-4">
                      <p className="text-body font-semibold text-ink">{area.title}</p>
                      <p className="text-small text-muted">{area.text}</p>
                      <p className="mt-0.5 text-small text-ink/50">{ROADMAP.fromStage(area.from)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </AdminSection>
    </>
  );
}
