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
import { numberPool, TopicCards, TopicHeader } from "./AdminTopics";
import { AdminCapsuleView } from "./AdminCapsuleView";
import { useDepthChoice } from "@/config/platform";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useFormat } from "@/i18n/format";
import { ANALYSIS_DIMENSIONS, ANALYSIS_MEASURES, analysisDimensions, analysisRows, cockpit, measureOf, rankByMeasure, sweetSpot, valueCheck, type ValueCheck, type AnalysisDimension, type AnalysisMeasure, type AnalysisPeriod, type AnalysisRow } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { days, dec, eur, month as monthShort, monthLong, num, pct, share } from "@/lib/i18n/adminFormat";
import { VALUE_CHECK } from "@/config/policies";
import { ColumnChart, StatusDot } from "./AdminCharts";
import { TileValue } from "./AdminTiles";
import type { ADMIN_DE } from "@/lib/i18n/admin.de";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SPECTRUM_ROWS } from "@/config/spectrum";
import { AdminShell } from "./AdminShell";
import { AdminSort, AdminSubTabs, AdminTabs, BackToList } from "./AdminLayout";
import { routeTiles, withUnits } from "./tileRoutes";
import { setAdminSearch, useAdminTab } from "@/lib/admin/urlState";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";
import { InfoTip } from "./AdminNumbers";

/** Analyse's one window: the Houses that began in the last 12 months. */
const WINDOW: AnalysisPeriod = "12m";

type Tab = "overview" | "value" | AnalysisDimension;

/** „Wen es anspricht“ per group, for the angles the spectrum describes (Länge · Crew · Host-Stufe). */
const AUDIENCE: Partial<Record<AnalysisDimension, Record<string, string>>> = Object.fromEntries(
  SPECTRUM_ROWS.map((row) => [row.detail, Object.fromEntries(row.columns.map((c) => [c.key, c.audience]))]),
);

/** The capsules that hold several angles (as sub-tabs). */
const GROUPS = { place: ["category", "origin", "hub"], host: ["tier", "depth"] } as const satisfies Record<string, readonly AnalysisDimension[]>;
type Capsule = "overview" | "value" | "place" | "host" | Exclude<AnalysisDimension, (typeof GROUPS)[keyof typeof GROUPS][number]>;

