"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SpotlightCoverflow } from "@/components/SpotlightCoverflow";
import { CollectionRow } from "@/components/explore/CollectionRow";
import { CategoryRow, ChoiceChips, FilterPanel, FiltersButton, LanguageFilter, MonthSection, PanelSection, PlaceDateSearch, PriceFilter, SortCapsule, SortList, type CheckOption } from "@/components/explore/Filters";
import { EXPLORE_SPACING, GRID_COLUMNS, HOUSE_GRID, SEARCH_INLINE_THRESHOLD, SHELF_EVERY_ROWS, SORT_INLINE_THRESHOLD, SPOTLIGHT_MIN, VISIBLE_CHIPS } from "@/config/explore";
import { DemandCard, InterestRow, useDemandSpots } from "@/components/explore/InterestRow";
import { Container } from "@/components/layout/Container";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExplorePrelaunch } from "@/components/explore/ExplorePrelaunch";
import { FitChips } from "@/components/explore/FitChips";
import { SpotlightHero } from "@/components/SpotlightHero";
import { StayCard } from "@/components/StayCard";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { cardClass } from "@/components/ui/Card";
import { useFormat } from "@/i18n/format";
import { useFormatter } from "next-intl";
import { COLLECTIONS, planShelves, type Collection, type ShelfSlot } from "@/lib/collections";
import { citySlugOf } from "@/lib/data/stays";
import {
  activeCount,
  countryCodeOf,
  countryNameOf,
  countryOf,
  countryRegionOf,
  EMPTY_FILTERS,
  eurRange,
  LENGTH_KEYS,
  matchesFilters,
  panelFilterCount,
  SORT_KEYS,
  SPOTS_MINS,
  withFilters,
  type ExploreFilters,
  type SortKey,
} from "@/lib/exploreFilters";
import { setExploreFilters, useExploreFilters } from "@/lib/exploreFilterState";
import { adoptNotchToAuto, NOTCH_OPEN_TOTAL } from "@/lib/notchState";
import { useHeroStays } from "@/lib/heroRotation";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { getCardVariant, SPOTLIGHT_VISIBLE, withoutSpotlightUpFront } from "@/lib/exploreLayout";
import { WORLD_REGIONS } from "@/lib/interests";
import type { DestinationSpot } from "@/lib/destinations";
import { MD_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { VIBES } from "@/lib/catalog";
import { isListedStay, isPreLaunch } from "@/lib/launch";
import { findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

function subscribeColumns(onChange: () => void) {
  const lists = GRID_COLUMNS.map((q) => window.matchMedia(q.query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

/** 0 on the server and during hydration – the grid then renders without collection rows. */
function useGridColumns(): number {
  return useSyncExternalStore(
    subscribeColumns,
    () => GRID_COLUMNS.find((q) => window.matchMedia(q.query).matches)?.cols ?? 1,
    () => 0,
  );
}

/** The Spotlight loops over at most this many Houses. */
const MAX_SPOTLIGHT = 16;
/** Cards per page of the grid ("Show more" adds as many) – divisible by 1–4 columns, so every page ends on full rows. */
const PAGE_SIZE = 24;
/** Budget slider ends are rounded to this (EUR). */
const BUDGET_ROUND = 50;

type FeedCard = { kind: "stay"; stay: Stay } | { kind: "interest"; spot: DestinationSpot };

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
  const tRegion = useTranslations("explore.interests.regions");
  const tc = useTranslations("common");
  const format = useFormat();
  const formatter = useFormatter();
  const store = useStore();
  // The one filter state – in the URL (src/lib/exploreFilterState.ts); every control below reads and writes only it.
  const filters = useExploreFilters();
  const [panelOpen, setPanelOpen] = useState(false);
  const spots = useDemandSpots().filter((s) => s.count > 0);
  const collection = scope && "collection" in scope ? COLLECTIONS.find((c) => c.id === scope.collection) : undefined;

  const resultsRef = useRef<HTMLDivElement>(null);
  const gridEndRef = useRef<HTMLDivElement>(null);
  // Every change goes into the URL right away (no navigation), so it can be shared and survives a reload. The page then
  // glides to the start of the House list, its top just under the header (with its filter row).
  const setFilters = useCallback((next: ExploreFilters, key?: string) => {
    setExploreFilters(next, key);
    adoptNotchToAuto();
    requestAnimationFrame(() => scrollUnderHeader(resultsRef.current));
  }, []);
  const update = (patch: Partial<ExploreFilters>) => setFilters({ ...filters, ...patch }, Object.keys(patch).join(","));

  // Houses of people you blocked never show up.
  const blocked = settingsOf(getCurrentUser(store)).blockedUserIds;
  const listed = useMemo(() => store.stays.filter((s) => isListedStay(s) && !blocked.includes(s.hostId)), [store.stays, blocked]);
  const base = useMemo(() => listed.filter((s) => inScope(s, scope)), [listed, scope]);
  // The hero (bento / carousel): open Houses with a free spot that haven't started, in the session's weighted order.
  const featured = useHeroStays(listed, (s) => findUser(store, s.hostId));
  const spotlightStays = useMemo(() => featured.slice(0, MAX_SPOTLIGHT), [featured]);

  // Options with how many Houses each would show alongside the other filters.
  const countryOptions = useMemo<CheckOption[]>(() => {
    const codes = [...new Set(base.map((s) => countryCodeOf(countryOf(s))))];
    const regionOrder = (code: string) => WORLD_REGIONS.indexOf(countryRegionOf(code) as (typeof WORLD_REGIONS)[number]);
    return codes
      .map((code) => ({
        value: code,
        label: countryNameOf(code),
        group: countryRegionOf(code) ? tRegion(countryRegionOf(code) as (typeof WORLD_REGIONS)[number]) : tf("otherRegion"),
        count: base.filter((s) => countryCodeOf(countryOf(s)) === code && matchesFilters(s, filters, "countries")).length,
      }))
      // Regions in a fixed order; inside each, countries with Houses for the other filters first.
      .toSorted(
        (a, b) =>
          (regionOrder(a.value) === -1 ? 99 : regionOrder(a.value)) - (regionOrder(b.value) === -1 ? 99 : regionOrder(b.value)) ||
          Number(b.count > 0) - Number(a.count > 0) ||
          a.label.localeCompare(b.label),
      );
  }, [base, filters, tRegion, tf]);
  const languageOptions = useMemo<CheckOption[]>(
    () =>
      [...new Set(base.map((s) => s.language).filter(Boolean))]
        .map((code) => ({ value: code, label: format.language(code), count: base.filter((s) => s.language === code && matchesFilters(s, filters, "languages")).length }))
        .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    [base, filters, format],
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
  const vibeOptions = useMemo(() => VIBES.map((v) => ({ value: v.key, label: format.vibe(v.key) })), [format]);
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
    .filter((s) => matchesFilters(s, filters))
    .toSorted(
      (a, b) =>
        // Houses that aren't taking requests go after the open ones, each group in the chosen order.
        Number(!a.acceptingRequests) - Number(!b.acceptingRequests) ||
        compareBy(filters.sort, a, b),
    );
  const countryCount = new Set(results.map(countryOf)).size;
  const resultLabel = tc("houses", { count: results.length });

  // Layout: a plain grid of equal cards, cut into sections of complete rows (see lib/exploreLayout). Everything below
  // follows from the real counts – the mock's data presets only change what's there.
  const cols = useGridColumns();
  const filtered = activeCount(filters) > 0;
  // A scoped page (collection, city, vibe) shows a plain grid: no Spotlight, no collection rows.
  const scoped = scope !== undefined;
  const showSpotlight = !scoped && featured.length >= SPOTLIGHT_MIN;
  // The Spotlight's Houses don't open the grid as well.
  const spotlightIds = useMemo(() => new Set(showSpotlight ? featured.slice(0, SPOTLIGHT_VISIBLE).map((s) => s.id) : []), [featured, showSpotlight]);
  const ordered = withoutSpotlightUpFront(results, spotlightIds, cols || 4);
  const allCards: FeedCard[] = ordered.map((stay) => ({ kind: "stay", stay }));

  // Paging: 24 cards, then "Show more". A new filter or sort starts at the first page again.
  const pageKey = withFilters(new URLSearchParams(), filters);
  const [paging, setPaging] = useState({ key: pageKey, visible: PAGE_SIZE });
  if (paging.key !== pageKey) setPaging({ key: pageKey, visible: PAGE_SIZE });
  const cards = allCards.slice(0, paging.visible);
  const hasMore = allCards.length > cards.length;
  // On the last page, demand tiles fill the open cells of the last row, so the grid ends on a straight edge.
  // Filtered results end where they end – fillers only round off the full feed.
  const fillers = !filtered && results.length > 0 && !hasMore && cols > 0 ? spots.slice(0, (cols - (cards.length % cols)) % cols) : [];
  cards.push(...fillers.map((spot): FeedCard => ({ kind: "interest", spot })));

  // The shelves go into the one list, after every 3 full rows, each behind its threshold (src/config/explore.ts). Searching
  // (a chip or filter on), or a scoped page: none in the list. Before the column count is known (server render) none either.
  const slots =
    scoped || filtered || cols === 0
      ? []
      : planShelves(
          base.toSorted((a, b) => Number(!a.acceptingRequests) - Number(!b.acceptingRequests) || compareBy(EMPTY_FILTERS.sort, a, b)),
          ordered,
          cols * SHELF_EVERY_ROWS,
          listed.length,
        );
  // What's loaded, cut at the shelves that have been reached. One that ends what's loaded takes the last row's fillers above it.
  const loaded = cards.length - fillers.length;
  const segments: { cards: FeedCard[]; shelf: ShelfSlot }[] = [];
  let cut = 0;
  for (const slot of slots) {
    if (slot.after > loaded) break;
    const end = slot.after === loaded ? cards.length : slot.after;
    segments.push({ cards: cards.slice(cut, end), shelf: slot });
    cut = end;
  }
  const rest = cards.slice(cut);
  // A scoped page ends with Where next, unless it's searching.
  const trailing = scoped && !filtered;

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
  const clearPanel = () => setFilters({ ...EMPTY_FILTERS, vibes: filters.vibes, sort: filters.sort });

  /** The row's search field: a country and / or month named in the text become those filters ("Portugal March"). */
  function searchPlaceDate(query: string) {
    const text = query.toLocaleLowerCase();
    const countries = countryOptions.filter((o) => text.includes(o.label.toLocaleLowerCase())).map((o) => o.value);
    const houseMonths = [...new Set(base.map((s) => s.startDate.slice(0, 7)).filter(Boolean))];
    const months = houseMonths.filter((month) => text.includes(formatter.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "long", timeZone: "UTC" }).toLocaleLowerCase()));
    if (countries.length === 0 && months.length === 0) return;
    update({ ...(countries.length > 0 && { countries }), ...(months.length > 0 && { months }) });
  }

  const sortInline = base.length >= SORT_INLINE_THRESHOLD;
  /** The category chips – the filter row's (36px) or the compact bar's (32px); one choice in the row (several only
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
  const chipRow = showVibes && <CategoryRow {...vibeRow} />;
  // Before the launch: no Spotlight, no grid, no filters. Where people want to go, and who could open the first House.
  if (!scoped && isPreLaunch(store.stays)) return <ExplorePrelaunch />;

  // Shortcuts only with enough Houses to pay off (src/config/explore.ts); the panel has everything anyway.
  const controls = (
    <>
      {base.length >= SEARCH_INLINE_THRESHOLD && <PlaceDateSearch onSearch={searchPlaceDate} />}
      {sortInline && (
        <SortCapsule label={t(`sortOptions.${filters.sort}`)}>
          <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
        </SortCapsule>
      )}
      <FiltersButton count={panelCount} onClick={() => setPanelOpen(true)} expanded={panelOpen} />
    </>
  );
  const Wrap = headless ? Fragment : Container;
  const RowWrap = headless ? "div" : Container;
  return (
    <div>
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
          <SpotlightHero stays={featured} />
          <SpotlightCoverflow stays={spotlightStays} />
        </>
      )}

      {/* The sections: transparent over PageGlow's patches, told apart by 96px of space and their SectionHeader alone.
          All the values: EXPLORE_SPACING. */}
      <Wrap>
        <div data-explore-blocks>
          <FullBleedSection padding={cn(showSpotlight ? EXPLORE_SPACING.underHero : EXPLORE_SPACING.scopedTop, !trailing && EXPLORE_SPACING.feedEnd)}>
            {!headless && (
              <>
                {/* The page's one H1 (Explore is the home page; a /collections page is titled by its collection). No
                    "See all": this is the main list – "Show 24 more" below it pages on. */}
                <SectionHeader
                  as="h1"
                  eyebrow={collection ? tCollections(`${collection.id}.eyebrow`) : t("eyebrow")}
                  title={collection ? tCollections(`${collection.id}.title`) : t("title")}
                  subline={collection && tCollections(`${collection.id}.subline`)}
                  meta={filtered ? resultLabel : t("summary", { houses: resultLabel, countries: tc("countries", { count: countryCount }) })}
                />
                {/* From md: a plain row here; once it's gone under the header, the header's tab has the same controls. */}
                <ExploreFilterBar
                  gridEndRef={gridEndRef}
                  handle={!scoped}
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
                  controls={
                    <>
                      {sortInline && (
                        <SortCapsule label={t(`sortOptions.${filters.sort}`)} size="bar">
                          <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
                        </SortCapsule>
                      )}
                      <FiltersButton count={panelCount} onClick={() => setPanelOpen(true)} expanded={panelOpen} />
                    </>
                  }
                />
                {/* Logged out on mobile there's no tab bar – this is the way to "How it works" (plus the footer). */}
                {!store.currentUserId && (
                  <Link href="/how-it-works" className={buttonStyles("tertiary", "md", "mt-1 min-h-11 md:hidden")}>
                    {t("howItWorksLink")}
                  </Link>
                )}
              </>
            )}
            {/* Where a filter change scrolls to: the grid's start right under the tab. */}
            <div ref={resultsRef} className={!headless ? "mt-5 md:mt-2" : undefined}>
              {results.length === 0 ? (
                // Nothing for these filters: say so, and the way back.
                <div className={cn(cardClass, "flex flex-col items-center py-12 text-center")}>
                  <p className="text-h3 tracking-tight text-ink">{t("noResults.title")}</p>
                  <p className="mt-1 max-w-md text-muted">{t("noResults.text")}</p>
                  {filtered && (
                    <Button variant="secondary" size="md" onClick={clearFilters} className="mt-6">
                      {t("noResults.clear")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {segments.map(({ cards: part, shelf }, i) => {
                    // Below a shelf: 96px when the list goes on with Houses or the button; another shelf brings its own.
                    const next = segments[i + 1];
                    const goesOn = next ? next.cards.length > 0 : rest.length > 0 || hasMore;
                    return (
                      <Fragment key={shelf.kind === "interests" ? "interests" : shelf.collection.id}>
                        {part.length > 0 && <FeedGrid cards={part} spotlightIds={spotlightIds} />}
                        <div className={cn(EXPLORE_SPACING.shelfTop, goesOn && EXPLORE_SPACING.shelfBottom)}>
                          {shelf.kind === "interests" ? <InterestRow exclude={fillers} /> : <CollectionRow collection={shelf.collection} stays={shelf.stays} />}
                        </div>
                      </Fragment>
                    );
                  })}
                  {rest.length > 0 && <FeedGrid cards={rest} spotlightIds={spotlightIds} />}
                </>
              )}
              {/* The list's end, shelves included: here the header's tab closes again. */}
              <div ref={gridEndRef} aria-hidden className="h-0" />
              {hasMore && (
                <div className={cn(rest.length > 0 && EXPLORE_SPACING.showMore, "flex justify-center")}>
                  <Button variant="secondary" size="lg" onClick={() => setPaging((p) => ({ ...p, visible: p.visible + PAGE_SIZE }))}>
                    {t("showMore", { count: Math.min(PAGE_SIZE, allCards.length - paging.visible) })}
                  </Button>
                </div>
              )}
            </div>
          </FullBleedSection>
          {trailing && (
            <FullBleedSection padding={cn(EXPLORE_SPACING.section, EXPLORE_SPACING.feedEnd)}>
              <InterestRow exclude={fillers} />
            </FullBleedSection>
          )}
        </div>
      </Wrap>

      {/* Filters, from the right. Live – the footer only clears or closes. */}
      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={t("filters")}
        footer={
          <>
            <Button variant="tertiary" size="md" onClick={clearPanel} disabled={panelCount === 0}>
              {tf("clearAll")}
            </Button>
            {/* The panel's one primary: it only closes – the filters apply live. */}
            <Button variant="primary" size="md" onClick={() => setPanelOpen(false)}>
              {/* The number rolls to each new count. */}
              {tf.rich("show", { count: results.length, num: () => <RollingNumber value={results.length} /> })}
            </Button>
          </>
        }
      >
        {/* When · Length · Price per person · Spots left · Language – no Sort (the header capsule) and no categories
            (the chips are the category filter). */}
        <MonthSection value={filters.months} onChange={(months) => update({ months })} title={tf("when")} />
        <PanelSection title={tf("length")}>
          <ChoiceChips
            label={tf("length")}
            columns={2}
            value={filters.length}
            onChange={(length) => update({ length })}
            options={[{ value: null, label: tf("lengthOptions.any") }, ...LENGTH_KEYS.map((key) => ({ value: key, label: tf(`lengthOptions.${key}`) }))]}
          />
        </PanelSection>
        <PanelSection title={tf("price")}>
          {budgetBounds ? (
            <PriceFilter bounds={budgetBounds} prices={prices} value={filters.budget} onChange={(budget) => update({ budget })} currency={currency} />
          ) : (
            <p className="text-small text-muted">{tf("noBudget")}</p>
          )}
        </PanelSection>
        <PanelSection title={tf("spots")}>
          <ChoiceChips
            label={tf("spots")}
            columns={3}
            value={filters.spots}
            onChange={(spots) => update({ spots })}
            options={[{ value: null, label: tf("spotsOptions.any") }, ...SPOTS_MINS.map((n) => ({ value: n, label: tf("spotsOptions.atLeast", { count: n }) }))]}
          />
        </PanelSection>
        <PanelSection title={t("language")}>
          {languageOptions.length > 0 ? (
            <LanguageFilter options={languageOptions} value={filters.languages} onChange={(languages) => update({ languages })} label={t("language")} placeholder={t("anyLanguage")} />
          ) : (
            <p className="text-small text-muted">{tf("noOptions")}</p>
          )}
        </PanelSection>
      </FilterPanel>

    </div>
  );
}

/**
 * Smoothly scrolls `el` to just under the header and its filter row (phones: no top header, only the safe area).
 * Instant with reduced motion.
 */
function scrollUnderHeader(el: HTMLElement | null) {
  if (!el) return;
  const root = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(root.getPropertyValue(name)) || 0;
  // Open Houses' row showing (from md): the header's open tab takes its place. Else the page's own chip row.
  const row = document.querySelector<HTMLElement>("[data-explore-filter-row]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const offset = row && row.offsetHeight > 0 ? NOTCH_OPEN_TOTAL : px("--header-total") + px("--filter-row-h");
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: reduce ? "auto" : "smooth" });
}

/** One stretch of the list's grid, between two shelves. */
function FeedGrid({ cards, spotlightIds }: { cards: readonly FeedCard[]; spotlightIds: ReadonlySet<string> }) {
  const store = useStore();
  return (
    <div className={HOUSE_GRID}>
      {cards.map((card) =>
        card.kind === "interest" ? (
          <DemandCard key={card.spot.placeName} spot={card.spot} tile />
        ) : (
          <StayCard key={card.stay.id} stay={card.stay} host={findUser(store, card.stay.hostId)} crew={getCrew(store, card.stay)} variant={getCardVariant(card.stay, spotlightIds)} />
        ),
      )}
    </div>
  );
}

/** The chosen order: soonest start, lowest price per person (≈ EUR, Houses without a price last) or just opened. */
function compareBy(sort: SortKey, a: Stay, b: Stay): number {
  if (sort === "soonest") return a.startDate.localeCompare(b.startDate);
  if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
  const price = (s: Stay) => eurRange(s)?.min ?? Number.POSITIVE_INFINITY;
  return price(a) - price(b) || a.startDate.localeCompare(b.startDate);
}
