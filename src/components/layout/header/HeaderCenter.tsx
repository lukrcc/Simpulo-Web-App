"use client";

// The header's middle from 1100px (CLAUDE.md "Kopfleiste nur Text"): "Getaways · Search · Themes · Filters" – words only, no icons, no
// arrows; an open entry in the full text colour with a soft surface, an active Getaways filter semibold (no line between them, no count on Filters – the active filters show as chips on the page) – plain words, no capsules, centred between the logo and the right group. Explore passes its filter state
// (ExploreFeed portals it into the bar's slot); every other page gets HeaderCenterNav, whose entries lead to Explore.
import type { PanelHandlers } from "./HeaderPanel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { BarCategories } from "@/components/explore/Filters";
import { SearchField } from "@/components/explore/SearchFields";
import { VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { VIBES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { hdrItem, hdrViewsRow } from "./headerItem";

/** Room kept between the middle and each side group. */
const CENTER_AIR = 24;
/** How many steps the middle can move together (0 = as it is). */
const SQUEEZE_STEPS = 3;

/** The Short Trips results: Explore with the length filter "up to 5 nights". */
const SHORT_TRIPS_HREF = "/explore?len=weekend";

export interface HeaderCenterProps {
  place: string | null;
  month: string | null;
  onWhereWhen: (change: {
    place?: string | null;
    month?: string | null;
  }) => void;
  /** The sheet closed (the other pages go to Explore with a place chosen) */
  onWhereWhenClose?: () => void;
  autoOpen?: boolean;
  /** The Short Trips results are what's shown (the link's active state) */
  shortTrips: boolean;
  /** On Explore itself: show the Short Trips results in place (its filters don't follow a link to the same page); elsewhere the link navigates */
  onShortTrips?: () => void;
  vibes: readonly string[];
  sub: string | null;
  onTheme: (vibe: string | null) => void;
  onSubTheme: (parent: string, sub: string) => void;
  filterCount: number;
  filtersOpen?: boolean;
  onFilters: () => void;
  /** Filters' hover and click from the page's header panel (useHeaderPanel); without, a click calls onFilters */
  filtersTrigger?: PanelHandlers["trigger"];
  /** The element All filters' sheet hangs under */
  filtersRef?: Ref<HTMLSpanElement>;
}

export function HeaderCenter({ filtersRef, ...p }: HeaderCenterProps) {
  const t = useTranslations("explore");
  const tf = useTranslations("explore.filtersUi");
  const tThemes = useTranslations("explore.barThemes");
  const format = useFormat();
  const options = useMemo(
    () =>
      VIBES.map((v) => ({
        value: v.key,
        label: format.vibe(v.key),
        icon: VIBE_ICONS[v.key],
      })),
    [format],
  );
  // Exactly centred (CLAUDE.md "Kopfleiste zentriert"): the middle may be as wide as the window less twice the wider side (logo or right
  // group) – too wide, it moves together step by step (globals.css [data-squeeze]: the entries tighter, in three steps) before the grid
  // would push it off the middle.
  const box = useRef<HTMLDivElement>(null);
  const [squeeze, setSqueeze] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    const row = el?.closest<HTMLElement>("[data-header-row]");
    if (!el || !row) return;
    const fit = () => {
      const left = row.querySelector<HTMLElement>("[data-header-left]");
      const right = row.querySelector<HTMLElement>("[data-header-right]");
      if (!left || !right || !right.offsetWidth) return;
      const side = Math.max(left.offsetWidth, right.offsetWidth) + CENTER_AIR;
      const room = row.clientWidth - 2 * side;
      let level = 0;
      for (; level < SQUEEZE_STEPS; level++) {
        el.dataset.squeeze = String(level);
        if (el.scrollWidth <= room) break;
      }
      el.dataset.squeeze = String(level);
      setSqueeze(level);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    const right = row.querySelector("[data-header-right]");
    if (right) observer.observe(right);
    return () => observer.disconnect();
  }, [p.place, p.month, p.vibes, p.sub]);
  return (
    <div
      ref={box}
      data-header-center
      data-squeeze={squeeze}
      // The one row of views in the bar (CLAUDE.md "Kopfleiste als Seitenwerkzeug" – the same as HeaderViews on the other tabs).
      className={hdrViewsRow}
    >
      {/* Short Trips · Search · Themes · Filters (CLAUDE.md "Kopfleiste wie apple.com"). */}
      {(
        // Short Trips is a link to its results (CLAUDE.md "Short Trips als Link"), not a switch: on them already, a click stays and glides to
        // the top. The filter goes only with its "Short Trips ×" chip or "Clear all". Active: the primary colour, medium.
        <Link
          href={SHORT_TRIPS_HREF}
          aria-current={p.shortTrips ? "page" : undefined}
          data-on={p.shortTrips ? "" : undefined}
          onClick={(e) => {
            if (!p.shortTrips) {
              if (!p.onShortTrips) return;
              e.preventDefault();
              p.onShortTrips();
              return;
            }
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }}
          className={cn(hdrItem, "hdr-short-trips")}
        >
          {tf("shortTrips")}
        </Link>
      )}
      <SearchField
        trigger="text"
        place={p.place}
        month={p.month}
        onChange={p.onWhereWhen}
        onClose={p.onWhereWhenClose}
        autoOpen={p.autoOpen}
      />
      {(
        <>
          <BarCategories buttonClass={hdrItem} label={tThemes("menuLabel")} themesLabel={tThemes("themes")} all={options}
            value={p.vibes}
            sub={p.sub}
            onSelect={p.onTheme}
            onSelectSub={p.onSubTheme}
          />
          <span ref={filtersRef} className="contents">
            <button
              type="button"
              {...(p.filtersTrigger ?? { onClick: p.onFilters })}
              aria-expanded={p.filtersOpen}
              aria-haspopup="dialog"
              aria-label={
                p.filterCount > 0
                  ? tf("filtersCount", { count: p.filterCount })
                  : t("filters")
              }
              className={hdrItem}
            >
              {t("filters")}
            </button>
          </span>
        </>
      )}
    </div>
  );
}

/** The start page and the result pages without Explore's own state: the entries lead to Explore with the choice set. */
export function HeaderCenterNav() {
  const router = useRouter();
  const [picked, setPicked] = useState<{
    place: string | null;
    month: string | null;
  }>({ place: null, month: null });
  // The latest choice for the close handler (the sheet calls onClose right after the month's onChange).
  const latest = useRef(picked);
  const go = (params: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    router.push(q.size ? `/explore?${q}` : "/explore");
  };
  const reset = () => {
    latest.current = { place: null, month: null };
    setPicked(latest.current);
  };
  return (
    <HeaderCenter
      place={picked.place}
      month={picked.month}
      onWhereWhen={(change) => {
        const next = { ...latest.current, ...change };
        latest.current = next;
        setPicked(next);
        if ("month" in change) {
          reset();
          go({ place: next.place, month: next.month });
        }
      }}
      onWhereWhenClose={() => {
        if (latest.current.place) {
          const place = latest.current.place;
          reset();
          go({ place });
        }
      }}
      shortTrips={false}
      vibes={[]}
      sub={null}
      onTheme={(vibe) => go({ vibe })}
      onSubTheme={(parent, sub) => go({ vibe: parent, sub })}
      filterCount={0}
      onFilters={() => go({ open: "filters" })}
    />
  );
}
