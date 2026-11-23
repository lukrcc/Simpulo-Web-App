"use client";

// The header's middle from 1100px (CLAUDE.md "Kopfleiste neu geordnet", "ruhiger Feinschliff"): "⌕ Where" · "When" · "Short trips" ·
// "Themes ▾" · "Filters ▾" (no line between them, no count on Filters – the active filters show as chips on the page) – plain words, no capsules, centred between the logo and the right group. Explore passes its filter state
// (ExploreFeed portals it into the bar's slot); every other page gets HeaderCenterNav, whose entries lead to Explore.
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type Ref } from "react";
import { BarCategories } from "@/components/explore/Filters";
import { SearchField } from "@/components/explore/SearchFields";
import { TOP_CATEGORIES, VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { VIBES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { hdrItem } from "./headerItem";

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
  onWhereWhen: (change: { place?: string | null; month?: string | null }) => void;
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
  /** The element All filters' sheet hangs under */
  filtersRef?: Ref<HTMLSpanElement>;
}

export function HeaderCenter({ filtersRef, ...p }: HeaderCenterProps) {
  const t = useTranslations("explore");
  const tf = useTranslations("explore.filtersUi");
  const tThemes = useTranslations("explore.barThemes");
  const format = useFormat();
  const options = useMemo(() => VIBES.map((v) => ({ value: v.key, label: format.vibe(v.key), icon: VIBE_ICONS[v.key] })), [format]);
  return (
    <div data-header-center className="flex min-w-0 items-center gap-1">
      <SearchField trigger="text" place={p.place} month={p.month} onChange={p.onWhereWhen} onClose={p.onWhereWhenClose} autoOpen={p.autoOpen} />
      <button type="button" aria-pressed={p.shortTrips} aria-label={tf("shortTrips")} data-on={p.shortTrips ? "" : undefined} onClick={p.onShortTrips} className={cn(hdrItem, "hdr-short-trips")}>
        <Bolt />
        <span className="hdr-short-trips-label">{tf("shortTrips")}</span>
      </button>
      <BarCategories menuOnly buttonClass={hdrItem} label={tThemes("themes")} moreLabel={tThemes("menuLabel")} themesLabel={tThemes("themes")} moreThemesLabel={tThemes("moreThemes")} top={TOP_CATEGORIES} all={options} value={p.vibes} sub={p.sub} onSelect={p.onTheme} onSelectSub={p.onSubTheme} />
      <span ref={filtersRef} className="contents">
        <button type="button" onClick={p.onFilters} aria-expanded={p.filtersOpen} aria-haspopup="dialog" aria-label={p.filterCount > 0 ? tf("filtersCount", { count: p.filterCount }) : t("filters")} className={hdrItem}>
          {t("filters")}
          <ChevronDown aria-hidden className={cn("transition-transform duration-200", p.filtersOpen && "rotate-180")} />
        </button>
      </span>
    </div>
  );
}

/** Every page but Explore: the same middle; its entries lead to Explore with the choice set. */
export function HeaderCenterNav() {
  const router = useRouter();
  const [picked, setPicked] = useState<{ place: string | null; month: string | null }>({ place: null, month: null });
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
