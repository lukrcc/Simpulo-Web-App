"use client";

import { ChevronDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { shortMonth, upcomingMonths } from "@/components/form/MonthChips";
import { Container } from "@/components/layout/Container";
import { Anchored } from "@/components/ui/Anchored";
import { Chip } from "@/components/ui/Chip";
import { ChipIndicator } from "@/components/ui/ChipIndicator";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DestinationCandidate } from "@/lib/data/destinationTypes";
import { hasTile, useDemandSpots, type DestinationSpot } from "@/lib/destinations";
import { CONTINENTS, continentOf, interestIn, type Continent } from "@/lib/interests";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DestinationPanel } from "./DestinationPanel";
import { DestinationTile } from "./DestinationTile";
import { SortCapsule, SortList, useDismiss } from "./Filters";
import { AddPlaceSheet, focusDestinationCard } from "./InterestRow";
import { PlaceCombobox } from "./PlaceCombobox";
import { useThisMonth } from "./spotInterest";
import { WorldMap } from "./WorldMap";

type PlaceSort = "most" | "soonest" | "az";
const SORTS: readonly PlaceSort[] = ["most", "soonest", "az"];
/** The bar's place while stuck: just under the header's tab (70px). */
const STUCK_TOP = "md:top-[calc(var(--band-h)+72px)]";
const firstMonth = (spot: DestinationSpot) => spot.months[0]?.month ?? "9999";

/** Arriving from a place's search elsewhere: its tile, ringed for a moment. Its own boundary: the query is read in the browser only. */
function FocusFromUrl() {
  const focus = useSearchParams().get("focus");
  useEffect(() => {
    if (focus) focusDestinationCard(focus);
  }, [focus]);
  return null;
}

/** "Any month ▾": the next 12 months as chips in a popover, any number of them. */
function MonthMenu({ value, onChange, options }: { value: readonly string[]; onChange: (months: string[]) => void; options: readonly string[] }) {
  const t = useTranslations("explore.interests");
  const tPage = useTranslations("explore.whereNext");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef, buttonRef, panelRef);
  const name = (month: string) => shortMonth(format, month, false);
  const sorted = value.toSorted();
  const label = sorted.length === 0 ? t("anyMonth") : sorted.length === 1 ? name(sorted[0]) : tPage("monthsMore", { first: name(sorted[0]), count: sorted.length - 1 });
  return (
    <div ref={rootRef} className="shrink-0">
      <Chip
        ref={buttonRef}
        variant="text"
        active={sorted.length > 0}
        onClick={() => setOpen((o) => !o)}
        aria-pressed={undefined}
        aria-expanded={open}
        aria-haspopup="true"
        trailing={<ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden />}
        indicate={false}
      >
        {label}
      </Chip>
      {open && (
        <Anchored anchor={buttonRef} ref={panelRef} align="end">
          <GlassPanel role="group" aria-label={t("monthsLabel")} className="animate-fade-in grid w-[min(340px,calc(100vw-32px))] grid-cols-4 gap-1.5 rounded-[20px]! p-3">
            {options.map((month, i) => (
              <Chip key={month} size="sm" active={value.includes(month)} onClick={() => onChange(value.includes(month) ? value.filter((m) => m !== month) : [...value, month])} className="w-full shrink justify-center px-1!">
                {shortMonth(format, month, i > 0 && month.slice(0, 4) !== options[i - 1].slice(0, 4))}
              </Chip>
            ))}
          </GlassPanel>
        </Anchored>
      )}
    </div>
  );
}

