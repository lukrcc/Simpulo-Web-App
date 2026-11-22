"use client";

// /admin/topics – Analyse (no visible title, CLAUDE.md "Admin-Pyramide"): where Simpulo works best. The click row: tabs Überblick · Thema ·
// Länge · Crew · Ort-Typ · Hub · Host-Stufe (Tiefe only with the depth choice); right a small "Letzte 12 Monate" (no period switch – Analyse
// always counts the Houses that began in the last 12 months) and „Bewerten nach“: Wert · Verbindung · Wiederkehr · Tempo – for the overview
// and every detail tab.
//   Überblick – only tiles (CLAUDE.md "Überblick zuerst", TileBoard, group Zahlen): the sweet spot, per angle the best group (and the
//               weakest), the best topic by each measure, Pro vollem House, Houses in 12 months, groups with too few data.
//   Detail    – horizontal bars per group by the chosen measure, a slim table (Gruppe · Hauptzahl · Houses; Länge, Crew and Host-Stufe with
//               „Wen es anspricht“ from config/spectrum.ts), the detail right with every other value; the first group opens selected.
// Groups under 10 Houses grey at the end ("zu wenig Daten"). Every number from lib/admin/metrics.ts (analysisRows, rankByMeasure, sweetSpot).
import { useDepthChoice } from "@/config/platform";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import { useFormat } from "@/i18n/format";
import { ANALYSIS_MEASURES, analysisDimensions, analysisRows, cockpit, measureOf, rankByMeasure, sweetSpot, type AnalysisDimension, type AnalysisMeasure, type AnalysisPeriod, type AnalysisRow } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { days, eur, monthLong, num, share } from "@/lib/i18n/adminFormat";
import type { ADMIN_DE } from "@/lib/i18n/admin.de";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SPECTRUM_ROWS } from "@/config/spectrum";
import { AdminShell } from "./AdminShell";
import { AdminTabs, BackToList } from "./AdminLayout";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";
import { InfoTip } from "./AdminNumbers";

/** Analyse's one window: the Houses that began in the last 12 months. */
const WINDOW: AnalysisPeriod = "12m";

type Tab = "overview" | AnalysisDimension;

/** „Wen es anspricht“ per group, for the angles the spectrum describes (Länge · Crew · Host-Stufe). */
const AUDIENCE: Partial<Record<AnalysisDimension, Record<string, string>>> = Object.fromEntries(
  SPECTRUM_ROWS.map((row) => [row.detail, Object.fromEntries(row.columns.map((c) => [c.key, c.audience]))]),
);

export function AdminAnalysis() {
  const t = useTranslations("admin.analysis");
  const tTopics = useTranslations("admin.topics");
  const depthOn = useDepthChoice();
  const dims = analysisDimensions(depthOn).filter((d) => d !== "origin");
  const [tab, setTab] = useState<Tab>("overview");
  const [measure, setMeasure] = useState<AnalysisMeasure>("value");
  const shown: Tab = tab === "overview" || (dims as readonly string[]).includes(tab) ? tab : "overview";
  return (
    <AdminShell
      title={tTopics("title")}
      tabs={<AdminTabs<Tab> label={t("dimension.label")} value={shown} onChange={setTab} tabs={[{ value: "overview" as const, label: t("dimension.overview") }, ...dims.map((value) => ({ value, label: t(`dimension.${value}`) }))]} />}
      aside={
        <>
          <span data-tooltip-info={t("windowInfo")} className="mr-2 text-small text-muted">
            {t("window")}
            <span className="sr-only">. {t("windowInfo")}</span>
          </span>
          <AdminTabs<AnalysisMeasure> label={t("measure.label")} value={measure} onChange={setMeasure} tabs={ANALYSIS_MEASURES.map((value) => ({ value, label: t(`measure.${value}`), tooltip: t(`measure.info.${value}`) }))} />
        </>
      }
    >
      {shown === "overview" ? <Overview dims={dims} measure={measure} onOpen={setTab} /> : <Detail key={shown} dimension={shown} measure={measure} />}
    </AdminShell>
  );
}

/** A group's name, by angle. */
function useGroupLabel() {
  const t = useTranslations("admin.analysis");
  const tPlace = useTranslations("admin.accommodation");
  const f = useFormat();
  return (dimension: AnalysisDimension, key: string): string => {
    if (dimension === "topic") return f.vibe(key as Vibe);
    if (dimension === "length") return t(`length.${key as "short" | "mid" | "long"}`);
    if (dimension === "crew") return t("crew", { band: key.replace("-", "–") });
    if (dimension === "origin") return t(`origin.${key as "own" | "new"}`);
    if (dimension === "category") return key === "unset" ? t("unset") : tPlace(`category.${key as keyof typeof ADMIN_DE.accommodation.category}`);
    if (dimension === "tier") return t(`tier.${key as "share" | "pro" | "anchor"}`);
    if (dimension === "depth") return t(`depth.${key as "easy" | "balanced" | "deep"}`);
    return key;
  };
}