export function AdminAnalysis() {
  const t = useTranslations("admin.analysis");
  const tTopics = useTranslations("admin.topics");
  const depthOn = useDepthChoice();
  const dims = analysisDimensions(depthOn).filter((d) => d !== "origin");
  // The capsule in ?tab= (pushed – back works); a tile's ?focus= that names a measure sets "Bewerten nach" (config/admin-tiles.ts).
  const { tab, focus, open: setTab } = useAdminTab<Tab>(["overview", "value", ...ANALYSIS_DIMENSIONS] as Tab[], "overview");
  const [chosenMeasure, setChosenMeasure] = useState<AnalysisMeasure>("value");
  const focusMeasure = (ANALYSIS_MEASURES as readonly string[]).includes(focus ?? "") ? (focus as AnalysisMeasure) : null;
  const measure = focusMeasure ?? chosenMeasure;
  const setMeasure = (next: AnalysisMeasure) => {
    setChosenMeasure(next);
    if (focusMeasure) setAdminSearch({ focus: null }, { replace: true });
  };
  const shown: Tab = tab === "overview" || tab === "value" || (dims as readonly string[]).includes(tab) ? tab : "overview";
  const tv = useTranslations("admin.analysis.value");
  // Six units at most (CLAUDE.md "Jeder Farbton nur einmal pro Seite"): Ort-Typ and Hub under "Ort", Stufe and Tiefe under "Host".
  const groupOf = (d: AnalysisDimension): Capsule => (Object.entries(GROUPS).find(([, list]) => (list as readonly string[]).includes(d))?.[0] as Capsule | undefined) ?? (d as Capsule);
  const capsules = [...new Set(dims.map(groupOf))];
  const capsule: Capsule = shown === "overview" || shown === "value" ? shown : groupOf(shown);
  const inDims = (d: AnalysisDimension) => (dims as readonly AnalysisDimension[]).includes(d);
  const subs: AnalysisDimension[] = capsule === "place" || capsule === "host" ? (GROUPS[capsule] as readonly AnalysisDimension[]).filter(inDims) : [];
  return (
    <AdminShell
      title={tTopics("title")}
      tabs={<TopicHeader page="analysis" title={tTopics("title")} />}
      aside={
        shown === "value" ? undefined : (
        <>
          <span data-tooltip-info={t("windowInfo")} className="mr-2 text-small text-muted">
            {t("window")}
            <span className="sr-only">. {t("windowInfo")}</span>
          </span>
          {/* "Bewerten nach: Wert ▾" – a setting, so a menu (CLAUDE.md "Einstellungen als Menü rechts"). */}
          <AdminSort<AnalysisMeasure> label={t("measure.label")} value={measure} onChange={setMeasure} options={ANALYSIS_MEASURES.map((value) => ({ value, label: t(`measure.${value}`) }))} />
        </>
        )
      }
    >
      {/* Every capsule but Überblick: its mini tiles on top, the chosen tile's detail under them (CLAUDE.md "Kapsel-Ansicht"). */}
      {shown === "overview" ? (
        <Overview dims={dims} measure={measure} onOpen={setTab} />
      ) : (
        <Overview dims={dims} measure={measure} onOpen={setTab} render={(tiles) => <AdminCapsuleView page="analysis" capsule={capsule} tiles={tiles} fallback={shown === "value" ? <ValueCheckView /> : <Detail key={shown} dimension={shown} measure={measure} />} />} />
      )}
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
function Overview({ dims, measure, onOpen, render }: { dims: readonly AnalysisDimension[]; measure: AnalysisMeasure; onOpen: (tab: Exclude<Tab, "overview">) => void ; /** A capsule's view of these tiles (AdminCapsuleView) instead of the board */ render?: (tiles: TileSpec[]) => ReactNode }) {
  const t = useTranslations("admin.analysis");
  const tt = useTranslations("admin.pageTiles.analysis");
  const tc = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const label = useGroupLabel();
  const spot = sweetSpot(inputs, WINDOW, measure);
  const rowsOf = (dim: AnalysisDimension) => analysisRows(inputs, dim, WINDOW);
  const enough = (dim: AnalysisDimension, m: AnalysisMeasure) => rankByMeasure(rowsOf(dim), m).filter((r) => !r.tooFew && measureOf(r, m) !== null);
  const month = cockpit(inputs, "month");
  const perHouse = month.areas.find((a) => a.number.key === "perHouse")!.number;
  const fullMonth = month.areas.find((a) => a.key === "supply")!.number;
  const vc = valueCheck(inputs);
  const tv = useTranslations("admin.analysis.value");
  // More detail lines where the tile has room (CLAUDE.md "fester Kachel-Bauplan"): a group's other numbers, most telling first; empty ones out.
  const keep = (...lines: (string | null | undefined | false)[]) => lines.filter((l): l is string => Boolean(l) && !/–$/.test(l as string));
  const facts = (row: AnalysisRow, ...skips: AnalysisMeasure[]) => {
    const skip = (m: AnalysisMeasure) => skips.includes(m);
    return [
    !skip("value") && row.valuePerPersonYear !== null ? tt("d.valueYear", { value: eur(row.valuePerPersonYear) }) : null,
    row.fillRate !== null ? tt("d.fill", { fill: share(row.fillRate) }) : null,
    !skip("speed") && row.daysToFull !== null ? tt("d.toFull", { days: num(Math.round(row.daysToFull)) }) : null,
    !skip("repeat") && row.repeat12 !== null ? tt("d.repeat", { repeat: share(row.repeat12) }) : null,
    row.perBooking !== null ? tt("d.perBooking", { value: eur(row.perBooking) }) : null,
    ];
  };
  const vcLine = (c: ValueCheck) => tt(`d.vc.${c.key}`, { value: c.key === "perFee" ? dec(c.value) : pct(c.value), mark: c.status === "good" ? "✓" : "!" });
  const tiles: TileSpec[] = [
    // Wert-Check first: "3 von 3 im grünen Bereich" – the warning in red when revenue rises while a value falls.
    {
      key: "valueCheck",
      label: tv("tile"),
      info: tv("tileInfo"),
      value: vc ? tv("tileValue", { green: vc.green, total: vc.checks.length }) : "–",
      details: vc ? keep(vc.warning ? tv("warning") : tv("tileGreen"), ...vc.checks.map(vcLine)) : [tv("noData")],
      onOpen: () => onOpen("value"),
    },
    {
      key: "sweetSpot",
      label: tt("sweetSpot.label"),
      info: tt("sweetSpot.info"),
      value: spot ? [label("topic", spot.topic), t(`lengthShort.${spot.length}`), label("crew", spot.crew), label("tier", spot.tier)].join(" · ") : tt("none"),
      small: true,
      details: spot
        ? keep(tt("sweetLine", { main: measureText(measure, measureOf(spot.row, measure)), repeat: share(spot.row.repeat12) }), tt("d.houses", { houses: num(spot.row.houses) }), ...facts(spot.row, measure, "repeat"))
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
          ? keep(
              tt("d.bestValue", { value: measureText(measure, measureOf(best, measure)), houses: num(best.houses) }),
              worst ? tt("d.worst", { name: label(dim, worst.key), value: measureText(measure, measureOf(worst, measure)) }) : tt("d.onlyOne"),
              ...facts(best, measure),
              tt("d.groups", { count: num(rowsOf(dim).length), few: num(rowsOf(dim).filter((r) => r.tooFew).length) }),
            )
          : [tt("d.groups", { count: num(rowsOf(dim).length), few: num(rowsOf(dim).filter((r) => r.tooFew).length) })],
        onOpen: () => onOpen(dim),
      };
    }),
    // The other three measures (the chosen one is already the Thema tile).
    ...ANALYSIS_MEASURES.filter((m) => m !== measure).map((m): TileSpec => {
      const [best, second, third] = enough("topic", m);
      return {
        key: `leader-${m}`,
        label: tt(`leader.${m}.label`),
        info: tt(`leader.${m}.info`),
        value: best ? label("topic", best.key) : tt("none"),
        small: true,
        details: best
          ? keep(
              tt("d.leaderValue", { value: measureText(m, measureOf(best, m)), houses: num(best.houses) }),
              second ? tt("d.second", { name: label("topic", second.key), value: measureText(m, measureOf(second, m)) }) : tt("d.onlyOne"),
              third ? tt("d.third", { name: label("topic", third.key), value: measureText(m, measureOf(third, m)) }) : null,
              ...facts(best, m),
            )
          : [tt("none")],
        onOpen: () => onOpen("topic"),
      };
    }),
    {
      key: "perHouse",
      label: tt("perHouse.label"),
      info: `${tt("perHouse.info")} (${tc("against.month", { month: monthLong(cockpit(inputs, "month").compareDate) })})`,
      value: perHouse.value === null ? tt("none") : eur(perHouse.value),
      change: perHouse.change,
      details: keep(
        tt("d.fullMonth", { count: fullMonth.value === null ? "–" : num(fullMonth.value) }),
        tt("d.profitMonth", { profit: eur(month.profit.current) }),
        perHouse.value !== null && perHouse.change ? tt("d.monthBefore", { value: eur(perHouse.value - perHouse.change.delta) }) : null,
        // No money targets in the admin (CLAUDE.md "Keine Geldziele"): "Pro vollem House" shows its number and change only.
        month.nights.current ? tt("d.nightsMonth", { nights: num(month.nights.current) }) : null,
      ),
      onOpen: () => onOpen("topic"),
    },
  ];
  // The page's numbers (CLAUDE.md "Karten-Inhalte als Konfiguration"): which of them a card shows is config/admin/cards/analysis.ts.
  const ts = useTranslations("admin.topicCards.sub");
  // Per angle: the best group's value, the weakest group, how many groups.
  const angleNumbers = Object.fromEntries(
    dims.flatMap((dim) => {
      const ranked = enough(dim, measure);
      const best = ranked[0];
      const worst = ranked.length >= 2 ? ranked.at(-1)! : null;
      return [
        [`${dim}.bestValue`, best ? { label: ts("bestValue"), value: measureText(measure, measureOf(best, measure)) } : null],
        [`${dim}.weakest`, worst ? { label: ts("weakest"), value: label(dim, worst.key) } : null],
        [`${dim}.groups`, { label: ts("groups"), value: num(rowsOf(dim).length) }],
      ];
    }),
  );
  const pool = numberPool(tiles, angleNumbers);
  if (render) return render(tiles);
  return <TopicCards page="analysis" pool={pool} />;
}

