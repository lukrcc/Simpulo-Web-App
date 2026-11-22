"use client";

// Admin › Zeitplan › Zeitleiste: the schedule as a Gantt-like timeline (Code · Marketing · Reise · Vorbereitung · Launch,
// Nov 2026 – Jun 2027, "heute" as a line); the rest of the page is AdminZeitplan.tsx. All dates and to-dos from config/roadmap.ts (the one source; the
// marketing phases from config/marketing.ts), the to-dos' status, note and cost through the adapter (AdminData.roadmapTodos), every change
// and every milestone reached logged (useAdminActions). German, dark, the admin's tokens.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { CODE_MILESTONES, DEPARTURE, LAUNCH, ROADMAP_IDEAS, ROADMAP_RANGE, TRAVEL, type TodoDue } from "@/config/roadmap";
import { useAdminActions } from "@/lib/admin/actions";
import { isRunningSpan, strategyDates, strategyPhases } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day, month } from "@/lib/i18n/adminFormat";
import { daysToDeparture, dueProgress, nextMilestone, roadmapTodos, type PlanMilestone } from "@/lib/roadmap";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/ActionButton";
import { STATUS_BG, StatusDot } from "./AdminCharts";

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const SPAN = ms(ROADMAP_RANGE.to) + 86_400_000 - ms(ROADMAP_RANGE.from);
/** A day's place on the timeline, 0–100 %. */
const at = (d: string) => Math.min(100, Math.max(0, ((ms(d) - ms(ROADMAP_RANGE.from)) / SPAN) * 100));
const endOf = (d: string) => at(new Date(ms(d) + 86_400_000).toISOString().slice(0, 10));

/** A milestone's name: "M1 Footer + Dashboard", "Woche 1–2 · Fundament", "Launch · Simpulo öffnet" (words in admin.zeitplan). */
export function useMilestoneName() {
  const t = useTranslations("admin.zeitplan");
  return (m: Pick<PlanMilestone, "kind" | "label" | "title" | "weeks">) =>
    m.kind === "code" ? `${m.label} ${m.title}` : m.kind === "marketing" ? `${t("weeks", { from: m.weeks!.from, to: m.weeks!.to })} · ${m.title}` : `${t("launchLabel")} · ${t("launchTitle")}`;
}

/** "Nächster Meilenstein: … in X Tagen · Abreise in X Tagen" – the timeline's top line and the Übersicht's (a link to /admin/zeitplan). */
export function RoadmapHeadline({ href, className }: { href?: string; className?: string }) {
  const t = useTranslations("admin.platform.roadmap");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const name = useMilestoneName();
  const next = nextMilestone(today, data);
  const dep = daysToDeparture(today);
  const text = `${next ? t("next", { label: name(next), days: next.days }) : t("nextNone")} · ${dep >= 0 ? t("departure", { days: dep }) : t("departed")}`;
  return href ? (
    <Link data-roadmap-headline href={href} className={cn("text-small text-muted underline-offset-4 hover:text-ink hover:underline", className)}>
      {text} →
    </Link>
  ) : (
    <p data-roadmap-headline className={cn("text-body text-ink", className)}>
      {text}
    </p>
  );
}

const LABEL_TOP = 26;
const ROW_H = 18;
/** A lane's height: the mark row plus its label rows. */
const laneHeight = (rows: number) => LABEL_TOP + rows * ROW_H + 10;
/** About how wide a character of text-small is, in % of the track (the track is ~1000px at 1440). */
const CHAR_PCT = 0.66;

/**
 * Labels centred under their mark, each in the first row where it doesn't overlap the ones already there (left to right); kept inside the
 * track. Returns each label's left edge (%) and row.
 */
