// Hosts' details for the platform's duties (CLAUDE.md "Plattform-Pflichten"): whether the tax details are due – past HOST_TAX_INFO's
// threshold in the calendar year (paid guest shares received: how many, how much in EUR). Pure.
import { HOST_TAX_INFO } from "@/config/policies";
import { convert, type CurrencyCode } from "./currency";
import type { Payment, Stay } from "./types";

export function hostYear(hostId: string, stays: readonly Stay[], payments: readonly Payment[], year: number): { activities: number; eur: number } {
  const mine = new Map(stays.filter((s) => s.hostId === hostId).map((s) => [s.id, s]));
  let activities = 0;
  let eur = 0;
  for (const p of payments) {
    const stay = mine.get(p.stayId);
    if (!stay || p.userId === hostId || p.status !== "paid" || !p.paidAt?.startsWith(String(year))) continue;
    activities += 1;
    eur += convert(p.share + (p.hostFee ?? 0), (stay.currency ?? "EUR") as CurrencyCode, "EUR");
  }
  return { activities, eur: Math.round(eur) };
}

/** Switched on and past either threshold – then Settings asks for the tax ID and address. */
export function taxDetailsDue(stats: { activities: number; eur: number }): boolean {
  return HOST_TAX_INFO.enabled && (stats.activities >= HOST_TAX_INFO.minActivities || stats.eur >= HOST_TAX_INFO.minPayoutEur);
}
