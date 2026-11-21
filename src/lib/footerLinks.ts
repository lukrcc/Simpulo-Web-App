// The large footer's Places and Themes (CLAUDE.md "Footer"), from the data instead of fixed lists. Pure: the Houses and the platform phase in,
// the lists out. Before the launch (pre-launch, beta) the places are the launch hubs and the themes those with a guide or example Houses;
// once live, the cities and themes with the most open Houses.
import { FOOTER_LIST } from "@/config/footer";
import { LAUNCH_HUBS } from "@/config/launch";
import { GUIDES } from "@/config/seo";
import { citySlugOf } from "./data/stays";
import { isListedStay } from "./launch";
import type { PlatformPhase, Stay, Vibe } from "./types";
import { openSpots, VIBES } from "./utils";

export interface FooterPlace {
  slug: string;
  name: string;
}

/** An open House: listed, published, a spot free, not an example. */
const isOpen = (s: Stay) => !s.isExample && s.status === "published" && isListedStay(s) && openSpots(s) > 0;

/** Count per key, most first (ties: the key, so the order is stable). */
function ranked<K extends string>(keys: readonly K[]): K[] {
  const count = new Map<K, number>();
  for (const k of keys) count.set(k, (count.get(k) ?? 0) + 1);
  return [...count.entries()].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
}

/**
 * Places: before the launch the hubs (config/launch.ts LAUNCH_HUBS); live the cities with the most open Houses, at most FOOTER_LIST.max – and
 * at least FOOTER_LIST.minPlaces, filled up with the hubs when the data has fewer.
 */
export function footerPlaces(stays: readonly Stay[], phase: PlatformPhase): FooterPlace[] {
  if (phase !== "live") return [...LAUNCH_HUBS];
  const open = stays.filter(isOpen);
  const names = new Map(open.map((s) => [citySlugOf(s), s.city]));
  const top = ranked(open.map(citySlugOf)).slice(0, FOOTER_LIST.max).map((slug) => ({ slug, name: names.get(slug) ?? slug }));
  const fill = LAUNCH_HUBS.filter((h) => !top.some((p) => p.slug === h.slug));
  return [...top, ...fill].slice(0, Math.max(top.length, FOOTER_LIST.minPlaces));
}

/**
 * Themes: before the launch those with a guide (config/seo.ts GUIDES) first, then those with the most example Houses; live those with the most
 * open Houses. At most FOOTER_LIST.max.
 */
export function footerThemes(stays: readonly Stay[], phase: PlatformPhase): Vibe[] {
  const known = new Set<string>(VIBES.map((v) => v.key));
  if (phase === "live") return ranked(stays.filter(isOpen).map((s) => s.vibe)).filter((v) => known.has(v)).slice(0, FOOTER_LIST.max);
  const guided = GUIDES.flatMap((g) => (g.houses.kind === "category" ? [g.houses.vibe] : []));
  const examples = ranked(stays.filter((s) => s.isExample || s.isFounding).map((s) => s.vibe));
  return [...new Set<Vibe>([...guided, ...examples])].filter((v) => known.has(v)).slice(0, FOOTER_LIST.max);
}
