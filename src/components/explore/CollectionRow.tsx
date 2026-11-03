"use client";

import { useTranslations } from "next-intl";
import { StayCard } from "@/components/StayCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import type { Collection } from "@/lib/collections";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

/** A themed row between the grid sections: heading, subline and compact cards on a shelf. */
export function CollectionRow({ collection, stays }: { collection: Collection; stays: Stay[] }) {
  const t = useTranslations("explore.collections");
  const store = useStore();
  return (
    <section aria-labelledby={`collection-${collection.id}`}>
      <SectionHeader
        id={`collection-${collection.id}`}
        eyebrow={t(`${collection.id}.eyebrow`)}
        title={t(`${collection.id}.title`)}
        subline={t(`${collection.id}.subline`)}
        seeAll={{ href: `/collections/${collection.slug}`, label: t("seeAll"), ariaLabel: t("seeAllLabel", { title: t(`${collection.id}.title`) }) }}
      />
      <Shelf>
        {stays.map((stay) => (
          <div key={stay.id} className="w-90 shrink-0">
            <StayCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} compact />
          </div>
        ))}
      </Shelf>
    </section>
  );
}
