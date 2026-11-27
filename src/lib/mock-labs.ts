import type { LabId } from "@/lib/admin/labs";

/**
 * Mock (dev and demo only): what a lab would earn a month once it is a source of revenue (status "Einnahme") – for the card
 * „Einnahmequellen“ on Geld. Invented round numbers, not a forecast; production has no such values (shows "–").
 */
export const LAB_REVENUE_MOCK: Readonly<Record<LabId, number>> = {
  marketplace: 0,
  crew: 1200,
  arc: 800,
  space: 2500,
  places: 600,
  trust: 400,
  phases: 1500,
  community: 3000,
  impact: 200,
};
