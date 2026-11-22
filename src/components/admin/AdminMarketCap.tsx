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
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { marketCap } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { dec, eur, month, num, pct } from "@/lib/i18n/adminFormat";
import { cn } from "@/lib/utils";
import { adminButtonStyles } from "./AdminButton";
import { ColumnChart } from "./AdminCharts";
import { ChangeLine, InfoTip } from "./AdminNumbers";
import { AdminShell, AREA_TEXT, AREA_TILE } from "./AdminShell";
import { Tile } from "./AdminTiles";

/** Room under the chart: its axis' second line and the note. */
const BOTTOM = 72;

export function AdminMarketCap() {
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
  const card = cn("relative min-w-0 rounded-xl border", AREA_TILE.plan);
  const label = cn("flex items-center gap-1 text-eyebrow uppercase", AREA_TEXT.plan);
  const data = mc.months.map((m) => ({ label: month(m.month).replace(".", ""), value: m.value, current: m.current ? ("running" as const) : null }));
  const drivers = [
    { key: "growth", value: mc.drivers.growth === null ? "–" : `${dec(mc.drivers.growth)} %`, change: mc.driverChanges.growth },
    { key: "repeat", value: mc.drivers.repeat === null ? "–" : pct(mc.drivers.repeat), change: mc.driverChanges.repeat },
    { key: "takeRate", value: mc.drivers.takeRate === null ? "–" : `${dec(mc.drivers.takeRate)} %`, change: mc.driverChanges.takeRate },
    { key: "openHouses", value: num(mc.openHouses), change: mc.driverChanges.openHouses },
  ] as const;

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
      <div data-market-cap className="flex flex-col gap-3">
        {/* The estimate, large; the span (all methods) and the change against a month ago. */}
        <section aria-label={t("estimate")} className={cn(card, "flex flex-wrap items-end justify-between gap-x-10 gap-y-2 px-6 py-4")}>
          <div className="min-w-0">
            <p className={label}>
              {t("estimate")}
              <InfoTip text={t("estimateInfo")} />
            </p>
            <p className="mt-1 text-display tabular-nums text-ink">{eur(mc.estimate)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 pb-1 text-body">
            <span className="tabular-nums text-muted">{t("span", { low: eur(mc.span.low), high: eur(mc.span.high) })}</span>
            <ChangeLine change={mc.change} against={t("vsMonth")} />
          </div>
        </section>

        {/* Three methods, each with its sum in sight: base × multiple band = result. */}
        <div className="grid gap-3 lg:grid-cols-3">
          {mc.methods.map((m) => (
            <section key={m.method} aria-label={t(`methods.${m.method}`)} data-market-cap-method={m.method} className={cn(card, "flex flex-col gap-1 px-4 pt-3 pb-3")}>
              <p className={label}>
                {t(`methods.${m.method}`)}
                <InfoTip text={t(`methodInfo.${m.method}`)} />
              </p>
              <p className="text-h2 tabular-nums text-ink">
                {eur(m.result.low)} – {eur(m.result.high)}
              </p>
              <p className="text-small tabular-nums text-muted">
                <span className="text-ink">{t("formula", { base: eur(m.base), low: dec(m.multiple.low), high: dec(m.multiple.high) })}</span>
                {" · "}
                {mc.extrapolated ? t("extrapolated") : t("base12")} · {t(`step.${String(mc.step) as "0" | "1" | "2"}`)}
              </p>
            </section>
          ))}
        </div>

        {/* What drives the value – four tiles with their change (against a month ago). */}
        <section aria-label={t("drivers")}>
          <h2 className={cn("mb-1", label)}>{t("drivers")}</h2>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ "--adm-tile-h": "84px" } as CSSProperties}>
            {drivers.map((d) => (
              <Tile key={d.key} group="plan" label={t(`driver.${d.key}`)} info={t(`driverInfo.${d.key}`)} value={d.value} change={d.change} openLabel={t(`driver.${d.key}`)} />
            ))}
          </dl>
        </section>

        {/* The estimate per month (bars only, this month dashed). */}
        <section aria-label={t("chart")}>
          <h2 className={cn("mb-1", label)}>{t("chart")}</h2>
          <div ref={chartBox}>
            <ColumnChart data={data} unit="€" height={chartH} label={t("chart")} />
          </div>
        </section>

        <p className="text-small text-muted">{t("note")}</p>
      </div>
    </AdminShell>
  );
}
