"use client";

// Admin › Market Cap (/admin/market-cap, the button top right in the overview; marked under Planen › Finanzierung in the side list): a rough
// value of Simpulo on one screen (1440 × 900 without scrolling), in Planen's orange. The estimate large (the middle of the revenue method),
// the span over all methods and its change against a month ago; three cards with their sums in sight (base × multiple band = result);
// what drives the value (growth, repeat guests, take rate, open Houses – each with its change); the estimate per month as bars (this month
// dashed); "Grobe Schätzung, kein Gutachten." Independent of the admin's period. Every number from lib/admin/metrics.ts marketCap, the
// multiples from config/valuation.ts.
import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { marketCap, type Change } from "@/lib/admin/metrics";
import { niceScale } from "@/lib/admin/scale";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { compact, dec, eur, month, num, pct, signed, signedPct } from "@/lib/i18n/adminFormat";
import { cn } from "@/lib/utils";
import { adminButtonStyles } from "./AdminButton";
import { ColumnChart } from "./AdminCharts";
import { InfoTip } from "./AdminNumbers";
import { AdminShell } from "./AdminShell";

/** Room under the chart: its axis' second line and the note. */
const BOTTOM = 68;

/** `embedded`: as the capsule Finanzierung › Market Cap (no shell of its own, no close button); otherwise the old standalone page. */
export function AdminMarketCap({ embedded = false }: { embedded?: boolean } = {}) {
  const t = useTranslations("admin.marketCap");
  const inputs = useAdminInputs();
  const mc = useMemo(() => marketCap(inputs), [inputs]);
  const chartBox = useRef<HTMLDivElement>(null);
  const [chartH, setChartH] = useState(200);
  useLayoutEffect(() => {
    const measure = () => {
      const top = chartBox.current?.getBoundingClientRect().top;
      if (top !== undefined) setChartH(Math.max(140, Math.floor(window.innerHeight - (top + window.scrollY) - BOTTOM)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const label = "text-eyebrow uppercase text-(--adm-label)";
  const data = mc.months.map((m) => ({ label: month(m.month).replace(".", ""), value: m.value, current: m.current ? ("running" as const) : null }));
  // The methods on one axis: from 0 to a round top over the largest result; the median as a dashed line.
  const scale = niceScale(mc.methods.map((m) => m.result.high));
  const at = (v: number) => `${(Math.max(0, v) / scale.max) * 100}%`;
  const basis = mc.extrapolated ? t("extrapolated") : t("base12");
  const step = t(`step.${String(mc.step) as "0" | "1" | "2"}`);
  const drivers = [
    { key: "growth", value: mc.drivers.growth === null ? "–" : `${dec(mc.drivers.growth)} %`, change: mc.driverChanges.growth },
    { key: "repeat", value: mc.drivers.repeat === null ? "–" : pct(mc.drivers.repeat), change: mc.driverChanges.repeat },
    { key: "takeRate", value: mc.drivers.takeRate === null ? "–" : `${dec(mc.drivers.takeRate)} %`, change: mc.driverChanges.takeRate },
    { key: "openHouses", value: num(mc.openHouses), change: mc.driverChanges.openHouses },
  ] as const;

  const body = (
    <>
      {/* Two colours only (CLAUDE.md "Market Cap"): Planen's orange for every datum (spans, bars), the rest neutral; no frames – fine lines. */}
      <div data-market-cap className="adm-market-cap flex flex-col">
        {/* Head: the median large; right, small, the mean and the span, and the change against a month ago (neutral). */}
        <section aria-label={t("estimate")} className="flex flex-wrap items-end justify-between gap-x-10 gap-y-2 pb-4">
          <div className="min-w-0">
            <p className={cn("flex items-center gap-1", label)}>
              {t("estimate")}
              <InfoTip text={t("estimateInfo")} />
            </p>
            <p className="mt-1 text-display tabular-nums text-ink">{eur(mc.estimate)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 pb-1 text-small text-muted">
            <span className="tabular-nums">{t("meanSpan", { mean: eur(mc.mean), low: eur(mc.span.low), high: eur(mc.span.high) })}</span>
            <NeutralChange change={mc.change} against={t("vsMonth")} />
          </div>
        </section>

        {/* The three methods as ONE chart: a span per method on a shared axis, the median dashed. */}
        <section aria-label={t("methodsTitle")} data-market-cap-methods className="border-t border-(--line) pt-6 pb-3">
          <div className="flex gap-4">
            {/* Labels, one per row. */}
            <div className="flex w-[min(200px,35%)] shrink-0 flex-col gap-2.5">
              {mc.methods.map((m) => (
                <span key={m.method} className="flex h-6 min-w-0 items-center gap-1 text-small text-ink">
                  <span className="truncate">{t(`methodRow.${m.method}`, { multiple: `${dec(m.multiple.low)}–${dec(m.multiple.high)}` })}</span>
                  <InfoTip text={t(`methodInfo.${m.method}`)} />
                </span>
              ))}
            </div>
            {/* The shared axis: the spans, the median dashed across all rows, the ticks under them. */}
            <div className="relative min-w-0 flex-1">
              <div className="relative flex flex-col gap-2.5">
                {mc.methods.map((m) => (
                  <div key={m.method} className="relative h-6">
                    <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-(--line)" />
                    <span
                      data-market-cap-method={m.method}
                      data-tooltip-title={t(`methods.${m.method}`)}
                      data-tooltip-info={t("methodTip", { base: eur(m.base), low: dec(m.multiple.low), high: dec(m.multiple.high), resultLow: eur(m.result.low), resultHigh: eur(m.result.high), basis, step })}
                      className="adm-mc-span absolute top-0.5 bottom-0.5 rounded-full border"
                      style={{ left: at(m.result.low), width: `calc(${at(m.result.high)} - ${at(m.result.low)})`, minWidth: 6 }}
                    />
                  </div>
                ))}
                <span aria-hidden data-market-cap-median className="pointer-events-none absolute -top-1 -bottom-1 border-l border-dashed border-ink/55" style={{ left: at(mc.estimate) }}>
                  <span className="absolute -top-4 left-1 text-small whitespace-nowrap text-muted">{t("median")}</span>
                </span>
              </div>
              <div className="relative mt-1.5 h-5 text-small text-muted tabular-nums">
                {scale.ticks.map((tick, i) => (
                  <span key={tick} className={cn("absolute whitespace-nowrap", i === 0 ? "" : i === scale.ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: at(tick) }}>
                    {tick === 0 ? "0" : tick >= 1_000_000 ? `${compact(tick)} €` : t("thousand", { value: num(tick / 1000) })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* The drivers as one line, each with its ⓘ; changes as ▲/▼ in the secondary colour. */}
        <section aria-label={t("drivers")} data-market-cap-drivers className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-(--line) py-3 text-small text-ink">
          {drivers.map((d, i) => (
            <span key={d.key} className="inline-flex items-center gap-1">
              {i > 0 && <span aria-hidden className="mr-1 text-muted">·</span>}
              {t(`driverLine.${d.key}`, { value: d.value })}
              <NeutralArrow change={d.change} />
              <InfoTip text={t(`driverInfo.${d.key}`)} />
            </span>
          ))}
        </section>

        {/* The value per month: bars in orange, this month dashed. */}
        <section aria-label={t("chart")} className="border-t border-(--line) pt-3">
          <h2 className={cn("mb-1", label)}>{t("chart")}</h2>
          <div ref={chartBox}>
            <ColumnChart data={data} unit="€" height={chartH} label={t("chart")} />
          </div>
        </section>

        <p className="mt-2 text-small text-muted">{t("note")}</p>
      </div>
    </>
  );
  if (embedded) return body;
  return (
    <AdminShell
      title={t("title")}
      aside={
        <Link href="/admin" className={adminButtonStyles("secondary")}>
          <X aria-hidden />
          {t("close")}
        </Link>
      }
    >
      {body}
    </AdminShell>
  );
}

/** ▲/▼ with the relative change, in the neutral secondary colour (Market Cap has no status colours). */
function NeutralChange({ change, against }: { change: Change | null; against: string }) {
  if (!change || change.delta === 0) return null;
  return (
    <span className="tabular-nums">
      {change.delta > 0 ? "▲" : "▼"} {change.relative !== null ? signedPct(change.relative) : signed(change.delta, eur)} {against}
    </span>
  );
}
function NeutralArrow({ change }: { change: Change | null }) {
  if (!change || change.delta === 0) return null;
  return <span className="text-muted">{change.delta > 0 ? "▲" : "▼"}</span>;
}