/** A measure's number in words: € · % · days ("–" when unknown). */
function measureText(measure: AnalysisMeasure, value: number | null): string {
  if (value === null) return "–";
  if (measure === "value") return eur(value);
  if (measure === "speed") return days(value);
  return share(value);
}

// ── Überblick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Analyse › Überblick: only tiles (group Zahlen), following „Bewerten nach“ – the sweet spot · per angle the best group (its number and the
 * weakest) · the best topic by each of the four measures · Pro vollem House (monthly, like the overview) · Houses in 12 months · groups with
 * too few data. Every tile opens its tab.
 */
function Overview({ dims, measure, onOpen }: { dims: readonly AnalysisDimension[]; measure: AnalysisMeasure; onOpen: (tab: AnalysisDimension) => void }) {
  const t = useTranslations("admin.analysis");
  const tt = useTranslations("admin.pageTiles.analysis");
  const tc = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const label = useGroupLabel();
  const spot = sweetSpot(inputs, WINDOW, measure);
  const rowsOf = (dim: AnalysisDimension) => analysisRows(inputs, dim, WINDOW);
  const enough = (dim: AnalysisDimension, m: AnalysisMeasure) => rankByMeasure(rowsOf(dim), m).filter((r) => !r.tooFew && measureOf(r, m) !== null);
  const topics = rowsOf("topic");
  const month = cockpit(inputs, "month");
  const perHouse = month.areas.find((a) => a.number.key === "perHouse")!.number;
  const fullMonth = month.areas.find((a) => a.key === "supply")!.number;
  const allGroups = dims.flatMap((d) => rowsOf(d));
  const lengths = rowsOf("length");
  const lengthOf = (key: string) => num(lengths.find((r) => r.key === key)?.houses ?? 0);
  const biggestTopic = topics.toSorted((a, b) => b.houses - a.houses)[0];
  const tiles: TileSpec[] = [
    {
      key: "sweetSpot",
      label: tt("sweetSpot.label"),
      info: tt("sweetSpot.info"),
      value: spot ? [label("topic", spot.topic), t(`lengthShort.${spot.length}`), label("crew", spot.crew), label("tier", spot.tier)].join(" · ") : tt("none"),
      small: true,
      details: spot
        ? [tt("sweetLine", { main: measureText(measure, measureOf(spot.row, measure)), repeat: share(spot.row.repeat12) }), tt("d.housesBooking", { houses: num(spot.row.houses), perBooking: spot.row.perBooking === null ? "–" : eur(spot.row.perBooking) })]
        : [tt("none")],
      onOpen: () => onOpen("topic"),
    },
    ...dims.map((dim): TileSpec => {
      const ranked = enough(dim, measure);
      const best = ranked[0];
      const worst = ranked.length >= 2 ? ranked.at(-1)! : null;
      return {
        key: `dim-${dim}`,
        label: t(`dimension.${dim}`),
        info: tt("best.info"),
        value: best ? label(dim, best.key) : t("tooFew"),
        small: true,
        details: best
          ? [
              tt("d.bestValue", { value: measureText(measure, measureOf(best, measure)), houses: num(best.houses) }),
              worst ? tt("d.worst", { name: label(dim, worst.key), value: measureText(measure, measureOf(worst, measure)) }) : tt("d.onlyOne"),
              tt("d.groups", { count: num(rowsOf(dim).length), few: num(rowsOf(dim).filter((r) => r.tooFew).length) }),
            ]
          : [tt("d.groups", { count: num(rowsOf(dim).length), few: num(rowsOf(dim).filter((r) => r.tooFew).length) })],
        onOpen: () => onOpen(dim),
      };
    }),
    // The other three measures (the chosen one is already the Thema tile).
    ...ANALYSIS_MEASURES.filter((m) => m !== measure).map((m): TileSpec => {
      const [best, second] = enough("topic", m);
      return {
        key: `leader-${m}`,
        label: tt(`leader.${m}.label`),
        info: tt(`leader.${m}.info`),
        value: best ? label("topic", best.key) : tt("none"),
        small: true,
        details: best ? [tt("d.leaderValue", { value: measureText(m, measureOf(best, m)), houses: num(best.houses) }), second ? tt("d.second", { name: label("topic", second.key), value: measureText(m, measureOf(second, m)) }) : tt("d.onlyOne")] : [tt("none")],
        onOpen: () => onOpen("topic"),
      };
    }),
    {
      key: "perHouse",
      label: tt("perHouse.label"),
      info: `${tt("perHouse.info")} (${tc("against.month", { month: monthLong(cockpit(inputs, "month").compareDate) })})`,
      value: perHouse.value === null ? tt("none") : eur(perHouse.value),
      change: perHouse.change,
      details: [tt("d.fullMonth", { count: fullMonth.value === null ? "–" : num(fullMonth.value) }), tt("d.profitMonth", { profit: eur(month.profit.current) })],
      onOpen: () => onOpen("topic"),
    },
    {
      key: "houses",
      label: tt("houses.label"),
      info: tt("houses.info"),
      value: num(topics.reduce((n, r) => n + r.houses, 0)),
      details: [tt("d.lengths", { short: lengthOf("short"), mid: lengthOf("mid"), long: lengthOf("long") }), biggestTopic ? tt("d.biggest", { name: label("topic", biggestTopic.key), count: num(biggestTopic.houses) }) : tt("none"), tt("d.sparse", { few: num(allGroups.filter((r) => r.tooFew).length), count: num(allGroups.length) })],
      onOpen: () => onOpen("length"),
    },
  ];
  return <TileBoard label={t("dimension.overview")} columns={4} rows={chunkRows(tiles, "numbers", 4)} />;
}

