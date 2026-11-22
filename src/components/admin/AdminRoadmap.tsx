"use client";

// Admin › Zeitplan › Zeitleiste (the page's first tab): a clean Gantt over the whole screen – from this month to December of the next year
// (timelineRange; every month shown, the year at the start and at the turn), a fixed name column left (220px), the time axis right, five
// rows that share the window's remaining height evenly (bars, diamonds, the star and their words grow with them), one band each:
// Code (M1–M6 one after another) · Marketing (phases 1–4) · Reise (Deutschland · Bangkok · Bali) · Vorbereitung (diamonds at the due dates
// with the number of open to-dos) · Launch (star with its date). No other text in the drawing – names, dates and lists in the tooltips.
// Nothing overlaps: diamonds closer than a few days merge into one, and a label never crosses the "heute" line (it moves to the side of
// the band that has room). Colours by tokens: Code primary, Marketing chart-2, Reise neutral grey, Vorbereitung and Launch the goal amber;
// bars as everywhere (edge, light fill), reached filled, running dashed. All dates from config/roadmap.ts (the marketing phases from
// config/marketing.ts), the to-dos' state through the adapter. German, dark, the admin's tokens.
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CODE_MILESTONES, LAUNCH, ROADMAP_RANGE, TRAVEL, type TodoDue } from "@/config/roadmap";
import { FALLBACK_RULES } from "@/config/marketing";
import { isRunningSpan, strategyDates, strategyPhases } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day, month } from "@/lib/i18n/adminFormat";
import { dueProgress, isOpenTodo, roadmapTodos, timelineRange, type PlanMilestone } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
/** A day's place on a range, 0–100 %, and the end of a day (its band runs through it). */
function scaleOf(range: { from: string; to: string }) {
  const span = ms(range.to) + 86_400_000 - ms(range.from);
  const at = (d: string) => Math.min(100, Math.max(0, ((ms(d) - ms(range.from)) / span) * 100));
  const endOf = (d: string) => at(new Date(ms(d) + 86_400_000).toISOString().slice(0, 10));
  return { at, endOf };
}
/** The axis' height (today's label over the months). */
const AXIS_H = 60;
/** What stays under the legend: the page's bottom padding. */
const BOTTOM_GAP = 44;
/** Each row at least this high – below it the page may scroll rather than squeeze. */
const MIN_ROW = 64;
/** Diamonds closer than this (px on the track) become one – nothing on top of each other. */
const MERGE_PX = 44;
/** A band shows its label only when it fits (≈ 10px per character + 12px room); otherwise the name stays in the tooltip. */
const labelFits = (label: string, px: number) => px >= label.length * 10 + 12;

/** A milestone's name: "M1 Footer + Dashboard", "Woche 1–2 · Fundament", "Launch · Simpulo öffnet" (words in admin.zeitplan). */
export function useMilestoneName() {
  const t = useTranslations("admin.zeitplan");
  return (m: Pick<PlanMilestone, "kind" | "label" | "title" | "weeks">) =>
    m.kind === "code" ? `${m.label} ${m.title}` : m.kind === "marketing" ? `${t("weeks", { from: m.weeks!.from, to: m.weeks!.to })} · ${m.title}` : `${t("launchLabel")} · ${t("launchTitle")}`;
}

