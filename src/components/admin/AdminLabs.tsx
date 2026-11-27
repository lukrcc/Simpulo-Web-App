"use client";

// Admin › Wachstum › Labore (/admin/labore): Simpulo's fields of growth. No visible title; the click row with the tabs Pyramide · Karte ·
// Labore · Fluss · Potenzial. Drawn like Algorithmus: SVG for the pyramid and the map, AdminListDetail for the labs, the BlockMap with lines
// for the flow, a table with log bars for the potential. Every text and value from lib/admin/labs.ts (estimates, not measurements).
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MOMENTS } from "@/config/data-points";
import { ADMIN_DE } from "@/lib/i18n/admin.de";
import { algorithmHref, INTERNAL_LINKS, LAB_MAP, LAB_STATUSES, LABS, LABS_TEXT, labOf, PHYSICAL_TREE, POTENTIAL, TEST_KEYS, type Lab, type LabId, type LabStatus, type TestKey, type TestValue } from "@/lib/admin/labs";
import { canEarn, useLabs } from "@/lib/admin/labState";
import { useAdminActions } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";
import { labNumbers } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { setAdminSearch, useAdminSearch } from "@/lib/admin/urlState";
import { ARCHITECTURE, type ArchitectureView } from "@/lib/admin/labs/architecture";
import { DATA_POINTS, type DataPointStatus } from "@/config/data-points";
import Link from "next/link";
import type { ReactNode } from "react";
import { num, pct, share } from "@/lib/i18n/adminFormat";
import { StatusDot } from "./AdminCharts";
import { AdminShell } from "./AdminShell";
import { AdminSort, AdminSubTabs, AdminTabs, BackToList } from "./AdminLayout";
import { TopicCards, TopicHeader, useAdminTopic, type NumberEntry, type NumberPool } from "./AdminTopics";
import { BlockMap, type MapLink } from "./BlockMap";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Box, Database, FlaskConical, Globe2, Hammer } from "lucide-react";

type View = "pyramid" | "map" | "flow" | "potential";
/** The views beside the nine labs – in the menu "Ansichten ▾" (CLAUDE.md "Labore angeglichen"), each a topic view with "← Labore". */
const VIEWS: readonly View[] = ["pyramid", "map", "flow", "potential"];
const T = LABS_TEXT;

export function AdminLabs() {
  // The same build as every page (CLAUDE.md "Acht Karten", Variante C): the board of nine lab cards (config/admin/cards/labs.ts); a card
  // opens its lab (?topic=<lab>, the bar of the nine labs above, "← Labore"); the views open from "Ansichten ▾" (?tab=pyramid …).
  const t = useTranslations("admin.pageTiles.labs");
  const { topic, open, back } = useAdminTopic("labs");
  const tab = useAdminSearch().get("tab");
  const view = !topic && VIEWS.includes(tab as View) ? (tab as View) : null;
  const openView = (v: View) => setAdminSearch({ topic: null, tab: v, focus: null, view: null });
  const pool = useLabsPool();
  const labs = useLabs();
  const lab = topic ? (labs.find((l) => l.id === topic) ?? null) : null;
  return (
    <AdminShell
      title={ADMIN_DE.nav.labs}
      tabs={view ? <ViewHeader view={view} onBack={back} /> : <TopicHeader page="labs" title={ADMIN_DE.nav.labs} />}
      // "Ansichten ▾": the overview has no row over its cards (CLAUDE.md "Kopfreihe nur für Zeitraum") – the menu stands in a lab's view.
      aside={!view ? <AdminSort label={t("card.viewsLabel")} trigger={t("card.views")} options={VIEWS.map((v) => ({ value: v, label: T.tabs[v] }))} value={"pyramid" as View} onChange={openView} /> : undefined}
    >
      {lab && <LabDetail lab={lab} />}
      {view === "pyramid" && <Pyramid onOpen={open} />}
      {view === "map" && <LabMap onOpen={open} />}
      {view === "flow" && <LabFlow onOpen={open} />}
      {view === "potential" && <Potential />}
      {!lab && !view && <TopicCards page="labs" pool={pool} />}
    </AdminShell>
  );
}

