"use client";

import { Check, Plus, Search, Users, X } from "lucide-react";
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
import { Img } from "@/components/ui/Img";
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
/** Tiles in the card's people mosaic (2×2) – past that, the last one says "+N". */
const MOSAIC_TILES = 4;

export function DemandCard({ spot, tile = false }: { spot: DemandSpot; tile?: boolean }) {
  const t = useTranslations("explore.interests");
  const format = useFormatter();
  const store = useStore();
  const requireAuth = useRequireAuth();
  const { interested, toggle } = useInterestToggle(spot);
  const thisYear = useThisYear();
  const span = monthSpan(format, spot, thisYear);
  const optedIn = useOptedInPeople(spot);
  const loggedIn = store.currentUserId !== null;
  const people = loggedIn ? optedIn : [];
  const [listing, setListing] = useState(false);
  const range = spot.months.length > 0 ? { from: monthRange(spot.months[0].month).from, to: monthRange(spot.months.at(-1)!.month).to } : {};
  const summary = [t("people", { count: spot.count }), span, spot.anytime > 0 ? t("anytime", { count: spot.anytime }) : null].filter(Boolean).join(" · ");
  const openPeople = () => (loggedIn ? setListing(true) : requireAuth(() => setListing(true), t("loginToSeeFor", { place: spot.placeName })));
  return (
    // Tiles fill a grid cell beside the House cards (as tall as they are); in rows the mosaic sets the height.
    <div className={cn("flex w-full flex-col overflow-hidden bg-white", tile ? "h-full rounded-[28px]" : "rounded-[24px]")}>
      <PeopleMosaic
        people={optedIn.map((p) => p.user)}
        blurred={!loggedIn}
        label={loggedIn ? t("seePeople", { count: optedIn.length, place: spot.placeName }) : t("loginToSeeFor", { place: spot.placeName })}
        onOpen={optedIn.length > 0 ? openPeople : undefined}
      />

      <div className="flex flex-1 flex-col p-5">
        <p className="text-lg font-bold tracking-tight text-ink">
          {spot.country ? `${spot.placeName}, ${spot.country}` : spot.placeName}
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-ink">
          <Users className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
          <span>{summary}</span>
        </p>
        {/* Logged out, the faces are blurred – this is the way to see them. */}
        {!loggedIn && optedIn.length > 0 && (
          <button
            type="button"
            onClick={openPeople}
            className="mt-2 w-fit whitespace-nowrap text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-ink"
          >
            {t("loginToSee")}
          </button>
        )}
        {/* One row, never wrapping: each button as wide as its label, both growing into the rest. The row is a size
            container – below 232px, where the two full labels no longer fit, "Host this house" becomes "Host it". */}
        <div className="@container mt-auto w-full pt-5">
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={interested}
              onClick={toggle}
              className={buttonClass(interested ? "secondary" : "dark", "xs", "min-w-0 flex-auto whitespace-nowrap")}
            >
              {interested && <Check className="size-4 shrink-0" aria-hidden />}
              <span className="truncate">{interested ? t("interestedOn") : t("interested")}</span>
            </button>
            <Link
              href={createHref({ region: spot.country, city: spot.placeName, ...range })}
              aria-label={t("host")}
              className={buttonClass("secondary", "xs", "min-w-0 flex-auto whitespace-nowrap")}
            >
              <span className="truncate @max-[14.5rem]:hidden">{t("host")}</span>
              <span className="hidden truncate @max-[14.5rem]:inline">{t("hostShort")}</span>
            </Link>
          </div>
        </div>
      </div>
      <PeopleSheet open={listing} onClose={() => setListing(false)} spot={spot} people={people} thisYear={thisYear} />
    </div>
  );
}

/**
 * The top of a demand card: the opted-in people as a 2×2 portrait mosaic (16:10, 2px gaps). More than four: the
 * fourth tile says "+N" over a dark overlay; fewer: the rest are tinted placeholder tiles. Logged out, the photos are
 * blurred – the "+N" stays readable. Tapping it opens the list (or the login first).
 */
function PeopleMosaic({ people, blurred, label, onOpen }: { people: Pick<User, "id" | "name" | "photos">[]; blurred: boolean; label: string; onOpen?: () => void }) {
  const overflow = people.length > MOSAIC_TILES;
  const shown = people.slice(0, MOSAIC_TILES);
  const rest = people.length - (MOSAIC_TILES - 1);
  const tiles = (
    <span className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
      {Array.from({ length: MOSAIC_TILES }, (_, i) => {
        const person = shown[i];
        return (
          <span key={person?.id ?? `empty-${i}`} className="relative overflow-hidden bg-[#E8E6E1]">
            {person?.photos[0] && (
              <Img
                src={person.photos[0]}
                alt=""
                fill
                sizes="160px"
                // Blurred photos are scaled up a little, so the blur doesn't fade in from the tile edges.
                className={cn("object-cover object-[center_30%]", blurred && "scale-110 blur-[6px]")}
              />
            )}
            {overflow && i === MOSAIC_TILES - 1 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">+{rest}</span>
            )}
          </span>
        );
      })}
    </span>
  );
  const frame = "relative block aspect-16/10 w-full shrink-0 overflow-hidden";
  // Names are in the list behind it; the tiles themselves are decorative.
  return onOpen ? (
    <button type="button" onClick={onOpen} aria-label={label} className={cn(frame, "transition-opacity hover:opacity-95")}>
      {tiles}
    </button>
  ) : (
    <div aria-hidden className={frame}>
      {tiles}
    </div>
  );
}

interface VisiblePerson {
  user: User;
  months: string[];
}

/**
 * The people interested in a spot who opted in to be shown (never the opted-out ones). Logged in, the card shows them;
 * logged out only as a blurred teaser. (A real backend sends logged-out visitors placeholders, not their photos.)
 */
function useOptedInPeople(spot: DemandSpot): VisiblePerson[] {
  const store = useStore();
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
