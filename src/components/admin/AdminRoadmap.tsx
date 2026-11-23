"use client";

// Admin › Zeitplan › Zeitleiste (the page's first capsule, CLAUDE.md "Zeitplan"): a clean Gantt over the whole screen – from this month to
// December of the next year (timelineRange; every month shown, the year at the start and at the turn), a fixed name column left (220px),
// the time axis right, FOUR rows that share the window's remaining height evenly: Code (M1–M6) · Marketing (phases 1–4) · Vorbereitung (one
// bar per due date, from the one before to it: "{Frist} · x offen", the done share filled, the rest tinted) · Launch (the launch window: the
// star and its date on 3 May, two weeks of buffer dashed after it – the fallback rule). Each row in its capsule's unit colour (config/
// admin-tiles.ts "zeitplan"); a click on a bar opens that capsule with the entry marked (?focus=). The journey (config/roadmap.ts TRAVEL)
// stays in the config but isn't shown. Nothing overlaps: a label never crosses the "heute" line. German, the admin's tokens.
import { pageInset } from "@/lib/admin/inset";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CODE_MILESTONES, LAUNCH, ROADMAP_RANGE, type TodoDue } from "@/config/roadmap";
import { unitColorOf } from "@/config/admin-tiles";
import { FALLBACK_RULES } from "@/config/marketing";
import { isRunningSpan, launchProgress, strategyDates, strategyPhases } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day, month, num } from "@/lib/i18n/adminFormat";
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
/** Each row at least this high – below it the page may scroll rather than squeeze. */
const MIN_ROW = 64;
/** The rows: Code · Marketing · Vorbereitung · Launch. */
const ROWS = 4;
/** Due dates closer than this (days) share one preparation bar – a bar of a day or two would carry no label. */
const MERGE_DAYS = 7;
/** The launch window: the launch week solid, then the buffer of the fallback rule ("Launch +2 Wochen") dashed. */
const LAUNCH_WEEK_DAYS = 7;
const LAUNCH_BUFFER_DAYS = 14;
const addDays = (d: string, n: number) => new Date(ms(d) + n * 86_400_000).toISOString().slice(0, 10);
let measureCtx: CanvasRenderingContext2D | null = null;
/** A label's width in the band's type (15px semibold), measured once per label; on the server an estimate (≈ 9px per character). */
function textWidth(label: string): number {
  if (typeof document === "undefined") return label.length * 9;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return label.length * 9;
  measureCtx.font = `600 15px ${getComputedStyle(document.body).fontFamily}`;
  return measureCtx.measureText(label).width;
}
/** A band shows a label only when it fits with room on both sides (plate included); otherwise the next shorter one, else the tooltip. */
const labelFits = (label: string, px: number) => px >= textWidth(label) + 14;
/** The longest of a band's labels that fits ("vor Abreise · 17 offen" → "Abreise · 17" → "17"); none: the tooltip carries it. */
const fitting = (labels: readonly string[], px: number) => labels.find((l) => labelFits(l, px)) ?? null;

/** A milestone's name: "M1 Footer + Dashboard", "Woche 1–2 · Fundament", "Launch · Simpulo öffnet" (words in admin.zeitplan). */
export function useMilestoneName() {
  const t = useTranslations("admin.zeitplan");
  return (m: Pick<PlanMilestone, "kind" | "label" | "title" | "weeks">) =>
    m.kind === "code" ? `${m.label} ${m.title}` : m.kind === "marketing" ? `${t("weeks", { from: m.weeks!.from, to: m.weeks!.to })} · ${m.title}` : `${t("launchLabel")} · ${t("launchTitle")}`;
}

