"use client";

// Admin › Algorithmus (/admin/data) – what Simpulo learns from its data, drawn: no visible title; the click row with the tabs Fluss · Thesen ·
// Datenpunkte, right small "61 Datenpunkte · 5 Modelle" (on Datenpunkte also the filters as dropdowns).
//   Fluss: a BlockMap Daten · Modelle · Entscheidungen with curved lines (width = data points) – a moment per block with its count and a small
//          bar (share "Wird erfasst" + "Genutzt"), the five models with their maturity (three dots) and success number, the decisions they
//          feed (deduplicated). Hover lights a block's lines; a click opens its detail right. Fits 1470 × 814.
//   Thesen: cards, three a row – status dot, the short sentence, a bar with the target marked and filled to "Jetzt"; without a measure a
//          dashed empty bar and "noch nicht messbar"; a click shows the full measure.
//   Datenpunkte: grouped by moment (folding heads with counts); rows of 44px – short name · model capsules · legal basis icon · status dot;
//          the long text, the key and the purpose only in the detail. "Nie erfasst: …" as an ⓘ at the tab.
// Every text from config/data-points.ts, config/models.ts, config/hypotheses.ts; numbers from lib/admin/metrics.ts. The network numbers and
// "Tage bis voll" are no longer here (they stay in lib/admin/metrics.ts; Vision › Kern and Analyse show them).
import { X, Database, EyeOff, Flag, Repeat, Scale, SlidersHorizontal, Sofa, FileSignature, Hand, Lightbulb, MessageSquare, Search, Home, Inbox, Users, Megaphone, Star, LayoutGrid, MapPin, Clapperboard, RotateCcw, UserPlus, Brain, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DATA_POINT_STATUSES, DATA_POINTS, inputsOf, MOMENTS, NEVER_COLLECTED, type DataPoint, type DataPointStatus, type Moment } from "@/config/data-points";
import { HYPOTHESES, type Hypothesis } from "@/config/hypotheses";
import { MODEL_IDS, MODELS, type Model, type ModelId, type ModelStage } from "@/config/models";
import { hypothesisBar, hypothesisStatus, modelMeasures, modelMeasuresShort, type Status } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getHypothesisResults } from "@/lib/data";
import { cn } from "@/lib/utils";
import { StatusDot } from "./AdminCharts";
import { AdminShell } from "./AdminShell";
import { AdminSort, AdminTabs, BackToList } from "./AdminLayout";
import { BlockMap, type MapLink } from "./BlockMap";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";

const STAGES: readonly ModelStage[] = ["idea", "rules", "trained"];
const MODEL_NAME = Object.fromEntries(MODELS.map((m) => [m.id, m.name])) as Record<ModelId, string>;
type Tab = "overview" | "flow" | "theses" | "points";

const MOMENT_ICONS: Record<Moment, LucideIcon> = { onboarding: UserPlus, search: Search, create: Home, request: MessageSquare, inTheHouse: Users, afterTheStay: Star, afterwards: Repeat, marketing: Megaphone, support: Inbox };
const DECISION_ICONS: Record<string, LucideIcon> = { "Explore-Reihen": LayoutGrid, "Vorschläge an Hosts": Lightbulb, "Do it again": RotateCcw, "Wo Houses eröffnen": MapPin, "Welche Videos": Clapperboard, "Einrichtungs-Hinweise für Hosts": Sofa, "Hof-Stellschrauben": SlidersHorizontal, "Pacht-Test-Orte": Flag };
/** The decisions, deduplicated, in the models' order. */
const DECISIONS = [...new Set(MODELS.flatMap((m) => m.decisions))];
/** Data point status as a dot: planned grey, collecting amber, used sage. */
const DP_DOT: Record<DataPointStatus, Status | null> = { planned: null, collecting: "warning", used: "good" };

