import { VIBES } from "./catalog";
import type { Stay } from "./types";

/** A House's short name: at most this many characters – dashboards and small tiles ("Surf Bali", "IRL Bangkok", "Fitness Canggu"). */
export const SHORT_NAME_MAX = 14;

/** Words that say nothing about a House ("Surf House Ericeira" → "Surf Ericeira"). */
const FILLER = new Set(["house", "houses", "coliving", "co-living", "week", "weeks", "retreat", "camp", "villa", "club", "trip", "the", "a", "&", "and", "of", "in", "at", "–", "-", "—"]);

const cut = (text: string) => (text.length <= SHORT_NAME_MAX ? text : `${text.slice(0, SHORT_NAME_MAX - 1).trimEnd()}…`);

/**
 * The House's short name: its own `shortName`; else the title's first telling word and its place ("IRL House Bangkok" → "IRL Bangkok",
 * "Fitness House Canggu" → "Fitness Canggu") when that fits; else the category's first word and the place, cut to fit ("Holiday Mexic…").
 */
export function shortNameOf(stay: Pick<Stay, "shortName" | "title" | "vibe" | "location">): string {
  if (stay.shortName?.trim()) return cut(stay.shortName.trim());
  // The place as the title names it ("Fitness House Canggu" → Canggu, not the region's Bali): the area or city it mentions, else its last word.
  const title = stay.title.trim();
  const words = title.split(/\s+/);
  const last = words.at(-1) ?? "";
  const named = [stay.location.area, stay.location.city].find((p) => p && title.toLowerCase().includes(p.toLowerCase()));
  const place = (named ?? (/^\p{Lu}/u.test(last) && !FILLER.has(last.toLowerCase()) ? last : stay.location.city)).trim();
  const city = place;
  const lead = words.find((word) => word && !FILLER.has(word.toLowerCase()) && !place.toLowerCase().includes(word.toLowerCase()));
  if (lead && `${lead} ${city}`.length <= SHORT_NAME_MAX) return `${lead} ${city}`;
  const category = (VIBES.find((v) => v.key === stay.vibe)?.label ?? "").split(/\s+/)[0];
  return cut([category, city].filter(Boolean).join(" ") || stay.title);
}
