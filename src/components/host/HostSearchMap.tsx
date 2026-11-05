"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MAP_MIN_PEOPLE } from "@/config/explore";
import { placeKindOf } from "@/lib/data/places";
import { demandByPlace } from "@/lib/savedSearches";
import { useStore } from "@/lib/store";
import { WorldMap } from "./WorldMap";

/** "Where people are looking": saved searches as a map for hosts. A world region has no spot of its own; those people still hear about a House there. */
export function HostSearchMap({ className }: { className?: string }) {
  const t = useTranslations("explore.search.map");
  const { savedSearches } = useStore();
  const demand = useMemo(() => demandByPlace(savedSearches).filter((d) => d.people >= MAP_MIN_PEOPLE && placeKindOf(d.place.id) !== "world"), [savedSearches]);
  const top = demand[0];
  if (!top) return null;
  return (
    <section data-glow-section aria-labelledby="host-demand" className={className}>
      <SectionHeader id="host-demand" eyebrow={t("eyebrow")} title={t("title")} subline={t("subline", { count: top.people, place: top.place.name.split(",")[0] })} />
      <WorldMap demand={demand} className="mt-6" />
    </section>
  );
}