function stackLabels(items: readonly { id: string; pos: number; chars: number }[]): Record<string, { left: number; row: number }> {
  const rowsEnd: number[] = [];
  const out: Record<string, { left: number; row: number }> = {};
  for (const item of items.toSorted((a, b) => a.pos - b.pos)) {
    const width = item.chars * CHAR_PCT;
    const left = Math.min(100 - width, Math.max(0, item.pos - width / 2));
    let row = rowsEnd.findIndex((end) => end + 1 <= left);
    if (row === -1) row = rowsEnd.length;
    rowsEnd[row] = left + width;
    out[item.id] = { left, row };
  }
  return out;
}

/** One lane: its label left, the track right (positions in % of the track). */
function Lane({ label, height, children }: { label: string; height: number; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] border-t border-ink/8">
      <span className="flex items-center text-eyebrow uppercase text-(--adm-label)">{label}</span>
      <div className="relative" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

export function RoadmapTimeline({ onPickDue }: { onPickDue: (due: TodoDue) => void }) {
  const t = useTranslations("admin.platform.roadmap");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const reached = data.roadmapReached ?? {};
  const [picked, setPicked] = useState<string | null>(null);
  const phases = strategyPhases(strategyDates().start);
  const dues = dueProgress(roadmapTodos(data));
  const months: string[] = [];
  for (let m: string = ROADMAP_RANGE.from; m <= ROADMAP_RANGE.to;) {
    months.push(m);
    const d = new Date(ms(m));
    m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  }
  const now = today >= ROADMAP_RANGE.from && today <= ROADMAP_RANGE.to ? at(today) : null;
  const milestone = CODE_MILESTONES.find((m) => m.id === picked) ?? null;
  const datedDues = dues.filter((d) => d.date && d.total > 0);
  // Labels stacked in rows so none overlaps its neighbour (widths estimated from their characters).
  const codeLabels = stackLabels(
    CODE_MILESTONES.map((m) => ({
      id: m.id,
      pos: at(m.date),
      chars: `${m.label} ${m.title}`.length,
    })),
  );
  const phaseLabels = stackLabels(
    phases.map((p) => ({
      id: p.key,
      pos: (at(p.from) + endOf(p.to)) / 2,
      chars: p.label.length,
    })),
  );
  const dueLabels = stackLabels(
    datedDues.map((d) => ({
      id: d.id,
      pos: at(d.date!.date),
      chars: `${d.label} · ${t("dueOpen", { count: d.open })}`.length,
    })),
  );
  const rowsOf = (placed: Record<string, { row: number }>) => Math.max(0, ...Object.values(placed).map((p) => p.row)) + 1;
  const codeRows = rowsOf(codeLabels);
  const phaseRows = rowsOf(phaseLabels);
  const dueRows = rowsOf(dueLabels);
  const fallbackEnd = new Date(ms(LAUNCH.date) + 14 * 86_400_000).toISOString().slice(0, 10);
  return (
    <div data-roadmap-timeline className="flex flex-col gap-(--adm-inner)">
      <RoadmapHeadline />
      <div className="relative">
        {/* Month axis */}
        <div className="grid grid-cols-[112px_minmax(0,1fr)]">
          <span />
          <div className="relative h-6">
            {months.map((m) => (
              <span key={m} style={{ left: `${at(m)}%` }} className="absolute top-0 border-l border-ink/12 pl-1.5 text-small text-muted">
                {month(m.slice(0, 7))}
                {(m.endsWith("01-01") || m === ROADMAP_RANGE.from) && ` ${m.slice(2, 4)}`}
              </span>
            ))}
          </div>
        </div>

        <Lane label={t("lanes.code")} height={laneHeight(codeRows)}>
          {/* The sections between the milestones as one track, each milestone a point at its end. */}
          {CODE_MILESTONES.map((m, i) => {
            const done = Boolean(reached[m.id]);
            const left = i === 0 ? 0 : at(CODE_MILESTONES[i - 1].date);
            // Reached: primary; the section today lies in: the "current" style (metrics.ts isRunningSpan); still ahead: the grey track.
            const running = !done && isRunningSpan(i === 0 ? ROADMAP_RANGE.from : CODE_MILESTONES[i - 1].date, m.date, today);
            return <span key={`${m.id}-bar`} aria-hidden style={{ left: `${left}%`, width: `${at(m.date) - left}%` }} className={cn("absolute top-3 h-2 rounded-full", done ? "bg-adm-chart-primary" : running ? "border border-dashed border-adm-chart-hover bg-adm-chart-current" : "bg-adm-chart-track")} />;
          })}
          {CODE_MILESTONES.map((m) => {
            const done = Boolean(reached[m.id]);
            const place = codeLabels[m.id];
            return (
              <button key={m.id} type="button" data-code-milestone={m.id} data-reached={done || undefined} aria-pressed={picked === m.id} aria-label={`${m.label} ${m.title} · ${day(m.date)}`} onClick={() => setPicked(picked === m.id ? null : m.id)} className="group contents">
                <span aria-hidden style={{ left: `${at(m.date)}%` }} className={cn("absolute top-[7px] size-3.5 -translate-x-1/2 rounded-full ring-2 ring-(--bg)", done ? STATUS_BG.good : "bg-ink", picked === m.id && "outline-2 outline-offset-2 outline-ink/60")} />
                <span
                  aria-hidden
                  style={{
                    left: `${place.left}%`,
                    top: `${LABEL_TOP + place.row * ROW_H}px`,
                  }}
                  className={cn("absolute whitespace-nowrap text-small leading-4", picked === m.id ? "font-semibold text-ink" : "text-ink/75 group-hover:text-ink")}
                >
                  <span className="font-semibold">{m.label}</span> {m.title}
                </span>
              </button>
            );
          })}
        </Lane>

        <Lane label={t("lanes.marketing")} height={laneHeight(phaseRows)}>
          {phases.map((p) => {
            const here = isRunningSpan(p.from, p.to, today);
            const place = phaseLabels[p.key];
            return (
              <span key={p.key} data-roadmap-phase={p.key}>
                <span
                  aria-hidden
                  style={{
                    left: `${at(p.from)}%`,
                    width: `${endOf(p.to) - at(p.from)}%`,
                  }}
                  className={cn("absolute top-2.5 h-3 rounded-sm", here ? "border border-dashed border-adm-chart-hover bg-adm-chart-current" : "bg-adm-chart-primary")}
                />
                <span
                  style={{
                    left: `${place.left}%`,
                    top: `${LABEL_TOP + place.row * ROW_H}px`,
                  }}
                  className={cn("absolute whitespace-nowrap text-small leading-4", here ? "font-semibold text-ink" : "text-ink/75")}
                >
                  {p.label}
                </span>
              </span>
            );
          })}
        </Lane>

        <Lane label={t("lanes.travel")} height={76}>
          {TRAVEL.map((s) => (
            <span
              key={s.id}
              data-travel={s.id}
              data-uncertain={s.uncertain || undefined}
              style={{
                left: `${at(s.from)}%`,
                width: `${endOf(s.to) - at(s.from)}%`,
              }}
              className={cn("absolute top-2 flex h-8 items-center overflow-hidden rounded-md px-2 text-small text-ink", s.uncertain ? "border border-dashed border-ink/40" : "bg-(--adm-block) ring-1 ring-inset ring-ink/10")}
            >
              <span className="truncate">
                {s.label}
                {s.uncertain && <span className="text-muted"> · {t("uncertain")}</span>}
              </span>
            </span>
          ))}
          {ROADMAP_IDEAS.map((idea) => (
            <span
              key={idea.id}
              data-roadmap-idea={idea.id}
              style={{ left: `${at(idea.date)}%` }}
              className={cn("absolute top-11 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-small whitespace-nowrap text-ink", idea.uncertain ? "border border-dashed border-ink/40" : "bg-(--adm-block)")}
            >
              <span className="text-muted">{t("idea")}:</span> {idea.title}
            </span>
          ))}
        </Lane>

        <Lane label={t("lanes.prep")} height={laneHeight(dueRows)}>
          {datedDues.map((d) => {
            const place = dueLabels[d.id];
            return (
              <button key={d.id} type="button" data-due={d.id} data-complete={d.complete || undefined} aria-label={t("dueAll", { label: d.label })} onClick={() => onPickDue(d.id)} className="group contents">
                <span aria-hidden style={{ left: `${at(d.date!.date)}%` }} className={cn("absolute top-2 size-3.5 -translate-x-1/2 rotate-45 rounded-[3px]", d.complete ? STATUS_BG.good : STATUS_BG.warning, d.date!.uncertain && "outline-1 outline-offset-2 outline-dashed outline-ink/40")} />
                <span
                  aria-hidden
                  style={{
                    left: `${place.left}%`,
                    top: `${LABEL_TOP + place.row * ROW_H}px`,
                  }}
                  className="absolute whitespace-nowrap text-small leading-4 text-muted group-hover:text-ink"
                >
                  {d.label} · <span className={d.complete ? "text-muted" : "text-ink"}>{t("dueOpen", { count: d.open })}</span>
                </span>
              </button>
            );
          })}
        </Lane>

        <Lane label={t("lanes.launch")} height={56}>
          {/* The fallback's two weeks after the launch, dashed – a hint, nothing moves by itself. */}
          <span
            aria-hidden
            style={{
              left: `${at(LAUNCH.date)}%`,
              width: `${at(fallbackEnd) - at(LAUNCH.date)}%`,
            }}
            className="absolute top-4 h-3 rounded-full border border-dashed border-adm-chart-goal"
          />
          <span data-launch-star style={{ left: `${at(LAUNCH.date)}%` }} className="absolute top-1 flex -translate-x-1/2 flex-col items-center">
            <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-adm-chart-goal">
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z" />
            </svg>
            <span className="text-small font-semibold whitespace-nowrap text-ink">{t("launch", { date: day(LAUNCH.date) })}</span>
          </span>
          <span data-fallback-hint style={{ left: `calc(${at(fallbackEnd)}% + 16px)` }} className="absolute top-2 right-0 text-small leading-snug text-muted">
            {t("fallback")}
          </span>
        </Lane>

        {/* Today across all lanes */}
        {now !== null && (
          <div aria-hidden className="pointer-events-none absolute top-0 bottom-0 grid w-full grid-cols-[112px_minmax(0,1fr)]">
            <span />
            <div className="relative">
              <span data-today-line style={{ left: `${now}%` }} className="absolute top-5 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-adm-chart-1" />
              <span style={{ left: `${now}%` }} className="absolute -top-0.5 -translate-x-1/2 rounded-full bg-(--bg) px-1 text-small font-semibold text-adm-chart-1">
                {t("today")}
              </span>
            </div>
          </div>
        )}
      </div>

      <div data-milestone-detail className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/8 pt-(--adm-inner)">
        {milestone ? (
          <>
            <span className="text-body font-semibold text-ink">
              {milestone.label} · {milestone.title}
            </span>
            <span className="text-small text-muted">{t("milestoneDate", { date: day(milestone.date) })}</span>
            {reached[milestone.id] && (
              <span className="flex items-center gap-1.5 text-small text-ink">
                <StatusDot status="good" />
                {t("reached")} · {day(reached[milestone.id].slice(0, 10))}
              </span>
            )}
            <Button size="sm" variant={reached[milestone.id] ? "tertiary" : "secondary"} onClick={() => actions.setRoadmapReached(milestone.id, `${milestone.label} ${milestone.title}`, !reached[milestone.id])}>
              {reached[milestone.id] ? t("undoReached") : t("markReached")}
            </Button>
          </>
        ) : (
          <span className="text-small text-muted">{t("pickHint")}</span>
        )}
        <span className="ml-auto text-small text-muted">
          {t("legendUncertain")} · {t("departure", { days: Math.max(0, daysToDeparture(today)) })} ({day(DEPARTURE.date)})
        </span>
      </div>
    </div>
  );
}
