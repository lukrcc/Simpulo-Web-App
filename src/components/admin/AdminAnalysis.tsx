"use client";

// /admin/topics – "Analyse": where Simpulo earns the most. Two views: "Geld & Retention" (by angle: topic · length · crew size · kind of
// place · hub · host tier) and the former "Themen-Score". Every number from lib/admin/metrics.ts (analysisRows, sweetSpot, whoBringsMoney),
// a period switch (30 Tage · Dieses Jahr · Gesamt). No cards: the sweet spot (the page's one ocean focus), the table and "Wer bringt das
// Geld" stand free on the page, split by space and fine lines; groups under 10 Houses are grey ("zu wenig Daten").
import { useDepthChoice } from "@/config/platform";
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useFormat } from "@/i18n/format";
import { analysisDimensions, analysisRows, cohortReturns, sweetSpot, whoBringsMoney, windowsPerPlace, type AnalysisDimension, type AnalysisPeriod, type AnalysisRow } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { days, dec, eur, month as monthLabel, num, pct, share } from "@/lib/i18n/adminFormat";
import type { ADMIN_DE } from "@/lib/i18n/admin.de";
import { findUser, useStore } from "@/lib/store";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ThemeScore } from "./AdminDashboard";
import { AdminSection, AdminShell } from "./AdminShell";
import { LinesChart } from "./AdminCharts";
import { InfoTip } from "./AdminNumbers";

const PERIODS: readonly AnalysisPeriod[] = ["30d", "year", "all"];
type SortKey = Exclude<keyof AnalysisRow, "key" | "tooFew">;
const COLUMNS: readonly { key: SortKey; label: keyof typeof ADMIN_DE.analysis.col; format: (row: AnalysisRow) => string }[] = [
  { key: "revenuePerPerson", label: "perPerson", format: (r) => (r.revenuePerPerson === null ? "–" : eur(r.revenuePerPerson)) },
  { key: "revenuePerHouse", label: "perHouse", format: (r) => (r.revenuePerHouse === null ? "–" : eur(r.revenuePerHouse)) },
  { key: "daysToFull", label: "daysToFull", format: (r) => (r.daysToFull === null ? "–" : days(r.daysToFull)) },
  { key: "fillRate", label: "fill", format: (r) => share(r.fillRate) },
  { key: "repeat12", label: "repeat", format: (r) => share(r.repeat12) },
  { key: "valuePerPersonYear", label: "value", format: (r) => (r.valuePerPersonYear === null ? "–" : eur(r.valuePerPersonYear)) },
  { key: "houses", label: "houses", format: (r) => num(r.houses) },
];
/** Tiefe (social depth): how each level fills, comes back and wants to live together again – Füllrate, Tage bis voll, „Mit dir wieder“, Wiederkehrer. */
const DEPTH_COLUMNS: typeof COLUMNS = [
  { key: "fillRate", label: "fill", format: (r) => share(r.fillRate) },
  { key: "daysToFull", label: "daysToFull", format: (r) => (r.daysToFull === null ? "–" : days(r.daysToFull)) },
  { key: "againMutual", label: "again", format: (r) => share(r.againMutual) },
  { key: "repeat12", label: "repeat", format: (r) => share(r.repeat12) },
  { key: "houses", label: "houses", format: (r) => num(r.houses) },
];

export function AdminAnalysis() {
  const t = useTranslations("admin.analysis");
  const tTopics = useTranslations("admin.topics");
  const [view, setView] = useState<"money" | "score">("money");
  const [period, setPeriod] = useState<AnalysisPeriod>("year");
  return (
    <AdminShell
      title={tTopics("title")}
      aside={view === "money" && <CapsuleGroup size="sm" label={t("period.label")} value={period} onChange={setPeriod} options={PERIODS.map((value) => ({ value, content: t(`period.${value}`) }))} />}
    >
      <CapsuleGroup label={t("views.money")} value={view} onChange={setView} className="mb-10 w-fit" options={(["money", "score"] as const).map((value) => ({ value, content: t(`views.${value}`) }))} />
      {view === "money" ? <MoneyView period={period} /> : <ThemeScore />}
    </AdminShell>
  );
}