// ── Detail tabs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Detail({ dimension, measure }: { dimension: AnalysisDimension; measure: AnalysisMeasure }) {
  const t = useTranslations("admin.analysis");
  const inputs = useAdminInputs();
  const rows = rankByMeasure(analysisRows(inputs, dimension, WINDOW), measure);
  // The first group opens selected; a click picks another.
  const [picked, setPicked] = useState<string | null>(null);
  const row = rows.find((r) => r.key === picked) ?? rows[0] ?? null;
  const [listOpen, setListOpen] = useState(true);
  if (rows.length === 0) return <p className="text-body text-muted">{t("noData")}</p>;
  const select = (key: string) => {
    setPicked(key);
    setListOpen(false);
  };
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className={cn("flex min-w-0 flex-col gap-(--adm-inner)", !listOpen && "max-lg:hidden")}>
        <MeasureBars dimension={dimension} measure={measure} rows={rows} selected={row?.key ?? null} onSelect={select} />
        <AnalysisTable dimension={dimension} measure={measure} rows={rows} selected={row?.key ?? null} onSelect={select} />
      </div>
      <div className={cn("min-w-0", listOpen && "max-lg:hidden")}>{row && <GroupDetail dimension={dimension} measure={measure} row={row} onBack={() => setListOpen(true)} />}</div>
    </div>
  );
}

/**
 * One horizontal bar per group by the chosen measure (Regel „Admin-Diagramme“: violet outline over the light fill on the grey track; groups
 * with too few Houses in the comparison grey). Tempo: fewer days is better, so the bar is the fastest group's days ÷ this group's – the best
 * bar is the longest everywhere.
 */
