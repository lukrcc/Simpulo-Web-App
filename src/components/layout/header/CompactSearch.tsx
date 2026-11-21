"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { SearchField } from "@/components/explore/SearchFields";
import { panelFilterCount } from "@/lib/exploreFilters";
import { setExploreFilters, useExploreFilters } from "@/lib/exploreFilterState";
import { requestFeedFilters, useFeedOnPage } from "@/lib/exploreBridge";
import { cn } from "@/lib/utils";

/**
 * The header's one search below 1100px (phones' MobileHeader, the tablet's SiteHeader – CLAUDE.md "Kopf unter 1100px"): a light pill across
 * the width – "Where to next? · Any time" or the values ("Bali · Feb") – with a round filter button inside on the right (its small count:
 * the active filters). On a page with the feed (Explore, city and collection pages) a place or month applies at once and the button opens
 * the feed's filter sheet; elsewhere both lead to Explore (?place=&month=, ?open=filters).
 */
export function CompactSearch({ className }: { className?: string }) {
  const t = useTranslations("explore.search");
  const router = useRouter();
  const feed = useFeedOnPage();
  const filters = useExploreFilters();
  // Away from the feed: the choice is gathered, then Explore opens with it (a month – or closing with a place – goes).
  const [picked, setPicked] = useState<{ place: string | null; month: string | null }>({ place: null, month: null });
  const latest = useRef(picked);
  const go = (next: { place: string | null; month: string | null }) => {
    const params = new URLSearchParams();
    if (next.place) params.set("place", next.place);
    if (next.month) params.set("month", next.month);
    setPicked({ place: null, month: null });
    latest.current = { place: null, month: null };
    router.push(params.size ? `/explore?${params}` : "/explore");
  };
  const count = feed ? panelFilterCount(filters) : 0;
  const openFilters = () => {
    if (!requestFeedFilters()) router.push("/explore?open=filters");
  };
  const button = (
    <button
      type="button"
      onClick={openFilters}
      aria-label={count > 0 ? t("filtersButtonCount", { count }) : t("filtersButton")}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text-inverse)/8 transition-colors duration-150 hover:bg-(--text-inverse)/14"
    >
      <SlidersHorizontal aria-hidden className="size-4" />
      {count > 0 && <span aria-hidden className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-eyebrow font-semibold text-on-signal">{count}</span>}
    </button>
  );
  return feed ? (
    <SearchField trigger="pill" className={className} place={filters.place} month={filters.month} onChange={(change) => setExploreFilters({ ...filters, ...change }, Object.keys(change).join(","))} trailing={button} />
  ) : (
    <SearchField
      trigger="pill"
      className={cn(className)}
      place={picked.place}
      month={picked.month}
      onChange={(change) => {
        const next = { ...latest.current, ...change };
        latest.current = next;
        setPicked(next);
        if ("month" in change) go(next);
      }}
      onClose={() => {
        if (latest.current.place) go(latest.current);
      }}
      trailing={button}
    />
  );
}