/** A view's head: "← Labore" and the view's name (the same capsules as a topic's head). */
function ViewHeader({ view, onBack }: { view: View; onBack: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button type="button" data-topic-back onClick={onBack} className="adm-cap adm-press shrink-0">
        <ArrowLeft aria-hidden className="size-3.5" />
        {ADMIN_DE.nav.labs}
      </button>
      <AdminTabs level="sub" label={T.tabs[view]} value={view} onChange={() => {}} tabs={[{ value: view, label: T.tabs[view], tone: "var(--adm-page-color)" }]} />
    </div>
  );
}

/** The status dot: Idee neutral, Test amber, Einnahme sage – the word beside it stays in the text colour (AA on every ground). */
const LAB_STATUS_DOT: Record<LabStatus, "good" | "warning" | null> = { idea: null, test: "warning", revenue: "good" };

/** A small status capsule (Idee · Test · Einnahme): a neutral pill, the status as a dot, the word in the text colour. */
export function LabStatusCapsule({ status }: { status: LabStatus }) {
  return (
    <span data-lab-status={status} className="inline-flex h-6 items-center gap-1.5 rounded-full bg-(--adm-pill) px-2.5 text-small font-medium whitespace-nowrap text-ink">
      <StatusDot status={LAB_STATUS_DOT[status]} />
      {T.status[status]}
    </span>
  );
}

/** The labs' numbers for their cards: today's real number (lib/admin/metrics.ts labNumbers), the question, the status, ceiling and next step. */
function useLabsPool(): NumberPool {
  const t = useTranslations("admin.pageTiles.labs");
  const numbers = labNumbers(useAdminInputs());
  const out: Record<string, NumberEntry> = {};
  for (const lab of useLabs()) {
    const n = numbers[lab.id];
    const has = n.kind !== "none" && n.value !== null;
    const value = !has ? "–" : n.kind === "share" ? share(n.value!) : n.kind === "pct" ? pct(n.value!) : num(n.value!);
    out[`metric-${lab.id}`] = { label: has ? t(`card.metricLabel.${lab.id}`) : t("card.noMetric"), value, caption: lab.question, info: t("card.metricInfo") };
    out[`status-${lab.id}`] = { label: "", value: <LabStatusCapsule status={lab.status} /> };
    out[`ceiling-${lab.id}`] = { label: t("card.ceilingShort"), value: lab.ceiling };
    out[`next-${lab.id}`] = { label: t("card.nextShort"), value: <span title={lab.next}>{lab.nextShort}</span>, oneLine: true };
  }
  return out;
}

// ── Pyramide ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const PX = { left: 230, apex: 560, base: 890, top: 20, bottom: 400, topHalf: 70 } as const;
/** The pyramid's left and right edge at height y – a flat top (140 wide), so the rows with three labs keep room for their names. */
const edges = (y: number) => {
  const t = (y - PX.top) / (PX.bottom - PX.top);
  const half = PX.topHalf + (PX.base - PX.apex - PX.topHalf) * t;
  return [PX.apex - half, PX.apex + half] as const;
};
const BANDS = [
  { from: 20, to: 112 },
  { from: 112, to: 208 },
  { from: 208, to: 304 },
  { from: 304, to: 400 },
] as const;

/**
 * Four levels from the bottom up – Fundament (Marktplatz), Kern (Crew · Bogen · Raum), Erweitert (Orte · Vertrauen · Lebensphasen),
 * Spitze ★ (Gemeinschaft) – and impact as a band across all of them. A lab is a segment; a click opens it in the tab Labore.
 */
