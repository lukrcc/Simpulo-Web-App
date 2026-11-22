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
import { ChevronDown, Database, EyeOff, Flag, Repeat, Scale, SlidersHorizontal, Sofa, FileSignature, Hand, Lightbulb, MessageSquare, Search, Home, Inbox, Users, Megaphone, Star, LayoutGrid, MapPin, Clapperboard, RotateCcw, UserPlus, Brain, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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

const STAGES: readonly ModelStage[] = ["idea", "rules", "trained"];
const MODEL_NAME = Object.fromEntries(MODELS.map((m) => [m.id, m.name])) as Record<ModelId, string>;
type Tab = "flow" | "theses" | "points";

const MOMENT_ICONS: Record<Moment, LucideIcon> = { onboarding: UserPlus, search: Search, create: Home, request: MessageSquare, inTheHouse: Users, afterTheStay: Star, afterwards: Repeat, marketing: Megaphone, support: Inbox };
const DECISION_ICONS: Record<string, LucideIcon> = { "Explore-Reihen": LayoutGrid, "Vorschläge an Hosts": Lightbulb, "Do it again": RotateCcw, "Wo Houses eröffnen": MapPin, "Welche Videos": Clapperboard, "Einrichtungs-Hinweise für Hosts": Sofa, "Hof-Stellschrauben": SlidersHorizontal, "Pacht-Test-Orte": Flag };
/** The decisions, deduplicated, in the models' order. */
const DECISIONS = [...new Set(MODELS.flatMap((m) => m.decisions))];
/** Data point status as a dot: planned grey, collecting amber, used sage. */
const DP_DOT: Record<DataPointStatus, Status | null> = { planned: null, collecting: "warning", used: "good" };

export function AdminData() {
  const t = useTranslations("admin.data");
  const [tab, setTab] = useState<Tab>("flow");
  const [moment, setMoment] = useState<"all" | Moment>("all");
  const [model, setModel] = useState<"all" | ModelId | "none">("all");
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
              <AdminSort label={t("filter.moment")} value={moment} onChange={setMoment} options={(["all", ...MOMENTS] as const).map((value) => ({ value, label: value === "all" ? t("filter.all") : t(`moment.${value}`) }))} />
              <AdminSort label={t("filter.model")} value={model} onChange={setModel} options={(["all", ...MODEL_IDS, "none"] as const).map((value) => ({ value, label: value === "all" ? t("filter.all") : value === "none" ? t("filter.none") : MODEL_NAME[value] }))} />
              <AdminSort label={t("filter.status")} value={status} onChange={setStatus} options={(["all", ...DATA_POINT_STATUSES] as const).map((value) => ({ value, label: value === "all" ? t("filter.all") : t(`dpStatus.${value}`) }))} />
            </>
          )}
          <span className="text-small text-(--adm-label)">{t("totals", { points: DATA_POINTS.length, models: MODELS.length })}</span>
        </>
      }
    >
      {tab === "flow" && <Flow />}
      {tab === "theses" && <Theses />}
      {tab === "points" && <DataPoints moment={moment} model={model} status={status} />}
    </AdminShell>
  );
}

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
                <span className="min-w-0 flex-1 truncate text-ink">{shortName(d)}</span>
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
              <button type="button" onClick={() => setOpen(h.id)} aria-pressed={open === h.id} className={cn("flex h-full w-full flex-col gap-3 rounded-xl border bg-(--adm-block) p-4 text-left transition-colors duration-150 hover:bg-(--adm-block-hover)", h.highlight ? "border-ink/40" : "border-ink/8")}>
                <span className="flex items-start gap-2">
                  <StatusDot status={bar ? hypothesisStatus(verdict) : null} className="mt-2" />
                  <span className={cn("text-adm-block text-ink", open === h.id && "underline decoration-2 underline-offset-4")}>{h.short}</span>
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

