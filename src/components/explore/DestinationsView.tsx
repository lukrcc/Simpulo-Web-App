"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ScrollRow } from "@/components/explore/CollectionRow";
import { shortMonth, upcomingMonths } from "@/components/form/MonthChips";
import { Container } from "@/components/layout/Container";
import { Chip } from "@/components/ui/Chip";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DestinationCandidate } from "@/lib/data/destinationTypes";
import { hasCardImage, useDemandSpots, type DestinationSpot } from "@/lib/destinations";
import { CONTINENTS, continentOf, interestIn, type Continent } from "@/lib/interests";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AddPlaceSheet, DemandCard, focusDestinationCard, ROW_CARD } from "./InterestRow";
import { PlaceCombobox } from "./PlaceCombobox";

const noSubscribe = () => () => {};
const SECTION = "mt-(--space-section)";

/** Arriving from a place's search elsewhere: its card, ringed for a moment. Its own boundary: the query is read in the browser only. */
function FocusFromUrl() {
  const focus = useSearchParams().get("focus");
  useEffect(() => {
    if (focus) focusDestinationCard(focus);
  }, [focus]);
  return null;
}

function Shelf({ id, eyebrow, title, count, spots }: { id: string; eyebrow: string; title?: string; count?: string; spots: DestinationSpot[] }) {
  return (
    <section aria-labelledby={id} className={SECTION}>
      <SectionHeader id={id} eyebrow={eyebrow} title={title} meta={count} />
      <ScrollRow>
        {spots.map((spot) => (
          <div key={spot.destinationId} className={ROW_CARD}>
            <DemandCard spot={spot} />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/**
 * /destinations: every place people want to go. The large search on top; without a filter your picks and one shelf per continent,
 * most wanted first; with a filter one grid of what matches.
 */
export function DestinationsView() {
  const t = useTranslations("explore.interests");
  const tPage = useTranslations("explore.destinationsPage");
  const tRegion = useTranslations("explore.interests.regions");
  const format = useFormatter();
  const store = useStore();
  const spots = useDemandSpots().filter(hasCardImage);
  const [continent, setContinent] = useState<Continent | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [picked, setPicked] = useState<DestinationCandidate | null>(null);
  // In the browser only: the server must not read the clock.
  const thisMonth = useSyncExternalStore(noSubscribe, () => new Date().toISOString().slice(0, 7), () => "");
  const monthOptions = useMemo(() => (thisMonth ? upcomingMonths(new Date(`${thisMonth}-01T00:00:00Z`)) : []), [thisMonth]);

  const filtered = continent !== null || months.length > 0;
  const hits = spots.filter((s) => (!continent || (s.region !== "" && continentOf(s.region) === continent)) && (months.length === 0 || s.anytime > 0 || s.months.some((m) => months.includes(m.month))));
  const mine = spots.filter((s) => interestIn(store.interests, store.currentUserId, s));
  const options = CONTINENTS.map((c) => ({ value: c, label: tRegion(c) }));

  return (
    // No scroll anchoring here: the card you just pressed holds its place itself, the same in every browser.
    <Container page className="[overflow-anchor:none]">
      <Suspense fallback={null}>
        <FocusFromUrl />
      </Suspense>
      <h1 className="text-display text-ink">{tPage("title")}</h1>
      <p className="mt-3 max-w-[640px] text-body-lg text-muted">{t("pageIntro")}</p>
      <div className="mt-(--space-inner) max-w-[640px]">
        <PlaceCombobox id="destinations-search" large onPick={setPicked} placeholder={tPage("searchPlaceholder")} label={tPage("searchLabel")} />
      </div>

      <div className="mt-(--space-inner) space-y-3">
        <FilterChips label={t("regionsLabel")} options={options} value={continent} onChange={setContinent} allLabel={t("allRegions")} />
        <div role="group" aria-label={t("monthsLabel")} className="flex flex-wrap gap-2">
          {monthOptions.map((month, i) => (
            <Chip key={month} size="sm" active={months.includes(month)} onClick={() => setMonths((all) => (all.includes(month) ? all.filter((m) => m !== month) : [...all, month]))}>
              {shortMonth(format, month, i > 0 && month.slice(0, 4) !== monthOptions[i - 1].slice(0, 4))}
            </Chip>
          ))}
        </div>
      </div>

      {filtered ? (
        <section aria-labelledby="destinations-hits" className="mt-(--space-inner)">
          <h2 id="destinations-hits" className="text-h3 text-ink" aria-live="polite">
            {tPage("places", { count: hits.length })}
          </h2>
          {hits.length > 0 ? (
            <ul className={cn("card-grid mt-(--space-inner) [--card-cols:4] [--card-min:340px]")}>
              {hits.map((spot) => (
                <li key={spot.destinationId} className="flex">
                  <DemandCard spot={spot} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body text-muted">{tPage("noHits")}</p>
          )}
        </section>
      ) : (
        <>
          {mine.length > 0 && <Shelf id="destinations-mine" eyebrow={tPage("yourPicks")} spots={mine} />}
          {CONTINENTS.map((c) => {
            const here = spots.filter((s) => s.region !== "" && continentOf(s.region) === c);
            return here.length > 0 && <Shelf key={c} id={`destinations-${c}`} eyebrow={tRegion(c)} title={tRegion(c)} count={tPage("places", { count: here.length })} spots={here} />;
          })}
        </>
      )}
      {picked && <AddPlaceSheet key={picked.id} open initial={picked} focusOnSave onClose={() => setPicked(null)} />}
    </Container>
  );
}
