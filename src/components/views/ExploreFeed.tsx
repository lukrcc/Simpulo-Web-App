"use client";

import { CompactExploreBar } from "@/components/layout/header/CompactExploreBar";
import { expandExploreHeader, useExploreCompactWatch } from "@/lib/exploreCompact";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, Fragment, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { SpotlightCoverflow } from "@/components/SpotlightCoverflow";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/lib/usePagedList";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { CollectionRow } from "@/components/explore/CollectionRow";
import { PeopleGoingRow, usePeopleGoing } from "@/components/explore/PeopleGoingRow";
import { CategoryRow, FiltersButton, PriceFilter, SortCapsule, SortList, type CheckOption } from "@/components/explore/Filters";
import { EXPLORE_GRID, EXPLORE_SPACING, FILTER_ICONS, pageSize, SPOTLIGHT_MIN, VIBE_ICONS, VISIBLE_CHIPS } from "@/config/explore";
import { Container } from "@/components/layout/Container";
import { ExploreFilterBar, scrollUnderHeader } from "@/components/explore/ExploreFilterBar";
import { ExplorePrelaunch } from "@/components/explore/ExplorePrelaunch";
import { InForTile, NearbyShelf, NoHouseYet, NotifyLine, OpenHereTile } from "@/components/explore/NoHouseYet";
import { MonthField, PlaceField, SearchField, ShortTripsToggle } from "@/components/explore/SearchFields";
import { FilterDropdown, FilterRow, OverflowPickOptions, PickOptions, ToggleChip } from "@/components/explore/FilterPanel";
import { FitChips } from "@/components/explore/FitChips";
import { SpotlightHero } from "@/components/SpotlightHero";
import { HouseCard } from "@/components/HouseCard";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useFeatureFlag } from "@/lib/featureFlags";
import { Sheet } from "@/components/ui/Sheet";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { useFormat } from "@/i18n/format";
import { COLLECTIONS, topStateShelf, type Collection } from "@/lib/collections";
import { citySlugOf } from "@/lib/data/stays";
import {
  activeCount,
  countryOf,
  EMPTY_FILTERS,
  eurRange,
  ACCOMMODATION_KEYS,
  AGE_KEYS,
  HOST_EXPERIENCE_KEYS,
  CREW_SIZE_KEYS,
  LENGTH_KEYS,
  WHO_KEYS,
  matchesFilters,
  panelFilterCount,
  SORT_KEYS,
  SPOTS_MINS,
  withFilters,
  type ExploreFilters,
  type SortKey,
} from "@/lib/exploreFilters";
import { setExploreFilters, useExploreFilters } from "@/lib/exploreFilterState";
import { closeNotchPanel, setNotchStage, useNotchState } from "@/lib/notchState";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { adoptNotchToAuto } from "@/lib/notchState";
import { onePerHost, useHeroStays } from "@/lib/heroRotation";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { SPOTLIGHT_VISIBLE, withoutSpotlightUpFront } from "@/lib/exploreLayout";
import { placeById } from "@/lib/data/places";
import { MD_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { VIBES } from "@/lib/catalog";
import { hasHeadStart, isListedStay, isPreLaunch } from "@/lib/launch";
import { findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { answersSlowly, responseRate } from "@/lib/requests";
import { useNow } from "@/lib/useNow";
import { useGridColumns } from "@/lib/useGridColumns";

/** The Spotlight loops over at most this many Houses. */
const MAX_SPOTLIGHT = 16;
/** Cards per page of the grid ("Show more" adds about as many): rounded up to full rows, so every page ends on a straight edge. */
const PAGE_SIZE = pageSize;
const stayKey = (stay: Stay) => stay.id;
/** Budget slider ends are rounded to this (EUR). */
const BUDGET_ROUND = 50;

/** What a page's feed is limited to: a collection, a city or a vibe (their own pages). None = Explore itself. */
export type FeedScope = { collection: Collection["id"] } | { citySlug: string } | { vibe: Vibe };

function inScope(stay: Stay, scope: FeedScope | undefined): boolean {
  if (!scope) return true;
  if ("collection" in scope) return COLLECTIONS.find((c) => c.id === scope.collection)?.filter(stay) ?? false;
  if ("citySlug" in scope) return citySlugOf(stay) === scope.citySlug;
  return stay.vibe === scope.vibe;
}

interface ExploreFeedProps {
  scope?: FeedScope;
  /** The page brings its own heading and layout (city / vibe pages): no H1, no Container of its own */
  headless?: boolean;
}

/**
 * The Explore grid with its filters – on Explore itself and, scoped, on the collection, city and vibe pages. Filters
 * are multi-select (OR within one, AND across them) and live in the URL. Spotlight and collection rows only on the
 * unscoped, unfiltered Explore.
 */
export function ExploreFeed({ scope, headless = false }: ExploreFeedProps = {}) {
  const t = useTranslations("explore");
  const tf = useTranslations("explore.filtersUi");
  const tCollections = useTranslations("explore.collections");
  const tc = useTranslations("common");
  const format = useFormat();
  const store = useStore();
  // The one filter state – in the URL (src/lib/exploreFilterState.ts); every control below reads and writes only it.
  const filters = useExploreFilters();
  const [sheetOpen, setSheetOpenState] = useState(false);
  const panelOpenRef = useRef(false);
  const scrollAfterPanel = useRef(false);
  const setSheetOpen = (next: boolean) => {
    panelOpenRef.current = next;
    setSheetOpenState(next);
  };
  // With a mouse the panel is the header tab's third stage; on touch (and phones) the same content is a bottom sheet.
  const { mode: tabMode, panelSlot } = useNotchState();
  const mouse = useMediaQuery("(pointer: fine) and (min-width: 48rem)");
  const tabPanel = tabMode === "panel";
  const panelOpen = sheetOpen || tabPanel;
  const wasTabPanel = useRef(false);
  useEffect(() => {
    if (wasTabPanel.current === tabPanel) return;
    wasTabPanel.current = tabPanel;
    panelOpenRef.current = tabPanel;
    if (tabPanel || !scrollAfterPanel.current) return;
    // Filters changed while it was open: to the grid, now that it has gone.
    scrollAfterPanel.current = false;
    scrollUnderHeader(resultsRef.current);
  }, [tabPanel]);
  const collection = scope && "collection" in scope ? COLLECTIONS.find((c) => c.id === scope.collection) : undefined;

  const resultsRef = useRef<HTMLDivElement>(null);
  const gridEndRef = useRef<HTMLDivElement>(null);
  // Every change goes into the URL right away (no navigation), so it can be shared and survives a reload. The page then
  // glides to the start of the House list, its top just under the header (with its filter row).
  const setFilters = useCallback((next: ExploreFilters, key?: string) => {
    setExploreFilters(next, key);
    adoptNotchToAuto();
    // Behind the panel the page is locked: it goes to the grid when the panel has gone.
    if (panelOpenRef.current) scrollAfterPanel.current = true;
    else requestAnimationFrame(() => scrollUnderHeader(resultsRef.current));
  }, []);
  const update = (patch: Partial<ExploreFilters>) => setFilters({ ...filters, ...patch }, Object.keys(patch).join(","));

  // Houses of people you blocked never show up.
  const blocked = settingsOf(getCurrentUser(store)).blockedUserIds;
  const listed = useMemo(() => store.stays.filter((s) => (isListedStay(s) || hasHeadStart(s, store.houseInvites, store.currentUserId)) && !blocked.includes(s.hostId)), [store.stays, store.houseInvites, store.currentUserId, blocked]);
  const base = useMemo(() => listed.filter((s) => inScope(s, scope)), [listed, scope]);
  // The hero (bento / carousel): open Houses with a free spot that haven't started, in the session's weighted order.
  const candidates = useHeroStays(listed, (s) => findUser(store, s.hostId));
  // One House per host.
  const featured = useMemo(() => onePerHost(candidates), [candidates]);
  const spotlightStays = useMemo(() => featured.slice(0, MAX_SPOTLIGHT), [featured]);

  const verifiedHosts = useMemo(() => new Set(store.users.filter((u) => u.verified).map((u) => u.id)), [store.users]);
  // Hosts who let many requests expire (under 70 % answered, last 90 days; internal, never shown) sit a little lower in the default order.
  // The browser's clock (none during the prerender), to the day: the order doesn't move while you look at it.
  const now = useNow();
  const today = now === null ? null : Math.floor(now / 86_400_000) * 86_400_000;
  const slowHosts = useMemo(
    () => (today === null ? new Set<string>() : new Set([...new Set(store.stays.map((s) => s.hostId))].filter((id) => answersSlowly(responseRate(store, id, today))))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only stays and requests decide it
    [store.stays, store.joinRequests, today],
  );
  const hostPremium = useFeatureFlag("hostPremium");

  // Options with how many Houses each would show alongside the other filters.
  const languageOptions = useMemo<CheckOption[]>(
    () =>
      [...new Set(base.map((s) => s.language).filter(Boolean))]
        .map((code) => ({ value: code, label: format.language(code), count: base.filter((s) => s.language === code && matchesFilters(s, filters, "languages", verifiedHosts)).length }))
        .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    [base, filters, format, verifiedHosts],
  );
  const budgetBounds = useMemo(() => {
    const ranges = base.map(eurRange).filter((r): r is { min: number; max: number } => r !== null);
    if (ranges.length === 0) return null;
    return {
      min: Math.floor(Math.min(...ranges.map((r) => r.min)) / BUDGET_ROUND) * BUDGET_ROUND,
      max: Math.ceil(Math.max(...ranges.map((r) => r.max)) / BUDGET_ROUND) * BUDGET_ROUND,
    };
  }, [base]);
  // A vibe page has one vibe: no category chips there. (The panel always shows all of its sections.)
  const showVibes = !(scope && "vibe" in scope);
  const vibeOptions = useMemo(() => VIBES.map((v) => ({ value: v.key, label: format.vibe(v.key), icon: VIBE_ICONS[v.key] })), [format]);
  // Categories by how many Houses they have here (ties: the usual order) – the row's fixed chips come from the top.
  const vibesByCount = useMemo(
    () =>
      VIBES.map((v, i) => ({ key: v.key, i, count: base.filter((s) => s.vibe === v.key).length }))
        .toSorted((a, b) => b.count - a.count || a.i - b.i)
        .map((v) => v.key),
    [base],
  );
  const fixedVibes: readonly string[] = vibesByCount.slice(0, VISIBLE_CHIPS - 1);
  // The row's last chip: the 8th by count, or whatever was picked from "More" (also via the URL or the panel).
  const [slotVibe, setSlotVibe] = useState<string | null>(null);
  const single = filters.vibes.length === 1 ? filters.vibes[0] : null;
  if (single && !fixedVibes.includes(single) && slotVibe !== single) setSlotVibe(single);
  const lastVibe = slotVibe && !fixedVibes.includes(slotVibe) ? slotVibe : vibesByCount[VISIBLE_CHIPS - 1];
  // The price histogram: each House's price per person (the middle of a budget range), in EUR.
  const prices = useMemo(() => base.map(eurRange).flatMap((r) => (r ? [(r.min + r.max) / 2] : [])), [base]);
  const currency = usePreferredCurrency() ?? "EUR";
  const sortOptions = SORT_KEYS.map((key) => ({ value: key, label: t(`sortOptions.${key}`) }));

  const results = base
    .filter((s) => matchesFilters(s, filters, undefined, verifiedHosts))
    .toSorted(
      (a, b) =>
        // Houses that aren't taking requests go after the open ones, each group in the chosen order.
        Number(!a.acceptingRequests) - Number(!b.acceptingRequests) ||
        compareBy(filters.sort, a, b, slowHosts),
    );
  const countryCount = new Set(results.map(countryOf)).size;
  const resultLabel = tc("houses", { count: results.length });

  // Layout: a plain grid of equal cards, cut into sections of complete rows (see lib/exploreLayout). Everything below
  // follows from the real counts – the mock's data presets only change what's there.
  const [columnProbe, setColumnProbe] = useState<HTMLDivElement | null>(null);
  const cols = useGridColumns(columnProbe);
  const filtered = activeCount(filters) > 0;
  // A scoped page (collection, city, vibe) shows a plain grid: no Spotlight, no collection rows.
  const scoped = scope !== undefined;
  const showSpotlight = !scoped && featured.length >= SPOTLIGHT_MIN;
  // The Spotlight's Houses don't open the grid as well.
  const spotlightIds = useMemo(() => new Set(showSpotlight ? featured.slice(0, SPOTLIGHT_VISIBLE).map((s) => s.id) : []), [featured, showSpotlight]);
  const ordered = withoutSpotlightUpFront(results, spotlightIds, cols || 4);

  // Paging: 24 cards (up to full rows), then "Show 24 more" – only on a click, each page by cursor from the data layer. A new filter or sort
  // starts at the first page again.
  const pageKey = withFilters(new URLSearchParams(), filters);
  const toFullRows = (n: number) => (cols > 0 ? Math.ceil(n / cols) * cols : n);
  const paging = usePagedList({ list: ordered, keyOf: stayKey, resetKey: pageKey, firstCount: toFullRows(PAGE_SIZE), nextCount: (loaded) => toFullRows(loaded + PAGE_SIZE) - loaded });
  const cards = paging.items;
  // Fewer results than the grid has columns (measured): a dashed tile and a "Nearby" shelf fill in.
  const few = cols > 0 && results.length > 0 && results.length < cols;

  // Under the Spotlight, before the grid: at most two shelves – "Your people are going" (from one House), then one by state (Just opened, else
  // Starting soon, else Short trips; from 4). Only while browsing: searching (a chip or filter on), or a scoped page, has none.
  const peopleGoing = usePeopleGoing();
  // Not during the prerender (the shelves read the clock): only once the browser's clock is there.
  const browsing = !scoped && !filtered && !headless && today !== null;
  const showPeople = browsing && peopleGoing.length > 0;
  const stateShelf = useMemo(
    () => (browsing ? topStateShelf(base.toSorted((a, b) => Number(!a.acceptingRequests) - Number(!b.acceptingRequests) || compareBy(EMPTY_FILTERS.sort, a, b, slowHosts)), new Set(showPeople ? peopleGoing.map((s) => s.id) : [])) : null),
    [browsing, base, slowHosts, showPeople, peopleGoing],
  );
  // What this search would be saved as ("Notify me").
  const draft = useMemo(() => ({ place: placeById(filters.place), month: filters.month, category: filters.vibes[0] ?? null }), [filters.place, filters.month, filters.vibes]);
  const searched = draft.place !== null || draft.month !== null;

  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  const rowVibes = [...fixedVibes, ...(lastVibe ? [lastVibe] : [])];
  const rowOptions = rowVibes.map((key) => vibeOptions.find((o) => o.value === key)!).filter(Boolean);
  const moreOptions = vibeOptions.filter((o) => !rowVibes.includes(o.value));

  // Explore (not the city / vibe pages): from md the chips, Sort and Filters are Open Houses' row and the header's tab (ExploreFilterBar);
  // on phones they are a sticky row of their own at the top.
  const md = useMediaQuery(MD_QUERY);
  const inBar = !headless && md;


  // What Filters counts and clears: what the panel holds – sorting and the four filters, not the category chips.
  const panelCount = panelFilterCount(filters);
  const clearPanel = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });

  /** The category chips – the filter row's (32px) or the compact bar's (32px); one choice in the row (several only
   *  in the panel), a pick from More takes the last slot. */
  const vibeRow = {
    label: t("filterByVibe"),
    allLabel: t("all"),
    moreLabel: t("more"),
    chips: rowOptions,
    more: moreOptions,
    value: filters.vibes,
    onSelect: (vibe: string | null) => {
      if (vibe && !fixedVibes.includes(vibe)) setSlotVibe(vibe);
      update({ vibes: vibe ? [vibe as Vibe] : [] });
    },
  };
  const openOfVibe = (vibe: Vibe) => listed.filter((s) => s.vibe === vibe && s.acceptingRequests).length;
  const chipRow = showVibes && <CategoryRow {...vibeRow} />;
  const preLaunch = !scoped && isPreLaunch(store.stays);
  // Explore itself (not a city / vibe / collection page, not before the launch): scrolled down, header and filters become one compact bar.
  const compactBar = !scoped && !headless && !preLaunch;
  useExploreCompactWatch(compactBar);
  // Before the launch: no Spotlight, no grid. The slogan and the same search, ending where an empty result ends.
  if (preLaunch) return <ExplorePrelaunch />;

  const useTab = inBar && mouse;
  const openPanel = () => (useTab ? setNotchStage(2) : setSheetOpen(true));
  // Shortcuts only with enough Houses to pay off (src/config/explore.ts); the panel has everything anyway.
  const controls = (
    <>
      <SortCapsule label={t(`sortOptions.${filters.sort}`)}>
        <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
      </SortCapsule>
      <FiltersButton count={panelCount} onClick={openPanel} expanded={panelOpen} />
    </>
  );
  const fields = (
    <>
      <SearchField place={filters.place} month={filters.month} onChange={update} />
      <ShortTripsToggle
        label={tf("shortTrips")}
        active={filters.lengths.includes("weekend")}
        onToggle={() => update({ lengths: filters.lengths.includes("weekend") ? filters.lengths.filter((l) => l !== "weekend") : [...filters.lengths, "weekend"] })}
      />
    </>
  );
  const one = <T,>(value: T | null): T[] => (value === null ? [] : [value]);
  const panelBody = (
    // Rows: the label left (150px), the content right, 16px above and below, a 1px line (ink 7 %) between. No "Any": nothing picked means
    // all. Compact enough to fit without scrolling at 1440 × 900.
    <div className="flex flex-col divide-y divide-ink/7">
      {/* The sort, here too: the compact bar has no room for it (it sits beside "Open Houses" and in the tab otherwise). */}
      <FilterRow label={t("sort")}>
        <PickOptions label={t("sort")} options={sortOptions} value={[filters.sort]} onChange={(sort) => sort[0] && update({ sort: sort[0] })} />
      </FilterRow>
      <FilterRow label={tf("whereWhenRow")}>
        <div className="grid grid-cols-2 gap-3">
          <PlaceField size="panel" value={filters.place} onChange={(place) => update({ place })} className="w-full max-w-none" />
          <MonthField size="panel" value={filters.month} onChange={(month) => update({ month })} className="w-full" />
        </div>
      </FilterRow>
      {showVibes && (
        <FilterRow label={tf("category")} count={filters.vibes.length}>
          <OverflowPickOptions label={tf("category")} options={vibeOptions} value={filters.vibes} onChange={(vibes) => update({ vibes: vibes as Vibe[] })} />
        </FilterRow>
      )}
      <FilterRow label={tf("length")} count={filters.lengths.length}>
        <PickOptions multiple label={tf("length")} options={LENGTH_KEYS.map((key) => ({ value: key, label: tf(`lengthOptions.${key}`) }))} value={filters.lengths} onChange={(lengths) => update({ lengths })} />
      </FilterRow>
      {/* Crew size: its own row, the label on the left like Length. */}
      <FilterRow label={tf("crewSize")} count={filters.crewSizes.length}>
        <PickOptions multiple label={tf("crewSize")} options={CREW_SIZE_KEYS.map((key) => ({ value: key, label: key.replace("-", "–") }))} value={filters.crewSizes} onChange={(crewSizes) => update({ crewSizes })} />
      </FilterRow>
      <FilterRow label={tf("price")} aside={<CurrencyPicker />}>
        {budgetBounds ? (
          <PriceFilter bounds={budgetBounds} prices={prices} value={filters.budget} onChange={(budget) => update({ budget })} currency={currency} />
        ) : (
          <p className="text-small text-muted">{tf("noBudget")}</p>
        )}
      </FilterRow>
      <FilterRow label={tf("moreRow")}>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown icon={FILTER_ICONS.who} label={tf("who")} options={WHO_KEYS.map((key) => ({ value: key, label: tf(`whoOptions.${key}`) }))} value={one(filters.who)} onChange={(v) => update({ who: v[0] ?? null })} />
          <FilterDropdown icon={FILTER_ICONS.age} label={tf("age")} options={AGE_KEYS.map((key) => ({ value: key, label: tf(`ageOptions.${key}`) }))} value={one(filters.age)} onChange={(v) => update({ age: v[0] ?? null })} />
          <FilterDropdown icon={FILTER_ICONS.accommodation} label={tf("accommodation")} options={ACCOMMODATION_KEYS.map((key) => ({ value: key, label: tf(`accommodationOptions.${key}`) }))} value={one(filters.accommodation)} onChange={(v) => update({ accommodation: v[0] ?? null })} />
          <FilterDropdown icon={FILTER_ICONS.spots} label={tf("spots")} options={SPOTS_MINS.map((n) => ({ value: n, label: tf("spotsOptions.atLeast", { count: n }) }))} value={one(filters.spots)} onChange={(v) => update({ spots: v[0] ?? null })} />
          {languageOptions.length > 0 && (
            <FilterDropdown
              multiple
              icon={FILTER_ICONS.language}
              label={t("language")}
              options={languageOptions.map((o) => ({ value: o.value, label: o.label, hint: String(o.count) }))}
              value={filters.languages}
              onChange={(languages) => update({ languages })}
            />
          )}
          {/* Host experience only with its feature flag. */}
          {hostPremium && (
            <FilterDropdown icon={FILTER_ICONS.hostExperience} label={tf("hostExperience")} options={HOST_EXPERIENCE_KEYS.map((key) => ({ value: key, label: tf(`hostExperienceOptions.${key}`) }))} value={one(filters.hostExperience)} onChange={(v) => update({ hostExperience: v[0] ?? null })} />
          )}
          <ToggleChip icon={FILTER_ICONS.verified} label={tf("verifiedChip")} on={filters.verifiedOnly} onChange={(verifiedOnly) => update({ verifiedOnly })} />
        </div>
      </FilterRow>
    </div>
  );
  const panelFooter = (close: () => void) => (
    <>
      {/* Only when something is set; otherwise the primary keeps its place on the right. */}
      {panelCount > 0 || filters.vibes.length > 0 ? (
        <button type="button" onClick={clearPanel} className="text-body font-semibold text-ink underline underline-offset-4 transition-colors hover:text-ink/70">
          {tf("clearAll")}
        </button>
      ) : (
        <span />
      )}
      {/* The panel's one primary: it only closes – the filters apply live. */}
      {/* In the dark header the panel's one main action is cream (the light header: ink). */}
      <Button variant="primary" size="md" onClick={close}>
        {/* One span: inside the button's flex row, "Show", the number and "houses" would each be an item with 8px gaps instead of spaces. */}
        <span>{tf.rich("show", { count: results.length, num: () => <RollingNumber value={results.length} /> })}</span>
      </Button>
    </>
  );
  const Wrap = headless ? Fragment : Container;
  const RowWrap = headless ? "div" : Container;
  return (
    <div className="explore-root">
      {compactBar && (
        <CompactExploreBar
          search={<SearchField place={filters.place} month={filters.month} onChange={update} />}
          shortTrips={
            <ShortTripsToggle
              label={tf("shortTrips")}
              active={filters.lengths.includes("weekend")}
              onToggle={() => update({ lengths: filters.lengths.includes("weekend") ? filters.lengths.filter((l) => l !== "weekend") : [...filters.lengths, "weekend"] })}
            />
          }
          categories={showVibes && <CategoryRow {...vibeRow} icons arrow />}
          // "All filters" opens the panel in the header's tab: the full header comes back first.
          filters={
            <FiltersButton
              variant="compact"
              count={panelCount}
              expanded={panelOpen}
              onClick={() => {
                if (useTab) expandExploreHeader();
                openPanel();
              }}
            />
          }
          mobileFilters={<FiltersButton variant="icon" count={panelCount} expanded={panelOpen} onClick={openPanel} />}
        />
      )}
      {/* City / vibe pages, and phones: the chips, Sort and Filters as a plain sticky row at the top of the page. */}
      {!inBar && (
        <div className={cn("filter-row header-surface sticky top-(--header-total) z-30", !headless && "md:hidden")}>
          <RowWrap className="flex h-(--filter-row-h) items-center gap-3">
            <div className="min-w-0 flex-1">{chipRow}</div>
            <div className="flex shrink-0 items-center gap-2">{controls}</div>
          </RowWrap>
        </div>
      )}
      {/* Carousel below lg, bento block from lg up – each hides itself at the other size. */}
      {showSpotlight && (
        <>
          {/* Below lg the carousel is another component; the title for visitors goes above it here. */}
          <SpotlightHero stays={spotlightStays} />
          <SpotlightCoverflow stays={spotlightStays} countOf={openOfVibe} onPickVibe={vibeRow.onSelect} />
        </>
      )}

      {/* The sections: transparent over PageGlow's patches, at most 1440px wide, 72px apart, each with the same head (SectionHeader
          "explore") 24px over its content. All the values: EXPLORE_SPACING. */}
      <Wrap>
        <div data-explore-blocks>
          <FullBleedSection inner={headless ? undefined : "explore-width"} padding={cn(showSpotlight ? EXPLORE_SPACING.underHero : EXPLORE_SPACING.scopedTop, EXPLORE_SPACING.feedEnd)}>
            {/* 1. "Your people are going" · 2. Just opened (or Starting soon, or Short trips) – then the grid. */}
            {showPeople && (
              <div className="mb-18">
                <PeopleGoingRow />
              </div>
            )}
            {stateShelf && (
              <div className="mb-18">
                <CollectionRow collection={stateShelf.collection} stays={stateShelf.stays} />
              </div>
            )}
            {!headless && (
              <>
                {/* The page's one H1 (Explore is the home page; a /collections page is titled by its collection). Right on its baseline the
                    sort; the filters follow in their one row under it. */}
                <SectionHeader
                  as="h1"
                  variant="explore"
                  eyebrow={collection ? tCollections(`${collection.id}.eyebrow`) : t("allEyebrow")}
                  title={collection ? tCollections(`${collection.id}.title`) : t("title")}
                  subline={filtered ? resultLabel : t("summary", { houses: resultLabel, countries: tc("countries", { count: countryCount }) })}
                  action={
                    inBar && (
                      <SortCapsule variant="tertiary" label={t(`sortOptions.${filters.sort}`)}>
                        <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
                      </SortCapsule>
                    )
                  }
                />
                {/* From md: the one filter row, here under the head; once it's gone under the header, the header's tab has it (with the sort). */}
                <ExploreFilterBar
                  gridEndRef={gridEndRef}
                  handle={!scoped}
                  fields={fields}
                  chips={
                    showVibes && (
                      <FitChips
                        options={[...rowOptions, ...moreOptions]}
                        labels={{ row: t("filterByVibe"), all: t("all"), more: t("more") }}
                        value={filters.vibes}
                        onSelect={vibeRow.onSelect}
                      />
                    )
                  }
                  // The tab: the sort, 16px before the corner block; "All filters" fills the tab's right corner – the row's strongest element.
                  controls={
                    <SortCapsule label={t(`sortOptions.${filters.sort}`)}>
                      <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
                    </SortCapsule>
                  }
                  // In the page the row ends with "All filters" as an ink capsule.
                  pageEnd={<FiltersButton variant="strong" count={panelCount} onClick={openPanel} expanded={panelOpen} />}
                  corner={<FiltersButton variant="corner" count={panelCount} onClick={openPanel} expanded={panelOpen} />}
                />
                {/* Logged out on mobile there's no tab bar – this is the way to the questions (plus the footer). */}
                {!store.currentUserId && (
                  <Link href="/faq" className={buttonStyles("tertiary", "md", "mt-1 min-h-11 md:hidden")}>
                    {t("howItWorksLink")}
                  </Link>
                )}
              </>
            )}
            {/* Where a filter change scrolls to: the grid's start right under the tab. */}
            <div ref={resultsRef} data-explore-results className={!headless ? EXPLORE_SPACING.headContent : undefined}>
              <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />
              {results.length === 0 ? (
                // Nothing: open this House, or save the search – and what's closest.
                <NoHouseYet draft={draft} stays={base} title={searched ? undefined : t("noResults.title")} onClear={filtered ? clearFilters : undefined} />
              ) : (
                <>
                  <FeedGrid cards={cards} fresh={paging.fresh} after={
                      few && (
                        <>
                          <OpenHereTile draft={draft} />
                          <InForTile draft={draft} />
                        </>
                      )
                    } />
                  {/* Fewer than a row: the dashed "Open a House here" closes it, a shelf "Nearby" follows. */}
                  {few && <NearbyShelf draft={draft} stays={base} results={results} />}
                </>
              )}
              {/* The list's end: here the header's tab closes again. */}
              <div ref={gridEndRef} aria-hidden className="h-0" />
              {/* 48px under the grid: how far you are, "Show 24 more" – or, all loaded, "That's all 100 houses" + "Open your own →". */}
              <LoadMore
                shown={cards.length}
                total={paging.total}
                nextCount={paging.nextCount}
                loading={paging.loading}
                onLoadMore={paging.loadMore}
                paged={paging.paged}
                doneLink={{ href: "/create", label: tc("loadMore.openOwn") }}
                className={EXPLORE_SPACING.showMore}
              />
              {results.length > 0 && !few && <NotifyLine draft={draft} className={EXPLORE_SPACING.showMore} />}
            </div>
          </FullBleedSection>
        </div>
      </Wrap>

      {/* The filter panel: with a mouse in the header's tab, its third stage. Live – the footer only clears or closes. */}
      {useTab &&
        panelSlot &&
        createPortal(
          // As high as its content, never more than the window minus the header and 48px (the tab's 12px above and 24px below the content
          // included); compact enough not to scroll at 1440 × 900. Only on a very low window does the middle scroll – head and foot stay.
          <div data-filter-panel role="group" aria-label={t("filters")} className="flex max-h-[calc(100vh-var(--band-h)-140px)] flex-col">
            <div className="flex shrink-0 items-center gap-3 pb-5">
              <h2 className="text-h3 text-ink">{t("filters")}</h2>
              <span className="text-small text-muted">{resultLabel}</span>
              <button type="button" onClick={closeNotchPanel} aria-label={tc("close")} className="press ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink transition-colors duration-150 hover:bg-ink/10">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1">{panelBody}</div>
            <div className="mt-5 flex shrink-0 items-center justify-between gap-4 border-t border-ink/8 pt-4">{panelFooter(closeNotchPanel)}</div>
          </div>,
          panelSlot,
        )}
      {/* Touch and phones: the same content as a bottom sheet. */}
      <Sheet
        variant="panel"
        wide
        titleNote={resultLabel}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onClosed={() => {
          if (scrollAfterPanel.current) scrollUnderHeader(resultsRef.current);
          scrollAfterPanel.current = false;
        }}
        title={t("filters")}
        footer={panelFooter(() => setSheetOpen(false))}
      >
        <div data-filter-panel className="px-6">
          {panelBody}
        </div>
      </Sheet>

    </div>
  );
}

/** The list's grid. */
function FeedGrid({ cards, fresh, after }: { cards: readonly Stay[]; /** The page that just came: it fades in */ fresh?: ReadonlySet<string>; /** One more tile after the cards */ after?: ReactNode }) {
  const store = useStore();
  return (
    <div className={EXPLORE_GRID}>
      {cards.map((stay) => (
        <HouseCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} className={fresh?.has(stay.id) ? "animate-page-in" : undefined} />
      ))}
      {after}
    </div>
  );
}

/** How far back a slow host's House moves in the default order: as if it started this many days later. */
const SLOW_HOST_SHIFT_DAYS = 7;

/**
 * The chosen order: soonest start, lowest price per person (≈ EUR, Houses without a price last) or just opened. "Soonest" is the default (the
 * recommended order): a host who answers under 70 % of requests counts as starting a week later there – lower, never hidden.
 */
function compareBy(sort: SortKey, a: Stay, b: Stay, slowHosts?: ReadonlySet<string>): number {
  if (sort === "soonest") {
    const start = (s: Stay) => Date.parse(s.startDate) + (slowHosts?.has(s.hostId) ? SLOW_HOST_SHIFT_DAYS * 86_400_000 : 0);
    return start(a) - start(b) || a.startDate.localeCompare(b.startDate);
  }
  if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
  const price = (s: Stay) => eurRange(s)?.min ?? Number.POSITIVE_INFINITY;
  return price(a) - price(b) || a.startDate.localeCompare(b.startDate);
}
