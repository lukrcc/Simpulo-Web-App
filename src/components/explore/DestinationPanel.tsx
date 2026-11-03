"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { createHref } from "@/components/create/model";
import { DestinationInterestForm } from "@/components/explore/DestinationInterestForm";
import { upcomingMonths } from "@/components/form/MonthChips";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { Sheet } from "@/components/ui/Sheet";
import { foldPlace } from "@/lib/data/destinationTypes";
import type { DestinationSpot } from "@/lib/destinations";
import { useFormat } from "@/i18n/format";
import { interestIn, monthRange } from "@/lib/interests";
import { isListedStay } from "@/lib/launch";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn, firstName, housePhotos } from "@/lib/utils";
import { ChangeMonthsSheet, useInterestPress, useOptedInPeople, useThisMonth } from "./spotInterest";

/** Avatars in the panel at most; the rest is the count above them. */
const MAX_PEOPLE = 8;
/** Houses in the panel at most. */
const MAX_NEARBY = 4;
const SECTION_TITLE = "text-small font-semibold text-muted";

/** How many want each of the next 12 months: one series, so no legend. Bars rise from a shared baseline; yours are in full accent. */
function MonthBars({ spot, own, thisMonth }: { spot: DestinationSpot; own: readonly string[]; thisMonth: string }) {
  const t = useTranslations("explore.whereNext.panel");
  const format = useFormatter();
  if (!thisMonth) return null;
  const months = upcomingMonths(new Date(`${thisMonth}-01T00:00:00Z`));
  const counts = new Map(spot.months.map((m) => [m.month, m.count]));
  const top = Math.max(1, ...months.map((m) => counts.get(m) ?? 0));
  const date = (month: string) => new Date(`${month}-01T00:00:00Z`);
  return (
    <ul className="grid grid-cols-12 gap-1">
      {months.map((month) => {
        const count = counts.get(month) ?? 0;
        const mine = own.includes(month);
        const name = format.dateTime(date(month), { month: "long", timeZone: "UTC" });
        return (
          <li key={month} className="group/bar relative flex flex-col items-center gap-1.5">
            <div className="flex h-16 w-full items-end justify-center">
              <div style={{ height: count > 0 ? `${Math.max(8, (count / top) * 100)}%` : 2 }} className={cn("w-full max-w-5 rounded-t-[4px]", count === 0 ? "bg-ink/10" : mine ? "bg-accent" : "bg-accent/45")} />
            </div>
            <span aria-hidden className={cn("text-small", mine ? "font-semibold text-ink" : "text-muted")}>
              {format.dateTime(date(month), { month: "narrow", timeZone: "UTC" })}
            </span>
            <span className="sr-only">{t("barLabel", { month: name, count })}</span>
            <span aria-hidden className="glass-panel pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg! px-2 py-1 text-small text-ink opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100">
              {t("barLabel", { month: name, count })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function NearbyHouse({ stay, onOpen }: { stay: Stay; onOpen: () => void }) {
  const store = useStore();
  const format = useFormat();
  const price = useViewerPriceLabel(stay);
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  return (
    <Link href={`/house/${stay.slug}`} onClick={onOpen} className="group/house block min-w-0">
      <span className="relative block aspect-4/3 overflow-hidden rounded-2xl bg-ink/5">{photo && <Img src={photo} alt="" fill sizes="240px" className="object-cover" />}</span>
      <span className="mt-2 block truncate text-body font-semibold text-ink group-hover/house:underline">{stay.title}</span>
      <span className="block truncate text-small text-muted">
        {format.shortRange(stay.startDate, stay.endDate)} · {price}
      </span>
    </Link>
  );
}

/** What's open there: the city's Houses first, then the rest of its country. */
function useNearbyHouses(spot: DestinationSpot, thisMonth: string): Stay[] {
  const { stays } = useStore();
  const city = foldPlace(spot.placeName);
  const country = foldPlace(spot.country);
  const open = stays.filter((s) => isListedStay(s) && s.endDate.slice(0, 7) >= thisMonth);
  const here = open.filter((s) => foldPlace(s.location.city) === city);
  const around = open.filter((s) => foldPlace(s.location.city) !== city && foldPlace(s.location.country) === country);
  return [...here, ...around].slice(0, MAX_NEARBY);
}

/**
 * A place in full, from the map, its tile or its card on Explore: photo, who wants to go, when, what's open nearby. At the foot
 * "I'm interested" and the way to host it, with the place and the most wanted month filled in.
 */
export function DestinationPanel({ spot, open, onClose, onClosed }: { spot: DestinationSpot; open: boolean; onClose: () => void; onClosed?: () => void }) {
  const t = useTranslations("explore.whereNext.panel");
  const tRow = useTranslations("explore.interests");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const thisMonth = useThisMonth();
  const { destination } = spot;
  const people = useOptedInPeople(spot)
    .filter((p) => p.user.photos[0])
    .toSorted((a, b) => Number(b.user.id === store.currentUserId) - Number(a.user.id === store.currentUserId));
  const nearby = useNearbyHouses(spot, thisMonth);
  const own = interestIn(store.interests, store.currentUserId, spot)?.months ?? [];
  const bodyRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const { interested, loggedIn, asking, setAsking, press, leave } = useInterestPress(spot, { card: bodyRef, button: buttonRef, stack: stackRef });
  const [changing, setChanging] = useState(false);
  const mostWanted = spot.months.toSorted((a, b) => b.count - a.count || a.month.localeCompare(b.month))[0]?.month;
  const hostHref = createHref({ region: spot.country, city: spot.placeName, ...(mostWanted ? monthRange(mostWanted) : {}) });

  return (
    <>
      <Sheet
        variant="panel"
        open={open}
        onClose={onClose}
        onClosed={onClosed}
        title={spot.placeName}
        hero={
          <div ref={bodyRef}>
            <div className={cn("relative aspect-video overflow-hidden", !destination.coverImage && "bg-[linear-gradient(135deg,var(--stage-peach),var(--stage-mist))]")}>
              {destination.coverImage && <Img src={destination.coverImage} alt="" fill sizes="560px" className="object-cover" />}
            </div>
            <div className="px-6 pt-5">
              <h2 className="text-h2 text-ink">{spot.placeName}</h2>
              <p className="mt-1 text-small text-muted">{spot.country}</p>
            </div>
          </div>
        }
        footer={
          <>
            {interested ? (
              <button ref={buttonRef} type="button" onClick={() => press(() => setChanging(true))} className={buttonStyles("secondary", "md", "min-w-0")}>
                <Check className="text-accent" aria-hidden />
                <span className="truncate">{t("youreIn")}</span>
              </button>
            ) : (
              <button ref={buttonRef} type="button" onClick={() => press(() => {})} className={buttonStyles("secondary", "md")}>
                {tRow("interested")}
              </button>
            )}
            <Link href={hostHref} onClick={onClose} data-preview-action className={buttonStyles("primary", "md", "shrink-0")}>
              {t("host")}
            </Link>
          </>
        }
      >
        <div className="space-y-6 px-6 pb-5 pt-5">
          <section>
            <p className="text-body font-semibold text-ink">{t.rich("want", { count: spot.count, num: () => <RollingNumber value={spot.count} /> })}</p>
            {people.length > 0 && (
              <div ref={stackRef} className="mt-3 flex -space-x-2">
                {people.slice(0, MAX_PEOPLE).map(({ user }) => {
                  const mine = user.id === store.currentUserId;
                  const avatar = (
                    <span data-my-avatar={mine ? "" : undefined} className="relative block size-10 overflow-hidden rounded-full border-2 border-surface">
                      {loggedIn ? <PersonPhoto src={user.photos[0]} alt="" size={40} className="size-full" /> : <Img src={user.photos[0]} alt="" fill sizes="40px" className="scale-110 object-cover blur-[3px]" />}
                    </span>
                  );
                  return loggedIn ? (
                    <Link key={user.id} href={`/u/${user.id}`} onClick={onClose} aria-label={firstName(user)} title={firstName(user)} className="relative rounded-full transition-transform duration-150 hover:z-3 hover:-translate-y-0.5">
                      {avatar}
                    </Link>
                  ) : (
                    <button key={user.id} type="button" onClick={() => requireAuth(undefined, tRow("loginToSeeFor", { place: spot.placeName }))} aria-label={tRow("loginToSeeFor", { place: spot.placeName })} className="relative rounded-full">
                      {avatar}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {spot.count > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className={SECTION_TITLE}>{t("when")}</h3>
                {spot.anytime > 0 && <span className="text-small text-muted">{t("anytime", { count: spot.anytime })}</span>}
              </div>
              <MonthBars spot={spot} own={own} thisMonth={thisMonth} />
            </section>
          )}

          <section>
            <h3 className={cn(SECTION_TITLE, "mb-2")}>{t("nearby")}</h3>
            {nearby.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {nearby.map((stay) => (
                  <NearbyHouse key={stay.id} stay={stay} onOpen={onClose} />
                ))}
              </div>
            ) : (
              <p className="text-body text-muted">{t("noHouse")}</p>
            )}
          </section>
        </div>
      </Sheet>
      {asking &&
        createPortal(
          <Sheet open onClose={() => setAsking(false)} title={tRow("interestTitle", { place: spot.placeName })}>
            <DestinationInterestForm initial={destination} onDone={() => setAsking(false)} />
          </Sheet>,
          document.body,
        )}
      {changing && createPortal(<ChangeMonthsSheet spot={spot} onClose={() => setChanging(false)} onRemove={leave} />, document.body)}
    </>
  );
}

/** A panel that opens and, once it has slid out, is gone again. */
export function useDestinationPanel() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  return {
    mounted,
    open,
    show: () => {
      setMounted(true);
      setOpen(true);
    },
    close: () => setOpen(false),
    gone: () => setMounted(false),
  };
}
