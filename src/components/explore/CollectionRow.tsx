"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { HouseCard } from "@/components/HouseCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import { EXPLORE_SPACING } from "@/config/explore";
import type { Collection } from "@/lib/collections";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

/** A shelf on Explore, under the Spotlight: the explore head (eyebrow, title, subline, "See all →") and cards one grid column wide, flat. */
export function CollectionRow({ collection, stays }: { collection: Collection; stays: Stay[] }) {
  const t = useTranslations("explore.collections");
  const store = useStore();
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <SectionHeader
        variant="explore"
        id={id}
        eyebrow={t(`${collection.id}.eyebrow`)}
        title={t(`${collection.id}.title`)}
        subline={t(`${collection.id}.subline`)}
        seeAll={{ href: `/collections/${collection.slug}`, label: t("seeAll"), ariaLabel: t("seeAllLabel", { title: t(`${collection.id}.title`) }) }}
      />
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
