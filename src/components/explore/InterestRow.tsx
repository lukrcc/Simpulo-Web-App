"use client";

import { Check, MapPin, Plus, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { createHref } from "@/components/create/model";
import { formInput } from "@/components/form/FormLayout";
import { buttonClass } from "@/components/ui/button";
import { RowHeader, ScrollRow } from "@/components/explore/CollectionRow";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { chipActiveClass, chipClass, chipInactiveClass } from "@/components/form/chips";
import { MonthChips, shortMonth } from "@/components/form/MonthChips";
import { aggregateDemand, FLEXIBLE, interestIn, interestsIn, monthRange, type DemandSpot } from "@/lib/interests";
import { placeByName, PLACES, searchPlaces, type Place } from "@/lib/places";
import { findUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { AvatarStack } from "@/components/ui/Avatar";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

/** Demand spots from the store's interests, most wanted first. */
export function useDemandSpots(): DemandSpot[] {
  const { interests } = useStore();
  return useMemo(() => aggregateDemand(interests), [interests]);
}

/** Spots in the Explore row; the rest are on /next. */
export const ROW_SPOTS = 12;
/** Pre-launch grid: at most this many cards, "+ Add a place" included. */
const GRID_CARDS = 8;

/** Your own places first (newest first) – so one you just added shows up right away – then everyone's by count. */
export function useOrderedSpots(exclude: readonly DemandSpot[] = []): DemandSpot[] {
  const all = useDemandSpots();
  const store = useStore();
  return useMemo(() => {
    const mine = store.interests
      .filter((i) => i.userId === store.currentUserId)
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((i) => all.find((s) => interestIn([i], i.userId, s)))
      .filter((s): s is DemandSpot => s !== undefined);
    // Spots are compared by place: the grid's tiles come from another aggregation.
    const shownAbove = new Set(exclude.map((s) => s.placeName));
    return [...new Set([...mine, ...all])].filter((s) => !shownAbove.has(s.placeName));
  }, [all, store.interests, store.currentUserId, exclude]);
}

/**
 * "Where do you want to go next?" – the most wanted places (city, country, months, how many people), each with
 * "I'm interested" and "Host this house", "+ Add a place" last and "See all →" to /next. A horizontal scroll row of
 * the top 12; `grid` (pre-launch, no Houses yet): up to 8 cards as a grid.
 */
export function InterestRow({ exclude = [], layout = "scroll" }: { /** Spots already shown as tiles in the grid above */ exclude?: readonly DemandSpot[]; layout?: "scroll" | "grid" }) {
  const t = useTranslations("explore.interests");
  const spots = useOrderedSpots(exclude);
  const [adding, setAdding] = useState(false);
  const header = (
    <RowHeader id="interests-title" title={t("title")} subline={t("subline")} seeAll={{ href: "/next", label: t("seeAll"), ariaLabel: t("seeAllLabel") }} />
  );

  return (
    <section aria-labelledby="interests-title">
      {header}
      {layout === "grid" ? (
        <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 min-[90rem]:grid-cols-4">
          {spots.slice(0, GRID_CARDS - 1).map((spot) => (
            <li key={spot.placeName} className="flex">
              <DemandCard spot={spot} />
            </li>
          ))}
          <li className="flex">
            <AddPlaceCard onAdd={() => setAdding(true)} />
          </li>
        </ul>
      ) : (
        <ScrollRow className="mt-5">
          {spots.slice(0, ROW_SPOTS).map((spot) => (
            <div key={spot.placeName} className="flex w-72 shrink-0 snap-start">
              <DemandCard spot={spot} />
            </div>
          ))}
          <div className="flex w-72 shrink-0 snap-start">
            <AddPlaceCard onAdd={() => setAdding(true)} />
          </div>
        </ScrollRow>
      )}
      <AddPlaceSheet open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

/** Dashed "+ Add a place" card – asks to log in first. */
export function AddPlaceCard({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("explore.interests");
  const requireAuth = useRequireAuth();
  return (
    <button
      type="button"
      onClick={() => requireAuth(onAdd, t("loginToAdd"))}
      className="flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-black/10 p-6 text-zinc-600 transition-colors hover:border-black/20 hover:text-ink"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-ink">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="font-semibold">{t("addPlace")}</span>
    </button>
  );
}

/** "I'm interested" for a spot: on/off for the current user – after logging in, if needed. */
function useInterestToggle(spot: DemandSpot) {
  const t = useTranslations("explore.interests");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const interested = interestIn(store.interests, store.currentUserId, spot) !== undefined;
  const toggle = () => requireAuth((userId) => store.toggleInterest(spot, userId), t("loginToJoin", { place: spot.placeName }));
  return { interested, toggle };
}

const noSubscribe = () => () => {};
/** The current year, in the browser only – the server (and the prerender) must not read the clock: "" there. */
function useThisYear(): string {
  return useSyncExternalStore(noSubscribe, () => String(new Date().getUTCFullYear()), () => "");
}

/** The months people want, as one span: "Feb–Mar" (this year) or "Feb–Mar 2027"; null without dated interest. */
function monthSpan(format: ReturnType<typeof useFormatter>, spot: DemandSpot, thisYear: string): string | null {
  if (spot.months.length === 0) return null;
  const first = spot.months[0].month;
  const last = spot.months.at(-1)!.month;
  const span = first === last ? shortMonth(format, first, false) : `${shortMonth(format, first, false)}–${shortMonth(format, last, false)}`;
  return last.slice(0, 4) === thisYear ? span : `${span} ${last.slice(0, 4)}`;
}

/** Card of a demand spot: city, country, "8 people · Feb–Mar · 3 anytime" and the two actions. `tile`: House-card size (4:5), centred. */
export function DemandCard({ spot, tile = false }: { spot: DemandSpot; tile?: boolean }) {
  const t = useTranslations("explore.interests");
  const format = useFormatter();
  const { interested, toggle } = useInterestToggle(spot);
  const thisYear = useThisYear();
  const span = monthSpan(format, spot, thisYear);
  const people = useVisiblePeople(spot);
  const [listing, setListing] = useState(false);
  const range = spot.months.length > 0 ? { from: monthRange(spot.months[0].month).from, to: monthRange(spot.months.at(-1)!.month).to } : {};
  const summary = [t("people", { count: spot.count }), span, spot.anytime > 0 ? t("anytime", { count: spot.anytime }) : null].filter(Boolean).join(" · ");
  return (
    <div
      className={cn(
        "flex w-full flex-col bg-white",
        tile ? "aspect-4/5 items-center justify-center rounded-[28px] p-8 text-center" : "rounded-[24px] p-6",
      )}
    >
      {tile && (
        <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-page text-ink">
          <MapPin className="size-6" aria-hidden />
        </span>
      )}
      <p className="text-xl font-semibold tracking-tight text-ink">{spot.placeName}</p>
      {spot.country && <p className="mt-0.5 text-zinc-500">{spot.country}</p>}
      <p className={cn("mt-3 flex items-start gap-1.5 text-sm font-medium text-ink", tile && "justify-center")}>
        <Users className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
        <span>{summary}</span>
      </p>
      {/* Logged in only: the people who chose to be seen – tap for the list. Everyone else is just counted. */}
      {people.length > 0 && (
        <button
          type="button"
          onClick={() => setListing(true)}
          aria-label={t("seePeople", { count: people.length, place: spot.placeName })}
          className={cn("mt-3 flex w-fit items-center gap-2 rounded-full pr-2 hover:bg-black/[0.03]", tile && "mx-auto")}
        >
          <AvatarStack users={people.map((p) => p.user)} size="xs" max={5} />
        </button>
      )}
      <div className={cn("mt-auto flex flex-wrap gap-2 pt-6", tile && "mt-0 justify-center")}>
        <button type="button" aria-pressed={interested} onClick={toggle} className={buttonClass(interested ? "secondary" : "dark", "sm")}>
          {interested && <Check className="size-4" aria-hidden />}
          {interested ? t("interestedOn") : t("interested")}
        </button>
        <Link href={createHref({ region: spot.country, city: spot.placeName, ...range })} className={buttonClass("secondary", "sm")}>
          {t("host")}
        </Link>
      </div>
      <PeopleSheet open={listing} onClose={() => setListing(false)} spot={spot} people={people} thisYear={thisYear} />
    </div>
  );
}

interface VisiblePerson {
  user: User;
  months: string[];
}

/** Logged in: the people interested in a spot who opted in to be shown (never the opted-out ones). Logged out: none. */
function useVisiblePeople(spot: DemandSpot): VisiblePerson[] {
  const store = useStore();
  if (!store.currentUserId) return [];
  return interestsIn(store.interests, spot.placeName).flatMap((interest) => {
    const user = interest.visible ? findUser(store, interest.userId) : undefined;
    return user ? [{ user, months: interest.months }] : [];
  });
}

/** "Feb · Mar 2027" or "Anytime" – months only, never dates. */
function personMonths(format: ReturnType<typeof useFormatter>, months: string[], thisYear: string, anytime: string): string {
  const dated = months.filter((m) => m !== FLEXIBLE);
  if (dated.length === 0) return anytime;
  const year = dated.at(-1)!.slice(0, 4);
  const names = dated.map((m) => shortMonth(format, m, false)).join(" · ");
  return year === thisYear ? names : `${names} ${year}`;
}

/** Who's interested (opted-in people only): photo, first name, badge, months, a link to the profile – no messaging. */
function PeopleSheet({ open, onClose, spot, people, thisYear }: { open: boolean; onClose: () => void; spot: DemandSpot; people: VisiblePerson[]; thisYear: string }) {
  const t = useTranslations("explore.interests");
  const format = useFormatter();
  return (
    <Sheet open={open} onClose={onClose} title={t("peopleTitle", { place: spot.placeName })} subtitle={t("peopleSubtitle", { count: spot.count })}>
      <ul className="divide-y divide-black/5">
        {people.map(({ user, months }) => (
          <li key={user.id}>
            <Link href={`/u/${user.id}`} onClick={onClose} className="flex items-center gap-3 py-3 hover:bg-neutral-50">
              <PersonPhoto src={user.photos[0]} alt={user.name} size={44} className="size-11" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-medium text-ink">
                  {firstName(user)}
                  {user.verified && <VerifiedBadge size={14} />}
                </span>
                <span className="block text-sm text-zinc-500">{personMonths(format, months, thisYear, t("anytimeShort"))}</span>
              </span>
              <span className="shrink-0 text-sm font-medium text-ink underline underline-offset-2">{t("viewProfile")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** Popular destinations offered as chips at the top of "Add a place". */
const POPULAR_COUNT = 8;

/** "+ Add a place": pick a place and one or more months (or "Flexible"), notify me. Nothing typed is saved. */
export function AddPlaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("explore.interests.add");
  return (
    <Sheet open={open} onClose={onClose} title={t("title")} subtitle={t("subtitle")}>
      {/* Remounted per open, so it always starts empty. */}
      {open && <AddPlaceForm onDone={onClose} />}
    </Sheet>
  );
}

function AddPlaceForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("explore.interests.add");
  const store = useStore();
  const showToast = useToast();
  const spots = useDemandSpots();
  const [place, setPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [visible, setVisible] = useState(true);
  const [tried, setTried] = useState(false);

  // Where people already want to go, then the rest of the list – a place appears once.
  const popular = useMemo(() => {
    const fromDemand = spots.map((s) => placeByName(s.placeName) ?? { placeId: `demand:${s.placeName}`, name: s.placeName, country: s.country, region: s.region });
    return [...new Map([...fromDemand, ...PLACES].map((p) => [p.name, p])).values()].slice(0, POPULAR_COUNT);
  }, [spots]);
  const suggestions = place ? [] : searchPlaces(query);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!place || months.length === 0 || !store.currentUserId) return;
    store.addInterest({ placeName: place.name, country: place.country, region: place.region, months, notify, visible }, store.currentUserId);
    showToast(notify ? t("addedNotify", { place: place.name }) : t("added", { place: place.name }));
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("place")}</legend>
        <div role="group" aria-label={t("popular")} className="flex flex-wrap gap-2">
          {popular.map((p) => {
            const active = place?.name === p.name;
            return (
              <button key={p.placeId} type="button" aria-pressed={active} onClick={() => setPlace(active ? null : p)} className={cn(chipClass, active ? chipActiveClass : chipInactiveClass)}>
                {p.name}
              </button>
            );
          })}
        </div>
        {place && !popular.some((p) => p.name === place.name) ? (
          <span className={cn(chipClass, chipActiveClass, "mt-3 inline-flex items-center gap-1.5 pr-2")}>
            {place.name}, {place.country}
            <button type="button" onClick={() => setPlace(null)} aria-label={t("removePlace", { place: place.name })} className="rounded-full p-0.5 hover:bg-white/20">
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : (
          !place && (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
              <input
                type="search"
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="place-suggestions"
                aria-autocomplete="list"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("search")}
                aria-invalid={tried && !place ? true : undefined}
                className={cn(formInput, "pl-10")}
              />
              {suggestions.length > 0 && (
                <ul id="place-suggestions" role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/5">
                  {suggestions.map((p) => (
                    <li key={p.placeId} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlace(p);
                          setQuery("");
                        }}
                        className="flex w-full items-baseline gap-2 px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
                      >
                        <span className="font-medium text-ink">{p.name}</span>
                        <span className="text-zinc-500">{p.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim() && suggestions.length === 0 && <p className="mt-1.5 text-[13px] text-zinc-500">{t("noMatch")}</p>}
            </div>
          )
        )}
        {tried && !place && <p className="mt-1.5 text-[13px] text-red-600">{t("placeError")}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("months")}</legend>
        <MonthChips value={months} onChange={setMonths} label={t("months")} />
        {tried && months.length === 0 && <p className="mt-1.5 text-[13px] text-red-600">{t("monthError")}</p>}
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-page px-4 py-3">
        <span className="text-sm font-medium">{t("notify")}</span>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-5 accent-ink" />
      </label>
      <label className="-mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-page px-4 py-3">
        <span>
          <span className="block text-sm font-medium">{t("visible")}</span>
          <span className="mt-0.5 block text-[13px] text-zinc-500">{t("visibleHelper")}</span>
        </span>
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-5 shrink-0 accent-ink" />
      </label>
      <button type="submit" className={buttonClass("dark", "lg", "w-full")}>
        {t("submit")}
      </button>
    </form>
  );
}
