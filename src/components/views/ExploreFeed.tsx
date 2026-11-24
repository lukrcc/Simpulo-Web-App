"use client";

import { depthOf, depthShiftDays } from "@/config/depth";
import { boostShiftDays } from "@/lib/houseHelp";
import { feedLayout, type FeedItem } from "@/lib/highlight";
import { useHeaderSlot } from "@/lib/headerSlot";
import { createPortal } from "react-dom";
import { HeaderCenter } from "@/components/layout/header/HeaderCenter";
import { useHeaderPanel } from "@/components/layout/header/HeaderPanel";
import { ActiveFilterChips, ResultsBar, ResultsHead } from "@/components/explore/ActiveFilters";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { SpotlightCoverflow } from "@/components/SpotlightCoverflow";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/lib/usePagedList";
import { CollectionRow } from "@/components/explore/CollectionRow";
import { PeopleGoingRow, usePeopleGoing } from "@/components/explore/PeopleGoingRow";
import { CategoryRow, SortCapsule, SortList } from "@/components/explore/Filters";
import { EXPLORE_COUNTS, EXPLORE_GRID, EXPLORE_RHYTHM, EXPLORE_SPACING, explorePageSize, HIGHLIGHT_MIN_COLS, SPOTLIGHT_MIN, VIBE_ICONS, VISIBLE_CHIPS } from "@/config/explore";
import { Container } from "@/components/layout/Container";
import { scrollUnderHeader } from "@/lib/scrollUnderHeader";
import { ExplorePrelaunch } from "@/components/explore/ExplorePrelaunch";
import { BeFirstHere, InForTile, NearbyShelf, NoHouseYet, NotifyLine, OpenHereTile } from "@/components/explore/NoHouseYet";
import { getVisibleHouses } from "@/lib/data/visibleHouses";
import { canPay, launch, showsExamples, showsPersonalRows, useDepthChoice, usePlatformPhase } from "@/config/platform";
import { HOST_APPLY_HREF, useJoinWaitlist } from "@/components/platform/useJoinWaitlist";
import { LaunchIntro } from "@/components/explore/SpotlightIntro";
import { SlimBolt, useMonthName } from "@/components/explore/SearchFields";
import { Chip } from "@/components/ui/Chip";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { registerFeed } from "@/lib/exploreBridge";
import { FilterSheets } from "@/components/explore/FilterSheets";
import { SpotlightHero } from "@/components/SpotlightHero";
import { HouseCard } from "@/components/HouseCard";
import { useFeatureFlag } from "@/lib/featureFlags";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { RowTile } from "@/components/ui/RowTile";
import { useFormat } from "@/i18n/format";
import { COLLECTIONS, shelfFor, type Collection, type Shelf } from "@/lib/collections";
import { citySlugOf } from "@/lib/data/stays";
import { forYouScore } from "@/lib/ranking";
import { useYourPeople } from "@/lib/useYourPeople";
import {
  activeCount,
  countryOf,
  EMPTY_FILTERS,
  eurRange,
  matchesFilters,
  panelFilterCount,
  SORT_KEYS,
  withFilters,
  type ExploreFilters,
  type SortKey,
} from "@/lib/exploreFilters";
import { setExploreFilters, useExploreFilters } from "@/lib/exploreFilterState";
import { onePerHost, useHeroStays } from "@/lib/heroRotation";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { SPOTLIGHT_VISIBLE, withoutSpotlightUpFront } from "@/lib/exploreLayout";
import { placeById } from "@/lib/data/places";
import { MD_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { VIBES } from "@/lib/catalog";
import { hasHeadStart, isListedStay, isPreLaunch } from "@/lib/launch";
import { findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";
import { answersSlowly, responseRate } from "@/lib/requests";
import { useNow } from "@/lib/useNow";
import { useGridColumns } from "@/lib/useGridColumns";

/** The Spotlight loops over at most this many Houses. */
const MAX_SPOTLIGHT = 16;
/** Cards per page of the grid ("Show more" adds about as many): rounded up to full rows, so every page ends on a straight edge. */
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
  const headerSlot = useHeaderSlot();
  const [sheetOpen, setSheetOpen] = useState(false);
  // The header's search field below 1100px opens this feed's filter sheet (lib/exploreBridge.ts); /explore?open=filters (from a page without
  // a feed) opens it once on arrival – the parameter goes at once.
  useEffect(() => registerFeed(() => setSheetOpen(true)), []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("open") !== "filters") return;
    url.searchParams.delete("open");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    requestAnimationFrame(() => setSheetOpen(true));
  }, []);
  // Read by setFilters (an event): is the panel open right now?
  const panelOpenRef = useRef(false);
  useEffect(() => {
    panelOpenRef.current = sheetOpen;
  }, [sheetOpen]);
  // The bar's "All filters" (both sizes): the sheet hangs from its bar.
  const [filtersEl, setFiltersEl] = useState<HTMLSpanElement | null>(null);
  const filtersAnchor = useMemo(() => ({ current: filtersEl }), [filtersEl]);
  const scrollAfterPanel = useRef(false);
  // "All filters" is one sheet on every device (the side panel with a mouse, the bottom sheet on touch).
  const panelOpen = sheetOpen;
  const collection = scope && "collection" in scope ? COLLECTIONS.find((c) => c.id === scope.collection) : undefined;

  const resultsRef = useRef<HTMLDivElement>(null);
  // The results' head ("16 houses", the active filters): where every filter change glides to (CLAUDE.md "Filtern ohne Springen").
  const headRef = useRef<HTMLDivElement>(null);
  const scrollPending = useRef(false);
  const gridEndRef = useRef<HTMLDivElement>(null);
  // Every change goes into the URL right away (no navigation), so it can be shared and survives a reload. The page then
  // glides to the start of the House list, its top just under the header (with its filter row).
  const setFilters = useCallback((next: ExploreFilters, key?: string) => {
    setExploreFilters(next, key);
    // Behind the panel the page is locked: it goes to the head when the panel has gone. Otherwise once the new results are drawn (below).
    if (panelOpenRef.current) scrollAfterPanel.current = true;
    else scrollPending.current = true;
  }, []);
  const update = (patch: Partial<ExploreFilters>) => setFilters({ ...filters, ...patch }, Object.keys(patch).join(","));
  // After any filter change (Short trips, Themes, the panel, Where · When, the sort): once the new results are drawn, the page glides to the
  // results' head – the count and the active filters in view (CLAUDE.md "Filtern ohne Springen").
  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    return glideToHead(headRef, 0);
  }, [filters]);

  // Houses of people you blocked never show up.
  const blocked = settingsOf(getCurrentUser(store)).blockedUserIds;
  // The Houses anyone may see in this phase (lib/data/visibleHouses.ts – the one source: real ones, and before the launch / in the beta the
  // example Houses), then listing, head start and blocking.
  const phase = usePlatformPhase();
  const visible = useMemo(() => getVisibleHouses(store.stays, phase), [store.stays, phase]);
  // Hosts who paused their account (Settings › Your data): their Houses are off Explore until they're back.
  const pausedHosts = useMemo(() => new Set(store.users.filter((u) => u.privacy?.paused).map((u) => u.id)), [store.users]);
  const listed = useMemo(() => visible.filter((s) => (isListedStay(s) || hasHeadStart(s, store.houseInvites, store.currentUserId)) && !blocked.includes(s.hostId) && !pausedHosts.has(s.hostId)), [visible, store.houseInvites, store.currentUserId, blocked, pausedHosts]);
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
  // Interest ranking: the answer to "How much community do you need?" (User.communityNeed) moves Houses at the fitting depth up a little in the
  // default order (config/depth.ts depthShiftDays) – a recommendation, never a filter. Only while the depth choice is on.
  const depthOn = useDepthChoice();
  const need = getCurrentUser(store)?.communityNeed;
  // Admin › Houses › "Im Explore hervorheben": a House that needs help sits higher for a while (lib/houseHelp.ts, config/policies.ts HIGHLIGHT_POLICY).
  const shiftDaysOf = useCallback(
    (s: Stay) => (slowHosts.has(s.hostId) ? SLOW_HOST_SHIFT_DAYS : 0) + (depthOn ? depthShiftDays(depthOf(s, true), need) : 0) + (today === null ? 0 : boostShiftDays(s, today)),
    [slowHosts, depthOn, need, today],
  );
  const hostPremium = useFeatureFlag("hostPremium");

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

  // "For you" (lib/ranking.ts): the person's themes (interests, Houses joined, hosted or saved, what they're in for), Your people, open
  // spots, how soon and how new – never Simpulo's fee or revenue. Unfiltered Explore always shows this order (no sort menu there).
  const people = useYourPeople();
  const me = getCurrentUser(store);
  const forYou = useMemo(() => {
    const themes = new Set<string>([
      ...(me?.interests ?? []),
      ...store.stays.filter((s) => s.hostId === me?.id || (me?.savedStayIds ?? []).includes(s.id)).map((s) => s.vibe),
      ...store.joinRequests.filter((r) => r.userId === me?.id).flatMap((r) => store.stays.find((s) => s.id === r.stayId)?.vibe ?? []),
      ...store.inFor.filter((x) => x.userId === me?.id).flatMap((x) => x.categories),
    ]);
    const ctx = {
      today: new Date(today ?? 0).toISOString().slice(0, 10),
      themes,
      people: new Set(people.map((p) => p.user.id)),
      crewOf: (s: Stay) => [s.hostId, ...getCrew(store, s).map((u) => u.id)],
      openSpotsOf: openSpots,
      shiftDays: shiftDaysOf,
    };
    return new Map(base.map((s) => [s.id, forYouScore(s, ctx)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store's Houses, requests and in-for decide it
  }, [base, me, people, store.stays, store.joinRequests, store.inFor, today, shiftDaysOf]);
  const scoreOf = (s: Stay) => forYou.get(s.id) ?? 0;
  const order: SortKey = !scope && activeCount(filters) === 0 ? "forYou" : filters.sort;
  const results = base
    .filter((s) => matchesFilters(s, filters, undefined, verifiedHosts))
    .toSorted(
      (a, b) =>
        // Real Houses before the examples (the beta's founding Houses first; live has no examples), then the ones not taking requests after
        // the open ones, each group in the chosen order.
        Number(Boolean(a.isExample)) - Number(Boolean(b.isExample)) ||
        Number(!a.acceptingRequests) - Number(!b.acceptingRequests) ||
        compareBy(order, a, b, shiftDaysOf, scoreOf),
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
  // Searching (any filter) shows only the results: no Spotlight, no bands.
  const showSpotlight = !scoped && !filtered && featured.length >= SPOTLIGHT_MIN;
  // The Spotlight's Houses don't open the grid as well.
  const spotlightIds = useMemo(() => new Set(showSpotlight ? featured.slice(0, SPOTLIGHT_VISIBLE).map((s) => s.id) : []), [featured, showSpotlight]);
  const ordered = withoutSpotlightUpFront(results, spotlightIds, cols || 4);

  // Paging: 24 cards (up to full rows), then "Show 24 more" – only on a click, each page by cursor from the data layer. A new filter or sort
  // starts at the first page again.
  const pageKey = withFilters(new URLSearchParams(), filters);
  // A page: columns × 4 rows × 2 (EXPLORE_RHYTHM) – the first and every "Show {n} more" load exactly one.
  const pageCount = explorePageSize(cols || 4);
  const paging = usePagedList({ list: ordered, keyOf: stayKey, resetKey: pageKey, firstCount: pageCount, nextCount: () => pageCount });
  const cards = paging.items;
  // Fewer results than the grid has columns (measured): a dashed tile and a "Nearby" shelf fill in.
  const few = cols > 0 && results.length > 0 && results.length < cols;

  // Under the Spotlight, before the grid: at most two shelves – "Your people are going" (from one House), then one by state (Just opened, else
  // Starting soon, else Short trips; from 4). Only while browsing: searching (a chip or filter on), or a scoped page, has none.
  const peopleGoing = usePeopleGoing();
  // Not during the prerender (the shelves read the clock): only once the browser's clock is there.
  const browsing = !scoped && !filtered && !headless && today !== null;
  const showPeople = browsing && peopleGoing.length > 0 && showsPersonalRows(phase);
  const joinWaitlist = useJoinWaitlist({ from: "landing" });
  const launchHero = showsExamples(phase) ? { label: launch.targetLabel, onJoin: joinWaitlist, hostHref: HOST_APPLY_HREF } : undefined;
  // The bands between the grid's rows (browsing only): Just opened, then Short trips – never the same House in two of them.
  // The bands of the rhythm (EXPLORE_RHYTHM): in their order, empty ones skipped, never the same House in two of them.
  const bands = useMemo((): Band[] => {
    if (!browsing) return [];
    const sorted = base.toSorted((a, b) => Number(!a.acceptingRequests) - Number(!b.acceptingRequests) || compareBy("soonest", a, b, shiftDaysOf));
    const taken = new Set(showPeople ? peopleGoing.map((s) => s.id) : []);
    return EXPLORE_RHYTHM.shelves.flatMap((id): Band[] => {
      const shelf = shelfFor(id, sorted, taken);
      if (!shelf) return [];
      shelf.stays.forEach((s) => taken.add(s.id));
      return [{ key: id, kind: "collection", shelf }];
    });
  }, [browsing, base, shiftDaysOf, showPeople, peopleGoing]);
  // What this search would be saved as ("Notify me").
  const draft = useMemo(() => ({ place: placeById(filters.place), month: filters.month, category: filters.vibes[0] ?? null }), [filters.place, filters.month, filters.vibes]);
  const searched = draft.place !== null || draft.month !== null;

  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  // Explore searching: the count as the title, the active filters as chips (each removable), "Clear all".
  const searchView = !scoped && !headless && filtered;
  const monthName = useMonthName();
  const tSubTheme = useTranslations("common.subThemes");
  const activeChips: { key: string; label: string; patch: Partial<ExploreFilters> }[] = [
    ...(filters.place ? [{ key: "place", label: placeById(filters.place)?.name.split(",")[0] ?? filters.place, patch: { place: null } }] : []),
    ...(filters.month ? [{ key: "month", label: monthName(filters.month, true), patch: { month: null } }] : []),
    ...filters.vibes.map((vibe) => ({ key: `vibe-${vibe}`, label: format.vibe(vibe), patch: { vibes: filters.vibes.filter((v) => v !== vibe), sub: null } })),
    ...(filters.sub ? [{ key: "sub", label: tSubTheme(filters.sub as "running"), patch: { sub: null } }] : []),
    ...filters.lengths.map((length) => ({ key: `len-${length}`, label: length === "weekend" ? tf("shortTrips") : tf(`lengthOptions.${length}`), patch: { lengths: filters.lengths.filter((l) => l !== length) } })),
    ...filters.crewSizes.map((size) => ({ key: `crew-${size}`, label: `${tf("crewSize")} ${size.replace("-", "–")}`, patch: { crewSizes: filters.crewSizes.filter((c) => c !== size) } })),
    ...(filters.budget ? [{ key: "budget", label: `${tf("price")} ${filters.budget.min}–${filters.budget.max}`, patch: { budget: null } }] : []),
    ...(filters.spots ? [{ key: "spots", label: `${tf("spots")} ${tf("spotsOptions.atLeast", { count: filters.spots })}`, patch: { spots: null } }] : []),
    ...(filters.who ? [{ key: "who", label: tf(`whoOptions.${filters.who}`), patch: { who: null } }] : []),
    ...(filters.age ? [{ key: "age", label: `${tf("age")} ${tf(`ageOptions.${filters.age}`)}`, patch: { age: null } }] : []),
    ...(filters.accommodation ? [{ key: "stay", label: tf(`accommodationOptions.${filters.accommodation}`), patch: { accommodation: null } }] : []),
    ...(filters.hostExperience ? [{ key: "xp", label: `${tf("hostExperience")} · ${tf(`hostExperienceOptions.${filters.hostExperience}`)}`, patch: { hostExperience: null } }] : []),
    ...filters.languages.map((language) => ({ key: `lang-${language}`, label: format.language(language), patch: { languages: filters.languages.filter((l) => l !== language) } })),
    ...(filters.verifiedOnly ? [{ key: "verified", label: tf("verifiedChip"), patch: { verifiedOnly: false } }] : []),
    ...(filters.depth ? [{ key: "depth", label: `${tf("depth")} · ${tf(`depthOptions.${filters.depth}`)}`, patch: { depth: null } }] : []),
  ];
  // The results head (CLAUDE.md "Ergebnis-Titel ohne Doppelung"): the title names the choice – one filter: its name ("Short Trips", a theme,
  // a place); several: "{N} houses" –, beside it grey "{N} houses · {M} countries"; the number never twice (with "{N} houses" as the title
  // only the countries). Unfiltered "Open Houses": the number only from EXPLORE_COUNTS.showTotalCountMin, else only "{M} countries" (and that
  // only from showCountriesMin). Filtered views and the "See all" pages always show the number.
  const countriesLabel = tc("countries", { count: countryCount });
  const bothCounts = t("summary", { houses: resultLabel, countries: countriesLabel });
  const selectionTitle = activeChips.length === 1 ? activeChips[0].label : resultLabel;
  const headTitle = searchView ? selectionTitle : collection ? tCollections(`${collection.id}.title`) : t("title");
  const headSummary =
    searchView || scoped
      ? searchView && selectionTitle === resultLabel
        ? countriesLabel
        : bothCounts
      : results.length >= EXPLORE_COUNTS.showTotalCountMin
        ? bothCounts
        : countryCount >= EXPLORE_COUNTS.showCountriesMin
          ? countriesLabel
          : undefined;
  // Browsing Explore (CLAUDE.md "Rhythmus aus Raster und Reihen"): Spotlight → signed in "Your people are going" → a block of 2 rows → "Just
  // opened" → a block → "Short trips" → a block → the further rows in the same pattern. The grid laid out in advance (lib/highlight.ts):
  // blocks of full rows (a wide card – a real last spot, 3+ columns, at most one per 8 – counts as two cells), a House from the row right
  // before a block waits for a later one, and while more pages are to come a last half row stays out (it comes with the next page).
  const chunk = EXPLORE_RHYTHM.rowsPerBlock * (cols || 4);
  const interleave = browsing && cards.length > chunk && !few;
  const isWide = (stay: Stay) => cols >= HIGHLIGHT_MIN_COLS && canPay(phase) && !stay.isExample && openSpots(stay) === 1;
  const peopleIds = useMemo(() => new Set(showPeople ? peopleGoing.map((s) => s.id) : []), [showPeople, peopleGoing]);
  const chunks: FeedItem[][] =
    browsing && !few && cols > 0
      ? feedLayout(cards, cols, interleave ? EXPLORE_RHYTHM.rowsPerBlock : Number.POSITIVE_INFINITY, isWide, {
          // Block 0 follows "Your people are going", block i the row bands[i − 1].
          avoid: (block) => (block === 0 ? peopleIds : bands[block - 1]?.kind === "collection" ? new Set((bands[block - 1] as Extract<Band, { kind: "collection" }>).shelf.stays.map((s) => s.id)) : undefined),
          fullRowsOnly: cards.length < paging.total,
        })
      : [cards.map((stay) => ({ stay, wide: false }))];
  const shownCount = chunks.reduce((n, part) => n + part.length, 0);
  // The list's end (the header's tab closes here) and, 48px under it, how far you are and "Show 24 more".
  const gridEnd = () => (
    <>
      <div ref={gridEndRef} aria-hidden className="h-0" />
      <LoadMore
        shown={shownCount}
        total={paging.total}
        nextCount={paging.nextCount}
        loading={paging.loading}
        onLoadMore={paging.loadMore}
        paged={paging.paged}
        doneLink={{ href: "/create", label: tc("loadMore.openOwn") }}
        className={EXPLORE_SPACING.showMore}
      />
      {results.length > 0 && !few && <NotifyLine draft={draft} className={EXPLORE_SPACING.showMore} />}
    </>
  );
  const rowVibes = [...fixedVibes, ...(lastVibe ? [lastVibe] : [])];
  const rowOptions = rowVibes.map((key) => vibeOptions.find((o) => o.value === key)!).filter(Boolean);
  const moreOptions = vibeOptions.filter((o) => !rowVibes.includes(o.value));

  // From 1100px the header carries the search, the themes and the filters (HeaderCenter); below, the chip row at the top of the page.
  const md = useMediaQuery(MD_QUERY);
  const desktop = useIsDesktop();
  // From 744px the header's panel: hover 200ms or click, stays open once you work in it (HeaderPanel). Phones: the button opens the sheet.
  const filterPanel = useHeaderPanel(sheetOpen && md, setSheetOpen);
  // After the bar's All filters closes (from md): to the grid, if something changed there (phones: the Sheet's onClosed).
  useEffect(() => {
    if (sheetOpen || !md || !scrollAfterPanel.current) return;
    scrollAfterPanel.current = false;
    // Once the panel has gone and the page is unlocked again (its closing takes 260ms).
    return glideToHead(headRef, 300);
  }, [sheetOpen, md]);
  // From 1100px the quick search sits in the desktop header's bar; below it the chip row under the header (phones and tablets).
  const inBar = !headless && desktop;


  // What Filters counts and clears: what the panel holds – sorting and the four filters, not the category chips.
  const panelCount = panelFilterCount(filters);

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
  // Below 1100px: All · Short trips (its bolt orange) · the themes one by one · More – they act at once (not part of the filter draft).
  const shortTripsOn = filters.lengths.includes("weekend");
  const toggleShortTrips = () => update({ lengths: shortTripsOn ? filters.lengths.filter((l) => l !== "weekend") : [...filters.lengths, "weekend"] });
  const shortTripsChip = (
    <Chip variant="bare" size="lg" role="checkbox" aria-checked={shortTripsOn} active={shortTripsOn} onClick={toggleShortTrips} icon={<span className="text-accent [&_svg]:size-4"><SlimBolt /></span>}>
      {tf("shortTrips")}
    </Chip>
  );
  const chipRow = <CategoryRow {...vibeRow} chips={showVibes ? vibeRow.chips : []} more={showVibes ? vibeRow.more : []} lead={shortTripsChip} />;
  const preLaunch = !scoped && isPreLaunch(store.stays);
  // Explore itself (not a city / vibe / collection page, not before the launch): scrolled down, header and filters become one compact bar.
  // Explore itself (not a city / vibe / collection page, not before the launch): the quick search lives in the header's bar.
  // Explore and every "See all" page (/collections/…, CLAUDE.md "Aufräumen – ein Design") – the full middle; not the city / vibe landing pages.
  const quickSearch = !headless && !preLaunch;
  // Before the launch: no Spotlight, no grid. The slogan and the same search, ending where an empty result ends.
  if (preLaunch) return <ExplorePrelaunch />;

  // "All filters" toggles: from md it grows out of the bar (ui/BarSheet), on phones the bottom sheet.
  const openPanel = () => setSheetOpen((o) => !o);
  const closePanel = () => setSheetOpen(false);
  const Wrap = headless ? Fragment : Container;
  const RowWrap = headless ? "div" : Container;
  return (
    <div className="explore-root">
      {/* Explore's quick search, in the header's one bar (SiteHeader's slot): Where · When, Short trips, the categories (they give way first
          below 1100px), "All filters" (glass; below 1100px only its icon). The sort stays beside "Open Houses". */}
      {quickSearch &&
        headerSlot &&
        createPortal(
          <>
            {/* The bar's middle (CLAUDE.md "Kopfleiste neu geordnet"): ⌕ Where · When | Short trips · Themes ▾ · Filters ▾ – plain words. */}
            <HeaderCenter
              place={filters.place}
              month={filters.month}
              onWhereWhen={update}
              autoOpen
              shortTrips={filters.lengths.includes("weekend")}
              // A link to the Short Trips results – on this page set in place (never a switch: it goes with its chip or "Clear all").
              onShortTrips={() => update({ lengths: [...filters.lengths.filter((l) => l !== "weekend"), "weekend"] })}
              vibes={showVibes ? filters.vibes : []}
              sub={filters.sub}
              onTheme={(vibe) => update({ vibes: vibe ? [vibe as Vibe] : [], sub: null })}
              onSubTheme={(parent, sub) => update({ vibes: [parent as Vibe], sub })}
              filterCount={panelCount}
              filtersOpen={panelOpen}
              onFilters={openPanel}
              filtersTrigger={filterPanel.trigger}
              filtersRef={setFiltersEl}
            />
          </>,
          headerSlot,
        )}
      {/* Searching, from 1100px: the bar that runs along under the header once the results' head has scrolled away (CLAUDE.md "Mitlaufender
          Ergebnis-Kopf"). */}
      {(searchView || scoped) && inBar && (
        <ResultsBar
          summary={headSummary}
          headRef={headRef}
          title={headTitle}
          chips={<ActiveFilterChips compact chips={activeChips} label={tf("sectionActive")} removeLabel={(label) => tf("remove", { label })} clearLabel={tf("clearAll")} onRemove={(chip) => update(chip.patch)} onClear={clearFilters} />}
          sort={
            <SortCapsule variant="tertiary" label={t(`sortOptions.${filters.sort}`)}>
              <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
            </SortCapsule>
          }
        />
      )}
      {/* City / vibe pages, and phones: the chips, Sort and Filters as a plain sticky row at the top of the page. */}
      {!inBar && (
        // Below 1100px (phones and tablets): the chip row, sticky under the header, on the header's fixed surface (.chip-bar). The filters
        // and the sort open from the header's search field (CompactSearch → the feed's filter sheet).
        <div data-bar className={cn("filter-row chip-bar sticky top-(--header-total) z-30", !headless && "split:hidden")}>
          <RowWrap className="flex h-(--filter-row-h) items-center gap-3">
            <div className="min-w-0 flex-1">{chipRow}</div>
          </RowWrap>
        </div>
      )}
      {/* Carousel below lg, bento block from lg up – each hides itself at the other size. */}
      {showSpotlight && (
        <>
          {/* Below lg the carousel is another component; the title for visitors goes above it here. */}
          {/* Before the launch and in the beta: the launch hero ("Opening May 2027", "Find your people.", the waitlist and the founding host). */}
          {launchHero && <LaunchIntro launch={launchHero} className="md:hidden" />}
          <SpotlightHero stays={spotlightStays} />
          <SpotlightCoverflow stays={spotlightStays} countOf={openOfVibe} onPickVibe={vibeRow.onSelect} launchHero={launchHero} />
        </>
      )}

      {/* Explore's rhythm (browsing): Spotlight → band "Just opened" → "Open Houses" (two rows) → band "Short trips" → two rows → band "Your people
          are going" → the rest and "Show 24 more". Bands: full width, a soft tint (.band), the same card size as the grid. Searching: only the
          count, the active filters as chips and the grid. All spacing: EXPLORE_SPACING. */}
      <Wrap>
        <div data-explore-blocks>
          {showPeople && browsing && (
            // Under the Spotlight's stage, below the first screen (CLAUDE.md "Startseite – Bühne nach oben, unten hell").
            <RowTile>
              <PeopleGoingRow />
            </RowTile>
          )}
          <FullBleedSection inner={headless ? undefined : "explore-width"} padding={cn(showSpotlight && !(showPeople && browsing) ? EXPLORE_SPACING.underHero : showPeople && browsing ? "pt-0" : EXPLORE_SPACING.scopedTop, interleave ? "pb-0" : EXPLORE_SPACING.feedEnd)}>
            {!headless && (
              <>
                {/* The page's one H1 (Explore is the home page; a /collections page is titled by its collection). Right on its baseline the
                    sort. Searching on Explore: the count is the title, the active filters follow as chips. */}
                {/* THE results head (explore/ActiveFilters ResultsHead): title + grey summary + sort; the active filters; one line of
                    description ("See all" pages: the collection's line). */}
                <div ref={headRef} data-results-head>
                  {/* Unfiltered Explore (CLAUDE.md "Startseite-Raster ohne Zahlen und Sortierung"): the title alone, small and calm – no count, no
                      sort menu, the order is "For you". Results and "See all" pages: title, "N houses · M countries" and the sort. */}
                  <ResultsHead
                    title={headTitle}
                    calm={!searchView && !scoped}
                    summary={searchView || scoped ? headSummary : undefined}
                    description={collection && !searchView ? tCollections(`${collection.id}.subline`) : undefined}
                    sort={
                      searchView || scoped ? (
                        <SortCapsule variant="tertiary" label={t(`sortOptions.${filters.sort}`)}>
                          <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
                        </SortCapsule>
                      ) : undefined
                    }
                    chips={activeChips.length > 0 ? <ActiveFilterChips chips={activeChips} label={tf("sectionActive")} removeLabel={(label) => tf("remove", { label })} clearLabel={tf("clearAll")} onRemove={(chip) => update(chip.patch)} onClear={clearFilters} /> : undefined}
                  />
                </div>
              </>
            )}
            {/* Where a filter change scrolls to: the grid's start right under the tab. */}
            {/* Searching: the results keep at least a window's height, so the glide to the head never runs out of page and nothing jumps
                when the cards change (CLAUDE.md "Filtern ohne Springen"). */}
            <div ref={resultsRef} data-explore-results className={cn(!headless && EXPLORE_SPACING.headContent, searchView && "min-h-[calc(100svh-var(--header-total)-160px)]")}>
              <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />
              {results.length === 0 ? (
                // Nothing: open this House, or save the search – and what's closest.
                // Before the launch and in the beta: "Be the first here" (the waitlist, host here) instead of "No House here yet".
                showsExamples(phase) ? <BeFirstHere draft={draft} onClear={filtered ? clearFilters : undefined} /> : <NoHouseYet draft={draft} stays={base} title={searched ? undefined : t("noResults.title")} onClear={filtered ? clearFilters : undefined} />
              ) : (
                <>
                  <FeedGrid items={chunks[0] ?? []} fresh={paging.fresh} after={
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
              {!interleave && gridEnd()}
            </div>
          </FullBleedSection>
          {/* The rhythm: a band, then the next cards – as long as there are cards (and after "Show 24 more" too); the list's end last. */}
          {interleave &&
            chunks.slice(1).map((part, i) => (
              <Fragment key={part[0]?.stay.id ?? i}>
                {bands[i] && <BandRow band={bands[i]} />}
                <FullBleedSection inner="explore-width" padding={cn(bands[i] ? "pt-0" : "pt-6", i === chunks.length - 2 && EXPLORE_SPACING.feedEnd)}>
                  <FeedGrid items={part} fresh={paging.fresh} />
                  {i === chunks.length - 2 && gridEnd()}
                </FullBleedSection>
              </Fragment>
            ))}
        </div>
      </Wrap>

      {/* "All filters": the bar's sheet from 744px, the bottom sheet on phones – a draft until "Show N houses" (explore/FilterSheets.tsx). */}
      <FilterSheets
        open={sheetOpen}
        md={md}
        panelHandlers={filterPanel.panel}
        onClose={closePanel}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClosed={() => {
          if (scrollAfterPanel.current) glideToHead(headRef, 0);
          scrollAfterPanel.current = false;
        }}
        anchor={filtersAnchor}
        filters={filters}
        base={base}
        verifiedHosts={verifiedHosts}
        showVibes={showVibes}
        vibeOptions={vibeOptions}
        sortOptions={sortOptions}
        budgetBounds={budgetBounds}
        prices={prices}
        currency={currency}
        hostPremium={hostPremium}
        depthOn={depthOn}
      />

    </div>
  );
}

/**
 * The list's grid. Browsing with 3+ columns (`highlight`): each block shows its most urgent House two columns wide in its first row (lib/highlight:
 * one spot left › starts within 7 days › just opened), with the reason as a capsule – on the left in even blocks, on the right in odd ones;
 * the rest flows around it, no holes (grid-auto-flow: dense).
 */
/**
 * Glides to the results' head (CLAUDE.md "Filtern ohne Springen"), after `delay` ms. The page's height can still change while it glides (the
 * Spotlight and the bands go, the cards come): once the glide has ended it aligns the head once more – it always lands just under the header.
 * Returns the cleanup.
 */
function glideToHead(headRef: RefObject<HTMLElement | null>, delay: number): () => void {
  let timer = 0;
  let start = 0;
  const again = () => {
    window.removeEventListener("scrollend", again);
    window.clearTimeout(timer);
    scrollUnderHeader(headRef.current);
  };
  start = window.setTimeout(() => {
    requestAnimationFrame(() => {
      scrollUnderHeader(headRef.current);
      window.addEventListener("scrollend", again, { once: true });
      timer = window.setTimeout(again, 900);
    });
  }, delay);
  return () => {
    window.clearTimeout(start);
    window.clearTimeout(timer);
    window.removeEventListener("scrollend", again);
  };
}

function FeedGrid({ items, fresh, after }: { items: readonly FeedItem[]; /** The page that just came: it fades in */ fresh?: ReadonlySet<string>; /** One more tile after the cards */ after?: ReactNode }) {
  const store = useStore();
  // Laid out in advance (lib/highlight.ts feedLayout): a wide card spans two columns where it stands – never in the last one, no gaps.
  return (
    <div className={EXPLORE_GRID}>
      {items.map(({ stay, wide }) => (
        <HouseCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} wide={wide} className={cn(wide && "col-span-2", fresh?.has(stay.id) && "animate-page-in")} />
      ))}
      {after}
    </div>
  );
}

/** How far back a slow host's House moves in the default order: as if it started this many days later. */
const SLOW_HOST_SHIFT_DAYS = 7;

/**
 * The chosen order: soonest start, lowest price per person (≈ EUR, Houses without a price last) or just opened. "Soonest" is the default (the
 * recommended order): a host who answers under 70 % of requests counts as starting a week later there, a House at the depth that fits the
 * viewer a few days earlier (`shiftDays`) – higher or lower, never hidden.
 */
function compareBy(sort: SortKey, a: Stay, b: Stay, shiftDays?: (s: Stay) => number, scoreOf?: (s: Stay) => number): number {
  // "For you" (the default): the higher score first (lib/ranking.ts – never Simpulo's fee or revenue); ties: the sooner start.
  if (sort === "forYou" && scoreOf) return scoreOf(b) - scoreOf(a) || a.startDate.localeCompare(b.startDate);
  if (sort === "soonest" || sort === "forYou") {
    const start = (s: Stay) => Date.parse(s.startDate) + (shiftDays?.(s) ?? 0) * 86_400_000;
    return start(a) - start(b) || a.startDate.localeCompare(b.startDate);
  }
  if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
  const price = (s: Stay) => eurRange(s)?.min ?? Number.POSITIVE_INFINITY;
  return price(a) - price(b) || a.startDate.localeCompare(b.startDate);
}

/** One band of Explore's rhythm: a collection's shelf or "Your people are going". */
type Band = { key: string; kind: "people" } | { key: string; kind: "collection"; shelf: Shelf };

function BandRow({ band }: { band: Band }) {
  // Every row but "Your people are going" in a light tile (CLAUDE.md "Rhythmus aus Raster und Reihen").
  return <RowTile>{band.kind === "people" ? <PeopleGoingRow /> : <CollectionRow collection={band.shelf.collection} stays={band.shelf.stays} />}</RowTile>;
}