function MoneyView({ period }: { period: AnalysisPeriod }) {
  const t = useTranslations("admin.analysis");
  const inputs = useAdminInputs();
  const [dimension, setDimension] = useState<AnalysisDimension>("topic");
  // "Tiefe" only while the depth choice is on (config/platform.ts).
  const depthOn = useDepthChoice();
  const shown = depthOn || dimension !== "depth" ? dimension : "topic";
  return (
    <>
      <HowWeMeasure />
      <SweetSpot spot={sweetSpot(inputs, period)} />
      <AdminSection title={t("dimension.label")} className="mt-14">
        <ScrollRow label={t("dimension.label")} className="mb-6 max-w-full">
          <CapsuleGroup size="sm" label={t("dimension.label")} value={shown} onChange={setDimension} options={analysisDimensions(depthOn).map((value) => ({ value, content: t(`dimension.${value}`) }))} />
        </ScrollRow>
        <AnalysisTable dimension={shown} rows={analysisRows(inputs, shown, period)} />
        {shown === "depth" && <p className="mt-3 text-small text-muted">{t("againExample")}</p>}
        {shown === "origin" && <WindowsPerPlace stats={windowsPerPlace(inputs, period)} />}
      </AdminSection>
      <WhoBringsMoney money={whoBringsMoney(inputs, period)} />
      <Cohorts />
    </>
  );
}

