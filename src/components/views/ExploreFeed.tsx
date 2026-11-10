"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, Fragment, useCallback, useMemo, useRef, useState } from "react";
import { SpotlightCoverflow } from "@/components/SpotlightCoverflow";
import { CollectionRow } from "@/components/explore/CollectionRow";
import { CategoryRow, ChoiceChips, FiltersButton, LanguageFilter, PanelSection, PriceFilter, SortCapsule, SortList, type CheckOption } from "@/components/explore/Filters";
import { EXPLORE_SPACING, HOUSE_GRID, SORT_INLINE_THRESHOLD, SPOTLIGHT_MIN, VISIBLE_CHIPS } from "@/config/explore";
import { Container } from "@/components/layout/Container";
import { ExploreFilterBar, scrollUnderHeader } from "@/components/explore/ExploreFilterBar";
import { ExplorePrelaunch } from "@/components/explore/ExplorePrelaunch";
import { NoHouseYet, NotifyLine } from "@/components/explore/NoHouseYet";
import { MonthField, PlaceField, ToggleCapsule } from "@/components/explore/SearchFields";
import { FitChips } from "@/components/explore/FitChips";
import { SpotlightHero } from "@/components/SpotlightHero";
import { HouseCard } from "@/components/HouseCard";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { useFeatureFlag } from "@/lib/featureFlags";
import { Sheet } from "@/components/ui/Sheet";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { cardClass } from "@/components/ui/Card";
import { useFormat } from "@/i18n/format";
import { COLLECTIONS, planShelves, type Collection, type ShelfSlot } from "@/lib/collections";
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
import { ActiveFilters } from "@/components/explore/ActiveFilters";
import { IconButton } from "@/components/ui/IconButton";
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
const PAGE_SIZE = 24;
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

  // Paging: 24 cards, then "Show more". A new filter or sort starts at the first page again.
  const pageKey = withFilters(new URLSearchParams(), filters);
  const [paging, setPaging] = useState({ key: pageKey, visible: PAGE_SIZE });
  if (paging.key !== pageKey) setPaging({ key: pageKey, visible: PAGE_SIZE });
  const visible = cols > 0 ? Math.ceil(paging.visible / cols) * cols : paging.visible;
  const cards = ordered.slice(0, visible);
  const hasMore = ordered.length > cards.length;

  // The shelves go into the one list and take turns without end (planShelves). Searching (a chip or filter on), or a scoped page: none in
  // the list. Before the column count is known (server render) none either.
  const slots =
    scoped || filtered || cols === 0
      ? []
      : planShelves({
          stays: base.toSorted((a, b) => Number(!a.acceptingRequests) - Number(!b.acceptingRequests) || compareBy(EMPTY_FILTERS.sort, a, b, slowHosts)),
          grid: ordered,
          cols,
          total: listed.length,
          loaded: cards.length,
          pageSize: PAGE_SIZE,
        });
  // What's loaded, cut at the shelves that have been reached.
  const segments: { cards: Stay[]; shelf: ShelfSlot }[] = [];
  let cut = 0;
  for (const slot of slots) {
    segments.push({ cards: cards.slice(cut, slot.after), shelf: slot });
    cut = slot.after;
  }
  const rest = cards.slice(cut);
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

  const sortInline = base.length >= SORT_INLINE_THRESHOLD;
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
  // Before the launch: no Spotlight, no grid. The slogan and the same search, ending where an empty result ends.
  if (!scoped && isPreLaunch(store.stays)) return <ExplorePrelaunch />;

  const useTab = inBar && mouse;
  const openPanel = () => (useTab ? setNotchStage(2) : setSheetOpen(true));
  // Shortcuts only with enough Houses to pay off (src/config/explore.ts); the panel has everything anyway.
  const controls = (
    <>
      {sortInline && (
        <SortCapsule label={t(`sortOptions.${filters.sort}`)}>
          <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
        </SortCapsule>
      )}
      <FiltersButton count={panelCount} onClick={openPanel} expanded={panelOpen} />
    </>
  );
  const fields = (
    <>
      <PlaceField value={filters.place} onChange={(place) => update({ place })} />
      <MonthField value={filters.month} onChange={(month) => update({ month })} />
      <ToggleCapsule label={tf("shortTrips")} active={filters.length === "weekend"} onToggle={() => update({ length: filters.length === "weekend" ? null : "weekend" })} />
      {/* What's set in the panel, each with its ✕: two, then "+N". Below 1200px only the "+N". */}
      <span className="flex items-center gap-1 max-nav:hidden">
        <ActiveFilters filters={filters} onChange={update} currency={currency} withoutShortTrips limit={2} onMore={openPanel} />
      </span>
      <span className="flex items-center gap-1 nav:hidden">
        <ActiveFilters filters={filters} onChange={update} currency={currency} withoutShortTrips limit={0} onMore={openPanel} />
      </span>
    </>
  );
  const panelBody = (
    // Left what you're after, right the practical side. One column under 900px, with scrolling. No Sort: that's the capsule.
    <div className="grid gap-x-10 min-[56.25rem]:grid-cols-2">
      <div>
        <div className="grid grid-cols-2 gap-x-4">
          <PanelSection title={tf("where")} onClear={filters.place ? () => update({ place: null }) : undefined}>
            <PlaceField value={filters.place} onChange={(place) => update({ place })} className="w-full max-w-none" />
          </PanelSection>
          <PanelSection title={tf("when")} onClear={filters.month ? () => update({ month: null }) : undefined}>
            <MonthField value={filters.month} onChange={(month) => update({ month })} className="w-full" />
          </PanelSection>
        </div>
        {showVibes && (
          <PanelSection title={tf("category")} onClear={filters.vibes.length > 0 ? () => update({ vibes: [] }) : undefined}>
            <ChoiceChips clearable label={tf("category")} value={single as string | null} onChange={vibeRow.onSelect} options={vibeOptions} />
          </PanelSection>
        )}
        <PanelSection title={tf("crewSize")} onClear={filters.crewSize ? () => update({ crewSize: null }) : undefined}>
          <SegmentedControl label={tf("crewSize")} value={filters.crewSize} onChange={(crewSize) => update({ crewSize })} options={[{ value: null, label: tf("any") }, ...CREW_SIZE_KEYS.map((key) => ({ value: key, label: key.replace("-", "–") }))]} />
        </PanelSection>
        <PanelSection title={tf("who")} onClear={filters.who ? () => update({ who: null }) : undefined}>
          <SegmentedControl label={tf("who")} value={filters.who} onChange={(who) => update({ who })} options={[{ value: null, label: tf("any") }, ...WHO_KEYS.map((key) => ({ value: key, label: tf(`whoOptions.${key}`) }))]} />
        </PanelSection>
        <PanelSection title={tf("age")} onClear={filters.age ? () => update({ age: null }) : undefined}>
          <SegmentedControl label={tf("age")} value={filters.age} onChange={(age) => update({ age })} options={[{ value: null, label: tf("any") }, ...AGE_KEYS.map((key) => ({ value: key, label: tf(`ageOptions.${key}`) }))]} />
        </PanelSection>
        <div className="flex items-center justify-between gap-3 pb-2.5">
          <span className="text-small font-semibold text-ink">{tf("verifiedOnly")}</span>
          <span className="-my-2.5">
            <Switch on={filters.verifiedOnly} label={tf("verifiedOnly")} onChange={(verifiedOnly) => update({ verifiedOnly })} />
          </span>
        </div>
      </div>
      <div>
        <PanelSection title={tf("length")} onClear={filters.length ? () => update({ length: null }) : undefined}>
          <SegmentedControl
            label={tf("length")}
            value={filters.length}
            onChange={(length) => update({ length })}
            options={[{ value: null, label: tf("lengthOptions.any") }, ...LENGTH_KEYS.map((key) => ({ value: key, label: tf(`lengthOptions.${key}`) }))]}
          />
        </PanelSection>
        <PanelSection title={tf("price")} onClear={filters.budget ? () => update({ budget: null }) : undefined}>
          {budgetBounds ? (
            <PriceFilter bounds={budgetBounds} prices={prices} value={filters.budget} onChange={(budget) => update({ budget })} currency={currency} />
          ) : (
            <p className="text-small text-muted">{tf("noBudget")}</p>
          )}
        </PanelSection>
        <PanelSection title={tf("accommodation")} onClear={filters.accommodation ? () => update({ accommodation: null }) : undefined}>
          <SegmentedControl label={tf("accommodation")} value={filters.accommodation} onChange={(accommodation) => update({ accommodation })} options={[{ value: null, label: tf("any") }, ...ACCOMMODATION_KEYS.map((key) => ({ value: key, label: tf(`accommodationOptions.${key}`) }))]} />
        </PanelSection>
        {hostPremium && (
          <PanelSection title={tf("hostExperience")} onClear={filters.hostExperience ? () => update({ hostExperience: null }) : undefined}>
            <SegmentedControl label={tf("hostExperience")} value={filters.hostExperience} onChange={(hostExperience) => update({ hostExperience })} options={[{ value: null, label: tf("any") }, ...HOST_EXPERIENCE_KEYS.map((key) => ({ value: key, label: tf(`hostExperienceOptions.${key}`) }))]} />
          </PanelSection>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <PanelSection title={tf("spots")} onClear={filters.spots ? () => update({ spots: null }) : undefined}>
            <SegmentedControl
              label={tf("spots")}
              value={filters.spots}
              onChange={(spots) => update({ spots })}
              options={[{ value: null, label: tf("spotsOptions.any") }, ...SPOTS_MINS.map((n) => ({ value: n, label: tf("spotsOptions.atLeast", { count: n }) }))]}
            />
          </PanelSection>
          <PanelSection title={t("language")} onClear={filters.languages.length > 0 ? () => update({ languages: [] }) : undefined}>
            {languageOptions.length > 0 ? (
              <LanguageFilter options={languageOptions} value={filters.languages} onChange={(languages) => update({ languages })} label={t("language")} placeholder={t("anyLanguage")} />
            ) : (
              <p className="text-small text-muted">{tf("noOptions")}</p>
            )}
          </PanelSection>
        </div>
      </div>
    </div>
  );
  const panelActive = <ActiveFilters filters={filters} onChange={update} currency={currency} withCategory />;
  const panelFooter = (close: () => void) => (
    <>
      {/* Only when something is set; otherwise the primary keeps its place on the right. */}
      {panelCount > 0 || filters.vibes.length > 0 ? (
        <Button variant="tertiary" size="md" onClick={clearPanel} className="-ml-4">
          {tf("clearAll")}
        </Button>
      ) : (
        <span />
      )}
      {/* The panel's one primary: it only closes – the filters apply live. */}
      <Button variant="primary" size="md" onClick={close}>
        {/* The number rolls to each new count. */}
        {tf.rich("show", { count: results.length, num: () => <RollingNumber value={results.length} /> })}
      </Button>
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
          {/* Below lg the carousel is another component; the title for visitors goes above it here. */}
          <SpotlightHero stays={spotlightStays} />
          <SpotlightCoverflow stays={spotlightStays} countOf={openOfVibe} onPickVibe={vibeRow.onSelect} />
        </>
      )}

      {/* The sections: transparent over PageGlow's patches, told apart by --space-section and their SectionHeader alone.
          All the values: EXPLORE_SPACING. */}
      <Wrap>
        <div data-explore-blocks>
          <FullBleedSection padding={cn(showSpotlight ? EXPLORE_SPACING.underHero : EXPLORE_SPACING.scopedTop, EXPLORE_SPACING.feedEnd)}>
            {!headless && (
              <>
                {/* The page's one H1 (Explore is the home page; a /collections page is titled by its collection). No
                    "See all": this is the main list – "Show 24 more" below it pages on. */}
                <SectionHeader
                  as="h1"
                  eyebrow={collection && tCollections(`${collection.id}.eyebrow`)}
                  title={collection ? tCollections(`${collection.id}.title`) : t("title")}
                  subline={collection && tCollections(`${collection.id}.subline`)}
                  meta={filtered ? resultLabel : t("summary", { houses: resultLabel, countries: tc("countries", { count: countryCount }) })}
                  action={
                    inBar && (
                      <>
                        {sortInline && (
                          <SortCapsule variant="tertiary" label={t(`sortOptions.${filters.sort}`)}>
                            <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
                          </SortCapsule>
                        )}
                        <FiltersButton variant="secondary" count={panelCount} onClick={openPanel} expanded={panelOpen} />
                      </>
                    )
                  }
                />
                {/* From md: a plain row here, Sort and Filters beside the title; once it's gone under the header, the header's tab has all of them in one row. */}
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
                  controls={
                    <>
                      {sortInline && (
                        <SortCapsule label={t(`sortOptions.${filters.sort}`)}>
                          <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
                        </SortCapsule>
                      )}
                      <FiltersButton count={panelCount} onClick={openPanel} expanded={panelOpen} />
                    </>
                  }
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
            <div ref={resultsRef} data-explore-results className={!headless ? "mt-5 md:mt-6" : undefined}>
              <div ref={setColumnProbe} aria-hidden className={cn(HOUSE_GRID, "h-0")} />
              {results.length === 0 && searched ? (
                // Nothing for this place and month: open the first House, or hear first.
                <NoHouseYet draft={draft} stays={base} />
              ) : results.length === 0 ? (
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
                    // Below a shelf: --space-section when the list goes on with Houses or the button; another shelf brings its own.
                    const next = segments[i + 1];
                    const goesOn = next ? next.cards.length > 0 : rest.length > 0 || hasMore;
                    return (
                      <Fragment key={`${shelf.collection.id}-${shelf.after}`}>
                        {part.length > 0 && <FeedGrid cards={part} />}
                        <div className={cn(EXPLORE_SPACING.shelfTop, goesOn && EXPLORE_SPACING.shelfBottom)}>
                          <CollectionRow collection={shelf.collection} stays={shelf.stays} />
                        </div>
                      </Fragment>
                    );
                  })}
                  {rest.length > 0 && <FeedGrid cards={rest} />}
                </>
              )}
              {/* The list's end, shelves included: here the header's tab closes again. */}
              <div ref={gridEndRef} aria-hidden className="h-0" />
              {hasMore && (
                <div className={cn(rest.length > 0 && EXPLORE_SPACING.showMore, "flex justify-center")}>
                  <Button variant="secondary" size="md" onClick={() => setPaging({ key: pageKey, visible: visible + PAGE_SIZE })}>
                    {t("showMore", { count: Math.min(cols > 0 ? Math.ceil((visible + PAGE_SIZE) / cols) * cols - visible : PAGE_SIZE, ordered.length - visible) })}
                  </Button>
                </div>
              )}
              {results.length > 0 && <NotifyLine draft={draft} className={EXPLORE_SPACING.showMore} />}
            </div>
          </FullBleedSection>
        </div>
      </Wrap>

      {/* The filter panel: with a mouse in the header's tab, its third stage. Live – the footer only clears or closes. */}
      {useTab &&
        panelSlot &&
        createPortal(
          <div data-filter-panel role="group" aria-label={t("filters")} className="flex max-h-[calc(80vh-var(--band-h)-92px)] flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 pb-2">
              <h2 className="text-h3 text-ink">{t("filters")}</h2>
              <span className="text-small text-ink">{resultLabel}</span>
              {panelActive}
              <IconButton size="xs" onClick={closeNotchPanel} aria-label={tc("close")} className="ml-auto">
                <X className="size-4" aria-hidden />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{panelBody}</div>
            <div className="flex shrink-0 items-center justify-between gap-4 pt-1">{panelFooter(closeNotchPanel)}</div>
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
          <div className="flex flex-wrap gap-2 empty:hidden pb-4">{panelActive}</div>
          {panelBody}
        </div>
      </Sheet>

    </div>
  );
}

/** One stretch of the list's grid, between two shelves. */
function FeedGrid({ cards }: { cards: readonly Stay[] }) {
  const store = useStore();
  return (
    <div className={HOUSE_GRID}>
      {cards.map((stay) => (
        <HouseCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
      ))}
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
