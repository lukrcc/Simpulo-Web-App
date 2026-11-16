"use client";

// Your houses › "Your places" ("Host from your place"): the places the host lives in and saved (lib/ownPlaces.ts). A calm row like the others
// – no box, straight on the page: per place its photo, name, kind · free rooms · rent, and a calendar strip across the host's rental period
// with the windows opened in it (its Houses) as segments – past ones quiet, coming ones ink, each to its House. "Open a window" starts Open a
// House from the place (only dates, spots and price to set); the newest past window has "Open again" (the same, from that House).
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { againHref, windowHref } from "@/components/create/model";
import { Button } from "@/components/ui/ActionButton";
import { RowHead } from "@/components/ui/CardRow";
import { Img } from "@/components/ui/Img";
import { accommodationOf } from "@/config/accommodation";
import { useFormat } from "@/i18n/format";
import { manageHref } from "@/lib/houseTasks";
import { placesOf, windowsOf } from "@/lib/ownPlaces";
import { shortNameOf } from "@/lib/shortName";
import { getCurrentUser, useStore } from "@/lib/store";
import type { Place, Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
const at = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);

export function YourPlaces({ today }: { /** YYYY-MM-DD */ today: string }) {
  const t = useTranslations("houses.places");
  const store = useStore();
  const me = getCurrentUser(store);
  const places = placesOf(store, me?.id);
  if (places.length === 0) return null;
  return (
    <section aria-labelledby="row-places">
      <RowHead id="row-places" title={t("title")} count={places.length} />
      <ul className="mt-4 flex flex-col gap-8">
        {places.map((place) => (
          <PlaceRow key={place.id} place={place} windows={windowsOf(store, place.id)} today={today} />
        ))}
      </ul>
    </section>
  );
}

function PlaceRow({ place, windows, today }: { place: Place; windows: Stay[]; today: string }) {
  const t = useTranslations("houses.places");
  const format = useFormat();
  const kind = accommodationOf(place.accommodationType)?.type.label ?? "";
  // The newest window that is over: "Open again" (Open a House from that House, its crew invited – components/create/model againHref).
  const lastPast = windows.filter((w) => w.endDate.slice(0, 10) < today).at(-1);
  // A new window can only open while the rental lasts.
  const canOpen = place.rentTo > today;
  return (
    <li className="grid gap-x-8 gap-y-4 sm:grid-cols-[200px_minmax(0,1fr)]">
      <span className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-ink/5">
        {place.photos[0] && <Img src={place.photos[0]} alt="" fill sizes="200px" className="object-cover" />}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="truncate text-h3 text-ink">{place.name}</p>
            <p className="mt-1 text-small text-muted">
              {t("meta", { kind: kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : place.address.city, rooms: place.freeSpots, rent: format.price(place.monthlyRent, place.currency) })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastPast && (
              <Button variant="tertiary" size="sm" href={againHref(lastPast.id)} aria-label={t("openAgainLabel", { title: shortNameOf(lastPast) })}>
                {t("openAgain")}
              </Button>
            )}
            {canOpen && (
              <Button variant="secondary" size="sm" href={windowHref(place.id)}>
                {t("openWindow")}
              </Button>
            )}
          </div>
        </div>
        <RentalStrip place={place} windows={windows} today={today} />
      </div>
    </li>
  );
}

/**
 * The rental period as one strip (ink 5 %, fully round): the months as ticks with their short names (every month up to a year, else every
 * third, the year small before each January), today as a fine line, each window a segment at its dates – over: ink 25 %, coming: ink. A
 * segment is its House (a link; its name and dates in the tooltip). Under it the windows as text, in order.
 */
function RentalStrip({ place, windows, today }: { place: Place; windows: Stay[]; today: string }) {
  const t = useTranslations("houses.places");
  const format = useFormat();
  const locale = useLocale();
  const from = at(place.rentFrom);
  const to = at(place.rentTo);
  const span = Math.max(DAY_MS, to - from);
  const pos = (date: string) => Math.min(100, Math.max(0, ((at(date) - from) / span) * 100));
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  // The first day of each month inside the rental.
  const months: string[] = [];
  for (let d = new Date(from); d.getTime() <= to; d.setUTCMonth(d.getUTCMonth() + 1, 1)) {
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    if (first.getTime() >= from) months.push(first.toISOString().slice(0, 10));
  }
  const every = months.length > 13 ? 3 : 1;
  const todayIn = today >= place.rentFrom && today <= place.rentTo;
  return (
    <div className="mt-5">
      <p className="sr-only">{t("calendar", { name: place.name })}</p>
      <div className="relative h-8 rounded-full bg-ink/5">
        {windows.map((w) => {
          const left = pos(w.startDate);
          const width = Math.max(0.8, pos(w.endDate) - left);
          const over = w.endDate.slice(0, 10) < today;
          return (
            <Link
              key={w.id}
              href={manageHref(w)}
              aria-label={t("window", { title: shortNameOf(w), dates: format.stayDates(w) })}
              className={cn("absolute inset-y-1 min-w-2 rounded-full transition-opacity duration-150 hover:opacity-80", over ? "bg-ink/25" : "bg-ink")}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {todayIn && <span aria-hidden className="absolute -inset-y-1 w-px bg-ink/40" style={{ left: `${pos(today)}%` }} />}
      </div>
      <div aria-hidden className="relative mt-1.5 h-4 text-eyebrow text-muted">
        {months.map((m, i) =>
          i % every === 0 && pos(m) <= 96 ? (
            <span key={m} className="absolute whitespace-nowrap" style={{ left: `${pos(m)}%` }}>
              {m.slice(5, 7) === "01" || i === 0 ? `${m.slice(0, 4)} ` : ""}
              {monthName.format(new Date(at(m)))}
            </span>
          ) : null,
        )}
      </div>
      <p className="mt-3 text-small text-muted">{t("rental", { range: format.longRange(place.rentFrom, place.rentTo) ?? "" })}</p>
      {windows.length === 0 ? (
        <p className="mt-1 text-small text-muted">{t("noWindows")}</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-small">
          {windows.map((w) => (
            <li key={w.id}>
              <Link href={manageHref(w)} className={cn("hover:underline underline-offset-4", w.endDate.slice(0, 10) < today ? "text-muted" : "font-semibold text-ink")}>
                {shortNameOf(w)} · {format.stayDates(w)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
