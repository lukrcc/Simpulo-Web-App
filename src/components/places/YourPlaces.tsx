"use client";

// Your houses › "Your places" ("Host from your place"): the places the host lives in and saved (lib/ownPlaces.ts) – cards in a row like the
// others (CLAUDE.md "Your houses – Reihen statt Reiter"; no calendar strip any more): the photo, the name, "Villa · Barceloneta", the label
// "4 free rooms"; on hover "Open a window" (Open a House from the place – only dates, spots and price to set) while the rental lasts.
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { windowHref } from "@/components/create/model";
import { PhotoTile } from "@/components/MyHouseTile";
import { buttonStyles } from "@/components/ui/ActionButton";
import { accommodationOf } from "@/config/accommodation";
import { placesOf } from "@/lib/ownPlaces";
import { getCurrentUser, useStore } from "@/lib/store";
import type { Place } from "@/lib/types";
import Link from "next/link";

/** The places as cards for Your houses' row "Your places" (none: an empty list – the row is left out). */
export function usePlaceCards(today: string): { key: string; node: ReactNode }[] {
  const store = useStore();
  const me = getCurrentUser(store);
  return placesOf(store, me?.id).map((place) => ({ key: place.id, node: <PlaceTile place={place} today={today} /> }));
}

function PlaceTile({ place, today }: { place: Place; today: string }) {
  const t = useTranslations("houses.places");
  const kind = accommodationOf(place.accommodationType)?.type.label ?? "";
  // A new window can only open while the rental lasts.
  const canOpen = place.rentTo > today;
  return (
    <PhotoTile
      // → the place's own page (CLAUDE.md "Klare Ziele für alle House-Karten").
      href={`/places/${place.id}`}
      photo={place.photos[0]}
      title={place.name}
      sub={[kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "", place.address.city].filter(Boolean).join(" · ")}
      label={t("freeRooms", { count: place.freeSpots })}
      hoverAction={
        canOpen ? (
          <Link href={windowHref(place.id)} className={buttonStyles("onImage", "sm")}>
            {t("openWindow")}
          </Link>
        ) : undefined
      }
    />
  );
}
