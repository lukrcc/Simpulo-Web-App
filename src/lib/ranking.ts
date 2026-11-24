// "For you" (CLAUDE.md "Startseite-Raster ohne Zahlen und Sortierung, Reihenfolge For you"): one score per House from the person's theme fit,
// how soon it starts, a link to Your people, the open spots and how new it is – weights in config/ranking.ts. Simpulo's fee and revenue NEVER
// count (see there). Until real signals exist the inputs are simple (the mock's interests, Houses and people); later the Interest ranking model.
import { FOR_YOU_WEIGHTS, NEW_DAYS, SOON_DAYS } from "@/config/ranking";
import type { Stay } from "./types";

const DAY_MS = 86_400_000;

export interface ForYouContext {
  /** YYYY-MM-DD */
  today: string;
  /** Themes the person likes (their interests, Houses joined, hosted, saved, what they're in for) */
  themes: ReadonlySet<string>;
  /** Your people's ids */
  people: ReadonlySet<string>;
  /** Who's in a House (the crew, host included) */
  crewOf: (stay: Stay) => readonly string[];
  /** Free spots of a House */
  openSpotsOf: (stay: Stay) => number;
  /** Days a House counts as starting later (a slow host) or earlier (a highlighted House, a fitting depth) – the same shifts as "Soonest" */
  shiftDays?: (stay: Stay) => number;
}

/** 1 within `full` days, 0 after `none`, straight in between. */
const fade = (days: number, full: number, none: number) => (days <= full ? 1 : days >= none ? 0 : 1 - (days - full) / (none - full));

/** A House's "For you" score (higher first). */
export function forYouScore(stay: Stay, ctx: ForYouContext): number {
  const today = Date.parse(`${ctx.today}T00:00:00Z`);
  const startsIn = (Date.parse(stay.startDate) - today) / DAY_MS + (ctx.shiftDays?.(stay) ?? 0);
  const ageDays = stay.createdAt ? (today - Date.parse(stay.createdAt)) / DAY_MS : Number.POSITIVE_INFINITY;
  const crew = ctx.crewOf(stay);
  const signals = {
    theme: ctx.themes.has(stay.vibe) ? 1 : 0,
    soon: startsIn < 0 ? 0 : fade(startsIn, SOON_DAYS.full, SOON_DAYS.none),
    people: crew.some((id) => ctx.people.has(id)) ? 1 : 0,
    openSpots: stay.spotsTotal > 0 ? Math.max(0, ctx.openSpotsOf(stay)) / stay.spotsTotal : 0,
    newness: fade(Math.max(0, ageDays), NEW_DAYS.full, NEW_DAYS.none),
  };
  return (Object.keys(FOR_YOU_WEIGHTS) as (keyof typeof FOR_YOU_WEIGHTS)[]).reduce((sum, key) => sum + FOR_YOU_WEIGHTS[key] * signals[key], 0);
}

/** The Houses in "For you" order (ties: the sooner start). */
export function rankForYou(stays: readonly Stay[], ctx: ForYouContext): Stay[] {
  const score = new Map(stays.map((s) => [s.id, forYouScore(s, ctx)]));
  return stays.toSorted((a, b) => score.get(b.id)! - score.get(a.id)! || a.startDate.localeCompare(b.startDate));
}
