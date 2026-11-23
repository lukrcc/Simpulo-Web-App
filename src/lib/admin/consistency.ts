// The admin's ONE data source, checked (CLAUDE.md "Admin: eine Datenquelle"): for every period, bookings and revenue must be the same on
// Übersicht (cockpit, moneyPeriod), Geld (moneyPeriod), Wachstum (growthFunnel with bookingTotals) and the channels (alignRows, exact) – any
// difference is an error. Run in dev on every admin page (AdminFrame logs it) and by scripts/check-admin-numbers.mjs against the rendered
// pages. Pure – no React.
import { COMPARE_PERIODS } from "@/config/admin";
import type { GrowthEvent } from "@/lib/growth";
import { alignRows, bookingTotals, cockpit, connectionOverview, coreMetrics, fundingReadiness, growthFunnel, growthRows, labNumbers, launchCountdown, launchProgress, moneyPeriod, periodRanges, type AdminInputs } from "./metrics";

export function adminNumberMismatches(inputs: AdminInputs, events: readonly GrowthEvent[]): string[] {
  const out: string[] = [];
  for (const period of COMPARE_PERIODS) {
    const ranges = periodRanges(inputs.today, period);
    const money = moneyPeriod(inputs, period);
    const overview = cockpit(inputs, period);
    const source = bookingTotals(inputs, ranges);
    const funnel = growthFunnel(events, period, inputs.today, ranges, source);
    const channels = alignRows(growthRows(events, (e) => e.utmSource ?? "", period, inputs.today, ranges), { paid: source.paid.now, revenue: source.revenue.now }, true);
    const bookings = {
      geld: Math.round(money.now.guests),
      uebersicht: Math.round(moneyPeriod(inputs, period, null).now.guests),
      wachstum: funnel.paid.value,
      kanaele: channels.reduce((n, r) => n + r.paid, 0),
    };
    const values = Object.values(bookings);
    if (values.some((v) => v !== values[0])) out.push(`${period}: Buchungen ${JSON.stringify(bookings)}`);
    const revenue = { geld: Math.round(money.now.revenue), wachstum: Math.round(funnel.revenue.now) };
    if (revenue.geld !== revenue.wachstum) out.push(`${period}: Umsatz ${JSON.stringify(revenue)}`);
    if (overview.ranges.current.from !== ranges.current.from || overview.ranges.current.to !== ranges.current.to) out.push(`${period}: Zeitraum Übersicht ≠ Geld`);
  }
  out.push(...planningMismatches(inputs));
  return out;
}

/**
 * Planen (CLAUDE.md "Planen: eine Datenquelle"): the same number must read the same on Übersicht, Vision, Finanzierung, Labore and Marketing –
 * the connection rate (Übersicht, laufender Monat), the repeat guests, the hubs; Marketing's progress counts only what was won since its start,
 * so before the start every ring is 0.
 */
function planningMismatches(inputs: AdminInputs): string[] {
  const out: string[] = [];
  const month = periodRanges(inputs.today, "month");
  const labs = labNumbers(inputs);
  const overviewConnection = connectionOverview(inputs, month, "month").value;
  const core = coreMetrics(inputs).again;
  const connection = { uebersicht: overviewConnection, vision: core === null ? null : Math.round(core * 100), labore: labs.crew.value };
  if (new Set(Object.values(connection)).size > 1) out.push(`Verbindungsrate ${JSON.stringify(connection)}`);
  const repeat = { uebersicht: cockpit(inputs, "month").areas.find((a) => a.key === "quality")!.number.value, finanzierung: fundingReadiness(inputs).values.repeatRate.value, labore: labs.community.value };
  if (new Set(Object.values(repeat)).size > 1) out.push(`Wiederkehrer ${JSON.stringify(repeat)}`);
  const hubs = { launch: launchProgress(inputs).hubs.value, labore: labs.places.value };
  if (hubs.launch !== hubs.labore) out.push(`Hubs ${JSON.stringify(hubs)}`);
  const c = launchCountdown(inputs);
  if (c.state === "before") {
    const early = c.rings.filter((r) => r.value !== 0).map((r) => `${r.metric} ${r.value}`);
    if (early.length) out.push(`Marketing vor dem Start nicht 0: ${early.join(", ")}`);
  }
  return out;
}