type Tone = "code" | "marketing" | "travel";
type State = "open" | "running" | "reached" | "uncertain";
/** A band's look by its tone and state: edge + light fill; reached filled; running dashed over the faint fill; uncertain dashed, no fill. */
const BAND: Record<Tone, Record<State, string>> = {
  code: {
    open: "border-adm-chart-primary bg-(--adm-chart-fill) text-ink",
    running: "border-dashed border-adm-chart-hover bg-(--adm-chart-fill-current) text-ink",
    reached: "border-adm-chart-primary bg-adm-chart-primary text-(--adm-cap-on-text)",
    uncertain: "border-dashed border-adm-chart-primary text-ink",
  },
  marketing: {
    open: "border-adm-chart-2 bg-(--adm-chart-2-fill) text-ink",
    running: "border-dashed border-adm-chart-2 bg-(--adm-chart-2-fill-current) text-ink",
    reached: "border-adm-chart-2 bg-adm-chart-2 text-(--adm-cap-on-text)",
    uncertain: "border-dashed border-adm-chart-2 text-ink",
  },
  travel: {
    open: "border-ink/25 bg-ink/6 text-ink",
    running: "border-ink/40 bg-ink/10 text-ink",
    reached: "border-ink/25 bg-ink/6 text-ink",
    uncertain: "border-dashed border-ink/40 text-ink",
  },
};

/**
 * Where a band's label goes so it never crosses "heute": centred in the band, or – when today lies in it – centred in the larger part beside
 * the line. Returns the label's centre in % of the band.
 */
function labelCentre(from: number, to: number, now: number | null): number {
  if (now === null || now <= from || now >= to) return 50;
  const left = now - from;
  const right = to - now;
  const width = to - from;
  return left >= right ? (left / 2 / width) * 100 : ((left + right / 2) / width) * 100;
}

/** One row: its name in the fixed column, the track right; the height the rows share (--row-h). */
function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)] items-center border-t border-ink/8">
      <span className="truncate pr-4 text-body font-semibold uppercase tracking-wide text-(--adm-label)">{name}</span>
      <div className="relative h-(--row-h)">
        {children}
      </div>
    </div>
  );
}

/** A band on the track: one section, its short label inside (kept off the today line), the full text in the tooltip; a button when it opens something. */
function Band({ id, from, to, tone, state, label, tip, now, track, onClick }: { id: string; from: number; to: number; tone: Tone; state: State; label: string; tip: string; now: number | null; track: number; onClick?: () => void }) {
  const centre = labelCentre(from, to, now);
  const roomy = labelFits(label, ((to - from) / 100) * track);
  const className = cn("absolute top-1/2 h-(--band-h) -translate-y-1/2 overflow-hidden rounded-lg border-[1.5px] text-body font-semibold", BAND[tone][state], onClick && "cursor-pointer transition-[filter] duration-150 hover:brightness-125");
  const style = { left: `${from}%`, width: `calc(${to - from}% - 2px)` };
  const inner = roomy ? (
    <span aria-hidden className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap leading-none" style={{ left: `${centre}%` }}>
      {label}
    </span>
  ) : null;
  return onClick ? (
    <button type="button" data-band={id} data-band-state={state} data-tooltip-info={tip} aria-label={tip} onClick={onClick} className={className} style={style}>
      {inner}
    </button>
  ) : (
    <span data-band={id} data-band-state={state} data-tooltip-info={tip} aria-label={tip} role="img" className={className} style={style}>
      {inner}
    </span>
  );
}