function MeasureBars({ dimension, measure, rows, selected, onSelect }: { dimension: AnalysisDimension; measure: AnalysisMeasure; rows: readonly AnalysisRow[]; selected: string | null; onSelect: (key: string) => void }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const values = rows.map((r) => measureOf(r, measure)).filter((v): v is number => v !== null && v > 0);
  const top = measure === "speed" ? Math.min(...values) : Math.max(...values);
  const width = (v: number | null) => (v === null || v <= 0 || !Number.isFinite(top) ? 0 : measure === "speed" ? (top / v) * 100 : (v / top) * 100);
  return (
    <section aria-label={t("bars", { measure: t(`measure.${measure}`) })} data-analysis-bars>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => {
          const v = measureOf(r, measure);
          return (
            <li key={r.key}>
              <button type="button" onClick={() => onSelect(r.key)} aria-pressed={r.key === selected} className={cn("grid w-full grid-cols-[minmax(0,11rem)_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-md px-1 py-0.5 text-left transition-colors duration-150 hover:bg-(--adm-block-hover)", r.key === selected && "bg-(--adm-row-on)")}>
                <span className={cn("truncate text-small", r.tooFew ? "text-ink/40" : "text-ink")}>{label(dimension, r.key)}</span>
                <span aria-hidden className="relative block h-4 rounded-[5px] bg-adm-chart-track">
                  <span className={cn("absolute inset-y-0 left-0 rounded-[5px] border-[1.5px]", r.tooFew ? "border-adm-chart-compare bg-adm-chart-compare/20" : "border-adm-chart-primary bg-(--adm-chart-fill)")} style={{ width: `${width(v)}%` }} />
                </span>
                <span className={cn("text-right text-small tabular-nums", r.tooFew ? "text-ink/40" : "text-ink")}>{measureText(measure, v)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The slim table: Gruppe (with „Wen es anspricht“ for Länge, Crew and Host-Stufe) · the chosen measure · Houses. Groups under 10 Houses grey
 * with "zu wenig Daten", at the end. Its height fills the rest of the window – only the table scrolls.
 */
function AnalysisTable({ dimension, measure, rows, selected, onSelect }: { dimension: AnalysisDimension; measure: AnalysisMeasure; rows: readonly AnalysisRow[]; selected: string | null; onSelect: (key: string) => void }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measureBox = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined || window.innerWidth < 1024) return setHeight(null);
      setHeight(Math.max(160, Math.floor(window.innerHeight - (top + window.scrollY) - 48)));
    };
    measureBox();
    window.addEventListener("resize", measureBox);
    return () => window.removeEventListener("resize", measureBox);
  }, [rows.length]);
  const audience = AUDIENCE[dimension];
  const cell = "h-(--adm-row-h) px-3 text-right tabular-nums";
  return (
    <div ref={box} data-analysis-table className="min-w-0 overflow-auto overscroll-contain" style={height ? { maxHeight: height } : undefined}>
      <table className="w-full text-left text-body">
        <thead className="sticky top-0 z-1 bg-(--bg) text-small text-(--adm-label)">
          <tr className="border-b border-ink/8">
            <th className="px-3 pl-0 font-medium">{t("col.group")}</th>
            <th className="px-3 text-right font-medium">
              <span className="inline-flex items-center justify-end gap-1">
                {t(`measure.${measure}`)}
                <InfoTip text={t(`measure.info.${measure}`)} />
              </span>
            </th>
            <th className="px-3 pr-0 text-right font-medium">{t("col.houses")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} onClick={() => onSelect(row.key)} aria-selected={row.key === selected} className={cn("cursor-pointer border-b border-ink/8 transition-colors duration-150", row.key === selected ? "bg-(--adm-row-on)" : "hover:bg-ink/3", row.tooFew && "text-ink/40")}>
              <td className="h-(--adm-row-h) min-w-0 px-3 pl-0">
                <button type="button" onClick={() => onSelect(row.key)} className="block max-w-full text-left">
                  <span className={cn(row.tooFew ? undefined : "font-semibold text-ink", row.key === selected && "font-semibold text-(--adm-active)")}>{label(dimension, row.key)}</span>
                  {row.tooFew && <span className="ml-2 text-small">· {t("tooFew")}</span>}
                  {audience?.[row.key] && <span className="block truncate text-small text-muted">{audience[row.key]}</span>}
                </button>
              </td>
              <td className={cn(cell, !row.tooFew && "text-ink")}>{measureText(measure, measureOf(row, measure))}</td>
              <td className={cn(cell, "pr-0")}>{num(row.houses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A group's detail: every value – the four measures, € per booking, fill rate, Houses, its top topics and the guests' top countries. */
function GroupDetail({ dimension, measure, row, onBack }: { dimension: AnalysisDimension; measure: AnalysisMeasure; row: AnalysisRow; onBack: () => void }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const f = useFormat();
  const audience = AUDIENCE[dimension]?.[row.key];
  const facts = [
    ...ANALYSIS_MEASURES.map((m) => ({ key: m, label: t(`measure.${m}`), value: measureText(m, measureOf(row, m)), info: t(`measure.info.${m}`), on: m === measure })),
    { key: "perBooking", label: t("perBooking"), value: row.perBooking === null ? "–" : eur(row.perBooking), info: t("spectrum.info.perBooking"), on: false },
    { key: "fill", label: t("col.fill"), value: share(row.fillRate), info: null, on: false },
    { key: "houses", label: t("col.houses"), value: num(row.houses), info: null, on: false },
  ];
  const list = (items: readonly { key: string; count: number }[], name: (key: string) => string) => (items.length ? items.map((x) => name(x.key)).join(", ") : "–");
  return (
    <article data-analysis-detail>
      <BackToList onBack={onBack} />
      <p className="text-h3 text-ink">{label(dimension, row.key)}</p>
      {audience && <p className="mt-0.5 text-small text-muted">{audience}</p>}
      {row.tooFew && <p className="mt-1 text-small text-muted">{t("tooFew")}</p>}
      <dl className="mt-(--adm-inner) grid grid-cols-2 gap-x-6 gap-y-(--adm-inner)">
        {facts.map((fact) => (
          <div key={fact.key} className="min-w-0">
            <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
              {fact.label}
              {fact.info && <InfoTip text={fact.info} />}
            </dt>
            <dd className={cn("mt-1 text-h3 tabular-nums", fact.on ? "text-adm-chart-1" : "text-ink")}>{fact.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-(--adm-inner) flex flex-col gap-1 text-small">
        {dimension !== "topic" && (
          <div className="flex gap-2">
            <dt className="text-muted">{t("topTopics")}:</dt>
            <dd className="text-ink">{list(row.topTopics, (k) => f.vibe(k as Vibe))}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-muted">{t("topCountries")}:</dt>
          <dd className="text-ink">{list(row.topCountries, (k) => k)}</dd>
        </div>
      </dl>
    </article>
  );
}
