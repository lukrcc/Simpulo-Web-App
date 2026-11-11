"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo } from "react";
import { HouseCard } from "@/components/HouseCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import { EXPLORE_SPACING } from "@/config/explore";
import { findUser, getCrew, useStore } from "@/lib/store";
import { housesOfYourPeople, yourPeople } from "@/lib/yourPeople";

/** At most this many Houses on the shelf. */
const MAX = 12;

/**
 * "Your people are going": open Houses one of the viewer's people hosts or is in (lib/yourPeople.ts). Logged in only, and only with at least
 * one: otherwise nothing at all. The cards say who ("Anna is in", "Hosted by Tom from your people").
 */
export function usePeopleGoing() {
  const store = useStore();
  const me = store.currentUserId;
  return useMemo(() => {
    if (!me) return [];
    const people = yourPeople(store, me);
    return housesOfYourPeople(store, me, people, new Date().toISOString().slice(0, 10)).slice(0, MAX);
  }, [store, me]);
}

export function PeopleGoingRow() {
  const t = useTranslations("people.going");
  const store = useStore();
  const id = useId();
  const stays = usePeopleGoing();
  if (stays.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <SectionHeader variant="explore" id={id} eyebrow={t("eyebrow")} title={t("title")} subline={t("subline")} seeAll={{ href: "/people", label: t("seeAll") }} />
      <Shelf variant="flat" top={EXPLORE_SPACING.headContent}>
        {stays.map((stay) => (
          <div key={stay.id} className="explore-slide shrink-0">
            <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
          </div>
        ))}
      </Shelf>
    </section>
  );
}
