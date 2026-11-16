// The mock's social depth per House (config/depth.ts), deterministic: Party, ski trips and short trips (≤ 5 nights) lean Easy; Founder and
// Pro hosts' Houses (a host fee – a programme) lean Deep; the rest Balanced, with a few Easy and Deep by id so every level shows up.
import type { Depth } from "@/config/depth";
import type { Stay } from "./mock";

const SKI = /\bski|snow|powder|zillertal|chamonix|alps\b/i;

function hash(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function mockDepth(stay: Pick<Stay, "id" | "vibe" | "title" | "startDate" | "endDate" | "hostFeePerPerson">): Depth {
  const nights = stay.startDate && stay.endDate ? Math.round((Date.parse(stay.endDate) - Date.parse(stay.startDate)) / 86_400_000) : null;
  if (stay.vibe === "party" || SKI.test(stay.title) || (nights !== null && nights <= 5)) return "easy";
  if (stay.vibe === "founder" || stay.hostFeePerPerson) return "deep";
  const n = hash(stay.id) % 10;
  return n === 0 ? "easy" : n === 1 ? "deep" : "balanced";
}
