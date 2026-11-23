import type { AdminIconName } from "@/components/admin/adminIcons";
import type { CardDef } from "./types";

/**
 * Labore: one card per lab, 3 × 3 (the one page with nine – CLAUDE.md "Labore angeglichen"). Per lab: its symbol, the real number of today
 * (lib/admin/metrics.ts labNumbers – "–" with "noch keine Kennzahl" when there is none), the guiding question in grey, the status small top
 * right, and as sub numbers the ceiling and the next step (one line). A click opens the lab's topic view (?topic=<lab>).
 */
const lab = (id: string, icon: AdminIconName): CardDef => ({ topic: id, icon, tab: "labs", focus: id, main: `metric-${id}`, badge: `status-${id}`, subs: [`ceiling-${id}`, `next-${id}`], target: false });

export const LABS_CARDS: readonly CardDef[] = [
  lab("marketplace", "Store"),
  lab("crew", "Users"),
  lab("arc", "Waves"),
  lab("space", "LayoutGrid"),
  lab("places", "MapPin"),
  lab("trust", "ShieldCheck"),
  lab("phases", "Sprout"),
  lab("community", "HeartHandshake"),
  lab("impact", "Sparkles"),
];