/** ⓘ "So messen wir das": the formulas in plain words, and the note on small numbers – folded until opened. */
function HowWeMeasure() {
  const t = useTranslations("admin.analysis");
  const keys = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"] as const;
  return (
    <details className="group mb-10 max-w-3xl">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-small font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <Info aria-hidden className="size-4 text-muted" />
        {t("howTitle")}
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-small text-muted">
        {keys.map((key) => (
          <li key={key}>{t(`how.${key}`)}</li>
        ))}
      </ul>
    </details>
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

/** The sweet spot: the combination with the highest value per person per year (10+ Houses) – one line, four numbers, the value in ocean. */
function SweetSpot({ spot }: { spot: ReturnType<typeof sweetSpot> }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  return (
    <section>
      <h2 className="text-eyebrow uppercase text-muted">{t("sweetSpot")}</h2>
      {spot ? (
        <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-5">
          <p className="min-w-0 text-h2 text-ink">
            {[label("topic", spot.topic), t(`lengthShort.${spot.length}`), label("crew", spot.crew), label("tier", spot.tier)].join(" · ")}
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { label: t("sweetValue"), value: spot.row.valuePerPersonYear === null ? "–" : eur(spot.row.valuePerPersonYear), focus: true },
              { label: t("sweetPerPerson"), value: spot.row.revenuePerPerson === null ? "–" : eur(spot.row.revenuePerPerson) },
              { label: t("sweetRepeat"), value: share(spot.row.repeat12) },
              { label: t("sweetHouses"), value: num(spot.row.houses) },
            ].map((s, i) => (
              <div key={s.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-8")}>
                <dt className="text-small text-muted">{s.label}</dt>
                <dd className={cn("mt-1 tabular-nums", s.focus ? "text-h1 text-adm-chart-1" : "text-h2 text-ink")}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="mt-3 text-body text-muted">{t("sweetNone")}</p>
      )}
    </section>
  );
}

/** The table by angle: sortable (a click on a column head; again turns the order round); groups under 10 Houses grey with "zu wenig Daten". */
function AnalysisTable({ dimension, rows }: { dimension: AnalysisDimension; rows: readonly AnalysisRow[] }) {
  const t = useTranslations("admin.analysis");
  const label = useGroupLabel();
  const columns = dimension === "depth" ? DEPTH_COLUMNS : COLUMNS;
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "valuePerPersonYear", desc: true });
  if (rows.length === 0) return <p className="text-body text-muted">{t("noData")}</p>;
  const sorted = rows.toSorted((a, b) => {
    const x = a[sort.key] ?? -Infinity;
    const y = b[sort.key] ?? -Infinity;
    return sort.desc ? y - x : x - y;
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-body">
        <thead className="text-small text-muted">
          <tr className="border-b border-ink/8">
            <th className="py-3 pr-4 font-medium">{t("col.group")}</th>
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} className="py-3 pr-4 text-right font-medium last:pr-0" aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}>
                  <button
                    type="button"
                    onClick={() => setSort((s) => (s.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: true }))}
                    aria-label={t("sortBy", { column: t(`col.${c.label}`) })}
                    className={cn("inline-flex items-center gap-1 hover:text-ink", active && "font-semibold text-ink")}
                  >
                    {t(`col.${c.label}`)}
                    {active && (sort.desc ? <ArrowDown aria-hidden className="size-3.5" /> : <ArrowUp aria-hidden className="size-3.5" />)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key} className={cn("border-b border-ink/8", row.tooFew && "text-ink/40")}>
              <td className="py-3 pr-4">
                <span className={row.tooFew ? undefined : "text-ink"}>{label(dimension, row.key)}</span>
                {row.tooFew && <span className="ml-2 text-small">· {t("tooFew")}</span>}
              </td>
              {columns.map((c) => (
                <td key={c.key} className={cn("py-3 pr-4 text-right tabular-nums last:pr-0", !row.tooFew && (c.key === "valuePerPersonYear" ? "font-semibold text-ink" : "text-ink/80"))}>
                  {c.format(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Ort-Herkunft › Fenster pro Ort: how many own places had windows in the period, the windows, the average per place (the number in ink, no
 * focus – the sweet spot keeps the page's one ocean) and how many places had 1 · 2 · 3+ windows, as a small table free on the page.
 */
function WindowsPerPlace({ stats }: { stats: ReturnType<typeof windowsPerPlace> }) {
  const t = useTranslations("admin.analysis.origin");
  return (
    <div className="mt-8">
      <h3 className="flex items-center gap-2 text-small font-semibold text-ink">
        {t("windowsTitle")}
        <InfoTip text={t("windowsInfo")} />
      </h3>
      {stats.places === 0 ? (
        <p className="mt-2 text-body text-muted">{t("none")}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-x-12 gap-y-6">
          <dl className="flex gap-8">
            {[
              { label: t("places"), value: num(stats.places) },
              { label: t("windows"), value: num(stats.windows) },
              { label: t("average"), value: stats.average === null ? "–" : dec(Math.round(stats.average * 10) / 10) },
            ].map((s, i) => (
              <div key={s.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-8")}>
                <dt className="text-small text-muted">{s.label}</dt>
                <dd className="mt-1 text-h2 tabular-nums text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
          <table className="min-w-60 text-left text-body">
            <tbody>
              {stats.buckets.map((b) => (
                <tr key={b.key} className="border-b border-ink/8">
                  <th scope="row" className="py-2 pr-6 font-normal text-ink">{t(`bucket.${b.key}`)}</th>
                  <td className="py-2 text-right tabular-nums text-ink/80">{num(b.places)} {t("places")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** "Wer bringt das Geld": service fee vs host fee as one split line, value per guest and per host per year, the top 10 hosts. */
function WhoBringsMoney({ money }: { money: ReturnType<typeof whoBringsMoney> }) {
  const t = useTranslations("admin.analysis");
  const store = useStore();
  const label = useGroupLabel();
  return (
    <AdminSection title={t("money")} className="mt-16">
      <div className="grid gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 lg:pr-10">
          <div className="flex justify-between gap-4 text-small text-muted">
            <span>
              {t("serviceFee")} · <span className="font-semibold text-ink">{share(money.serviceShare)}</span>
            </span>
            <span>
              {t("hostFee")} · <span className="font-semibold text-ink">{share(money.hostFeeShare)}</span>
            </span>
          </div>
          <div aria-hidden className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full">
            <span className="h-full rounded-l-full bg-ink/70" style={{ width: `${(money.serviceShare ?? 0) * 100}%` }} />
            <span className="h-full flex-1 rounded-r-full bg-ink/20" />
          </div>
          <dl className="mt-8 grid grid-cols-2">
            {[
              { label: t("perGuest"), value: money.valuePerGuestYear === null ? "–" : eur(money.valuePerGuestYear) },
              { label: t("perHost"), value: money.valuePerHostYear === null ? "–" : eur(money.valuePerHostYear) },
            ].map((s, i) => (
              <div key={s.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-6")}>
                <dt className="text-small text-muted">{s.label}</dt>
                <dd className="mt-1 text-h2 tabular-nums text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="min-w-0 lg:border-l lg:border-ink/8 lg:pl-10">
          <p className="text-small text-muted">{t("topHosts")}</p>
          {money.topHosts.length === 0 ? (
            <p className="mt-3 text-body text-muted">{t("noData")}</p>
          ) : (
            <ol className="mt-3 divide-y divide-ink/8 border-y border-ink/8">
              {money.topHosts.map((host, i) => {
                const user = findUser(store, host.hostId);
                return (
                  <li key={host.hostId} className="flex items-center gap-3 py-2.5 text-body">
                    <span className="w-5 shrink-0 text-small tabular-nums text-muted">{i + 1}</span>
                    {user && <Avatar user={user} size="sm" />}
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {user?.name ?? host.hostId}
                      <span className="text-small text-muted">
                        {" "}
                        · {label("tier", host.tier)} · {t("hostHouses", { count: host.houses })}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">{t("perYear", { value: eur(host.valuePerYear) })}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </AdminSection>
  );
}

/**
 * Kohorten der Wiederkehrer: per start month (a guest's first stay) the share who booked again within 3, 6 and 12 months, as three lines
 * (chart-1 to chart-3) and the numbers below; months whose time hasn't passed yet stay open (lib/admin/metrics.ts cohortReturns).
 */
function Cohorts() {
  const t = useTranslations("admin.analysis.cohorts");
  const rows = cohortReturns(useAdminInputs());
  const lines = [
    { key: "r3", label: t("r3"), color: "var(--adm-chart-1)", format: (v: number) => pct(v) },
    { key: "r6", label: t("r6"), color: "var(--adm-chart-2)", format: (v: number) => pct(v) },
    { key: "r12", label: t("r12"), color: "var(--adm-chart-3)", format: (v: number) => pct(v) },
  ] as const;
  const percent = (v: number | null) => (v === null ? null : Math.round(v * 100));
  const data = rows.map((r) => ({ label: `${monthLabel(r.month)} ${r.month.slice(2, 4)}`, r3: percent(r.r3), r6: percent(r.r6), r12: percent(r.r12) }));
  return (
    <AdminSection title={t("title")} className="mt-16" aside={<span className="text-small text-muted">{t("note")}</span>}>
      <LinesChart data={data} series={lines} label={t("title")} yFormat={(v) => pct(v)} height={260} />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-small tabular-nums">
          <thead>
            <tr className="border-b border-ink/8 text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">{t("month")}</th>
              {rows.map((r) => (
                <th key={r.month} scope="col" className="py-2 pr-3 text-right font-normal">
                  {monthLabel(r.month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink/8">
              <th scope="row" className="py-2 pr-4 font-normal text-muted">{t("size")}</th>
              {rows.map((r) => (
                <td key={r.month} className="py-2 pr-3 text-right text-muted">{num(r.size)}</td>
              ))}
            </tr>
            {lines.map((l) => (
              <tr key={l.key} className="border-b border-ink/8">
                <th scope="row" className="py-2 pr-4 font-normal text-ink">{l.label}</th>
                {rows.map((r) => (
                  <td key={r.month} className="py-2 pr-3 text-right text-ink">{r[l.key] === null ? <span className="text-ink/30">–</span> : pct(Math.round(r[l.key]! * 100))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminSection>
  );
}
