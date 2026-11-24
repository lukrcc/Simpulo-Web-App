"use client";

// The header's middle from 1100px (CLAUDE.md "Kopfleiste neu geordnet", "ruhiger Feinschliff"): "⌕ Where" · "When" · "Short trips" ·
// "Themes ▾" · "Filters ▾" (no line between them, no count on Filters – the active filters show as chips on the page) – plain words, no capsules, centred between the logo and the right group. Explore passes its filter state
// (ExploreFeed portals it into the bar's slot); every other page gets HeaderCenterNav, whose entries lead to Explore.
import { ChevronDown } from "lucide-react";
import type { PanelHandlers } from "./HeaderPanel";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { BarCategories } from "@/components/explore/Filters";
import { SearchField } from "@/components/explore/SearchFields";
import { VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { VIBES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { hdrItem } from "./headerItem";

/** Room kept between the middle and each side group. */
const CENTER_AIR = 24;
/** How many steps the middle can move together (0 = as it is). */
const SQUEEZE_STEPS = 3;

/** Short trips' mark – neutral now (no orange in the calm bar), in the words' colour. */
function Bolt() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.2 1.6 5.6 13.4a.6.6 0 0 0 .5 1h5.2l-1.6 7.5c-.1.6.6.9 1 .4l8.6-11.8a.6.6 0 0 0-.5-1h-5.2l1.6-7.5c.1-.6-.6-.9-1-.4Z" />
    </svg>
  );
}

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
  shortTrips: boolean;
  onShortTrips: () => void;
  vibes: readonly string[];
  sub: string | null;
  onTheme: (vibe: string | null) => void;
  onSubTheme: (parent: string, sub: string) => void;
  filterCount: number;
  filtersOpen?: boolean;
  onFilters: () => void;
  /** Only "⌕ Where · When" (every page but the start page and Explore) */
  compact?: boolean;
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
  // group) – too wide, it moves together step by step (globals.css [data-squeeze]: 1 Short trips only its bolt · 2 tighter entries · 3 Where ·
  // When only its magnifier while nothing is chosen) before the grid would push it off the middle.
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
      className="flex min-w-0 items-center gap-1"
    >
      {/* ⚡ Short trips · ⌕ Search · Themes ▾ · Filters ▾ (CLAUDE.md "Persönliche Navigation als schwebende Leiste unten"); compact: only Search. */}
      {!p.compact && (
        <button
          type="button"
          aria-pressed={p.shortTrips}
          aria-label={tf("shortTrips")}
          data-on={p.shortTrips ? "" : undefined}
          onClick={p.onShortTrips}
          className={cn(hdrItem, "hdr-short-trips")}
        >
          <Bolt />
          <span className="hdr-short-trips-label">{tf("shortTrips")}</span>
        </button>
      )}
      <SearchField
        trigger="text"
        place={p.place}
        month={p.month}
        onChange={p.onWhereWhen}
        onClose={p.onWhereWhenClose}
        autoOpen={p.autoOpen}
      />
      {!p.compact && (
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
              <ChevronDown
                aria-hidden
                className={cn(
                  "transition-transform duration-200",
                  p.filtersOpen && "rotate-180",
                )}
              />
            </button>
          </span>
        </>
      )}
    </div>
  );
}

/** Every page but Explore: its entries lead to Explore with the choice set – the start page the full group, the others `compact` (only Where · When). */
export function HeaderCenterNav({ compact = false }: { compact?: boolean }) {
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
      compact={compact}
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
      onShortTrips={() => go({ len: "weekend" })}
      vibes={[]}
      sub={null}
      onTheme={(vibe) => go({ vibe })}
      onSubTheme={(parent, sub) => go({ vibe: parent, sub })}
      filterCount={0}
      onFilters={() => go({ open: "filters" })}
    />
  );
}
