"use client";

import { Check, Plus, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { createHref } from "@/components/create/model";
import { formInput } from "@/components/form/FormLayout";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { RowHeader, ScrollRow } from "@/components/explore/CollectionRow";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip, ChipCheck, chipStyles } from "@/components/ui/Chip";
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
 * "I'm interested" and "Host it", "+ Add a place" last and "See all →" to /next. A horizontal scroll row of
 * the top 12; `grid` (pre-launch, no Houses yet): up to 8 cards as a grid.
 */
export function InterestRow({ exclude = [], layout = "scroll" }: { /** Spots already shown as tiles in the grid above */ exclude?: readonly DemandSpot[]; layout?: "scroll" | "grid" }) {
  const t = useTranslations("explore.interests");
  const spots = useOrderedSpots(exclude);
  const [adding, setAdding] = useState(false);
  const header = (
    <RowHeader id="interests-title" eyebrow={t("eyebrow")} title={t("title")} subline={t("subline")} seeAll={{ href: "/next", label: t("seeAll"), ariaLabel: t("seeAllLabel") }} />
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
        <ScrollRow>
          {spots.slice(0, ROW_SPOTS).map((spot) => (
            <div key={spot.placeName} className="flex w-90 shrink-0 snap-start">
              <DemandCard spot={spot} />
            </div>
          ))}
          <div className="flex w-90 shrink-0 snap-start">
            <AddPlaceCard onAdd={() => setAdding(true)} />
          </div>
        </ScrollRow>
      )}
      <AddPlaceSheet open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