export function AdminData() {
  const t = useTranslations("admin.data");
  const tOverview = useTranslations("admin.overviewBlock");
  // Überblick first and by default (CLAUDE.md "Überblick zuerst").
  const [tab, setTab] = useState<Tab>("overview");
  const [highlight, setHighlight] = useState<"all" | ModelId>("all");
  const [status, setStatus] = useState<"all" | DataPointStatus>("all");
  return (
    <AdminShell
      title={t("title")}
      tabs={
        <AdminTabs
          label={t("title")}
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: tOverview("tab") },
            { value: "flow", label: t("tab.flow") },
            { value: "theses", label: t("tab.theses") },
            { value: "points", label: t("tab.points"), tooltip: t("never") },
          ]}
        />
      }
      aside={
        <>
          {tab === "points" && (
            <>
              <AdminSort label={t("filter.highlight")} value={highlight} onChange={setHighlight} options={(["all", ...MODEL_IDS] as const).map((value) => ({ value, label: value === "all" ? t("filter.all") : MODEL_NAME[value] }))} />
              <AdminSort label={t("filter.status")} value={status} onChange={setStatus} options={(["all", ...DATA_POINT_STATUSES] as const).map((value) => ({ value, label: value === "all" ? t("filter.all") : t(`dpStatus.${value}`) }))} />
            </>
          )}
          <span className="text-small text-(--adm-label)">{t("totals", { points: DATA_POINTS.length, models: MODELS.length })}</span>
        </>
      }
    >
      {tab === "overview" && (
        <DataOverview
          onOpen={(next, filter) => {
            setTab(next);
            if (next === "points") {
              setHighlight("all");
              setStatus(filter ?? "all");
            }
          }}
        />
      )}
      {tab === "flow" && <Flow />}
      {tab === "theses" && <Theses />}
      {tab === "points" && <DataPoints highlight={highlight} status={status} />}
    </AdminShell>
  );
}

// ── Überblick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Algorithmus › Überblick (CLAUDE.md "Überblick zuerst"): only tiles in the Planen colour, three rows of five – the data points (all, by
 * status – each opens Datenpunkte filtered –, moments), the models (all, by maturity, decisions → Fluss), the theses (all, by verdict →
 * Thesen) and what is never collected.
 */
function DataOverview({ onOpen }: { onOpen: (tab: Exclude<Tab, "overview">, filter?: DataPointStatus) => void }) {
  const t = useTranslations("admin.pageTiles.data");
  const tData = useTranslations("admin.data");
  const results = getHypothesisResults();
  const verdict = (v: "supported" | "open" | "rejected") => HYPOTHESES.filter((h) => (results[h.id]?.status ?? "open") === v).length;
  const stage = (v: ModelStage) => MODELS.filter((m) => m.stage === v).length;
  const dp = (v: DataPointStatus) => DATA_POINTS.filter((d) => d.status === v).length;
  const of = (total: number) => t("ofAll", { total: String(total) });
  const tile = (key: TileKey, value: number, open: () => void, extra?: string): TileSpec => ({ key, label: t(`${key}.label`), info: t(`${key}.info`), value: String(value), extra, onOpen: open });
  const tiles: TileSpec[] = [
    tile("points", DATA_POINTS.length, () => onOpen("points")),
    tile("used", dp("used"), () => onOpen("points", "used"), of(DATA_POINTS.length)),
    tile("collecting", dp("collecting"), () => onOpen("points", "collecting"), of(DATA_POINTS.length)),
    tile("planned", dp("planned"), () => onOpen("points", "planned"), of(DATA_POINTS.length)),
    tile("moments", MOMENTS.length, () => onOpen("flow")),
    tile("models", MODELS.length, () => onOpen("flow")),
    tile("idea", stage("idea"), () => onOpen("flow"), of(MODELS.length)),
    tile("rules", stage("rules"), () => onOpen("flow"), of(MODELS.length)),
    tile("trained", stage("trained"), () => onOpen("flow"), of(MODELS.length)),
    tile("decisions", DECISIONS.length, () => onOpen("flow")),
    tile("theses", HYPOTHESES.length, () => onOpen("theses")),
    tile("supported", verdict("supported"), () => onOpen("theses"), of(HYPOTHESES.length)),
    tile("open", verdict("open"), () => onOpen("theses"), of(HYPOTHESES.length)),
    tile("rejected", verdict("rejected"), () => onOpen("theses"), of(HYPOTHESES.length)),
    tile("never", NEVER_COLLECTED.length, () => onOpen("points")),
  ];
  return <TileBoard label={tData("title")} rows={chunkRows(tiles, "plan", 5)} />;
}
/** The overview's tiles (their words in admin.pageTiles.data). */
type TileKey = "points" | "used" | "collecting" | "planned" | "moments" | "models" | "idea" | "rules" | "trained" | "decisions" | "theses" | "supported" | "open" | "rejected" | "never";

