// Admin › Houses › Themen: supply and demand per theme – one place (CLAUDE.md "Houses › Themen"). Supply: the real Houses opened in the
// period (and before, for the trend) and the Houses open now, per top theme and sub theme (config/themes.ts, sorted by lib/themes.ts –
// merged themes count towards their target). Demand: saved searches with that category, hearted Houses of that theme, waitlist
// interests. A gap: demand with (almost) no supply. Hosts' own labels no keyword knows are listed for sorting in ("Sonstige"). Pure.
import { SUB_THEMES } from "@/config/themes";
import type { Stay, User } from "@/lib/mock";
import type { SavedSearch } from "@/lib/savedSearches";
import { activeThemes, isUnknownLabel, subThemeOf, themeOf, topThemeOfStay } from "@/lib/themes";
import type { TopThemeId } from "@/config/themes";
import type { WaitlistEntry } from "@/lib/types";

const isReal = (s: Stay) => !s.isExample && (s.status === "published" || s.status === "booked" || s.status === "completed");

export interface ThemeRow {
  id: TopThemeId;
  /** Opened in the period, and in the same span before */
  opened: number;
  openedBefore: number;
  /** Opened ever (every real House of the theme) */
  total: number;
  /** Open now (published, not started) */
  open: number;
  /** Per sub theme (id → opened in the period); "" = no sub theme */
  subs: { id: string; opened: number; open: number }[];
  searches: number;
  saved: number;
  waitlist: number;
  /** Demand all told (searches + saved + waitlist) */
  demand: number;
  /** Demand per open House (demand ÷ max(1, open)) – the higher, the more demand without supply */
  gap: number;
}

export function themeStats(input: { stays: readonly Stay[]; users: readonly User[]; savedSearches: readonly SavedSearch[]; waitlist: readonly WaitlistEntry[]; today: string; ranges: { current: { from: string; to: string }; previous: { from: string; to: string } } }) {
  const { stays, users, savedSearches, waitlist, today, ranges } = input;
  const real = stays.filter(isReal);
  const inRange = (iso: string, r: { from: string; to: string }) => iso.slice(0, 10) >= r.from && iso.slice(0, 10) <= r.to;
  const savedIds = users.flatMap((u) => u.savedStayIds ?? []);
  const rows: ThemeRow[] = activeThemes().map((id) => {
    const mine = real.filter((s) => topThemeOfStay(s) === id);
    const openNow = mine.filter((s) => s.status === "published" && s.startDate > today);
    const opened = mine.filter((s) => inRange(s.createdAt, ranges.current));
    const subIds = [...SUB_THEMES.filter((x) => x.parent === id && x.status === "active" && !x.mergedInto).map((x) => x.id), ""];
    const subs = subIds
      .map((sid) => ({
        id: sid,
        opened: opened.filter((s) => (subThemeOf(s)?.id ?? "") === sid).length,
        open: openNow.filter((s) => (subThemeOf(s)?.id ?? "") === sid).length,
      }))
      .filter((x) => x.opened > 0 || x.open > 0);
    const searches = savedSearches.filter((x) => x.category && themeOf(x.category) === id).length;
    const saved = savedIds.filter((sid) => {
      const s = stays.find((x) => x.id === sid);
      return s ? topThemeOfStay(s) === id : false;
    }).length;
    const wl = waitlist.filter((w) => w.interests.some((i) => themeOf(i) === id)).length;
    const demand = searches + saved + wl;
    return { id, total: mine.length, opened: opened.length, openedBefore: mine.filter((s) => inRange(s.createdAt, ranges.previous)).length, open: openNow.length, subs, searches, saved, waitlist: wl, demand, gap: demand / Math.max(1, openNow.length) };
  });
  // Active: a theme with at least one open House; most and least opened over all time (only themes that have Houses).
  const withHouses = rows.filter((r) => r.open > 0);
  const byOpen = rows.filter((r) => r.total > 0).toSorted((a, b) => b.total - a.total);
  // The strongest gaps: demand at least 3 and at most one open House – most demand per House first.
  const gaps = rows.filter((r) => r.demand >= 3 && r.open <= 1).toSorted((a, b) => b.gap - a.gap);
  const unknown = real.filter(isUnknownLabel).map((s) => ({ label: s.customVibe!, stay: s }));
  return { rows, active: withHouses.length, top: byOpen[0] ?? null, low: byOpen.at(-1) ?? null, gaps, unknown };
}
