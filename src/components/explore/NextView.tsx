"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { shortMonth } from "@/components/form/MonthChips";
import { Container } from "@/components/layout/Container";
import { FilterChips } from "@/components/ui/FilterChips";
import { HOUSE_GRID } from "@/config/explore";
import { WORLD_REGIONS, type WorldRegion } from "@/lib/interests";
import { cn } from "@/lib/utils";
import { AddPlaceCard, AddPlaceSheet, DemandCard, useOrderedSpots } from "./InterestRow";

/**
 * /next – every place people want to go: region and month chips, "+ Add a place" first, then all demand spots
 * (most wanted first, your own on top). The chips only list regions and months that have demand.
 */
export function NextView() {
  const t = useTranslations("explore.interests");
  const tRegion = useTranslations("explore.interests.regions");
  const format = useFormatter();
  const spots = useOrderedSpots().filter((s) => s.count > 0);
  const [region, setRegion] = useState<WorldRegion | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const regionOptions = useMemo(() => WORLD_REGIONS.filter((r) => spots.some((s) => s.region === r)).map((r) => ({ value: r, label: tRegion(r) })), [spots, tRegion]);
  const monthOptions = useMemo(() => {
    const months = [...new Set(spots.flatMap((s) => s.months.map((m) => m.month)))].toSorted();
    return months.map((m, i) => ({ value: m, label: shortMonth(format, m, i === 0 || m.slice(0, 4) !== months[i - 1].slice(0, 4)) }));
  }, [spots, format]);
  // A month matches people who want it – and those who said anytime.
  const shown = spots.filter((s) => (!region || s.region === region) && (!month || s.anytime > 0 || s.months.some((m) => m.month === month)));

  return (
    <Container page>
      <h1 className="text-h2 tracking-tight text-ink md:text-h1">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-body-lg text-muted">{t("pageIntro")}</p>
      {regionOptions.length > 1 && (
        <div className="mt-6">
          <FilterChips label={t("regionsLabel")} options={regionOptions} value={region} onChange={setRegion} allLabel={t("allRegions")} />
        </div>
      )}
      {monthOptions.length > 1 && (
        <div className="mt-3">
          <FilterChips label={t("monthsLabel")} options={monthOptions} value={month} onChange={setMonth} allLabel={t("anyMonth")} />
        </div>
      )}
      <ul className={cn("mt-6", HOUSE_GRID)}>
        <li className="flex">
          <AddPlaceCard onAdd={() => setAdding(true)} />
        </li>
        {shown.map((spot) => (
          <li key={spot.destinationId} className="flex">
            <DemandCard spot={spot} />
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-muted">{t("noneHere")}</p>}
      <AddPlaceSheet open={adding} onClose={() => setAdding(false)} />
    </Container>
  );
}
