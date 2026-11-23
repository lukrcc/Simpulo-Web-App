import type { AdminIconName } from "@/components/admin/adminIcons";
import type { CardDef } from "./types";

/** Analyse: Wert-Check · Sweet Spot · Thema · Länge · Crew · Ort-Typ · Hub · Host-Stufe (per angle: the best group, its value, the weakest, how many groups). */
const angle = (dim: string, icon: AdminIconName): CardDef => ({ topic: dim, icon, tab: dim, main: `dim-${dim}`, subs: [`${dim}.bestValue`, `${dim}.weakest`, `${dim}.groups`] });
export const ANALYSIS_CARDS: readonly CardDef[] = [
  { topic: "value", icon: "Scale", tab: "value", main: "valueCheck", subs: ["perHouse"] },
  { topic: "sweetSpot", icon: "Target", tab: "topic", focus: "value", main: "sweetSpot", subs: ["leader-connection", "leader-repeat", "leader-speed", "leader-value"] },
  angle("topic", "Tags"),
  angle("length", "CalendarDays"),
  angle("crew", "Users"),
  angle("category", "BedDouble"),
  angle("hub", "MapPin"),
  angle("tier", "Award"),
];
