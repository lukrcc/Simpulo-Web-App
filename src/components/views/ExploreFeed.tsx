"use client";

import { BellRing, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { BentoTop } from "@/components/BentoTop";
import { CollectionRow } from "@/components/explore/CollectionRow";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { BudgetSlider, CategoryRow, CheckboxList, FilterPanel, FiltersButton, PlaceDateSearch, SortCapsule, type CheckOption } from "@/components/explore/Filters";
import { SEARCH_INLINE_THRESHOLD, SORT_INLINE_THRESHOLD, VISIBLE_CHIPS } from "@/config/explore";
import { AddPlaceSheet, DemandCard, InterestRow, useDemandSpots } from "@/components/explore/InterestRow";
import { MonthChips } from "@/components/form/MonthChips";
import { Container } from "@/components/layout/Container";
import { SpotlightHero } from "@/components/SpotlightHero";
import { StayCard } from "@/components/StayCard";
import { Img } from "@/components/ui/Img";
import { buttonClass } from "@/components/ui/button";
import { useFormat } from "@/i18n/format";
import { useFormatter } from "next-intl";
import { collectionsFor, COLLECTIONS, type Collection } from "@/lib/collections";
import { citySlugOf } from "@/lib/data/stays";
import {
  activeCount,
  countryCodeOf,
  countryNameOf,
  countryOf,
  countryRegionOf,
  EMPTY_FILTERS,
  eurRange,
  matchesFilters,
  SORT_KEYS,
  withFilters,
  type ExploreFilters,
  type SortKey,
} from "@/lib/exploreFilters";
import { setExploreFilters, useExploreFilters } from "@/lib/exploreFilterState";
import { useHeroStays } from "@/lib/heroRotation";
import { getCardVariant, MAX_COLLECTIONS, sectionsOf, SPOTLIGHT_VISIBLE, withoutSpotlightUpFront } from "@/lib/exploreLayout";
import { FLEXIBLE, WORLD_REGIONS, type DemandSpot } from "@/lib/interests";
import { VIBES } from "@/lib/mock";
import { findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";

/** Grid columns by width: 4 from 1440px, 3 from 1024px, 2 from 768px, else 1. */
const COLUMN_QUERIES = [
  { query: "(min-width: 1440px)", cols: 4 },
  { query: "(min-width: 1024px)", cols: 3 },
  { query: "(min-width: 768px)", cols: 2 },
] as const;

function subscribeColumns(onChange: () => void) {
  const lists = COLUMN_QUERIES.map((q) => window.matchMedia(q.query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

/** 0 on the server and during hydration – the grid then renders without collection rows. */
function useGridColumns(): number {
  return useSyncExternalStore(
    subscribeColumns,
    () => COLUMN_QUERIES.find((q) => window.matchMedia(q.query).matches)?.cols ?? 1,
    () => 0,
  );
}

/** From this many public Houses on, collection rows appear (fewer: launch – the grid and the demand row only). */
const COLLECTIONS_FROM = 8;
/** Cards per page of the grid ("Show more" adds as many) – divisible by 1–4 columns, so every page ends on full rows. */
const PAGE_SIZE = 24;
/** Budget slider ends are rounded to this (EUR). */
const BUDGET_ROUND = 50;

/** The grid's own breakpoints – COLUMN_QUERIES above must match them, so sections end on complete rows. */
const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 min-[90rem]:grid-cols-4";

type FeedCard = { kind: "stay"; stay: Stay } | { kind: "interest"; spot: DemandSpot };

function isListed(stay: Stay): boolean {
  return stay.status === "published";
}

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
  const spots = useDemandSpots();
  const collection = scope && "collection" in scope ? COLLECTIONS.find((c) => c.id === scope.collection) : undefined;

  const resultsRef = useRef<HTMLDivElement>(null);
  // Every change goes into the URL right away (no navigation), so it can be shared and survives a reload. The page then
  // glides to the start of the House list, its top just under the header (with its filter row).
  const setFilters = useCallback((next: ExploreFilters, key?: string) => {
    setExploreFilters(next, key);
    requestAnimationFrame(() => scrollUnderHeader(resultsRef.current));
  }, []);
  const update = (patch: Partial<ExploreFilters>) => setFilters({ ...filters, ...patch }, Object.keys(patch).join(","));

  // Houses of people you blocked never show up.
  const blocked = settingsOf(getCurrentUser(store)).blockedUserIds;
  const listed = useMemo(() => store.stays.filter((s) => isListed(s) && !blocked.includes(s.hostId)), [store.stays, blocked]);
  const base = useMemo(() => listed.filter((s) => inScope(s, scope)), [listed, scope]);
  // The hero (bento / carousel): open Houses with a free spot that haven't started, in the session's weighted order.
  const featured = useHeroStays(listed, (s) => findUser(store, s.hostId));

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
  // Counts for the panel's checkboxes, next to the other filters.
  const categoryOptions = useMemo<CheckOption[]>(
    () => vibesByCount.map((key) => ({ value: key, label: format.vibe(key as Vibe), count: base.filter((s) => s.vibe === key && matchesFilters(s, filters, "vibes")).length })),
    [vibesByCount, base, filters, format],
  );
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
  // The Spotlight's Houses don't open the grid as well.
  const spotlightIds = useMemo(() => new Set(scoped ? [] : featured.slice(0, SPOTLIGHT_VISIBLE).map((s) => s.id)), [featured, scoped]);
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

  // Collections: unfiltered Explore with enough Houses only, at most three, each after a complete section – never at
  // the very end. Before the column count is known (server render) there are none.
  const collections = filtered || scoped || listed.length < COLLECTIONS_FROM || cols === 0 ? [] : collectionsFor(results).slice(0, MAX_COLLECTIONS);
  const sections = sectionsOf(cards, cols || 4);
  const groups: { cards: FeedCard[]; collection?: (typeof collections)[number] }[] = [];
  let pending: FeedCard[] = [];
  sections.forEach((section, i) => {
    pending.push(...section);
    const next = i < sections.length - 1 ? collections[i] : undefined;
    if (next) {
      groups.push({ cards: pending, collection: next });
      pending = [];
    }
  });
  groups.push({ cards: pending });

  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  const rowVibes = [...fixedVibes, ...(lastVibe ? [lastVibe] : [])];
  const rowOptions = rowVibes.map((key) => vibeOptions.find((o) => o.value === key)!).filter(Boolean);
  const moreOptions = vibeOptions.filter((o) => !rowVibes.includes(o.value));
  const eur = (amount: number) => formatter.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  // No public House at all (yet): one intentional screen instead of an empty feed.
  if (!scoped && listed.length === 0) return <ExploreEmpty />;

  // What Filters counts and clears: what the panel holds – sorting and the four filters, not the category chips.
  const panelCount =
    filters.countries.length + filters.languages.length + filters.months.length + (filters.budget ? 1 : 0) + (filters.sort === EMPTY_FILTERS.sort ? 0 : 1);
  const clearPanel = () => setFilters({ ...EMPTY_FILTERS, vibes: filters.vibes });

  /** The row's search field: a country and / or month named in the text become those filters ("Portugal March"). */
  function searchPlaceDate(query: string) {
    const text = query.toLocaleLowerCase();
    const countries = countryOptions.filter((o) => text.includes(o.label.toLocaleLowerCase())).map((o) => o.value);
    const houseMonths = [...new Set(base.map((s) => s.startDate.slice(0, 7)).filter(Boolean))];
    const months = houseMonths.filter((month) => text.includes(formatter.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "long", timeZone: "UTC" }).toLocaleLowerCase()));
    if (countries.length === 0 && months.length === 0) return;
    update({ ...(countries.length > 0 && { countries }), ...(months.length > 0 && { months }) });
  }

  const Wrap = headless ? Fragment : Container;
  const RowWrap = headless ? "div" : Container;
  return (
    <div>
      {/* The header's second row (56px): eight category chips + "More", and Filters. Same glass as the header bar, a line
          between the two; it sticks right under the header bar (desktop: also while that shrinks; phones: at the top).
          In the page flow, so the hero and everything else start below it. */}
      <div className="glass sticky top-(--header-h) z-30 rounded-none border-0 bg-surface/72 shadow-none after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line md:top-(--header-bar-h) md:transition-[top] md:duration-200 md:ease-out motion-reduce:transition-none">
        <RowWrap className="flex h-(--filter-row-h) items-center gap-3">
          <div className="min-w-0 flex-1">
            {showVibes && (
              <CategoryRow
                label={t("filterByVibe")}
                allLabel={t("all")}
                moreLabel={t("more")}
                chips={rowOptions}
                more={moreOptions}
                value={filters.vibes}
                // Single choice in the row (several only in the panel); a pick from More takes the last slot.
                onSelect={(vibe) => {
                  if (vibe && !fixedVibes.includes(vibe)) setSlotVibe(vibe);
                  update({ vibes: vibe ? [vibe as Vibe] : [] });
                }}
              />
            )}
          </div>
          {/* Shortcuts only with enough Houses to pay off (src/config/explore.ts); the panel has everything anyway. */}
          <div className="flex shrink-0 items-center gap-2">
            {base.length >= SEARCH_INLINE_THRESHOLD && <PlaceDateSearch onSearch={searchPlaceDate} />}
            {base.length >= SORT_INLINE_THRESHOLD && (
              <SortCapsule label={t(`sortOptions.${filters.sort}`)}>
                <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
              </SortCapsule>
            )}
            <FiltersButton count={panelCount} onClick={() => setPanelOpen(true)} expanded={panelOpen} small />
          </div>
        </RowWrap>
      </div>
      {/* Carousel below lg, bento block from lg up – each hides itself at the other size. */}
      {/* Filtered, results come first – the Spotlight (unrelated to the filters) steps aside. */}
      {!scoped && !filtered && (
        <>
          <SpotlightHero stays={featured} />
          <BentoTop stays={featured} />
        </>
      )}

      <Wrap>
        {!headless && (
          <div className={scoped || filtered ? "pt-10" : "mt-12"}>
            {/* The page's one H1 (Explore is the home page; a /collections page is titled by its collection). */}
            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{collection ? tCollections(`${collection.id}.title`) : t("title")}</h1>
            {collection && <p className="mt-1 text-lg text-muted">{tCollections(`${collection.id}.subline`)}</p>}
            <p className="mt-1 text-muted">{t("summary", { houses: resultLabel, countries: tc("countries", { count: countryCount }) })}</p>
            {/* Logged out on mobile there's no tab bar – this is the way to "How it works" (plus the footer). */}
            {!store.currentUserId && (
              <Link href="/how-it-works" className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 md:hidden">
                {t("howItWorksLink")}
              </Link>
            )}
          </div>
        )}

        {/* Where a filter change scrolls to. */}
        <div ref={resultsRef}>
        {results.length === 0 ? (
          // Nothing for these filters: say so, and the way back.
          <div className="mt-10 flex flex-col items-center rounded-[28px] bg-surface px-6 py-12 text-center">
            <p className="text-xl font-semibold tracking-tight text-ink">{t("noResults.title")}</p>
            <p className="mt-1 max-w-md text-muted">{t("noResults.text")}</p>
            {filtered && (
              <button type="button" onClick={clearFilters} className={buttonClass("dark", "md", "mt-6")}>
                {t("noResults.clear")}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6">
            {groups.map((group, i) => (
              <div key={i}>
                <div className={GRID}>
                  {group.cards.map((card) =>
                    card.kind === "interest" ? (
                      <DemandCard key={card.spot.placeName} spot={card.spot} tile />
                    ) : (
                      <StayCard
                        key={card.stay.id}
                        stay={card.stay}
                        host={findUser(store, card.stay.hostId)}
                        crew={getCrew(store, card.stay)}
                        variant={getCardVariant(card.stay, spotlightIds)}
                      />
                    ),
                  )}
                </div>
                {/* Between two complete sections, with the same space above and below. */}
                {group.collection && (
                  <div className="my-12">
                    <CollectionRow collection={group.collection.collection} stays={group.collection.stays} />
                  </div>
                )}
              </div>
            ))}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button type="button" onClick={() => setPaging((p) => ({ ...p, visible: p.visible + PAGE_SIZE }))} className={buttonClass("secondary", "lg")}>
                  {t("showMore", { count: Math.min(PAGE_SIZE, allCards.length - paging.visible) })}
                </button>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Where people want to go – always at the end of the feed (with no results too). */}
        <div className="mt-16">
          <InterestRow exclude={fillers} />
        </div>
      </Wrap>

      {/* Filters: sorting and the four filters, from the right. Live – the footer only clears or closes. */}
      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={t("filters")}
        footer={
          <>
            <button
              type="button"
              onClick={clearPanel}
              disabled={panelCount === 0}
              className="text-sm font-semibold text-ink underline-offset-4 hover:underline disabled:text-muted/60 disabled:no-underline"
            >
              {tf("clearAll")}
            </button>
            <button type="button" onClick={() => setPanelOpen(false)} className={buttonClass("dark", "md")}>
              {tf("show", { count: results.length })}
            </button>
          </>
        }
      >
        <FilterSection title={t("sort")}>
          <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
        </FilterSection>
        {/* Several categories at once – only here; the row picks one. */}
        {showVibes && (
          <FilterSection title={tf("categories", { count: filters.vibes.length })}>
            <CheckboxList options={categoryOptions} value={filters.vibes} onChange={(vibes) => update({ vibes: vibes as Vibe[] })} />
          </FilterSection>
        )}
        <FilterSection title={t("country")}>
          {countryOptions.length > 0 ? (
            <CheckboxList options={countryOptions} value={filters.countries} onChange={(countries) => update({ countries })} searchPlaceholder={t("searchCountries")} />
          ) : (
            <p className="text-sm text-muted">{tf("noOptions")}</p>
          )}
        </FilterSection>
        <FilterSection title={tf("month")}>
          <MonthChips value={filters.months} onChange={(months) => update({ months: months.filter((m) => m !== FLEXIBLE) })} label={tf("month")} columns="three" />
        </FilterSection>
        <FilterSection title={tf("budget")}>
          {budgetBounds ? (
            <BudgetSlider bounds={budgetBounds} value={filters.budget} onChange={(budget) => update({ budget })} format={eur} />
          ) : (
            <p className="text-sm text-muted">{tf("noBudget")}</p>
          )}
        </FilterSection>
        <FilterSection title={t("language")}>
          {languageOptions.length > 0 ? (
            <CheckboxList options={languageOptions} value={filters.languages} onChange={(languages) => update({ languages })} />
          ) : (
            <p className="text-sm text-muted">{tf("noOptions")}</p>
          )}
        </FilterSection>
      </FilterPanel>

    </div>
  );
}

/**
 * Smoothly scrolls `el` to just under the header and its filter row (desktop: the compact header bar it shrinks to on
 * the way; phones: no top header, only the safe area). Instant with reduced motion.
 */
function scrollUnderHeader(el: HTMLElement | null) {
  if (!el) return;
  const root = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(root.getPropertyValue(name)) || 0;
  const header = window.matchMedia("(min-width: 768px)").matches ? px("--header-bar-h-compact") : px("--header-h");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - px("--filter-row-h"), behavior: reduce ? "auto" : "smooth" });
}

/** The chosen order: soonest start, lowest price per person (≈ EUR, Houses without a price last) or just opened. */
function compareBy(sort: SortKey, a: Stay, b: Stay): number {
  if (sort === "soonest") return a.startDate.localeCompare(b.startDate);
  if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
  const price = (s: Stay) => eurRange(s)?.min ?? Number.POSITIVE_INFINITY;
  return price(a) - price(b) || a.startDate.localeCompare(b.startDate);
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

/** Sort as a short radio list (in its popover and in the mobile sheet). */
function SortList({ options, value, onChange }: { options: ReadonlyArray<{ value: SortKey; label: string }>; value: SortKey; onChange: (sort: SortKey) => void }) {
  // Its own radio group name: the list can be on the page more than once (pills row, sheet, sticky bar).
  const name = useId();
  return (
    <div role="radiogroup" className="space-y-1">
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2 text-[15px] hover:bg-bg">
          {o.label}
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="size-5 accent-ink" />
        </label>
      ))}
    </div>
  );
}

/**
 * Pre-launch (no public House yet): the smiley, "The first houses are opening soon", Open a House / Get notified –
 * right on the page – and, still above the fold, where people already want to go. "Get notified" asks to log in
 * first, then opens "Add a place".
 */
function ExploreEmpty() {
  const t = useTranslations("explore.empty");
  const requireAuth = useRequireAuth();
  const [adding, setAdding] = useState(false);
  return (
    <Container page>
      <section className="flex flex-col items-center text-center">
        <Img src="/icon.svg" alt="" width={80} height={80} className="size-20" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink md:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-md text-lg text-muted">{t("text")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/create" className={buttonClass("dark", "lg")}>
            <Plus className="size-4" aria-hidden />
            {t("open")}
          </Link>
          <button type="button" onClick={() => requireAuth(() => setAdding(true), t("notifyLogin"))} className={buttonClass("secondary", "lg")}>
            <BellRing className="size-4" aria-hidden />
            {t("notify")}
          </button>
        </div>
      </section>
      <div className="mt-12">
        <InterestRow layout="grid" />
      </div>
      <AddPlaceSheet open={adding} onClose={() => setAdding(false)} />
    </Container>
  );
}
