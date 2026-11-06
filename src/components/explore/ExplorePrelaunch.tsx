"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/Container";
import { StageBand } from "@/components/ui/StageBand";
import { placeById } from "@/lib/data/places";
import { setExploreFilters, useExploreFilters } from "@/lib/exploreFilterState";
import { NoHouseYet } from "./NoHouseYet";
import { MonthField, PlaceField } from "./SearchFields";

/**
 * Explore before the launch: no Spotlight, no grid, no example Houses. The slogan, Where? and When?, and what an empty result always says:
 * open the first House, or hear first when someone does. Houses that exist already work through their own link.
 */
export function ExplorePrelaunch() {
  const t = useTranslations("explore.prelaunch");
  const filters = useExploreFilters();
  return (
    <div data-explore-blocks className="pb-(--space-section)">
      <StageBand from="md" className="pb-(--space-inner) [--stage-focus:100%]">
        <Container className="pt-12 md:pt-16">
          <p className="text-eyebrow uppercase text-ink/55">{t("eyebrow")}</p>
          <h1 className="mt-3 text-h1 text-ink md:text-display">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-body-lg text-muted">{t("text")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <PlaceField value={filters.place} onChange={(place) => setExploreFilters({ ...filters, place }, "place")} />
            <MonthField value={filters.month} onChange={(month) => setExploreFilters({ ...filters, month }, "month")} />
          </div>
        </Container>
      </StageBand>
      <Container className="pt-(--space-inner)">
        <NoHouseYet draft={{ place: placeById(filters.place), month: filters.month, category: null }} />
      </Container>
    </div>
  );
}
