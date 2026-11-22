"use client";

// Admin › Wachstum › Labore (/admin/labore): Simpulo's fields of growth. No visible title; the click row with the tabs Pyramide · Karte ·
// Labore · Fluss · Potenzial. Drawn like Algorithmus: SVG for the pyramid and the map, AdminListDetail for the labs, the BlockMap with lines
// for the flow, a table with log bars for the potential. Every text and value from lib/admin/labs.ts (estimates, not measurements).
import { ArrowRight } from "lucide-react";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MOMENTS } from "@/config/data-points";
import { ADMIN_DE } from "@/lib/i18n/admin.de";
import { LAB_MAP, LABS, LABS_TEXT, labOf, PHYSICAL_TREE, POTENTIAL, TEST_KEYS, type Lab, type LabId, type LabStatus, type TestValue } from "@/lib/admin/labs";
import { cn } from "@/lib/utils";
import { StatusDot } from "./AdminCharts";
import { AdminShell, AREA_TEXT, AREA_TILE } from "./AdminShell";
import { TileValue } from "./AdminTiles";
import { InfoTip } from "./AdminNumbers";
import { AdminListDetail, AdminTabs, BackToList } from "./AdminLayout";
import { BlockMap, type MapLink } from "./BlockMap";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Box, Database, FlaskConical, Globe2, Hammer } from "lucide-react";

type Tab = "overview" | keyof typeof LABS_TEXT.tabs;
/** Überblick first and by default (CLAUDE.md "Überblick zuerst"). */
const TABS: readonly Tab[] = ["overview", "pyramid", "map", "labs", "flow", "potential"];
const T = LABS_TEXT;

export function AdminLabs() {
  const [tab, setTab] = useState<Tab>("overview");
  const tOverview = useTranslations("admin.overviewBlock");
  const [lab, setLab] = useState<LabId | null>(null);
  const open = (id: LabId) => {
    setLab(id);
    setTab("labs");
  };
  return (
    <AdminShell title={ADMIN_DE.nav.labs} tabs={<AdminTabs label={ADMIN_DE.nav.labs} value={tab} onChange={setTab} tabs={TABS.map((key) => ({ value: key, label: key === "overview" ? tOverview("tab") : T.tabs[key] }))} />}>
      {tab === "overview" && <LabsOverview onLab={open} />}
      {tab === "pyramid" && <Pyramid onOpen={open} />}
      {tab === "map" && <LabMap onOpen={open} />}
      {tab === "labs" && <LabList selected={lab} onSelect={setLab} />}
      {tab === "flow" && <LabFlow onOpen={open} />}
      {tab === "potential" && <Potential />}
    </AdminShell>
  );
}

// ── Überblick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Labore › Überblick (CLAUDE.md "Überblick je Seitentyp", SAMMLUNG): one card per lab in a 3 × 3 grid in the Planen colour – number and
 * name, the guiding question, the status as a coloured label (Idee · läuft · bestätigt · verworfen), the most important number (the upper
 * bound per year, an estimate) and the next step. The grid fills the height left under the bar (no scrolling at ≥ 1280 × 720); a click
 * opens the lab in the tab Labore. Every value from lib/admin/labs.ts.
 */
const LAB_STATUS_TONE: Record<LabStatus, string> = {
  idea: "border-ink/20 text-muted",
  running: "border-adm-warning/60 text-adm-warning",
  confirmed: "border-adm-good/60 text-adm-good",
  dropped: "border-adm-critical/60 text-adm-critical",
};
/** Room under the grid (the page's bottom padding) and the card height's bounds. */
const LAB_BOTTOM = 40;
const LAB_CARD_MIN = 132;
const LAB_CARD_MAX = 260;

