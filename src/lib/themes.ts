// The themes' logic over config/themes.ts – the one place that resolves merges and sorts a House under a sub theme. Pure.
import { SUB_THEMES, THEMES, type SubThemeDef, type TopThemeId } from "@/config/themes";
import type { Stay } from "./mock";

const MAX_MERGE_HOPS = 8;

/** The top theme a theme counts as: itself, or – merged – the theme it went into (followed through). */
export function themeOf(id: string): TopThemeId {
  let current = id;
  for (let i = 0; i < MAX_MERGE_HOPS; i++) {
    const def = THEMES.find((x) => x.id === current) as { id: TopThemeId; mergedInto?: string } | undefined;
    if (!def?.mergedInto) break;
    current = def.mergedInto;
  }
  return current as TopThemeId;
}

/** The top themes that lists show: active and not merged. */
export function activeThemes(): TopThemeId[] {
  return THEMES.filter((x) => x.status === "active" && !(x as { mergedInto?: string }).mergedInto).map((x) => x.id);
}

/** A sub theme through its merges. */
function resolveSub(def: SubThemeDef): SubThemeDef {
  let current = def;
  for (let i = 0; i < MAX_MERGE_HOPS && current.mergedInto; i++) current = SUB_THEMES.find((x) => x.id === current.mergedInto) ?? current;
  return current;
}

/** The sub theme a House belongs to: the first whose word appears in the host's own label, else in the title; null: none. */
export function subThemeOf(stay: Pick<Stay, "customVibe" | "title">): SubThemeDef | null {
  const own = (stay.customVibe ?? "").toLowerCase();
  const title = stay.title.toLowerCase();
  const hit = (text: string) => (text ? SUB_THEMES.find((s) => s.keywords.some((k) => text.includes(k))) : undefined);
  const found = hit(own) ?? hit(title);
  return found ? resolveSub(found) : null;
}

/** The top theme a House counts towards: a host's own label sorted by its keywords (else its category), merges followed. */
export function topThemeOfStay(stay: Pick<Stay, "vibe" | "customVibe" | "title">): TopThemeId {
  if (stay.customVibe) {
    const sub = subThemeOf({ customVibe: stay.customVibe, title: "" });
    if (sub) return themeOf(sub.parent);
  }
  return themeOf(stay.vibe);
}

/** A host's own label that no keyword knows ("Sonstige", to be sorted in by hand). */
export const isUnknownLabel = (stay: Pick<Stay, "customVibe">) => Boolean(stay.customVibe) && subThemeOf({ customVibe: stay.customVibe, title: "" }) === null;
