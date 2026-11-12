"use client";

import { Check, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { InForSheet } from "@/components/InFor";
import { createHrefOf } from "@/components/create/model";
import { HouseCard } from "@/components/HouseCard";
import { Button } from "@/components/ui/ActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import { EXPLORE_GRID, EXPLORE_SPACING } from "@/config/explore";
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
 * No result: instead of a grid the two ways on – "Open this House" (Open a House with place, month and category filled in) and "Save this
 * search" (hear first when one opens); below it what's closest. Also Explore before the launch, there without anything nearby. `title`: the
 * heading when it isn't a place or month that found nothing (filters alone); `onClear` adds "Clear filters".
 */
export function NoHouseYet({ draft, stays = [], title: own, onClear }: { draft: SearchDraft; /** Houses to suggest from */ stays?: readonly Stay[]; title?: string; onClear?: () => void }) {
  const t = useTranslations("explore.search");
  const store = useStore();
  const monthName = useMonthName();
  const { saved, save, sheet } = useSaveSearch(draft);
  const place = placeNameOf(draft);
  const month = draft.month && monthName(draft.month);
  const nearby = useMemo(() => housesNearby(stays, draft), [stays, draft]);
  const title = place && month ? t("titlePlaceMonth", { place, month }) : place ? t("titlePlace", { place }) : month ? t("titleMonth", { month }) : (own ?? t("titleNone"));

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
        <InForLink draft={draft} className="mt-2" />
        {onClear && (
          <button type="button" onClick={onClear} className="mt-2 text-small font-semibold text-muted underline underline-offset-4 transition-colors duration-150 hover:text-ink">
            {t("clearFilters")}
          </button>
        )}
      </div>
      {nearby.length > 0 && (
        <section className="mt-(--space-section)">
          <SectionHeader eyebrow={t("nearby")} />
          <div className={cn(EXPLORE_GRID, "mt-(--space-inner)")}>
            {nearby.map((stay) => (
              <HouseCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            ))}
          </div>
        </section>
      )}
      {sheet}
    </div>
  );
}

/** Exactly a HouseCard's size (4:5, the grid's height cap), a dashed edge: "Open a House here" with this search filled in. */
export function OpenHereTile({ draft }: { draft: SearchDraft }) {
  const t = useTranslations("explore.search");
  const place = placeNameOf(draft);
  return (
    <Link
      href={createHrefOf(draft)}
      data-house-card="open"
      data-preview-action
      className="flex aspect-4/5 w-full flex-col items-center justify-center gap-3 rounded-3xl border-[1.5px] border-dashed border-ink/15 p-6 text-center transition-colors duration-150 hover:border-ink/30 hover:bg-ink/3"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="text-body font-semibold text-ink">{t("openHere")}</span>
      <span className="text-small text-muted">{place ? t("openHereIn", { place }) : t("openHereText")}</span>
    </Link>
  );
}

/** "I'm in for …" from a search: log in if needed, then the sheet with the search's place and month already in. */
function useInForSheet(draft: SearchDraft) {
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false);
  const start = () => requireAuth(() => setOpen(true), { reason: "save" });
  const sheet = <InForSheet open={open} onClose={() => setOpen(false)} initial={{ placeId: draft.place?.id ?? null, month: draft.month }} />;
  return { start, sheet };
}

/** No result: one quiet line under the two ways on – "Nothing fits? Tell hosts where you'd go". */
function InForLink({ draft, className }: { draft: SearchDraft; className?: string }) {
  const t = useTranslations("inFor");
  const { start, sheet } = useInForSheet(draft);
  return (
    <>
      <button type="button" onClick={start} className={cn("text-small font-semibold text-muted underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline", className)}>
        {t("cardTitle")} {t("cardText")}
      </button>
      {sheet}
    </>
  );
}

/** Few results: after "Open a House here" one more tile of the same size – "Nothing fits? Tell hosts where you'd go" (I'm in for). */
export function InForTile({ draft }: { draft: SearchDraft }) {
  const t = useTranslations("inFor");
  const { start, sheet } = useInForSheet(draft);
  return (
    <>
      <button
        type="button"
        onClick={start}
        data-house-card="in-for"
        className="flex aspect-4/5 w-full flex-col items-center justify-center gap-3 rounded-3xl border-[1.5px] border-dashed border-ink/15 p-6 text-center transition-colors duration-150 hover:border-ink/30 hover:bg-ink/3"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
          <MapPin className="size-5" aria-hidden />
        </span>
        <span className="text-body font-semibold text-ink">{t("cardTitle")}</span>
        <span className="text-small text-muted">{t("cardText")}</span>
      </button>
      {sheet}
    </>
  );
}

/** Fewer results than the grid has columns: under them a shelf "Nearby" – a similar place or time, without the results themselves. */
export function NearbyShelf({ draft, stays, results }: { draft: SearchDraft; stays: readonly Stay[]; results: readonly Stay[] }) {
  const t = useTranslations("explore.search");
  const store = useStore();
  const nearby = useMemo(() => {
    const shown = new Set(results.map((s) => s.id));
    return housesNearby(
      stays.filter((s) => !shown.has(s.id)),
      draft,
      12,
    );
  }, [stays, draft, results]);
  if (nearby.length === 0) return null;
  return (
    <section className={EXPLORE_SPACING.between}>
      <SectionHeader variant="explore" eyebrow={t("nearbyEyebrow")} title={t("nearbyTitle")} subline={t("nearbySubline")} />
      <Shelf variant="flat" top={EXPLORE_SPACING.headContent}>
        {nearby.map((stay) => (
          <div key={stay.id} className="explore-slide shrink-0">
            <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
          </div>
        ))}
      </Shelf>
    </section>
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
