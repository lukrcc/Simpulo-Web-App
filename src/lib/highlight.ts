import type { Stay } from "./types";
import { openSpots } from "./utils";

/** Why a card is Explore's highlight of its block – the small capsule on it. */
export type HighlightReason = { kind: "lastSpot" } | { kind: "startsIn"; days: number } | { kind: "justOpened" };

const DAY = 86_400_000;
const daysUntil = (iso: string, today: string) => Math.max(0, Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY));
const soonest = (a: Stay, b: Stay) => a.startDate.localeCompare(b.startDate);

/**
 * The one card a block of Explore's grid shows two columns wide: the most urgent House in it – one spot left › starts within 7 days › just
 * opened (only the host in) – each the soonest first; none of these: the soonest start. Null for an empty block.
 */
export function blockHighlight(stays: readonly Stay[], today: string): { id: string; reason: HighlightReason } | null {
  if (stays.length === 0) return null;
  const lastSpot = stays.filter((s) => openSpots(s) === 1).toSorted(soonest)[0];
  if (lastSpot) return { id: lastSpot.id, reason: { kind: "lastSpot" } };
  const soon = stays.filter((s) => daysUntil(s.startDate, today) <= 7).toSorted(soonest)[0];
  if (soon) return { id: soon.id, reason: { kind: "startsIn", days: daysUntil(soon.startDate, today) } };
  const fresh = stays.filter((s) => s.spotsFilled <= 1 && openSpots(s) > 0).toSorted(soonest)[0];
  if (fresh) return { id: fresh.id, reason: { kind: "justOpened" } };
  const first = stays.toSorted(soonest)[0];
  return { id: first.id, reason: { kind: "startsIn", days: daysUntil(first.startDate, today) } };
}