type Tone = "code" | "marketing" | "prep" | "launch";
type State = "open" | "running" | "reached" | "uncertain";
/** Each row's colour: its capsule's unit colour (config/admin-tiles.ts "zeitplan"). */
const TONE: Record<Tone, string> = { code: unitColorOf("zeitplan", "code")!, marketing: unitColorOf("zeitplan", "marketing")!, prep: unitColorOf("zeitplan", "prep")!, launch: unitColorOf("zeitplan", "launch")! };
/** A band's look in its row's colour (--tone): edge + light fill; reached filled (inverse text); running dashed over a fainter fill; uncertain dashed, no fill. */
const BAND: Record<State, string> = {
  open: "border-(--tone) bg-[color-mix(in_srgb,var(--tone)_24%,var(--bg))] text-ink",
  running: "border-dashed border-(--tone) bg-[color-mix(in_srgb,var(--tone)_12%,var(--bg))] text-ink",
  reached: "border-(--tone) bg-(--tone) text-(--adm-cap-on-text)",
  uncertain: "border-dashed border-(--tone) text-ink",
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
function Band({ id, from, to, tone, state, label, labels, tip, now, track, onClick, dashed = false, done, children }: { id: string; from: number; to: number; tone: Tone; state: State; label: string; /** Shorter labels to fall back on when `label` doesn't fit */ labels?: readonly string[]; tip: string; now: number | null; track: number; onClick?: () => void; /** A dashed edge while keeping its fill (an uncertain due date) */ dashed?: boolean; /** The done share (0–1): filled in the full colour, the rest stays tinted (Vorbereitung) */ done?: number; children?: ReactNode }) {
  const centre = labelCentre(from, to, now);
  const shown = label ? fitting([label, ...(labels ?? [])], ((to - from) / 100) * track) : null;
  const className = cn("absolute top-1/2 h-(--band-h) -translate-y-1/2 overflow-hidden rounded-lg border-[1.5px] text-body font-semibold", BAND[state], dashed && "border-dashed", onClick && "adm-press cursor-pointer");
  const style = { left: `${from}%`, width: `calc(${to - from}% - 2px)`, "--tone": TONE[tone] } as CSSProperties;
  // Over a partly filled bar the label sits on a small plate of the ground, so it reads on both parts.
  const inner = (
    <>
      {done !== undefined && done > 0 && <span aria-hidden data-band-done className="absolute inset-y-0 left-0 bg-(--tone)" style={{ width: `${Math.min(1, done) * 100}%` }} />}
      {shown && (
        <span aria-hidden className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap leading-none", done !== undefined && "rounded-md bg-(--bg) px-1.5 py-1 text-ink")} style={{ left: `${centre}%` }}>
          {shown}
        </span>
      )}
      {children}
    </>
  );
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

export function RoadmapTimeline({ onOpen }: { onOpen: (lane: "code" | "marketing" | "prep" | "launch", focus: string) => void }) {
  const t = useTranslations("admin.zeitplan.timeline");
  const tz = useTranslations("admin.zeitplan");
  const inputs = useAdminInputs();
  const { today } = inputs;
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
      const rest = window.innerHeight - (top + window.scrollY) - AXIS_H - (legend.current?.offsetHeight ?? 0) - pageInset();
      setRowH(Math.max(MIN_ROW, Math.floor(rest / ROWS)));
      // Then measured once more: the rows' own borders count too – the legend ends exactly the page's inset above the window's bottom.
      requestAnimationFrame(() => {
        const bottom = legend.current?.getBoundingClientRect().bottom;
        if (bottom === undefined) return;
        const over = bottom + window.scrollY - (window.innerHeight - pageInset());
        if (over > 0) setRowH((h) => Math.max(MIN_ROW, h - Math.ceil(over / ROWS)));
      });
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

  // The preparation as bars: each due date with to-dos from the one before (the first from the range's start) to its date, "{Frist} · x offen";
  // due dates closer than MERGE_DAYS share one bar (named after the later one, both in the tooltip).
  const dues = dueProgress(todos).filter((d) => d.date && d.total > 0).toSorted((a, b) => a.date!.date.localeCompare(b.date!.date));
  const prepBars: { ids: TodoDue[]; label: string; short: string; from: string; to: string; open: number; done: number; total: number; uncertain: boolean; tip: string[] }[] = [];
  for (const d of dues) {
    const openTitles = todos.filter((x) => x.due === d.id && isOpenTodo(x)).map((x) => x.title);
    const list = openTitles.length ? `: ${openTitles.slice(0, 4).join(", ")}${openTitles.length > 4 ? " …" : ""}` : "";
    const line = `${d.label} · ${day(d.date!.date)}${d.date!.uncertain ? ` (${tz("todos.approx")})` : ""} · ${t("open", { count: d.open })}${list}`;
    const last = prepBars.at(-1);
    if (last && (ms(d.date!.date) - ms(last.to)) / 86_400_000 < MERGE_DAYS) {
      Object.assign(last, { ids: [...last.ids, d.id], label: d.label, short: t(`prepShortName.${d.id}`), to: d.date!.date, open: last.open + d.open, done: last.done + d.done, total: last.total + d.total, uncertain: last.uncertain || Boolean(d.date!.uncertain), tip: [...last.tip, line] });
    } else prepBars.push({ ids: [d.id], label: d.label, short: t(`prepShortName.${d.id}`), from: last ? last.to : range.from, to: d.date!.date, open: d.open, done: d.done, total: d.total, uncertain: Boolean(d.date!.uncertain), tip: [line] });
  }

  const stateOf = (id: string, from: string, to: string): State => (reached[id] ? "reached" : isRunningSpan(from, to, today) ? "running" : "open");
  // The launch window: the launch week solid (the star and its date), the buffer dashed; the tooltip with the criteria and how many are met.
  const lp = launchProgress(inputs);
  const tc = useTranslations("admin.overview");
  const criteria = [
    { key: "houses", label: tc("criteria.houses"), p: lp.houses, unit: "" },
    { key: "hubs", label: tc("criteria.hubs", { min: lp.hubs.target }), p: lp.hubs, unit: "" },
    { key: "reservedShare", label: tc("criteria.reservedShare", { min: 2 }), p: lp.reservedShare, unit: " %" },
    { key: "waitlist", label: tc("criteria.waitlist"), p: lp.waitlist, unit: "" },
  ];
  const met = criteria.filter((c) => c.p.ratio >= 1).length;
  const launchEnd = addDays(LAUNCH.date, LAUNCH_WEEK_DAYS - 1);
  const bufferEnd = addDays(LAUNCH.date, LAUNCH_WEEK_DAYS + LAUNCH_BUFFER_DAYS - 1);
  const launchTip = [
    `${t("launch", { date: day(LAUNCH.date) })} · ${t("criteriaMet", { met, total: criteria.length })}`,
    ...criteria.map((c) => `${c.p.ratio >= 1 ? "✓" : "○"} ${c.label}: ${num(c.p.value)}${c.unit} / ${num(c.p.target)}${c.unit}`),
    `${t("fallback")}: ${FALLBACK_RULES.map((r) => r.text).join(" · ")}`,
  ].join(" · ");

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
            return <Band key={m.id} id={m.id} from={at(from)} to={endOf(m.date)} tone="code" state={m.uncertain ? "uncertain" : stateOf(m.id, from, m.date)} label={m.label} tip={`${m.label} ${m.title} · ${t("due", { date: day(m.date) })}`} now={now} track={track} onClick={() => onOpen("code", m.id)} />;
          })}
        </Row>

        <Row name={t("rows.marketing")}>
          {phases.map((p, i) => (
            <Band key={p.key} id={p.key} from={at(p.from)} to={endOf(p.to)} tone="marketing" state={stateOf(p.key, p.from, p.to)} label={String(i + 1)} tip={`${tz("weeks", { from: p.weeks.from, to: p.weeks.to })} · ${p.label} · ${day(p.from)} – ${day(p.to)}`} now={now} track={track} onClick={() => onOpen("marketing", p.key)} />
          ))}
        </Row>

        <Row name={t("rows.prep")}>
          {prepBars.map((b) => (
            <Band
              key={b.ids.join("+")}
              id={b.ids.join("+")}
              from={at(b.from)}
              to={endOf(b.to)}
              tone="prep"
              state={b.open === 0 ? "reached" : "open"}
              dashed={b.uncertain && b.open > 0}
              done={b.open === 0 ? undefined : b.done / b.total}
              label={t("prepLabel", { label: b.label, count: b.open })}
              labels={[t("prepShort", { label: b.short, count: b.open }), num(b.open)]}
              tip={b.tip.join(" · ")}
              now={now}
              track={track}
              onClick={() => onOpen("prep", b.ids[0])}
            />
          ))}
        </Row>

        <Row name={t("rows.launch")}>
          {/* The star and the date right before the window (the week itself is too narrow to carry them). */}
          <span aria-hidden data-launch-star className="pointer-events-none absolute top-1/2 flex -translate-x-full -translate-y-1/2 items-center gap-1.5 pr-2 text-body font-semibold whitespace-nowrap text-ink" style={{ left: `${at(LAUNCH.date)}%`, "--tone": TONE.launch } as CSSProperties}>
            <svg viewBox="0 0 24 24" className="size-(--mark) shrink-0 fill-(--tone) stroke-(--tone)" strokeWidth={1.5}>
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z" />
            </svg>
            {day(LAUNCH.date)}
          </span>
          <Band id="launch" from={at(LAUNCH.date)} to={endOf(launchEnd)} tone="launch" state="reached" label="" tip={launchTip} now={now} track={track} onClick={() => onOpen("launch", "launch")} />
          <Band id="launch-buffer" from={endOf(launchEnd)} to={endOf(bufferEnd)} tone="launch" state="uncertain" label={t("buffer")} labels={[t("bufferShort")]} tip={launchTip} now={now} track={track} onClick={() => onOpen("launch", "launch")} />
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
