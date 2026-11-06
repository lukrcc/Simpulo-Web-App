"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { createHrefOf } from "@/components/create/model";
import { StayCard } from "@/components/StayCard";
import { Button } from "@/components/ui/ActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HOUSE_GRID } from "@/config/explore";
import { housesNearby, type SearchDraft } from "@/lib/savedSearches";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSaveSearch } from "./NotifySheet";
import { useMonthName } from "./SearchFields";

const placeNameOf = (draft: SearchDraft) => draft.place?.name.split(",")[0].trim();

function SavedLine({ className }: { className?: string }) {
  const t = useTranslations("explore.search");
  return (
    <p role="status" className={cn("flex items-center justify-center gap-1.5 text-body text-ink", className)}>
      <Check className="size-4 shrink-0 text-ink motion-safe:animate-check-in" strokeWidth={3} aria-hidden />
      {t("saved")}
    </p>
  );
}

/**
 * Nothing for this place and month: instead of a grid, the two ways on. Open the first House, or hear first when someone does; below it what's closest.
 * Also Explore before the launch, there without anything nearby.
 */
export function NoHouseYet({ draft, stays = [] }: { draft: SearchDraft; /** Houses to suggest from */ stays?: readonly Stay[] }) {
  const t = useTranslations("explore.search");
  const store = useStore();
  const monthName = useMonthName();
  const { saved, save, sheet } = useSaveSearch(draft);
  const place = placeNameOf(draft);
  const month = draft.month && monthName(draft.month);
  const nearby = useMemo(() => housesNearby(stays, draft), [stays, draft]);
  const title = place && month ? t("titlePlaceMonth", { place, month }) : place ? t("titlePlace", { place }) : month ? t("titleMonth", { month }) : t("titleNone");

  return (
    <div>
      <div className="flex flex-col items-center py-(--space-inner) text-center">
        <h2 className="max-w-160 text-h2 text-ink">{title}</h2>
        <Button href={createHrefOf(draft)} variant="primary" size="md" data-preview-action className="mt-6">
          {t("openFirst")}
        </Button>
        {saved ? (
          <SavedLine className="mt-4" />
        ) : (
          <Button variant="tertiary" size="md" onClick={save} className="mt-4">
            {t("notifyMe")}
          </Button>
        )}
      </div>
      {nearby.length > 0 && (
        <section className="mt-(--space-section)">
          <SectionHeader eyebrow={t("nearby")} />
          <div className={cn(HOUSE_GRID, "mt-(--space-inner)")}>
            {nearby.map((stay) => (
              <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            ))}
          </div>
        </section>
      )}
      {sheet}
    </div>
  );
}

/** Under a result: the same promise, one quiet line. */
export function NotifyLine({ draft, className }: { draft: SearchDraft; className?: string }) {
  const t = useTranslations("explore.search");
  const { saved, save, sheet } = useSaveSearch(draft);
  const place = placeNameOf(draft);
  if (!place) return null;
  return (
    <div className={cn("flex justify-center text-center", className)}>
      {saved ? (
        <SavedLine />
      ) : (
        <Button variant="tertiary" size="md" onClick={save}>
          {t("notQuite", { place })}
        </Button>
      )}
      {sheet}
    </div>
  );
}
