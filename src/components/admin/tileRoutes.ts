"use client";

// The one way a tile opens (CLAUDE.md "Jede Kachel → eine Kapsel"): its route from config/admin-tiles.ts – on its own page the capsule and
// focus in the URL (?tab=&focus=, setAdminSearch: back works, links can be shared), on another page a link to that page's capsule. A tile
// without a route keeps what it had (and dev says so – the config should know it). And its unit (CLAUDE.md "Kapsel = Einheit = eine Frage =
// eine Farbe"): the tile softly filled in its capsule's colour, the tiles of one unit side by side (the page's order, else the capsules' order).
import { ADMIN_PAGES, NEUTRAL_UNIT, routeHref, unitColorOf, type AdminPageKey } from "@/config/admin-tiles";
import { APP_MODE } from "@/lib/appMode";
import { setAdminSearch } from "@/lib/admin/urlState";
import type { AdminTab } from "./AdminLayout";
import type { TileSpec } from "./AdminTiles";

export function routeTiles(page: AdminPageKey, tiles: readonly TileSpec[]): TileSpec[] {
  const def = ADMIN_PAGES[page];
  const routed = tiles.map((tile) => {
    const route = def.tiles[tile.key];
    if (!route) {
      if (APP_MODE === "dev") console.warn(`[admin] Kachel ohne Kapsel: ${page} › ${tile.key}`);
      return tile;
    }
    const target = route.page ?? page;
    // A tile wears its unit's colour – its capsule's (Übersicht too: its group capsules); a tile of another page none.
    const unit = target !== page ? undefined : (route.unit ?? route.tab);
    // A tile of another page: neutral silver (never unfilled); else its unit's colour.
    const unitColor = target !== page ? NEUTRAL_UNIT : unit ? unitColorOf(page, unit) : null;
    if (APP_MODE === "dev" && !unitColor) console.error(`[admin] Kachel ohne Farbe: ${page} › ${tile.key} (Kapsel ${route.tab})`);
    if (target !== page) return { ...tile, onOpen: undefined, href: routeHref(page, route), unit, unitColor };
    const first = def.capsules[0]?.key;
    return { ...tile, href: undefined, onOpen: () => setAdminSearch({ tab: route.tab === first ? null : route.tab, focus: route.focus ?? null }), unit, unitColor };
  });
  // Übersicht brings its rows in their fixed order (config/admin/overview.ts).
  if (page === "overview") return routed;
  // The order: the page's own (config), else by unit in the capsules' order (stable; tiles without a unit last).
  if (def.order) {
    const at = (key: string) => {
      const i = def.order!.indexOf(key);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    return routed.toSorted((a, b) => at(a.key) - at(b.key));
  }
  const capIndex = (unit: string | undefined) => {
    const i = def.capsules.findIndex((c) => c.key === unit);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return routed.toSorted((a, b) => capIndex(a.unit) - capIndex(b.unit));
}

/** A page's capsules filled in their unit colour (the tab's `tone`): Überblick none. */
export function withUnits<T extends string>(page: AdminPageKey, tabs: readonly AdminTab<T>[]): AdminTab<T>[] {
  return tabs.map((tab) => {
    const tone = tab.tone ?? unitColorOf(page, tab.value) ?? undefined;
    // Dev: a capsule without a valid colour is an error – unless the config names it neutral (Überblick, Zeitleiste: unit null).
    if (APP_MODE === "dev" && !tone) {
      const def = ADMIN_PAGES[page].capsules.find((c) => c.key === tab.value);
      if (!def || def.unit !== null) console.error(`[admin] Kapsel ohne Farbe: ${page} › ${tab.value}`);
    }
    return { ...tab, tone };
  });
}