// ── Fluss ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type FlowSelection = { kind: "moment"; id: Moment } | { kind: "model"; id: ModelId } | { kind: "decision"; id: string } | null;

function Flow() {
  const t = useTranslations("admin.data");
  const tStage = useTranslations("admin.data.stage");
  const short = modelMeasuresShort(useAdminInputs());
  const [selected, setSelected] = useState<FlowSelection>(null);
  const keyOf = (s: NonNullable<FlowSelection>) => `${s.kind}:${s.id}`;

  // Lines: moment → model (width = the moment's data points that model reads), model → decision (width = the model's data points, at most 6).
  const links = useMemo<MapLink[]>(
    () => [
      ...MOMENTS.flatMap((m) => MODEL_IDS.map((id) => ({ from: `moment:${m}`, to: `model:${id}`, weight: DATA_POINTS.filter((d) => d.moment === m && d.models.includes(id)).length })).filter((l) => l.weight > 0)),
      ...MODELS.flatMap((m) => m.decisions.map((d) => ({ from: `model:${m.id}`, to: `decision:${d}`, weight: Math.min(6, Math.max(1, Math.round(inputsOf(m.id).length / 3))) }))),
    ],
    [],
  );

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,3.3fr)_minmax(0,1fr)]">
      <BlockMap
        label={t("tab.flow")}
        compact
        links={links}
        selectedId={selected ? keyOf(selected) : null}
        columns={[
          {
            key: "data",
            label: t("flow.data"),
            blocks: MOMENTS.map((m) => {
              const points = DATA_POINTS.filter((d) => d.moment === m);
              const collecting = points.filter((d) => d.status === "collecting").length;
              const used = points.filter((d) => d.status === "used").length;
              return {
                id: `moment:${m}`,
                icon: MOMENT_ICONS[m],
                title: t(`moment.${m}`),
                status: "none" as const,
                // The count beside the bar (not on the right: the moment's name keeps the full width).
                extra: (
                  <span className="flex items-center gap-2">
                    <ShareBar used={used} collecting={collecting} total={points.length} label={t("flow.shareLabel", { used, collecting, total: points.length })} />
                    <span className="text-small leading-none tabular-nums text-ink/70">{points.length}</span>
                  </span>
                ),
                onOpen: () => setSelected({ kind: "moment", id: m }),
              };
            }),
          },
          {
            key: "models",
            label: t("flow.models"),
            blocks: MODELS.map((model) => ({
              id: `model:${model.id}`,
              icon: Brain,
              title: model.name,
              // The success number as its own line under the name (the name keeps the full width).
              subtitle: short[model.id] ?? "—",
              status: "none" as const,
              extra: <StageDots stage={model.stage} label={tStage(model.stage)} />,
              onOpen: () => setSelected({ kind: "model", id: model.id }),
            })),
          },
          {
            key: "decisions",
            label: t("flow.decisions"),
            blocks: DECISIONS.map((d) => ({
              id: `decision:${d}`,
              icon: DECISION_ICONS[d] ?? Database,
              title: d,
              subtitle: MODELS.filter((m) => m.decisions.includes(d)).map((m) => m.name).join(", "),
              status: "none" as const,
              onOpen: () => setSelected({ kind: "decision", id: d }),
            })),
          },
        ]}
      />
      <aside className={cn("min-w-0", !selected && "max-lg:hidden")}>{selected ? <FlowDetail selection={selected} onBack={() => setSelected(null)} /> : <p className="pt-8 text-body text-muted">{t("flow.pick")}</p>}</aside>
    </div>
  );
}

