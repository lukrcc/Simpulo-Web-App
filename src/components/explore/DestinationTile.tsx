"use client";

import { Check, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { DestinationInterestForm } from "@/components/explore/DestinationInterestForm";
import { cardGradient, cardTextShadow } from "@/components/ui/glass";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { Sheet } from "@/components/ui/Sheet";
import type { DestinationSpot } from "@/lib/destinations";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { monthSpan, useInterestPress, useOptedInPeople, useThisMonth } from "./spotInterest";

const MAX_AVATARS = 3;

/**
 * A place in a /where-next grid: 4:3, the photo with the cards' gradient (or the fallback's colours), city, avatars and "18 · Sep–Oct".
 * The whole tile opens the panel; the button top right counts you in or out at once.
 */
export function DestinationTile({ spot, onOpen }: { spot: DestinationSpot; onOpen: () => void }) {
  const t = useTranslations("explore.whereNext");
  const tRow = useTranslations("explore.interests");
  const format = useFormatter();
  const store = useStore();
  const thisMonth = useThisMonth();
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const { interested, loggedIn, asking, setAsking, press, leave } = useInterestPress(spot, { card: cardRef, button: buttonRef, stack: stackRef });
  const avatars = useOptedInPeople(spot)
    .filter((p) => p.user.photos[0])
    .toSorted((a, b) => Number(b.user.id === store.currentUserId) - Number(a.user.id === store.currentUserId))
    .slice(0, MAX_AVATARS);
  const when = monthSpan(format, spot, thisMonth) ?? (spot.anytime > 0 ? tRow("anytimeShort") : null);
  const cover = spot.destination.coverImage;

  return (
    <div ref={cardRef} data-destination-card={spot.destinationId} className={cn("tile relative isolate aspect-4/3 w-full overflow-hidden rounded-[20px]", cover ? "bg-ink" : "bg-[linear-gradient(135deg,var(--stage-peach),var(--stage-mist))]")}>
      {cover && <Img src={cover} alt="" fill sizes="(min-width: 768px) 320px, 50vw" className="object-cover" />}
      {cover && <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />}
      <button type="button" onClick={onOpen} aria-label={t("openDetails", { place: spot.placeName })} className="absolute inset-0 rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
      <IconButton
        ref={buttonRef}
        size="xs"
        onClick={() => press(leave)}
        aria-pressed={interested}
        aria-label={t(interested ? "removeInterest" : "addInterest", { place: spot.placeName })}
        className={cn("absolute right-2.5 top-2.5", interested && "bg-(--select-bg)! text-accent!")}
      >
        {interested ? <Check className="size-4 motion-safe:animate-check-in" strokeWidth={3} aria-hidden /> : <Plus className="size-4" strokeWidth={2.5} aria-hidden />}
      </IconButton>
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 p-3.5", cover ? cn("text-white", cardTextShadow) : "text-ink")}>
        {cover ? (
          <p className="truncate text-tile">{spot.placeName}</p>
        ) : (
          <>
            <p className="line-clamp-2 text-h2 text-ink">{spot.placeName}</p>
            <p className="truncate text-small text-muted">{spot.country}</p>
          </>
        )}
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          {avatars.length > 0 && (
            <div ref={stackRef} className="flex shrink-0 -space-x-1.5">
              {avatars.map(({ user }) => (
                <span key={user.id} data-my-avatar={user.id === store.currentUserId ? "" : undefined} className="relative block size-[22px] overflow-hidden rounded-full border-[1.5px] border-white">
                  <Img src={user.photos[0]} alt="" fill sizes="22px" className={cn("object-cover object-[center_30%]", !loggedIn && "scale-110 blur-[2px]")} />
                </span>
              ))}
            </div>
          )}
          <p className={cn("min-w-0 truncate text-small", cover ? "text-white/85" : "text-muted")}>
            <RollingNumber value={spot.count} />
            {when && ` · ${when}`}
          </p>
        </div>
      </div>
      {asking &&
        createPortal(
          <Sheet open onClose={() => setAsking(false)} title={tRow("interestTitle", { place: spot.placeName })}>
            <DestinationInterestForm initial={spot.destination} onDone={() => setAsking(false)} />
          </Sheet>,
          document.body,
        )}
    </div>
  );
}
