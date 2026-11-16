"use client";

// /admin/topics – Analyse (no visible title): where Simpulo earns the most. The click row: tabs Thema · Länge · Crew · Ort-Typ · Hub · Host-Stufe
// (Tiefe only with the depth choice), right Zeitraum ▾ and Sortieren ▾ (Wert pro Person/Jahr · Wachstum · Themen-Score). Under it the sweet
// spot as one line (the combination large, beside it value per person/year and repeat; "So messen wir das" in its ⓘ). Then a slim table –
// Gruppe · Wert pro Person/Jahr (with a bar) · Wiederkehrer · Tage bis voll · Houses –, groups under 10 Houses grey with "zu wenig Daten"; a
// click on a row opens its detail right with every other value. At 1470 × 814 the page fits; only the table scrolls. Every number from
// lib/admin/metrics.ts (analysisRows, analysisGrowth, sweetSpot, topicScores); the cohorts stay there (cohortReturns), not on this page.
import { useDepthChoice } from "@/config/platform";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import { useFormat } from "@/i18n/format";
import { analysisDimensions, analysisGrowth, analysisRows, sweetSpot, topicScores, type AnalysisDimension, type AnalysisPeriod, type AnalysisRow } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { days, eur, num, share } from "@/lib/i18n/adminFormat";
import type { ADMIN_DE } from "@/lib/i18n/admin.de";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminShell } from "./AdminShell";
import { AdminSort, AdminTabs, BackToList } from "./AdminLayout";
import { InfoTip } from "./AdminNumbers";

const PERIODS: readonly AnalysisPeriod[] = ["30d", "year", "all"];
type SortKey = "value" | "growth" | "score";

