"use client";

import { BellRing, Plus, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { BentoTop } from "@/components/BentoTop";
import { CollectionRow } from "@/components/explore/CollectionRow";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { ActiveFilterChips, BudgetSlider, CheckboxList, FilterPopover, VibeChipRow, type ActiveChip, type CheckOption } from "@/components/explore/Filters";
import { AddPlaceSheet, DemandCard, InterestRow, useDemandSpots } from "@/components/explore/InterestRow";
import { MonthChips, shortMonth } from "@/components/form/MonthChips";
import { Container } from "@/components/layout/Container";
import { SpotlightHero } from "@/components/SpotlightHero";
import { StayCard } from "@/components/StayCard";
import { Img } from "@/components/ui/Img";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
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
  parseFilters,
  SORT_KEYS,
  withFilters,
  type ExploreFilters,
  type SortKey,
} from "@/lib/exploreFilters";
import { getCardVariant, MAX_COLLECTIONS, sectionsOf, SPOTLIGHT_VISIBLE, withoutSpotlightUpFront } from "@/lib/exploreLayout";
import { FLEXIBLE, WORLD_REGIONS, type DemandSpot } from "@/lib/interests";
import { VIBES } from "@/lib/mock";
import { findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [filters, setFiltersState] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const spots = useDemandSpots();
  const collection = scope && "collection" in scope ? COLLECTIONS.find((c) => c.id === scope.collection) : undefined;

  // Every change goes into the URL right away (no navigation), so it can be shared and survives a reload.
  const setFilters = useCallback((next: ExploreFilters) => {
    setFiltersState(next);
    const url = new URL(window.location.href);
    window.history.replaceState(window.history.state, "", url.pathname + withFilters(url.searchParams, next) + url.hash);
  }, []);
  const update = (patch: Partial<ExploreFilters>) => setFilters({ ...filters, ...patch });

  // Houses of people you blocked never show up.
  const blocked = settingsOf(getCurrentUser(store)).blockedUserIds;
  const listed = useMemo(() => store.stays.filter((s) => isListed(s) && !blocked.includes(s.hostId)), [store.stays, blocked]);
  const base = useMemo(() => listed.filter((s) => inScope(s, scope)), [listed, scope]);
  // The Spotlight only shows Houses that are taking requests.
  const featured = useMemo(() => listed.filter((s) => s.featured && s.acceptingRequests), [listed]);

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
  // A filter only pays off with more than one choice (a city page has one country, a vibe page one vibe).
  const showCountries = countryOptions.length >= 2;
  const showLanguages = languageOptions.length >= 2;
  const showVibes = !(scope && "vibe" in scope);
  const vibeOptions = useMemo(() => VIBES.map((v) => ({ value: v.key, label: format.vibe(v.key) })), [format]);
  const sortOptions = SORT_KEYS.map((key) => ({ value: key, label: t(`sortOptions.${key}`) }));

  const results = base
    .filter((s) => matchesFilters(s, filters))
    .toSorted(
      (a, b) =>
        // Houses that aren't taking requests go after the open ones, each group in the chosen order.
        Number(!a.acceptingRequests) - Number(!b.acceptingRequests) ||
        (filters.sort === "soonest" ? a.startDate.localeCompare(b.startDate) : b.createdAt.localeCompare(a.createdAt)),
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
  const eur = (amount: number) => formatter.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const monthLabel = (month: string) => shortMonth(formatter, month, true);

  // One removable chip per selected value.
  const chips: ActiveChip[] = [
    ...filters.countries.map((code) => ({ key: `c-${code}`, label: countryNameOf(code), onRemove: () => update({ countries: filters.countries.filter((c) => c !== code) }) })),
    ...filters.languages.map((code) => ({ key: `l-${code}`, label: format.language(code), onRemove: () => update({ languages: filters.languages.filter((l) => l !== code) }) })),
    ...filters.months.map((month) => ({ key: `m-${month}`, label: monthLabel(month), onRemove: () => update({ months: filters.months.filter((m) => m !== month) }) })),
    ...(filters.budget ? [{ key: "budget", label: `${eur(filters.budget.min)}–${eur(filters.budget.max)}`, onRemove: () => update({ budget: null }) }] : []),
    ...filters.vibes.map((vibe) => ({ key: `v-${vibe}`, label: format.vibe(vibe), onRemove: () => update({ vibes: filters.vibes.filter((v) => v !== vibe) }) })),
  ];

  const filterParams = (
    <Suspense fallback={null}>
      <FilterParams onChange={setFiltersState} />
    </Suspense>
  );

  // No public House at all (yet): one intentional screen instead of an empty feed.
  if (!scoped && listed.length === 0) return <ExploreEmpty />;

  const popovers = (
    <>
      {showCountries && (
        <FilterPopover label={t("country")} count={filters.countries.length} resultLabel={resultLabel} onClear={() => update({ countries: [] })}>
          <CheckboxList options={countryOptions} value={filters.countries} onChange={(countries) => update({ countries })} searchPlaceholder={t("searchCountries")} />
        </FilterPopover>
      )}
      {showLanguages && (
        <FilterPopover label={t("language")} count={filters.languages.length} resultLabel={resultLabel} onClear={() => update({ languages: [] })}>
          <CheckboxList options={languageOptions} value={filters.languages} onChange={(languages) => update({ languages })} />
        </FilterPopover>
      )}
      <FilterPopover label={tf("month")} count={filters.months.length} resultLabel={resultLabel} onClear={() => update({ months: [] })}>
        <MonthChips value={filters.months} onChange={(months) => update({ months: months.filter((m) => m !== FLEXIBLE) })} label={tf("month")} columns="three" />
      </FilterPopover>
      {budgetBounds && (
        <FilterPopover label={tf("budget")} count={filters.budget ? 1 : 0} resultLabel={resultLabel} onClear={() => update({ budget: null })} wide align="right">
          <BudgetSlider bounds={budgetBounds} value={filters.budget} onChange={(budget) => update({ budget })} format={eur} />
        </FilterPopover>
      )}
      <FilterPopover label={t("sort")} valueLabel={t(`sortOptions.${filters.sort}`)} count={filters.sort === "soonest" ? 0 : 1} resultLabel={resultLabel} align="right">
        <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
      </FilterPopover>
    </>
  );

  const Wrap = headless ? Fragment : Container;
  return (
    <div>
      {filterParams}
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
            {collection && <p className="mt-1 text-lg text-zinc-600">{tCollections(`${collection.id}.subline`)}</p>}
            <p className="mt-1 text-zinc-500">{t("summary", { houses: resultLabel, countries: tc("countries", { count: countryCount }) })}</p>
            {/* Logged out on mobile there's no tab bar – this is the way to "How it works" (plus the footer). */}
            {!store.currentUserId && (
              <Link href="/how-it-works" className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 md:hidden">
                {t("howItWorksLink")}
              </Link>
            )}
          </div>
        )}

        {/* Desktop: the filter pills; mobile: one "Filters" button for the sheet. Vibe chips on both. */}
        <div className={cn("hidden flex-wrap items-center gap-2 md:flex", headless ? "mt-2" : "mt-6")}>{popovers}</div>
        <div className={cn("flex items-center gap-2", headless ? "mt-2 md:mt-4" : "mt-5 md:mt-4")}>
          {showVibes && (
            <div className="min-w-0 flex-1">
              <VibeChipRow label={t("filterByVibe")} allLabel={t("all")} options={vibeOptions} value={filters.vibes} onChange={(vibes) => update({ vibes: vibes as Vibe[] })} />
            </div>
          )}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={activeCount(filters) > 0 ? tf("filtersCount", { count: activeCount(filters) }) : t("filters")}
            className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-ink md:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t("filters")}
            {activeCount(filters) > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{activeCount(filters)}</span>
            )}
          </button>
        </div>
        <ActiveFilterChips chips={chips} onClearAll={clearFilters} resultLabel={resultLabel} />

        {results.length === 0 ? (
          // Nothing for these filters: say so, and the way back.
          <div className="mt-10 flex flex-col items-center rounded-[28px] bg-white px-6 py-12 text-center">
            <p className="text-xl font-semibold tracking-tight text-ink">{t("noResults.title")}</p>
            <p className="mt-1 max-w-md text-zinc-500">{t("noResults.text")}</p>
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

        {/* Where people want to go – always at the end of the feed (with no results too). */}
        <div className="mt-16">
          <InterestRow exclude={fillers} />
        </div>
      </Wrap>

      {/* Mobile: every filter stacked in a sheet; changes apply live, the footer closes it. */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("filters")}>
        <div className="space-y-6 pb-2">
          {showVibes && (
            <SheetSection title={tf("vibe")}>
              <div className="flex flex-wrap gap-2">
                {vibeOptions.map((o) => {
                  const active = filters.vibes.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ vibes: active ? filters.vibes.filter((v) => v !== o.value) : [...filters.vibes, o.value] })}
                      className={cn("h-9 rounded-full px-4 text-sm font-medium", active ? "bg-ink text-white" : "bg-page text-ink")}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </SheetSection>
          )}
          <SheetSection title={tf("month")}>
            <MonthChips value={filters.months} onChange={(months) => update({ months: months.filter((m) => m !== FLEXIBLE) })} label={tf("month")} />
          </SheetSection>
          {showCountries && (
            <SheetSection title={t("country")}>
              <CheckboxList options={countryOptions} value={filters.countries} onChange={(countries) => update({ countries })} searchPlaceholder={t("searchCountries")} />
            </SheetSection>
          )}
          {showLanguages && (
            <SheetSection title={t("language")}>
              <CheckboxList options={languageOptions} value={filters.languages} onChange={(languages) => update({ languages })} />
            </SheetSection>
          )}
          {budgetBounds && (
            <SheetSection title={tf("budget")}>
              <BudgetSlider bounds={budgetBounds} value={filters.budget} onChange={(budget) => update({ budget })} format={eur} />
            </SheetSection>
          )}
          <SheetSection title={t("sort")}>
            <SortList options={sortOptions} value={filters.sort} onChange={(sort) => update({ sort })} />
          </SheetSection>
        </div>
        <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t border-black/5 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {filtered && (
            <button type="button" onClick={clearFilters} className={buttonClass("secondary", "lg")}>
              {tf("clear")}
            </button>
          )}
          <button type="button" onClick={() => setSheetOpen(false)} className={buttonClass("dark", "lg", "flex-1")}>
            {tf("show", { count: results.length })}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

/** Sort as a short radio list (in its popover and in the mobile sheet). */
function SortList({ options, value, onChange }: { options: ReadonlyArray<{ value: SortKey; label: string }>; value: SortKey; onChange: (sort: SortKey) => void }) {
  return (
    <div role="radiogroup" className="space-y-1">
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2 text-[15px] hover:bg-neutral-50">
          {o.label}
          <input type="radio" name="explore-sort" checked={value === o.value} onChange={() => onChange(o.value)} className="size-5 accent-ink" />
        </label>
      ))}
    </div>
  );
}

const KNOWN_VIBES = VIBES.map((v) => v.key);

/**
 * Reads the filters from the URL (?country=…&lang=…&month=…&vibe=…&budget=…&sort=…) into the feed. useSearchParams
 * makes everything up to the nearest Suspense render only in the browser – here that's just this empty component, not
 * the feed (which crawlers should get in the HTML).
 */
function FilterParams({ onChange }: { onChange: (filters: ExploreFilters) => void }) {
  const query = useSearchParams().toString();
  // Only a change of the URL counts – not every re-render (that would undo a filter picked a moment ago).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => onChangeRef.current(parseFilters(new URLSearchParams(query), KNOWN_VIBES)), [query]);
  return null;
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
        <p className="mt-2 max-w-md text-lg text-zinc-500">{t("text")}</p>
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