// ── Wert-Check ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Analyse › Wert-Check (Wert statt Abschöpfen, CLAUDE.md): three cards – Entsteht Verbindung? · Bleiben Hosts freiwillig? · Wächst der Wert
 * schneller als die Gebühr? – each with its number, the last 6 full months as bars (only bars) and a traffic light; red with "Umsatz steigt,
 * Wert sinkt – prüfen." when revenue rose while that value fell (then also a task in Aufgaben, kind Geld). Below, small, the three
 * principles. One screen at 1440 × 900. Numbers from lib/admin/metrics.ts valueCheck, thresholds config/policies.ts VALUE_CHECK.
 */
function ValueCheckView() {
  const tv = useTranslations("admin.analysis.value");
  const inputs = useAdminInputs();
  const vc = valueCheck(inputs);
  if (!vc) return <p className="text-body text-muted">{tv("noData")}</p>;
  const main = (c: ValueCheck) => (c.key === "perFee" ? dec(c.value) : pct(c.value));
  const second = (c: ValueCheck) =>
    c.key === "connection" ? tv("check.connection.second", { value: pct(c.second ?? 0) }) : c.key === "hosts" ? tv("check.hosts.second", { months: VALUE_CHECK.secondHouseWithinMonths }) : tv("check.perFee.second", { value: dec(c.second ?? 0) });
  const info = (c: ValueCheck) =>
    c.key === "connection"
      ? tv("check.connection.info", { good: VALUE_CHECK.connectionRate.good, touch: VALUE_CHECK.stillInTouch.good })
      : c.key === "hosts"
        ? tv("check.hosts.info", { months: VALUE_CHECK.secondHouseWithinMonths, good: VALUE_CHECK.secondHouse.good })
        : tv("check.perFee.info", { months: VALUE_CHECK.perHundred.trendMonths, drop: Math.abs(VALUE_CHECK.perHundred.good) });
  return (
    <div data-value-check className="flex flex-col gap-(--adm-inner)">
      <div className="grid gap-(--adm-grid-gap) lg:grid-cols-3">
        {vc.checks.map((c) => (
          <section key={c.key} aria-label={tv(`check.${c.key}.title`)} data-value-card={c.key} data-focus-key={c.key} data-status={c.status} className={cn("adm-tile flex min-w-0 flex-col rounded-xl border p-5", c.status === "critical" && "border-adm-critical/60")}>
            <h2 className="flex items-center gap-1.5 text-body font-semibold text-ink">
              {tv(`check.${c.key}.title`)}
              <InfoTip text={info(c)} />
            </h2>
            <p className="mt-2 flex items-center gap-2 text-small font-semibold text-ink">
              <StatusDot status={c.status} />
              {tv(`status.${c.status}`)}
            </p>
            <div className="mt-3 flex min-w-0 items-baseline gap-2">
              <TileValue value={main(c)} />
            </div>
            <p className="text-small text-muted">{tv(`check.${c.key}.value`)}</p>
            <p className="mt-1 truncate text-small text-ink">{second(c)}</p>
            <div className="mt-4">
              <ColumnChart data={c.bars.map((b) => ({ label: monthShort(b.month).replace(".", ""), value: b.value, current: null }))} unit={c.key === "perFee" ? "" : "%"} height={170} label={tv("bars", { months: VALUE_CHECK.months })} />
            </div>
            <p className="mt-1 text-small text-muted">{tv("bars", { months: VALUE_CHECK.months })}</p>
            {c.falling && (
              <p role="alert" data-value-warning className="mt-2 flex items-start gap-2 text-body font-semibold text-adm-critical" data-tooltip-info={tv("warningInfo", { months: VALUE_CHECK.risingMonths })}>
                {tv("warning")}
              </p>
            )}
          </section>
        ))}
      </div>
      {/* The three principles, small. */}
      <p data-value-principles className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span className="font-semibold text-(--adm-label)">{tv("principles")}:</span>
        {(["measure", "earn", "free"] as const).map((key, i) => (
          <span key={key}>
            {i > 0 && <span aria-hidden className="mr-3">·</span>}
            {tv(`principle.${key}`)}
          </span>
        ))}
      </p>
    </div>
  );
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