function LabsOverview({ onLab }: { onLab: (id: LabId) => void }) {
  const t = useTranslations("admin.pageTiles.labs");
  const box = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState<number | null>(null);
  const rows = Math.ceil(LABS.length / 3);
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined || window.innerWidth < 1024) return setCardH(null);
      const gap = Math.min(20, Math.max(10, Math.round(window.innerHeight * 0.015)));
      const room = window.innerHeight - (top + window.scrollY) - LAB_BOTTOM;
      setCardH(Math.round(Math.min(LAB_CARD_MAX, Math.max(LAB_CARD_MIN, (room - gap * (rows - 1)) / rows))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [rows]);
  // Compact cards (short windows): a smaller number and tighter gaps, so a two-line question never pushes it out.
  const compact = cardH !== null && cardH < 200;
  return (
    <div
      ref={box}
      data-tile-board
      aria-label={ADMIN_DE.nav.labs}
      role="list"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      style={{ gap: "clamp(10px, 1.5dvh, 20px)", ...(cardH ? { gridAutoRows: `${cardH}px` } : {}) } as CSSProperties}
    >
      {LABS.map((lab) => (
        // The same build as every admin tile (CLAUDE.md "Admin: Kacheln einheitlich"): title (number · name, the status right) on top, the
        // ceiling in the one value size right under it, then the detail lines – free room stays at the bottom.
        <div key={lab.id} role="listitem" data-cockpit-tile data-lab-card={lab.id} className={cn("relative flex min-h-0 min-w-0 flex-col justify-start overflow-hidden rounded-xl border px-4 pt-3 pb-3", AREA_TILE.plan)}>
          <button type="button" data-card-link aria-label={t("card.open", { name: lab.name })} onClick={() => onLab(lab.id)} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)" />
          <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
            <span className={cn("truncate text-eyebrow uppercase", AREA_TEXT.plan)}>{t("card.title", { no: String(lab.number), name: lab.name })}</span>
            <span data-lab-status={lab.status} className={cn("shrink-0 rounded-full border px-2 py-0.5 text-small font-semibold leading-none", LAB_STATUS_TONE[lab.status])}>
              {T.status[lab.status]}
            </span>
          </div>
          <div className="mt-0.5 flex min-w-0 shrink-0 items-center">
            <TileValue value={lab.ceiling} />
          </div>
          <div className="mt-0.5 flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden text-small leading-snug text-muted">
            <span className="flex shrink-0 items-center gap-1">
              {t("card.ceiling")}
              <InfoTip text={t("card.ceilingInfo")} />
            </span>
            <p className={cn("text-ink", compact ? "truncate" : "line-clamp-2")}>{lab.question}</p>
            <p className="truncate">{t("card.next", { step: lab.next ?? T.nextOpen })}</p>
          </div>
        </div>
      ))}
    </div>
  );
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

const TEST_DOT: Record<TestValue, "good" | "critical" | null> = { yes: "good", no: "critical", open: null };

function LabList({ selected, onSelect }: { selected: LabId | null; onSelect: (id: LabId | null) => void }) {
  const lab = selected ? labOf(selected) : null;
  return (
    <AdminListDetail
      label={T.tabs.labs}
      rows={LABS.map((l) => ({ id: l.id, title: `${l.number} ${l.name}`, meta: `${T.level[l.level]} · ${l.question}`, aside: l.ceiling.replace(" direkt", "") }))}
      selectedId={selected}
      onSelect={(id) => onSelect(id as LabId)}
      empty={null}
      detail={lab ? <LabDetail lab={lab} onBack={() => onSelect(null)} /> : <p className="py-2 text-body text-muted">{T.pick}</p>}
    />
  );
}

function LabDetail({ lab, onBack }: { lab: Lab; onBack: () => void }) {
  const fields = [
    { label: T.fields.level, value: T.level[lab.level] },
    { label: T.fields.question, value: lab.question },
    { label: T.fields.data, value: lab.data },
    { label: T.fields.internal, value: lab.internal },
    { label: T.fields.external, value: lab.external },
    { label: T.fields.physical, value: lab.physical },
    ...(lab.from ? [{ label: T.fields.from, value: lab.from }] : []),
    { label: T.fields.ceiling, value: lab.ceiling },
  ];
  return (
    <article data-lab-detail>
      <BackToList onBack={onBack} />
      <p className="text-h3 text-ink">
        {lab.number} {lab.name}
      </p>
      <dl className="mt-(--adm-inner) grid gap-x-6 gap-y-(--adm-inner) sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-eyebrow uppercase text-(--adm-label)">{f.label}</dt>
            <dd className="mt-1 text-body leading-normal text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-(--adm-section)">
        <h3 className="mb-2 text-eyebrow uppercase text-(--adm-label)">{T.fields.test}</h3>
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {TEST_KEYS.map((key) => (
            <li key={key} className="flex h-10 items-center justify-between gap-3 text-small">
              <span className="text-ink">{T.test[key]}</span>
              <span className="inline-flex items-center gap-2 text-ink/80">
                <StatusDot status={TEST_DOT[lab.test[key]]} />
                {T.testValue[lab.test[key]]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
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

