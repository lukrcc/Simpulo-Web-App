"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ScrollRow, RowHeader } from "@/components/explore/CollectionRow";
import { StayCard } from "@/components/StayCard";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

/** The row's vibes, in this order – one House each, the rest filled with any other open Houses. */
const ROW_VIBES = ["party", "founder", "surf", "singles", "study", "fitness", "creator", "remote-work", "yoga", "adventure"];
const ROW_SIZE = 8;
/** Fewer than this and the row isn't worth showing (sparse datasets). */
const MIN_ROW = 3;

function useOpenHouses(): Stay[] {
  const store = useStore();
  return useMemo(() => store.stays.filter((s) => s.status === "published" && s.acceptingRequests), [store.stays]);
}

/**
 * /host hero: one real House as the Explore card – the host's face in the notch tab and their crew's avatars. Picks
 * the open House with the biggest crew (ties by id, so it's stable). Nothing when no House is open.
 */
export function HostHeroCard({ className }: { className?: string }) {
  const t = useTranslations("growth.host");
  const store = useStore();
  const open = useOpenHouses();
  const pick = useMemo(() => {
    const withCrew = open
      .map((stay) => ({ stay, host: findUser(store, stay.hostId), crew: getCrew(store, stay) }))
      .filter((c) => c.host && c.host.photos.length > 0);
    return withCrew.toSorted((a, b) => b.crew.length - a.crew.length || a.stay.id.localeCompare(b.stay.id))[0];
  }, [open, store]);
  if (!pick) return null;
  return (
    <figure aria-label={t("heroCardLabel")} className={className}>
      <StayCard stay={pick.stay} host={pick.host} crew={pick.crew} />
    </figure>
  );
}

/** "Houses people opened": up to 8 open Houses across different vibes, as an Explore collection row. */
export function HostHousesRow() {
  const t = useTranslations("growth.host");
  const store = useStore();
  const open = useOpenHouses();
  const stays = useMemo(() => {
    const picked = ROW_VIBES.map((vibe) => open.find((s) => s.vibe === vibe)).filter((s): s is Stay => !!s);
    const rest = open.filter((s) => !picked.includes(s));
    return [...picked, ...rest].slice(0, ROW_SIZE);
  }, [open]);
  if (stays.length < MIN_ROW) return null;
  return (
    <section aria-labelledby="host-houses" className="mt-14">
      <RowHeader
        id="host-houses"
        title={t("housesTitle")}
        subline={t("housesSubline")}
        seeAll={{ href: "/explore", label: t("housesSeeAll"), ariaLabel: t("housesSeeAllLabel") }}
      />
      <ScrollRow className="mt-5">
        {stays.map((stay) => (
          <div key={stay.id} className="w-65 shrink-0 snap-start">
            <StayCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} compact />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