export function AdminAnalysis() {
  const t = useTranslations("admin.analysis");
  const tTopics = useTranslations("admin.topics");
  const inputs = useAdminInputs();
  const depthOn = useDepthChoice();
  // The tabs: the angles the prompt names (Tiefe only with the depth choice).
  const dims = analysisDimensions(depthOn).filter((d) => d !== "origin");
  const [dimension, setDimension] = useState<AnalysisDimension>("topic");
  const [period, setPeriod] = useState<AnalysisPeriod>("year");
  const [sort, setSort] = useState<SortKey>("value");
  const [selected, setSelected] = useState<string | null>(null);
  const shown: AnalysisDimension = (dims as readonly AnalysisDimension[]).includes(dimension) ? dimension : "topic";
  const rows = analysisRows(inputs, shown, period);
  const growth = analysisGrowth(inputs, shown, period);
  const scores = new Map(topicScores(inputs).map((s) => [s.vibe as string, s.score]));
  // Themen-Score exists per topic only; elsewhere the sort falls back to the value.
  const sortKey: SortKey = sort === "score" && shown !== "topic" ? "value" : sort;
  const valueOf = (r: AnalysisRow) => (sortKey === "growth" ? (growth.get(r.key) ?? -Infinity) : sortKey === "score" ? (scores.get(r.key) ?? -Infinity) : (r.valuePerPersonYear ?? -Infinity));
  const sorted = rows.toSorted((a, b) => Number(a.tooFew) - Number(b.tooFew) || valueOf(b) - valueOf(a));
  const row = sorted.find((r) => r.key === selected) ?? null;
  return (
    <AdminShell
      title={tTopics("title")}
      tabs={<AdminTabs label={t("dimension.label")} value={shown} onChange={(next) => (setDimension(next), setSelected(null))} tabs={dims.map((value) => ({ value, label: t(`dimension.${value}`) }))} />}
      aside={
        <>
          <AdminSort label={t("period.label")} value={period} onChange={setPeriod} options={PERIODS.map((value) => ({ value, label: t(`period.${value}`) }))} />
          <AdminSort label={t("sort.label")} value={sort} onChange={setSort} options={(["value", "growth", "score"] as const).map((value) => ({ value, label: t(`sort.${value}`) }))} />
        </>
      }
    >
      <SweetSpot spot={sweetSpot(inputs, period)} />
      <div className="mt-(--adm-section) grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AnalysisTable dimension={shown} rows={sorted} growth={growth} selected={row?.key ?? null} onSelect={setSelected} />
        <div className={cn("min-w-0", !row && "max-lg:hidden")}>
          {row ? <GroupDetail dimension={shown} row={row} growth={growth.get(row.key) ?? null} score={shown === "topic" ? (scores.get(row.key) ?? null) : null} onBack={() => setSelected(null)} /> : <p className="py-2 text-body text-muted">{t("pick")}</p>}
        </div>
      </div>
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

/** The sweet spot as one line: the combination large, beside it value per person/year (ocean) and repeat; "So messen wir das" in the ⓘ. */
function SweetSpot({ spot }: { spot: ReturnType<typeof sweetSpot> }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const how = (["p1", "p2", "p3", "p4", "p5", "p6", "p7"] as const).map((key) => t(`how.${key}`)).join(" ");
  return (
    <section className="flex flex-wrap items-end gap-x-10 gap-y-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
          {t("sweetSpot")}
          <InfoTip text={`${t("howTitle")}: ${how}`} />
        </p>
        <p className="mt-1 text-adm-figure text-ink">{spot ? [label("topic", spot.topic), t(`lengthShort.${spot.length}`), label("crew", spot.crew), label("tier", spot.tier)].join(" · ") : t("sweetNone")}</p>
      </div>
      {spot && (
        <dl className="flex gap-x-8">
          {[
            { label: t("sweetValue"), value: spot.row.valuePerPersonYear === null ? "–" : eur(spot.row.valuePerPersonYear), focus: true },
            { label: t("sweetRepeat"), value: share(spot.row.repeat12) },
          ].map((s, i) => (
            <div key={s.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-8")}>
              <dt className="text-eyebrow uppercase text-(--adm-label)">{s.label}</dt>
              <dd className={cn("mt-1 text-adm-figure tabular-nums", s.focus ? "text-adm-chart-1" : "text-ink")}>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * The slim table: Gruppe · Wert pro Person/Jahr (with a bar against the highest) · Wiederkehrer · Tage bis voll · Houses. Groups under 10
 * Houses grey with "zu wenig Daten". A click on a row opens its detail. Its height fills the rest of the window – only the table scrolls.
 */
function AnalysisTable({ dimension, rows, selected, onSelect }: { dimension: AnalysisDimension; rows: readonly AnalysisRow[]; growth: Map<string, number | null>; selected: string | null; onSelect: (key: string) => void }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined || window.innerWidth < 1024) return setHeight(null);
      setHeight(Math.max(240, Math.floor(window.innerHeight - (top + window.scrollY) - 48)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  if (rows.length === 0) return <p className="text-body text-muted">{t("noData")}</p>;
  const most = Math.max(1, ...rows.map((r) => r.valuePerPersonYear ?? 0));
  const cell = "h-(--adm-row-h) px-3 text-right tabular-nums";
  return (
    <div ref={box} data-analysis-table className="min-w-0 overflow-auto overscroll-contain" style={height ? { maxHeight: height } : undefined}>
      <table className="w-full text-left text-body">
        <thead className="sticky top-0 z-1 bg-(--bg) text-small text-(--adm-label)">
          <tr className="border-b border-ink/8">
            <th className="px-3 pl-0 font-medium">{t("col.group")}</th>
            <th className="w-[34%] px-3 font-medium">{t("col.value")}</th>
            <th className="px-3 text-right font-medium">{t("col.repeatShort")}</th>
            <th className="px-3 text-right font-medium">{t("col.daysToFull")}</th>
            <th className="px-3 pr-0 text-right font-medium">{t("col.houses")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} onClick={() => onSelect(row.key)} aria-selected={row.key === selected} className={cn("cursor-pointer border-b border-ink/8", row.tooFew && "text-ink/40")}>
              <td className="h-(--adm-row-h) px-3 pl-0">
                <button type="button" onClick={() => onSelect(row.key)} className="text-left">
                  <span className={cn(row.tooFew ? undefined : "font-semibold text-ink", row.key === selected && "text-(--adm-active) underline decoration-2 underline-offset-4")}>{label(dimension, row.key)}</span>
                  {row.tooFew && <span className="ml-2 text-small">· {t("tooFew")}</span>}
                </button>
              </td>
              <td className="h-(--adm-row-h) px-3">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="h-1.5 flex-1 rounded-full bg-ink/6">
                    <span className={cn("block h-full rounded-full", row.tooFew ? "bg-ink/20" : "bg-adm-chart-1")} style={{ width: `${((row.valuePerPersonYear ?? 0) / most) * 100}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{row.valuePerPersonYear === null ? "–" : eur(row.valuePerPersonYear)}</span>
                </span>
              </td>
              <td className={cell}>{share(row.repeat12)}</td>
              <td className={cell}>{row.daysToFull === null ? "–" : days(row.daysToFull)}</td>
              <td className={cn(cell, "pr-0")}>{num(row.houses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A group's detail: every other value – revenue per person, per House, fill rate (and growth, the topic score, "Mit dir wieder" for depth). */
function GroupDetail({ dimension, row, growth, score, onBack }: { dimension: AnalysisDimension; row: AnalysisRow; growth: number | null; score: number | null; onBack: () => void }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const facts = [
    { label: t("col.value"), value: row.valuePerPersonYear === null ? "–" : eur(row.valuePerPersonYear) },
    { label: t("col.perPerson"), value: row.revenuePerPerson === null ? "–" : eur(row.revenuePerPerson) },
    { label: t("col.perHouse"), value: row.revenuePerHouse === null ? "–" : eur(row.revenuePerHouse) },
    { label: t("col.fill"), value: share(row.fillRate) },
    { label: t("col.repeat"), value: share(row.repeat12) },
    { label: t("col.daysToFull"), value: row.daysToFull === null ? "–" : days(row.daysToFull) },
    { label: t("col.houses"), value: num(row.houses) },
    { label: t("sort.growth"), value: growth === null ? "–" : `${growth >= 0 ? "+" : "−"}${Math.round(Math.abs(growth) * 100)} %` },
    ...(score !== null ? [{ label: t("sort.score"), value: num(score) }] : []),
    ...(dimension === "depth" ? [{ label: t("col.again"), value: share(row.againMutual) }] : []),
  ];
  return (
    <article data-analysis-detail>
      <BackToList onBack={onBack} />
      <p className="text-h3 text-ink">{label(dimension, row.key)}</p>
      {row.tooFew && <p className="mt-1 text-small text-muted">{t("tooFew")}</p>}
      <dl className="mt-(--adm-inner) grid grid-cols-2 gap-x-6 gap-y-(--adm-inner)">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-eyebrow uppercase text-(--adm-label)">{f.label}</dt>
            <dd className="mt-1 text-h3 tabular-nums text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      {dimension === "depth" && <p className="mt-3 text-small text-muted">{t("againExample")}</p>}
    </article>
  );
}