/** Dashed "+ Add a place" card (the card's shape, dashed: a slot, not content) – asks to log in first. */
export function AddPlaceCard({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("explore.interests");
  const requireAuth = useRequireAuth();
  return (
    <button
      type="button"
      onClick={() => requireAuth(onAdd, t("loginToAdd"))}
      className="lift-card flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line p-6 text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-bg text-ink">
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

/** Card of a demand spot: city, country, "8 people", "Feb–Mar", "3 anytime" as Badges and the two actions. `tile`: House-card size (4:5), centred. */
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
  const openPeople = () => (loggedIn ? setListing(true) : requireAuth(() => setListing(true), t("loginToSeeFor", { place: spot.placeName })));
  return (
    // Tiles fill a grid cell beside the House cards (as tall as they are); in rows the mosaic sets the height. One
    // rounded element (24px, overflow hidden, no border) – the mosaic inside runs square to its edges. The hover shadow:
    // here in the grid; in a row the row casts it (.lift-row).
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-3xl bg-surface",
        // In the grid it lifts itself (scale + shadow); in a row, .lift-row lifts it (the same element).
        tile
          ? "h-full transition-[scale,box-shadow] duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:hover:scale-[1.02] md:hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:has-focus-visible:scale-[1.02] md:has-focus-visible:shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
          : "lift-card",
      )}
    >
      <PeopleMosaic
        people={optedIn.map((p) => p.user)}
        blurred={!loggedIn}
        label={loggedIn ? t("seePeople", { count: optedIn.length, place: spot.placeName }) : t("loginToSeeFor", { place: spot.placeName })}
        onOpen={optedIn.length > 0 ? openPeople : undefined}
      />

      <div className="flex flex-1 flex-col p-6">
        <p className="text-lg font-bold tracking-tight text-ink">
          {spot.country ? `${spot.placeName}, ${spot.country}` : spot.placeName}
        </p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          <Badge icon={<Users aria-hidden />}>{t("people", { count: spot.count })}</Badge>
          {span && <Badge>{span}</Badge>}
          {spot.anytime > 0 && <Badge>{t("anytime", { count: spot.anytime })}</Badge>}
        </p>
        {/* Logged out, the faces are blurred – this is the way to see them. */}
        {!loggedIn && optedIn.length > 0 && (
          <Button variant="tertiary" size="md" onClick={openPeople} className="mt-2 w-fit whitespace-nowrap">
            {t("loginToSee")}
          </Button>
        )}
        {/* One row, never wrapping: "Host it" keeps its full width (never cut); "I'm interested" takes the rest. */}
        <div className="mt-auto w-full pt-5">
          <div className="flex gap-2">
            {/* Both secondary – on Explore the header's "Open a House" is the one primary; on is shown by the check. */}
            <Button variant="secondary" size="md" aria-pressed={interested} onClick={toggle} className="min-w-0 flex-1 whitespace-nowrap">
              {interested && <Check className="shrink-0" aria-hidden />}
              <span className="truncate">{interested ? t("interestedOn") : t("interested")}</span>
            </Button>
            <Link
              href={createHref({ region: spot.country, city: spot.placeName, ...range })}
              className={buttonStyles("secondary", "md", "whitespace-nowrap")}
            >
              {t("host")}
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
          <span key={person?.id ?? `empty-${i}`} className="relative overflow-hidden">
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
              <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-lg font-semibold text-white">+{rest}</span>
            )}
          </span>
        );
      })}
    </span>
  );
  const frame = "relative block aspect-16/10 w-full shrink-0 overflow-hidden";
  // Names are in the list behind it; the tiles themselves are decorative.
  return onOpen ? (
    <button type="button" onClick={onOpen} aria-label={label} className={cn(frame, "outline-none transition-opacity hover:opacity-95")}>
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
      <ul className="divide-y divide-line">
        {people.map(({ user, months }) => (
          <li key={user.id}>
            <Link href={`/u/${user.id}`} onClick={onClose} className="block hover:bg-bg">
              <ListRow
                lead={<PersonPhoto src={user.photos[0]} alt={user.name} size={40} className="size-10" />}
                title={
                  <span className="flex items-center gap-1">
                    {firstName(user)}
                    {user.verified && <VerifiedBadge size={14} />}
                  </span>
                }
                subtitle={personMonths(format, months, thisYear, t("anytimeShort"))}
                // The whole row is the link – this only looks like one.
                action={<span className={buttonStyles("tertiary", "md")}>{t("viewProfile")}</span>}
              />
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

export function AddPlaceForm({ onDone }: { onDone: () => void }) {
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
              <Chip key={p.placeId} active={active} onClick={() => setPlace(active ? null : p)}>
                {p.name}
              </Chip>
            );
          })}
        </div>
        {place && !popular.some((p) => p.name === place.name) ? (
          <span className={cn(chipStyles(true), "mt-3 pr-2")}>
            <ChipCheck />
            {place.name}, {place.country}
            <button type="button" onClick={() => setPlace(null)} aria-label={t("removePlace", { place: place.name })} className="rounded-full p-0.5 hover:bg-white/20">
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : (
          !place && (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
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
                <ul id="place-suggestions" role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl bg-surface py-1 shadow-xl ring-1 ring-line">
                  {suggestions.map((p) => (
                    <li key={p.placeId} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlace(p);
                          setQuery("");
                        }}
                        className="flex w-full items-baseline gap-2 px-4 py-2.5 text-left text-sm hover:bg-bg"
                      >
                        <span className="font-medium text-ink">{p.name}</span>
                        <span className="text-muted">{p.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim() && suggestions.length === 0 && <p className="mt-1.5 text-[13px] text-muted">{t("noMatch")}</p>}
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

      {/* Two plain rows split by a 1px line (the helper wraps, so not a one-line ListRow). */}
      <div className="divide-y divide-line border-y border-line">
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2">
          <span className="text-[15px] text-ink">{t("notify")}</span>
          <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        </label>
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2">
          <span>
            <span className="block text-[15px] text-ink">{t("visible")}</span>
            <span className="mt-0.5 block text-[13px] text-muted">{t("visibleHelper")}</span>
          </span>
          <Checkbox checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        </label>
      </div>
      {/* The sheet's one primary. */}
      <Button type="submit" variant="primary" size="lg" className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