function PlaceGroup({ id, eyebrow, title, count, spots, onOpen }: { id: string; eyebrow: string; title?: string; count: string; spots: readonly DestinationSpot[]; onOpen: (spot: DestinationSpot) => void }) {
  return (
    <section aria-labelledby={id} className="mt-(--space-section) first:mt-0">
      <SectionHeader id={id} eyebrow={title ? eyebrow : undefined} title={title ?? eyebrow} meta={count} />
      <ul className="mt-(--space-inner) grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
        {spots.map((spot) => (
          <li key={spot.destinationId} className="min-w-0">
            <DestinationTile spot={spot} onOpen={() => onOpen(spot)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Map → filter bar → grids → panel: /where-next, and Explore before the launch. */
export function WhereNextContent() {
  const t = useTranslations("explore.whereNext");
  const tRow = useTranslations("explore.interests");
  const tRegion = useTranslations("explore.interests.regions");
  const store = useStore();
  const all = useDemandSpots();
  const spots = useMemo(() => all.filter(hasTile), [all]);
  const thisMonth = useThisMonth();
  const monthOptions = useMemo(() => (thisMonth ? upcomingMonths(new Date(`${thisMonth}-01T00:00:00Z`)) : []), [thisMonth]);
  const [continent, setContinent] = useState<Continent | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [sort, setSort] = useState<PlaceSort>("most");
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const matches = (s: DestinationSpot) => (!continent || (s.region !== "" && continentOf(s.region) === continent)) && (months.length === 0 || s.anytime > 0 || s.months.some((m) => months.includes(m.month)));
  const order = (a: DestinationSpot, b: DestinationSpot) => (sort === "az" ? a.placeName.localeCompare(b.placeName) : sort === "soonest" ? firstMonth(a).localeCompare(firstMonth(b)) || b.count - a.count : b.count - a.count || a.placeName.localeCompare(b.placeName));
  const hits = spots.filter(matches).toSorted(order);
  const mineIds = new Set(spots.filter((s) => interestIn(store.interests, store.currentUserId, s)).map((s) => s.destinationId));
  const mine = hits.filter((s) => mineIds.has(s.destinationId));
  const groups = CONTINENTS.map((c) => ({ continent: c, spots: hits.filter((s) => s.region !== "" && continentOf(s.region) === c) })).filter((g) => g.spots.length > 0);
  const spot = spots.find((s) => s.destinationId === selected);
  const places = (count: number) => t("places", { count });
  const open = (s: DestinationSpot) => {
    setSelected(s.destinationId);
    setPanelOpen(true);
  };
  /** A shorter list mustn't leave the stuck bar over nothing: back to the list's start, if it had scrolled past it. */
  const afterFilter = () => {
    const bar = barRef.current;
    const list = listRef.current;
    if (!bar || !list) return;
    const bottom = bar.getBoundingClientRect().bottom;
    const top = list.getBoundingClientRect().top;
    if (top < bottom) window.scrollBy({ top: top - bottom - 24, behavior: "auto" });
  };
  useEffect(afterFilter, [continent, months]);

  if (spots.length === 0) return null;
  const regions = [{ value: null as Continent | null, label: tRow("allRegions") }, ...CONTINENTS.map((c) => ({ value: c as Continent | null, label: tRegion(c) }))];
  const sortOptions = SORTS.map((value) => ({ value, label: t(`sort.${value}`) }));

  return (
    <>
      <WorldMap spots={spots} matches={matches} mine={mineIds} onOpen={open} className="mt-(--space-inner)" />

      <div ref={barRef} className={cn("relative z-30 mt-4 md:sticky", STUCK_TOP)}>
        <GlassPanel className="flex h-13 items-center gap-2 px-2 shadow-(--panel-shadow)!">
          {/* Too narrow for all of them: they scroll, the edge fades. */}
          <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto max-[75rem]:mask-[linear-gradient(to_right,black_calc(100%-24px),transparent)]">
            <div role="radiogroup" aria-label={tRow("regionsLabel")} className="relative flex w-max items-center gap-1 max-[75rem]:mr-6">
              <ChipIndicator />
              {regions.map((r) => (
                <Chip key={r.label} variant="text" role="radio" aria-checked={continent === r.value} active={continent === r.value} onClick={() => setContinent(r.value)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>
          {monthOptions.length > 0 && <MonthMenu value={months} onChange={setMonths} options={monthOptions} />}
          <SortCapsule label={t(`sort.${sort}`)}>
            <SortList options={sortOptions} value={sort} onChange={setSort} />
          </SortCapsule>
        </GlassPanel>
      </div>

      <div ref={listRef} className="mt-(--space-inner) [overflow-anchor:none]">
        {mine.length > 0 && <PlaceGroup id="where-next-mine" eyebrow={t("yourPicks")} title={t("yourPicks")} count={places(mine.length)} spots={mine} onOpen={open} />}
        {groups.map((g) => (
          <PlaceGroup key={g.continent} id={`where-next-${g.continent}`} eyebrow={tRegion(g.continent)} title={tRegion(g.continent)} count={places(g.spots.length)} spots={g.spots} onOpen={open} />
        ))}
        {hits.length === 0 && <p className="text-body text-muted">{t("noHits")}</p>}
      </div>

      {spot && <DestinationPanel key={spot.destinationId} spot={spot} open={panelOpen} onClose={() => setPanelOpen(false)} onClosed={() => setSelected(null)} />}
    </>
  );
}

/** /where-next: one line of heading and search, then the map and every place by region. */
export function WhereNextView() {
  const t = useTranslations("explore.whereNext");
  const [picked, setPicked] = useState<DestinationCandidate | null>(null);
  return (
    <Container page>
      <Suspense fallback={null}>
        <FocusFromUrl />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-h1 text-ink">{t("title")}</h1>
          <p className="text-small text-muted">{t("tagline")}</p>
        </div>
        <div className="w-full md:w-[420px]">
          <PlaceCombobox id="where-next-search" onPick={setPicked} placeholder={t("searchPlaceholder")} label={t("searchLabel")} />
        </div>
      </div>
      <WhereNextContent />
      {picked && <AddPlaceSheet key={picked.id} open initial={picked} focusOnSave onClose={() => setPicked(null)} />}
    </Container>
  );
}