/** A data point's short name: what it captures, up to the first bracket, colon or comma. */
const shortName = (d: DataPoint) => d.captures.split(/[(:,–]/)[0].trim();

function DataPoints({ moment, model, status }: { moment: "all" | Moment; model: "all" | ModelId | "none"; status: "all" | DataPointStatus }) {
  const t = useTranslations("admin.data");
  const [closed, setClosed] = useState<ReadonlySet<Moment>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const shown = DATA_POINTS.filter((d) => (moment === "all" || d.moment === moment) && (model === "all" || (model === "none" ? d.models.length === 0 : d.models.includes(model))) && (status === "all" || d.status === status));
  const point = DATA_POINTS.find((d) => d.id === selected);
  const toggle = (m: Moment) =>
    setClosed((now) => {
      const next = new Set(now);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.15fr)]">
      <div className={cn("min-w-0", point && "max-lg:hidden")}>
        {MOMENTS.map((m) => {
          const rows = shown.filter((d) => d.moment === m);
          if (rows.length === 0) return null;
          const isOpen = !closed.has(m);
          return (
            <section key={m} className="mb-3">
              <button type="button" onClick={() => toggle(m)} aria-expanded={isOpen} className="flex h-9 w-full items-center gap-2 text-left text-small font-semibold text-(--adm-label)">
                <ChevronDown aria-hidden className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} />
                {t(`moment.${m}`)}
                <span className="font-normal tabular-nums">{rows.length}</span>
              </button>
              {isOpen && (
                <ul className="divide-y divide-ink/8 border-y border-ink/8">
                  {rows.map((d) => (
                    <li key={d.id} className="relative flex h-(--adm-row-h) items-center gap-3 px-1">
                      <button type="button" onClick={() => setSelected(d.id)} aria-label={shortName(d)} className="absolute inset-0" />
                      <span className={cn("pointer-events-none min-w-0 flex-1 truncate text-body", selected === d.id ? "font-semibold text-(--adm-active) underline decoration-2 underline-offset-4" : "text-ink")}>{shortName(d)}</span>
                      {/* The model capsules from 640px; on phones they are in the detail (a row never runs out of the screen). */}
                      <span className="pointer-events-none flex shrink-0 gap-1 max-sm:hidden">
                        {d.models.map((id) => (
                          <span key={id} className="inline-flex h-6 items-center rounded-full bg-ink/6 px-2 text-small text-ink/80">
                            {MODEL_NAME[id]}
                          </span>
                        ))}
                      </span>
                      <LegalIcon basis={d.legalBasis} label={t(`basis.${d.legalBasis}`)} />
                      <span className="pointer-events-none flex w-3 shrink-0 justify-end">
                        <StatusDot status={DP_DOT[d.status]} />
                        <span className="sr-only">{t(`dpStatus.${d.status}`)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        <p className="mt-2 text-small text-(--adm-label)">{t("count", { shown: shown.length, all: DATA_POINTS.length })}</p>
        {/* Never collected – visible under the list (config/data-points.ts NEVER_COLLECTED). */}
        <section className="mt-(--adm-section)" aria-label={t("neverTitle")}>
          <h3 className="mb-2 text-small font-semibold text-(--adm-label)">{t("neverTitle")}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {NEVER_COLLECTED.map((item) => (
              <li key={item} className="inline-flex h-7 items-center rounded-full border border-dashed border-ink/25 px-2.5 text-small text-ink/80">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className={cn("min-w-0 lg:sticky lg:top-[calc(var(--header-h)+var(--adm-page))] lg:self-start", !point && "max-lg:hidden")}>
        {point ? (
          <article data-point-detail>
            <BackToList onBack={() => setSelected(null)} />
            <p className="text-h3 leading-normal text-ink">{shortName(point)}</p>
            <p className="mt-1 text-small text-ink/60">{point.id}</p>
            <dl className="mt-(--adm-inner) flex flex-col gap-(--adm-inner)">
              {[
                { label: t("col.captures"), value: point.captures },
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
          </article>
        ) : (
          <p className="text-body text-muted">{t("flow.pickPoint")}</p>
        )}
      </aside>
    </div>
  );
}

/** Vertrag · Einwilligung · keine Personendaten · prüfen as a small icon with its word as the tooltip. */
const LEGAL_ICONS = { contract: FileSignature, consent: Hand, none: EyeOff, review: Scale } as const;
function LegalIcon({ basis, label }: { basis: DataPoint["legalBasis"]; label: string }) {
  const Icon = LEGAL_ICONS[basis];
  return (
    <button type="button" aria-label={label} className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-ink/60 hover:text-ink">
      <Icon aria-hidden className="size-4" />
    </button>
  );
}