/** A small bar: the share "Genutzt" (primary) and "Wird erfasst" (chart-2) of a moment's data points, on the grey track. */
function ShareBar({ used, collecting, total, label }: { used: number; collecting: number; total: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-adm-chart-track">
      <span className="h-full bg-adm-chart-primary" style={{ width: `${(used / Math.max(1, total)) * 100}%` }} />
      <span className="h-full bg-adm-chart-2" style={{ width: `${(collecting / Math.max(1, total)) * 100}%` }} />
    </span>
  );
}

/** Idee · Regeln · Trainiert as three dots, the reached ones filled; the word beside them. */
function StageDots({ stage, label }: { stage: ModelStage; label: string }) {
  const reached = STAGES.indexOf(stage);
  return (
    <span className="flex items-center gap-1.5 text-small text-ink/60">
      {STAGES.map((s, i) => (
        <span key={s} aria-hidden className={cn("size-2 rounded-full", i <= reached ? "bg-adm-chart-primary" : "bg-adm-chart-track")} />
      ))}
      <span className="ml-1">{label}</span>
    </span>
  );
}

/** The detail right: a moment's data points · a model's measure, output, decisions · a decision's models. */
function FlowDetail({ selection, onBack }: { selection: NonNullable<FlowSelection>; onBack: () => void }) {
  const t = useTranslations("admin.data");
  const measures = modelMeasures(useAdminInputs());
  return (
    <article data-flow-detail className="lg:pt-8">
      <BackToList onBack={onBack} />
      {selection.kind === "moment" && (
        <>
          <p className="text-h3 text-ink">{t(`moment.${selection.id}`)}</p>
          <ul className="mt-(--adm-inner) divide-y divide-ink/8 border-y border-ink/8">
            {DATA_POINTS.filter((d) => d.moment === selection.id).map((d) => (
              <li key={d.id} className="flex min-h-10 items-center gap-2 py-1.5 text-small">
                <StatusDot status={DP_DOT[d.status]} />
                <span className="min-w-0 flex-1 truncate text-ink">{d.short}</span>
                <span className="shrink-0 text-ink/50">{d.models.length > 0 ? d.models.length : "–"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {selection.kind === "model" && <ModelFacts model={MODELS.find((m) => m.id === selection.id)!} measure={measures[selection.id]} />}
      {selection.kind === "decision" && (
        <>
          <p className="text-h3 text-ink">{selection.id}</p>
          <p className="mt-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{t("flow.fedBy")}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {MODELS.filter((m) => m.decisions.includes(selection.id)).map((m) => (
              <li key={m.id} className="inline-flex h-7 items-center rounded-full bg-ink/6 px-2.5 text-small text-ink">
                {m.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function ModelFacts({ model, measure }: { model: Model; measure: string | null }) {
  const t = useTranslations("admin.data");
  const tStage = useTranslations("admin.data.stage");
  return (
    <>
      <p className="text-h3 text-ink">{model.name}</p>
      <div className="mt-2">
        <StageDots stage={model.stage} label={tStage(model.stage)} />
      </div>
      <dl className="mt-(--adm-inner) flex flex-col gap-(--adm-inner)">
        {[
          { label: t("measure"), value: model.measure, sub: measure ? t("now", { value: measure }) : t("notMeasured") },
          { label: t("output"), value: model.output },
          { label: t("feeds"), value: model.feeds },
          { label: t("inputsLabel"), value: t("inputs", { count: inputsOf(model.id).length }) },
        ].map((f) => (
          <div key={f.label}>
            <dt className="text-eyebrow uppercase text-(--adm-label)">{f.label}</dt>
            <dd className="mt-1 text-body leading-normal text-ink">{f.value}</dd>
            {f.sub && <dd className="text-small text-muted">{f.sub}</dd>}
          </div>
        ))}
        {/* The hypotheses carry no model in config/hypotheses.ts – none are linked here (nothing invented). */}
        <div>
          <dt className="text-eyebrow uppercase text-(--adm-label)">{t("flow.theses")}</dt>
          <dd className="mt-1 text-small text-muted">{t("flow.noTheses")}</dd>
        </div>
      </dl>
    </>
  );
}

// ── Thesen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Theses() {
  const t = useTranslations("admin.data.hyp");
  const results = useMemo(() => getHypothesisResults(), []);
  const [open, setOpen] = useState<string | null>(null);
  const opened = HYPOTHESES.find((h) => h.id === open);
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.15fr)]">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {HYPOTHESES.map((h) => {
          const result = results[h.id];
          const verdict = result?.status ?? "open";
          const bar = h.metric && h.target ? hypothesisBar(h.target, result?.current) : null;
          return (
            <li key={h.id}>
              {/* The null hypothesis is set apart: a stronger edge. */}
              <button type="button" onClick={() => setOpen(h.id)} aria-pressed={open === h.id} className={cn("flex h-full w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors duration-150 hover:bg-(--adm-block-hover)", open === h.id ? "bg-(--adm-block-hover)" : "bg-(--adm-block)", h.highlight ? "border-ink/40" : "border-ink/8")}>
                <span className="flex items-start gap-2">
                  <StatusDot status={bar ? hypothesisStatus(verdict) : null} className="mt-2" />
                  <span className={cn("text-adm-block", open === h.id ? "font-semibold text-(--adm-active)" : "text-ink")}>{h.short}</span>
                </span>
                <ThesisBar bar={bar} />
                <span className="flex items-center justify-between gap-2 text-small">
                  <span className="text-ink/60">{h.target ? `${t("target")} ${h.target.replace("≥ ", "")}` : t("notMeasurable")}</span>
                  <span className="text-ink">{bar ? t(`status.${verdict}`) : ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <aside className={cn("min-w-0", !opened && "max-lg:hidden")}>{opened ? <ThesisDetail h={opened} current={results[opened.id]?.current ?? null} onBack={() => setOpen(null)} /> : <p className="text-body text-muted">{t("pick")}</p>}</aside>
    </div>
  );
}

/** The bar: filled to "Jetzt", the target as a mark; without a measure a dashed empty bar. */
function ThesisBar({ bar }: { bar: ReturnType<typeof hypothesisBar> }) {
  const t = useTranslations("admin.data.hyp");
  if (!bar) return <span role="img" aria-label={t("notMeasurable")} className="block h-2 rounded-full border border-dashed border-ink/25" />;
  return (
    <span role="img" aria-label={t("barLabel", { now: bar.now, target: bar.target })} className="relative block h-2 rounded-full bg-adm-chart-track">
      <span className="absolute inset-y-0 left-0 rounded-full bg-adm-chart-primary" style={{ width: `${(bar.now / bar.max) * 100}%` }} />
      <span className="absolute -inset-y-1 w-0.5 rounded-full bg-adm-chart-goal" style={{ left: `${(bar.target / bar.max) * 100}%` }} />
    </span>
  );
}

function ThesisDetail({ h, current, onBack }: { h: Hypothesis; current: string | null; onBack: () => void }) {
  const t = useTranslations("admin.data.hyp");
  return (
    <article data-thesis-detail>
      <BackToList onBack={onBack} />
      <p className="text-h3 leading-normal text-ink">{h.statement}</p>
      <dl className="mt-(--adm-inner) flex flex-col gap-(--adm-inner)">
        {[
          { label: t("metric"), value: h.metric ?? t("notMeasurable") },
          { label: t("target"), value: h.target ?? "–" },
          { label: t("current"), value: current ?? "–" },
        ].map((f) => (
          <div key={f.label}>
            <dt className="text-eyebrow uppercase text-(--adm-label)">{f.label}</dt>
            <dd className="mt-1 text-body leading-normal text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

// ── Datenpunkte ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The map's tiles: never lower than this, never higher; a sub-column never narrower than this (CLAUDE.md "Algorithmus › Datenpunkte"). */
const TILE_H: { min: number; max: number } = { min: 18, max: 30 };
const SUB_MIN_W = 112;
const TILE_GAP = 3;
const COL_GAP = 6;

/**
 * Algorithmus › Datenpunkte as a map: a column per moment in the order of the journey (config/data-points.ts MOMENTS – new moments and
 * points appear on their own), the head its name and count; each data point a small tile with its short name (`short`, one line with "…"),
 * coloured by status (used: sage tint · collecting: amber tint · planned: dashed, no surface) and its legal basis as a small icon in the
 * corner. "Hervorheben: Modell" leaves the model's tiles as they are and fades the rest; the status filter keeps only that status. The
 * tooltip: the full name, moment, models, status, legal basis; a click opens the details as a panel on the right over the map. Everything on
 * one screen: the tile height and the sub-columns of a long moment are computed from the room left (more points → more compact tiles).
 */
function DataPoints({ highlight, status }: { highlight: "all" | ModelId; status: "all" | DataPointStatus }) {
  const t = useTranslations("admin.data");
  const [selected, setSelected] = useState<string | null>(null);
  const shown = DATA_POINTS.filter((d) => status === "all" || d.status === status);
  const columns = MOMENTS.map((m) => ({ moment: m, points: shown.filter((d) => d.moment === m) })).filter((c) => c.points.length > 0);
  const point = DATA_POINTS.find((d) => d.id === selected);
  const box = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLParagraphElement>(null);
  const [fit, setFit] = useState<{ h: number; rows: number } | null>(null);
  // The room: from the map's top to the window's bottom minus the legend; the largest tile height whose sub-columns still fit the width.
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      if (!el) return;
      // Measured, not guessed: the first column's list top (under its head) and the legend's height under the map.
      const list = el.querySelector("ul");
      const top = (list ?? el).getBoundingClientRect().top + window.scrollY;
      const legend = legendRef.current ? legendRef.current.getBoundingClientRect().height + 12 : 32;
      const room = window.innerHeight - top - 40 - legend;
      const width = el.clientWidth;
      // Fewest sub-columns first (each column as narrow as can be, so its names have room), then the tallest tile that still fits.
      let best: { h: number; rows: number; subs: number } | null = null;
      for (let h = TILE_H.max; h >= TILE_H.min; h--) {
        const rows = Math.max(1, Math.floor((room + TILE_GAP) / (h + TILE_GAP)));
        const subs = columns.reduce((n, c) => n + Math.ceil(c.points.length / rows), 0);
        const fits = (width - (columns.length - 1) * COL_GAP) / subs >= SUB_MIN_W;
        if (!best || subs < best.subs || (subs === best.subs && h > best.h && fits)) best = { h, rows, subs };
      }
      if (best) setFit({ h: best.h, rows: best.rows });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // The columns follow the status filter (the only input that changes them).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    if (!point) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [point]);
  const rows = fit?.rows ?? 24;
  const tip = (d: DataPoint) => t("map.tip", { moment: t(`moment.${d.moment}`), models: d.models.length ? d.models.map((m) => MODEL_NAME[m]).join(", ") : t("map.noModels"), status: t(`dpStatus.${d.status}`), basis: t(`basis.${d.legalBasis}`) });
  return (
    <>
      <div ref={box} data-point-map className="flex min-w-0 gap-1.5 max-lg:overflow-x-auto" style={{ "--dp-h": `${fit?.h ?? 26}px` } as CSSProperties}>
        {columns.map(({ moment, points }) => {
          const subs = Math.ceil(points.length / rows);
          return (
            <section key={moment} data-point-column={moment} aria-label={t(`moment.${moment}`)} className="min-w-0" style={{ flex: `${subs} 1 0` }}>
              <h3 data-tooltip-info={`${t(`moment.${moment}`)} · ${points.length}`} className="mb-1.5 flex h-6 min-w-0 items-baseline gap-1.5 text-small font-semibold text-(--adm-label)">
                <span className="truncate">{t(`moment.${moment}`)}</span>
                <span className="font-normal tabular-nums">{points.length}</span>
              </h3>
              <ul className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${subs}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.min(rows, points.length)}, var(--dp-h))`, gridAutoFlow: "column" }}>
                {points.map((d) => {
                  const dim = highlight !== "all" && !d.models.includes(highlight);
                  const Icon = LEGAL_ICONS[d.legalBasis];
                  return (
                    <li key={d.id} className="min-w-0">
                      <button
                        type="button"
                        data-point={d.id}
                        data-point-status={d.status}
                        data-dim={dim || undefined}
                        data-tooltip-title={d.captures}
                        data-tooltip-info={tip(d)}
                        aria-label={t("map.open", { name: d.short })}
                        aria-pressed={selected === d.id}
                        onClick={() => setSelected(d.id)}
                        className={cn("adm-press adm-dp-tile relative flex h-full w-full min-w-0 items-center rounded-md border pr-3 pl-1.5 text-left", selected === d.id && "ring-2 ring-(--adm-chart-1)")}
                      >
                        <span className="min-w-0 truncate text-ink">{d.short}</span>
                        <Icon aria-hidden className="absolute top-1/2 right-0.5 size-2.5 -translate-y-1/2 text-ink/55" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {/* The legend, small. */}
      <p ref={legendRef} data-point-legend className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-small text-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="adm-dp-tile size-3.5 rounded-sm border" data-point-status="used" />{t("map.legendUsed")}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="adm-dp-tile size-3.5 rounded-sm border" data-point-status="collecting" />{t("map.legendCollecting")}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="adm-dp-tile size-3.5 rounded-sm border" data-point-status="planned" />{t("map.legendPlanned")}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="adm-dp-tile size-3.5 rounded-sm border" data-point-status="used" data-dim />{t("map.legendDim")}</span>
        {(["contract", "consent", "none", "review"] as const).map((basis) => {
          const Icon = LEGAL_ICONS[basis];
          return (
            <span key={basis} className="inline-flex items-center gap-1">
              <Icon aria-hidden className="size-3.5" />
              {t(`basis.${basis}`)}
            </span>
          );
        })}
        <span className="ml-auto inline-flex items-center gap-1" data-tooltip-info={NEVER_COLLECTED.join(" · ")}>
          {t("map.never")} · {NEVER_COLLECTED.length}
        </span>
      </p>
      {/* The details: a panel on the right over the map (the map stays in sight); ✕, Escape or another tile. */}
      {point && (
        <aside data-point-detail aria-label={point.short} className="fixed top-[calc(var(--header-total)+var(--adm-bar-h,56px)+8px)] right-4 bottom-4 z-30 flex w-[min(400px,calc(100vw-32px))] flex-col overflow-y-auto rounded-xl border border-(--line) bg-(--surface) p-5 shadow-(--shadow-float)">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-h3 leading-normal text-ink">{point.short}</p>
              <p className="mt-0.5 text-small text-muted">{point.id}</p>
            </div>
            <button type="button" aria-label={t("map.close")} onClick={() => setSelected(null)} className="adm-press flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/6 hover:text-ink">
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <dl className="mt-(--adm-inner) flex flex-col gap-(--adm-inner)">
            {[
              { label: t("col.captures"), value: point.captures },
              { label: t("col.moment"), value: t(`moment.${point.moment}`) },
              { label: t("col.purpose"), value: point.purpose },
              { label: t("col.models"), value: point.models.length ? point.models.map((m) => MODEL_NAME[m]).join(", ") : "–" },
              { label: t("col.basis"), value: t(`basis.${point.legalBasis}`) },
              { label: t("col.status"), value: t(`dpStatus.${point.status}`) },
            ].map((f) => (
              <div key={f.label}>
                <dt className="text-eyebrow uppercase text-(--adm-label)">{f.label}</dt>
                <dd className="mt-1 text-body leading-normal text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      )}
    </>
  );
}

/** Vertrag · Einwilligung · keine Personendaten · prüfen as a small icon with its word as the tooltip. */
const LEGAL_ICONS = { contract: FileSignature, consent: Hand, none: EyeOff, review: Scale } as const;