function Pyramid({ onOpen }: { onOpen: (id: LabId) => void }) {
  return (
    <figure className="min-w-0">
      <div className="overflow-x-auto overscroll-x-contain">
        <svg viewBox="0 0 1000 420" role="img" aria-label={T.pyramid.sentence} className="block h-auto w-full min-w-[640px] max-w-5xl">
          {T.pyramid.levels.map((lv, i) => {
            const band = BANDS[i];
            const [l1, r1] = edges(band.from + 2);
            const [l2, r2] = edges(band.to - 2);
            const n = lv.labs.length;
            return (
              <g key={lv.level}>
                {/* The level's name and role on the left. */}
                <text x={20} y={(band.from + band.to) / 2 - 4} className="fill-(--adm-label) text-eyebrow tracking-[0.08em]">
                  {lv.label}
                </text>
                <text x={20} y={(band.from + band.to) / 2 + 14} className="fill-(--text-muted) text-small">
                  {lv.role}
                </text>
                {lv.labs.map((id, k) => {
                  const lab = labOf(id);
                  // The segment between k/n and (k+1)/n of the top and bottom edges (a 3-unit gap between segments).
                  const at = (a: number, b: number, f: number) => a + (b - a) * f;
                  const pts = [
                    [at(l1, r1, k / n) + (k > 0 ? 3 : 0), band.from + 2],
                    [at(l1, r1, (k + 1) / n) - (k < n - 1 ? 3 : 0), band.from + 2],
                    [at(l2, r2, (k + 1) / n) - (k < n - 1 ? 3 : 0), band.to - 2],
                    [at(l2, r2, k / n) + (k > 0 ? 3 : 0), band.to - 2],
                  ];
                  const cx = pts.reduce((s, p) => s + p[0], 0) / 4;
                  const cy = (band.from + band.to) / 2;
                  return (
                    <g key={id} role="button" tabIndex={0} aria-label={T.pyramid.open(lab.name)} onClick={() => onOpen(id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(id)} className="group cursor-pointer outline-none">
                      <polygon points={pts.map((p) => p.join(",")).join(" ")} className="fill-(--adm-block) stroke-(--line) transition-colors duration-150 group-hover:fill-(--adm-block-hover) group-focus-visible:stroke-(--focus-ring)" />
                      {/* Three labs in a row: the 14px nav size, so the names never touch. */}
                      <text x={cx} y={cy + (lv.line ? -6 : 5)} textAnchor="middle" className={cn("fill-(--text)", n > 1 ? "text-nav" : "text-adm-block")}>
                        {lv.star ? `★ ${lab.name}` : lab.name}
                      </text>
                      {lv.line && (
                        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-(--text-muted) text-small">
                          {lv.line}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* Impact: a band across every level. */}
          <g role="button" tabIndex={0} aria-label={T.pyramid.open(labOf("impact").name)} onClick={() => onOpen("impact")} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen("impact")} className="group cursor-pointer outline-none">
            <rect x={914} y={22} width={56} height={376} rx={12} className="fill-(--adm-here) stroke-(--line) transition-colors duration-150 group-hover:fill-(--adm-chart-1-soft)" />
            <text x={942} y={210} textAnchor="middle" transform="rotate(-90 942 210)" className="fill-(--text) text-small">
              {T.pyramid.band}
            </text>
          </g>
        </svg>
      </div>
      <figcaption className="mt-(--adm-inner) text-adm-block text-ink">{T.pyramid.sentence}</figcaption>
    </figure>
  );
}

// ── Karte ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const PLOT = { x0: 70, x1: 760, y0: 24, y1: 340 } as const;

/** A scatter: x "Nähe und Sicherheit" (weit weg → nah), y "Potenzial"; the positions an estimate. Below, the order of building. */
function LabMap({ onOpen }: { onOpen: (id: LabId) => void }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Badge>{T.map.note}</Badge>
      </div>
      <div className="mt-3 overflow-x-auto overscroll-x-contain">
        <svg viewBox="0 0 800 390" role="img" aria-label={`${T.map.y} / ${T.map.x}`} className="block h-auto w-full min-w-[560px] max-w-4xl">
          <line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} className="stroke-(--line)" strokeWidth={1.5} />
          <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} className="stroke-(--line)" strokeWidth={1.5} />
          <text x={PLOT.x0} y={PLOT.y1 + 22} className="fill-(--text-muted) text-small">
            {T.map.xFrom}
          </text>
          <text x={PLOT.x1} y={PLOT.y1 + 22} textAnchor="end" className="fill-(--text-muted) text-small">
            {T.map.xTo}
          </text>
          <text x={(PLOT.x0 + PLOT.x1) / 2} y={PLOT.y1 + 42} textAnchor="middle" className="fill-(--adm-label) text-small">
            {T.map.x} →
          </text>
          <text x={20} y={(PLOT.y0 + PLOT.y1) / 2} textAnchor="middle" transform={`rotate(-90 20 ${(PLOT.y0 + PLOT.y1) / 2})`} className="fill-(--adm-label) text-small">
            {T.map.y} →
          </text>
          {LABS.map((lab) => {
            const p = LAB_MAP[lab.id];
            const x = PLOT.x0 + p.x * (PLOT.x1 - PLOT.x0);
            const y = PLOT.y1 - p.y * (PLOT.y1 - PLOT.y0);
            const r = 6 + p.y * 14;
            const right = p.x < 0.7;
            return (
              <g key={lab.id} role="button" tabIndex={0} aria-label={T.pyramid.open(lab.name)} onClick={() => onOpen(lab.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(lab.id)} className="group cursor-pointer outline-none">
                <circle cx={x} cy={y} r={r} className="fill-(--adm-chart-primary-soft) stroke-(--adm-chart-primary) transition-colors duration-150 group-hover:fill-(--adm-chart-hover)" strokeWidth={1.5} />
                <text x={right ? x + r + 6 : x - r - 6} y={y + 5} textAnchor={right ? "start" : "end"} className="fill-(--text) text-small">
                  {lab.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <section className="mt-(--adm-section)">
        <h2 className="mb-3 text-small font-semibold text-(--adm-label)">{T.map.orderTitle}</h2>
        <ol className="flex flex-wrap items-center gap-2">
          {T.map.order.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center rounded-full border border-ink/20 px-3 text-small text-ink">{step.map((id) => labOf(id).name).join(" + ")}</span>
              {i < T.map.order.length - 1 && <ArrowRight aria-hidden className="size-4 text-ink/40" />}
            </li>
          ))}
        </ol>
        {/* Impact through every step. */}
        <p className="mt-2 flex items-center gap-2 text-small text-ink/70">
          <span aria-hidden className="h-1.5 w-full max-w-md rounded-full bg-(--adm-here)" />
          <span className="shrink-0">{T.map.throughout}</span>
        </p>
      </section>
    </>
  );
}

// ── Labore ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The test's states: offen ○ · ja ✓ · nein ✕ – a click goes to the next. */
const TEST_MARK: Record<TestValue, string> = { open: "○", yes: "✓", no: "✕" };
const TEST_NEXT: Record<TestValue, TestValue> = { open: "yes", yes: "no", no: "open" };
const TEST_TONE: Record<TestValue, string> = { open: "text-muted", yes: "text-adm-good", no: "text-adm-critical" };

/**
 * A lab's way from the question to a possible revenue (CLAUDE.md „Labore: Weg und Status“): the head (name, level, the question as a quote,
 * the status), then four equal columns with space only – ① Daten ② Intern (entries with a place in Algorithmus link there) ③ Extern (below
 * it small: Physisch, Markt, Ab wann) ④ Test (the five questions, a click switches offen → ja → nein). Empty fields "–" in grey.
 */
function LabDetail({ lab, onBack }: { lab: Lab; onBack?: () => void }) {
  // Raum has a second level: Überblick · Architektur · Datenplan (?view=, Vision › Schichten links to Architektur).
  const view = useAdminSearch().get("view");
  const spaceView: ArchitectureView = lab.id === "space" && (view === "architecture" || view === "plan") ? view : "overview";
  return (
    <article data-lab-detail>
      {onBack && <BackToList onBack={onBack} />}
      <LabHead lab={lab} view={spaceView} />
      {spaceView === "architecture" ? <Architecture /> : spaceView === "plan" ? <DataPlan /> : <LabWay lab={lab} />}
    </article>
  );
}

const dash = (value: string | null) => (!value || value === "–" ? null : value);

function WayColumn({ no, title, line, children }: { no: number; title: string; line: string; children: ReactNode }) {
  return (
    <section data-way-column className="min-w-0">
      <h3 className="flex items-baseline gap-2">
        <span aria-hidden className="text-small font-semibold tabular-nums text-(--adm-label)">{no}</span>
        <span className="text-eyebrow uppercase text-(--adm-label)">{title}</span>
      </h3>
      <p className="mt-0.5 text-small text-muted">{line}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Empty = () => <span className="text-body text-muted">–</span>;

function LabWay({ lab }: { lab: Lab }) {
  const W = T.way;
  const actions = useAdminActions();
  const internal = dash(lab.internal)?.split(", ") ?? [];
  const small = [
    { label: T.fields.physical, value: dash(lab.physical) },
    { label: T.fields.ceiling, value: dash(lab.ceiling) },
    { label: T.fields.from, value: dash(lab.from) },
  ];
  const toggle = (key: TestKey) => {
    const next = TEST_NEXT[lab.test[key]];
    actions.setLabTest(lab.id, lab.name, key, next, `${T.test[key]} ${T.testValue[next]}`, key === "payingBuyer" && lab.status === "revenue" && next !== "yes");
  };
  return (
    <div data-lab-way className="mt-(--adm-section) grid gap-x-10 gap-y-(--adm-section) sm:grid-cols-2 xl:grid-cols-4">
      <WayColumn no={1} title={W.data.title} line={W.data.line}>
        {dash(lab.data) ? <p className="text-body leading-normal text-ink">{lab.data}</p> : <Empty />}
      </WayColumn>
      <WayColumn no={2} title={W.internal.title} line={W.internal.line}>
        {internal.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-2">
            {internal.map((entry) => {
              const link = INTERNAL_LINKS[entry];
              return (
                <li key={entry} className="text-body leading-normal">
                  {link ? (
                    <Link href={algorithmHref(link.select)} data-tooltip-info={W.linkTo(link.label)} className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                      {entry} <span aria-hidden>→</span>
                    </Link>
                  ) : (
                    <span className="text-ink">{entry}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </WayColumn>
      <WayColumn no={3} title={W.external.title} line={W.external.line}>
        {dash(lab.external) ? <p className="text-body leading-normal text-ink">{lab.external}</p> : <Empty />}
        <dl className="mt-4 flex flex-col gap-2">
          {small.map((f) => (
            <div key={f.label} className="flex min-w-0 items-baseline gap-3">
              <dt className="w-20 shrink-0 text-small text-muted">{f.label}</dt>
              <dd className={cn("min-w-0 text-small", f.value ? "text-ink" : "text-muted")}>{f.value ?? "–"}</dd>
            </div>
          ))}
        </dl>
      </WayColumn>
      <WayColumn no={4} title={W.test.title} line={W.test.line}>
        <ul className="flex flex-col gap-1">
          {TEST_KEYS.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-label={W.toggleTest(T.test[key], T.testValue[lab.test[key]])}
                className="adm-press -mx-2 flex min-h-9 w-[calc(100%+16px)] items-center gap-2.5 rounded-lg px-2 text-left text-body hover:bg-ink/5"
              >
                <span aria-hidden className={cn("w-4 shrink-0 text-center font-semibold", TEST_TONE[lab.test[key]])}>
                  {TEST_MARK[lab.test[key]]}
                </span>
                <span className="min-w-0 flex-1 text-ink">{T.test[key]}</span>
                <span className="shrink-0 text-small text-muted">{T.testValue[lab.test[key]]}</span>
              </button>
            </li>
          ))}
        </ul>
      </WayColumn>
    </div>
  );
}

// ── Fluss ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const KINDS = ["internal", "external", "physical"] as const;
const KIND_ICON = { internal: Database, external: Globe2, physical: Box } as const;

/** DATEN (moments) → LABORE → PRODUKTE (Intern · Extern · Physisch), the BlockMap with lines; below it the tree of physical products. */
function LabFlow({ onOpen }: { onOpen: (id: LabId) => void }) {
  const tMoment = ADMIN_DE.data.moment;
  const used = MOMENTS.filter((m) => LABS.some((l) => l.moments.includes(m)));
  const links: MapLink[] = [
    ...LABS.flatMap((l) => l.moments.map((m) => ({ from: `moment:${m}`, to: `lab:${l.id}`, weight: 2 }))),
    ...LABS.flatMap((l) => KINDS.filter((k) => l[k] !== "–").map((k) => ({ from: `lab:${l.id}`, to: `kind:${k}`, weight: 2 }))),
  ];
  return (
    <>
      <BlockMap
        label={T.tabs.flow}
        compact
        links={links}
        columns={[
          { key: "data", label: T.flow.data, blocks: used.map((m) => ({ id: `moment:${m}`, icon: Database, title: tMoment[m], status: "none" as const })) },
          { key: "labs", label: T.flow.labs, blocks: LABS.map((l) => ({ id: `lab:${l.id}`, icon: FlaskConical, title: `${l.number} ${l.name}`, subtitle: T.level[l.level], status: "none" as const, onOpen: () => onOpen(l.id) })) },
          { key: "products", label: T.flow.products, blocks: KINDS.map((k) => ({ id: `kind:${k}`, icon: KIND_ICON[k], title: T.flow.productKinds[k], subtitle: `${LABS.filter((l) => l[k] !== "–").length} Labore`, status: "none" as const })) },
        ]}
      />
      <p className="mt-3 text-small text-ink/50">{T.flow.assumption}</p>
      <section className="mt-(--adm-section)">
        <h2 className="mb-3 text-small font-semibold text-(--adm-label)">{T.flow.treeTitle}</h2>
        <div className="flex flex-col gap-2">
          <span className="inline-flex h-8 w-fit items-center gap-2 rounded-full border border-ink/20 px-3 text-small text-ink">
            <Hammer aria-hidden className="size-3.5 text-ink/60" />
            {T.flow.trunk}
          </span>
          <ul className="ml-4 flex flex-col gap-2 border-l border-ink/15 pl-4">
            {PHYSICAL_TREE.map((branch) => (
              <li key={branch.lab} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 w-28 shrink-0 text-small font-semibold text-ink">{labOf(branch.lab).name}</span>
                {branch.items.map((item) => (
                  <span key={item} className="inline-flex h-7 items-center rounded-full bg-ink/6 px-2.5 text-small text-ink">
                    {item}
                  </span>
                ))}
                {branch.note && <span className="text-small text-ink/60">({branch.note})</span>}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-(--adm-inner) text-adm-block text-ink">{T.flow.sentence}</p>
      </section>
    </>
  );
}

// ── Potenzial ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The log scale of the bars: 0,01 to 100 bn €. */
const LOG = { min: Math.log10(0.01), max: Math.log10(100) };
const logX = (v: number) => ((Math.log10(v) - LOG.min) / (LOG.max - LOG.min)) * 100;

function Potential() {
  const C = T.potential.cols;
  return (
    <>
      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[860px] text-left text-small">
          <thead className="text-(--adm-label)">
            <tr className="border-b border-ink/8">
              <th className="px-3 pl-0 font-medium">{C.rank}</th>
              <th className="px-3 font-medium">{C.lab}</th>
              <th className="px-3 font-medium">{C.market}</th>
              <th className="px-3 font-medium">{C.earn}</th>
              <th className="w-[26%] px-3 pr-0 font-medium">{C.ceiling}</th>
            </tr>
          </thead>
          <tbody>
            {POTENTIAL.map((row) => (
              // The foundation on top, set apart (no rank, a stronger line under it).
              <tr key={row.lab} className={cn("border-b align-top", row.rank === null ? "border-ink/25" : "border-ink/8")}>
                <td className="px-3 py-2.5 pl-0 tabular-nums text-ink/60">{row.rank ?? "–"}</td>
                <td className="px-3 py-2.5 font-semibold text-ink">{row.name ?? labOf(row.lab).name}</td>
                <td className="px-3 py-2.5 leading-normal text-ink/80">{row.market}</td>
                <td className="px-3 py-2.5 leading-normal text-ink/80">{row.earn}</td>
                <td className="px-3 py-2.5 pr-0">
                  <span className="relative block h-2 rounded-full bg-adm-chart-track" role="img" aria-label={row.ceiling}>
                    <span className={cn("absolute inset-y-0 rounded-full", row.rank === null ? "bg-adm-chart-compare" : "bg-adm-chart-primary")} style={{ left: `${logX(row.from)}%`, width: `${Math.max(1.5, logX(row.to) - logX(row.from))}%` }} />
                  </span>
                  <span className="mt-1 block leading-normal text-ink">{row.ceiling}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-small text-ink/50">{T.potential.note}</p>
    </>
  );
}


// ── Labor Raum: Simpulo-Architektur and the data plan (lib/admin/labs/architecture.ts) ─────────────────────────────────────────────

/** The lab's title; for Raum the second level (AdminSubTabs) right under it. */
function LabHead({ lab, view }: { lab: Lab; view: ArchitectureView }) {
  const A = ARCHITECTURE;
  const actions = useAdminActions();
  const earn = canEarn(lab);
  return (
    <header data-lab-head className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="adm-page-title text-h2">{lab.name}</span>
            <span className="text-body text-muted">{T.level[lab.level]}</span>
          </h2>
          <blockquote className="mt-3 max-w-[40ch] text-h3 leading-snug text-ink">„{lab.question}“</blockquote>
        </div>
        {/* The status: Idee · Test · Einnahme – "Einnahme" only with a paying buyer (the reason as a tooltip). */}
        <div role="radiogroup" aria-label={T.statusLabel} className="flex shrink-0 items-center gap-(--adm-cap-gap)">
          {LAB_STATUSES.map((status) => {
            const locked = status === "revenue" && !earn;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={lab.status === status}
                aria-disabled={locked || undefined}
                data-on={lab.status === status ? "" : undefined}
                data-tooltip-info={locked ? T.revenueLocked : undefined}
                onClick={() => !locked && lab.status !== status && actions.setLabStatus(lab.id, lab.name, status, T.status[status])}
                className={cn("adm-cap adm-press", locked && "cursor-not-allowed opacity-45")}
              >
                <StatusDot status={LAB_STATUS_DOT[status]} />
                {T.status[status]}
              </button>
            );
          })}
        </div>
      </div>
      {lab.id === "space" && (
        <AdminSubTabs<ArchitectureView>
          label={A.views.label}
          value={view}
          onChange={(next) => setAdminSearch({ view: next === "overview" ? null : next }, { replace: true })}
          tabs={(["overview", "architecture", "plan"] as const).map((value) => ({ value, label: A.views[value] }))}
        />
      )}
    </header>
  );
}

/** Architektur: the sentence, the five rules, the climate zones, the pattern book, the tools – Planen's orange and neutral only. */
function Architecture() {
  const A = ARCHITECTURE;
  const label = "mb-2 text-eyebrow uppercase text-(--adm-label)";
  return (
    <div data-architecture className="mt-(--adm-inner) flex flex-col gap-(--adm-section)">
      <section>
        <p className="text-h2 text-ink">{A.sentence}</p>
        <p className="mt-1 max-w-160 text-body text-muted">{A.sentenceNote}</p>
      </section>
      <section aria-labelledby="arch-rules">
        <h3 id="arch-rules" className={label}>
          {A.rulesTitle}
        </h3>
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-2">
          {A.rules.map((r) => (
            <li key={r.no} className="rounded-xl border border-(--adm-tile-edge) bg-(--adm-tile-bg) px-3 py-2.5">
              <p className="flex items-baseline gap-2">
                <span className="text-small font-semibold text-(--adm-group-plan)">{r.no}</span>
                <span className="text-adm-block font-semibold text-ink">{r.title}</span>
              </p>
              <p className="mt-0.5 text-small text-ink">{r.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/admin/data?tab=theses" className="mt-2 inline-block text-small font-semibold text-ink hover:underline">
          {A.rulesLink}
        </Link>
      </section>
      <section aria-labelledby="arch-climate">
        <h3 id="arch-climate" className={label}>
          {A.climateTitle}
        </h3>
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[520px] text-left text-small">
            <thead className="text-(--adm-label)">
              <tr className="border-b border-ink/8">
                {A.climateHead.map((h) => (
                  <th key={h} className="h-9 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {A.climate.map((c) => (
                <tr key={c.zone} className="border-b border-ink/8">
                  <td className="h-9 pr-4 font-semibold text-ink">{c.zone}</td>
                  <td className="h-9 pr-4 text-ink">{c.middle}</td>
                  <td className="h-9 pr-4 text-muted">{c.typical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-x-12 gap-y-(--adm-section) lg:grid-cols-2">
        <section aria-labelledby="arch-book">
          <h3 id="arch-book" className={label}>
            {A.patternBookTitle}
          </h3>
          <p className="max-w-160 text-body text-ink">{A.patternBook}</p>
        </section>
        <section aria-labelledby="arch-tools">
          <h3 id="arch-tools" className={label}>
            {A.toolsTitle}
          </h3>
          <ul className="divide-y divide-ink/8 border-y border-ink/8">
            {A.tools.map((tool) => (
              <li key={tool.name} className="flex min-h-10 items-center gap-3 py-1.5 text-small">
                <span className={cn("w-14 shrink-0 font-semibold", tool.when === "jetzt" ? "text-(--adm-group-plan)" : "text-muted")}>{tool.when}</span>
                <span className="w-40 shrink-0 font-semibold text-ink">{tool.name}</span>
                <span className="min-w-0 text-ink">{tool.use}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Datenplan: three columns Nachfrage · Raum · Wirkung – each data point's name and status from config/data-points.ts; the method as a chain. */
function DataPlan() {
  const A = ARCHITECTURE;
  const dot: Record<DataPointStatus, string> = { used: "bg-adm-good", collecting: "bg-adm-warning", planned: "border border-ink/40" };
  return (
    <div data-data-plan className="mt-(--adm-inner) flex flex-col gap-(--adm-section)">
      <div className="grid gap-x-8 gap-y-(--adm-section) lg:grid-cols-3">
        {A.planColumns.map((col) => {
          const points = col.ids.map((id) => DATA_POINTS.find((d) => d.id === id)).filter((d): d is (typeof DATA_POINTS)[number] => Boolean(d));
          return (
            <section key={col.key} aria-labelledby={`plan-${col.key}`}>
              <h3 id={`plan-${col.key}`} className="text-eyebrow uppercase text-(--adm-group-plan)">
                {col.title} <span className="text-(--adm-label)">· {points.length}</span>
              </h3>
              <p className="mb-2 text-small text-muted">{col.text}</p>
              <ul className="divide-y divide-ink/8 border-y border-ink/8">
                {points.map((d) => (
                  <li key={d.id} data-tooltip-info={d.captures} className="flex h-8 items-center justify-between gap-3 text-small">
                    <span className="min-w-0 truncate text-ink">{d.short}</span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                      <span aria-hidden className={cn("size-2 rounded-full", dot[d.status])} />
                      {A.status[d.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <section aria-labelledby="plan-method">
        <h3 id="plan-method" className="mb-2 text-eyebrow uppercase text-(--adm-label)">
          {A.methodTitle}
        </h3>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {A.method.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-(--adm-tile-edge) bg-(--adm-tile-bg) px-3 py-1 text-small text-ink">{step}</span>
              {i < A.method.length - 1 && <span aria-hidden className="text-small text-(--adm-group-plan)">→</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