export function RoadmapTimeline({ onPickDue, onMilestone, onMilestones }: { onPickDue: (due: TodoDue) => void; onMilestone: (id: string) => void; onMilestones: () => void }) {
  const t = useTranslations("admin.zeitplan.timeline");
  const tz = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const reached = data.roadmapReached ?? {};
  const phases = strategyPhases(strategyDates().start);
  const todos = roadmapTodos(data);
  const range = timelineRange(today);
  const { at, endOf } = scaleOf(range);
  const now = today >= range.from && today <= range.to ? at(today) : null;
  // The rows share the window's height under the bar: measured from the drawing's top, less the axis, the legend and the page's padding.
  const box = useRef<HTMLDivElement>(null);
  const legend = useRef<HTMLParagraphElement>(null);
  const [rowH, setRowH] = useState(MIN_ROW);
  // The track's width in px: narrow bands drop their label, close diamonds merge.
  const trackRef = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState(900);
  useLayoutEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrack(trackRef.current.clientWidth);
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      const rest = window.innerHeight - (top + window.scrollY) - AXIS_H - (legend.current?.offsetHeight ?? 0) - BOTTOM_GAP;
      setRowH(Math.max(MIN_ROW, Math.floor(rest / 5)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  // Bars, diamonds and the star grow with the rows (readable, never tiny).
  const sizes = { "--row-h": `${rowH}px`, "--band-h": `${Math.round(Math.min(72, Math.max(28, rowH * 0.42)))}px`, "--mark": `${Math.round(Math.min(28, Math.max(14, rowH * 0.16)))}px` } as CSSProperties;

  // Months on the axis, the year at the start and at the turn of the year ("Dez 2026", "Jan 2027").
  const months: { start: string; label: string; year: string | null }[] = [];
  for (let m: string = range.from; m <= range.to; ) {
    const d = new Date(ms(m));
    const mm = d.getUTCMonth();
    const withYear = m === range.from || mm === 0 || mm === 11;
    months.push({ start: m, label: month(m.slice(0, 7)).replace(".", ""), year: withYear ? String(d.getUTCFullYear()) : null });
    m = new Date(Date.UTC(d.getUTCFullYear(), mm + 1, 1)).toISOString().slice(0, 10);
  }

  // The preparation's due dates with to-dos; dates closer than MERGE_PCT become one diamond (its count the sum, its tooltip both).
  const dues = dueProgress(todos).filter((d) => d.date && d.total > 0);
  const clusters: { pos: number; ids: TodoDue[]; open: number; uncertain: boolean; tip: string[] }[] = [];
  for (const d of dues.toSorted((a, b) => a.date!.date.localeCompare(b.date!.date))) {
    const pos = at(d.date!.date);
    const openTitles = todos.filter((x) => x.due === d.id && isOpenTodo(x)).map((x) => x.title);
    const list = openTitles.length ? `: ${openTitles.slice(0, 4).join(", ")}${openTitles.length > 4 ? " …" : ""}` : "";
    const line = `${d.label} · ${day(d.date!.date)}${d.date!.uncertain ? ` (${tz("todos.approx")})` : ""} · ${t("open", { count: d.open })}${list}`;
    const last = clusters.at(-1);
    if (last && ((pos - last.pos) / 100) * track < MERGE_PX) {
      last.ids.push(d.id);
      last.open += d.open;
      last.uncertain ||= Boolean(d.date!.uncertain);
      last.tip.push(line);
    } else clusters.push({ pos, ids: [d.id], open: d.open, uncertain: Boolean(d.date!.uncertain), tip: [line] });
  }

  const stateOf = (id: string, from: string, to: string): State => (reached[id] ? "reached" : isRunningSpan(from, to, today) ? "running" : "open");
  const launch = at(LAUNCH.date);
  const launchTip = `${t("launch", { date: day(LAUNCH.date) })} · ${t("fallback")}: ${FALLBACK_RULES.map((r) => r.text).join(" · ")}`;

  return (
    <div data-roadmap-timeline className="flex flex-col" style={sizes}>
      <div ref={box} className="relative">
        {/* Axis: "heute" in its own line above the months, so it never meets a month's name. */}
        <div className="grid grid-cols-[220px_minmax(0,1fr)]">
          <span />
          <div ref={trackRef} className="relative" style={{ height: AXIS_H }}>
            {now !== null && (
              <span data-today-label style={{ left: `${now}%` }} className="absolute top-0 -translate-x-1/2 text-small font-semibold text-adm-chart-1">
                {t("today")}
              </span>
            )}
            {months.map((m) => (
              // The month, and under it – at the start and at the turn of the year – the year, small ("Dez / 2026", "Jan / 2027").
              <span key={m.start} data-month style={{ left: `${at(m.start)}%` }} className="absolute bottom-1 flex flex-col pl-1.5 leading-tight whitespace-nowrap">
                <span className="text-body text-muted">{m.label}</span>
                <span className="text-small text-(--adm-label)">{m.year ?? "\u00a0"}</span>
              </span>
            ))}
          </div>
        </div>

        <Row name={t("rows.code")}>
          {CODE_MILESTONES.map((m, i) => {
            const from = i === 0 ? ROADMAP_RANGE.from : CODE_MILESTONES[i - 1].date;
            return <Band key={m.id} id={m.id} from={at(from)} to={endOf(m.date)} tone="code" state={m.uncertain ? "uncertain" : stateOf(m.id, from, m.date)} label={m.label} tip={`${m.label} ${m.title} · ${t("due", { date: day(m.date) })}`} now={now} track={track} onClick={() => onMilestone(m.id)} />;
          })}
        </Row>

        <Row name={t("rows.marketing")}>
          {phases.map((p, i) => (
            <Band key={p.key} id={p.key} from={at(p.from)} to={endOf(p.to)} tone="marketing" state={stateOf(p.key, p.from, p.to)} label={String(i + 1)} tip={`${tz("weeks", { from: p.weeks.from, to: p.weeks.to })} · ${p.label} · ${day(p.from)} – ${day(p.to)}`} now={now} track={track} onClick={() => onMilestone(p.key)} />
          ))}
        </Row>

        <Row name={t("rows.travel")}>
          {TRAVEL.map((s) => (
            <Band key={s.id} id={s.id} from={at(s.from)} to={endOf(s.to)} tone="travel" state={s.uncertain ? "uncertain" : isRunningSpan(s.from, s.to, today) ? "running" : "open"} label={s.label} tip={`${s.label} · ${day(s.from)} – ${day(s.to)}${s.uncertain ? ` · ${t("uncertain")}` : ""}`} now={now} track={track} />
          ))}
        </Row>

        <Row name={t("rows.prep")}>
          {clusters.map((c) => (
            <button
              key={c.ids.join("+")}
              type="button"
              data-due={c.ids.join("+")}
              data-tooltip-info={c.tip.join(" · ")}
              aria-label={c.tip.join(" · ")}
              onClick={() => onPickDue(c.ids[0])}
              style={{ left: `${c.pos}%` }}
              className="group absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5"
            >
              <span aria-hidden className={cn("-ml-[calc(var(--mark)/2)] size-(--mark) rotate-45 rounded-[3px] border-[1.5px] border-adm-chart-goal", c.open === 0 ? "bg-adm-chart-goal" : "bg-(--adm-chart-goal-fill)", c.uncertain && "border-dashed")} />
              <span aria-hidden className="text-body font-semibold tabular-nums text-ink group-hover:underline">
                {c.open}
              </span>
            </button>
          ))}
        </Row>

        <Row name={t("rows.launch")}>
          <button type="button" data-launch-star data-tooltip-info={launchTip} aria-label={launchTip} onClick={onMilestones} style={{ left: `${launch}%` }} className="group absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            <svg viewBox="0 0 24 24" aria-hidden className="-ml-[calc(var(--mark)*0.7)] size-[calc(var(--mark)*1.4)] fill-(--adm-chart-goal-fill) stroke-adm-chart-goal" strokeWidth={1.5}>
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z" />
            </svg>
            <span className="text-body font-semibold whitespace-nowrap text-ink group-hover:underline">{day(LAUNCH.date)}</span>
          </button>
        </Row>

        {/* Fine month lines and the thin today line across the rows. */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 grid w-full grid-cols-[220px_minmax(0,1fr)]" style={{ top: AXIS_H }}>
          <span />
          <div className="relative">
            {months.map((m) => (
              <span key={m.start} style={{ left: `${at(m.start)}%` }} className="absolute top-0 bottom-0 border-l border-ink/6" />
            ))}
            {now !== null && <span data-today-line style={{ left: `${now}%` }} className="absolute -top-5 bottom-0 w-px bg-adm-chart-1" />}
          </div>
        </div>
      </div>

      <p ref={legend} className="border-t border-ink/8 pt-2 text-small text-muted">{t("legend")}</p>
    </div>
  );
}
