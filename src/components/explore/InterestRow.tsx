"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { createHref } from "@/components/create/model";
import { buttonStyles } from "@/components/ui/ActionButton";
import { ListRow } from "@/components/ui/ListRow";
import { RowHeader, ScrollRow } from "@/components/explore/CollectionRow";
import { Sheet } from "@/components/ui/Sheet";
import { shortMonth } from "@/components/form/MonthChips";
import { DestinationInterestForm } from "@/components/explore/DestinationInterestForm";
import { useDemandSpots, type DestinationSpot } from "@/lib/destinations";
export { useDemandSpots };
import { FLEXIBLE, interestIn, interestsIn, monthRange, type DemandSpot } from "@/lib/interests";
import { findUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { cardGradient, cardTextShadow, cardTitle } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

/** Spots in the Explore row; the rest are on /next. */
export const ROW_SPOTS = 12;
/** A card in the row: 560px, the phone's width keeps a peek of the next one. */
/** Destinations without a picture: stage colours instead. */
const FALLBACK_SURFACE = "bg-[linear-gradient(135deg,var(--stage-peach),var(--stage-mist))]";
export const ROW_CARD = "flex w-[min(560px,85vw)] shrink-0 snap-start";

/** Your own places first (newest first) – so one you just added shows up right away – then everyone's by count. */
export function useOrderedSpots(exclude: readonly DemandSpot[] = []): DestinationSpot[] {
  const all = useDemandSpots();
  const store = useStore();
  return useMemo(() => {
    const mine = store.interests
      .filter((i) => i.userId === store.currentUserId)
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((i) => all.find((s) => interestIn([i], i.userId, s)))
      .filter((s): s is DestinationSpot => s !== undefined);
    // Spots are compared by place: the grid's tiles come from another aggregation.
    const shownAbove = new Set(exclude.map((s) => s.destinationId));
    return [...new Set([...mine, ...all])].filter((s) => !shownAbove.has(s.destinationId));
  }, [all, store.interests, store.currentUserId, exclude]);
}

/**
 * "Where do you want to go next?" – the most wanted places (city, how many people, when), each with "I'm interested" and
 * "Host it", "+ Add a place" last and "See all →" to /next. A horizontal scroll row of the top 12.
 */
export function InterestRow({ exclude = [] }: { /** Spots already shown as tiles in the grid above */ exclude?: readonly DemandSpot[] }) {
  const t = useTranslations("explore.interests");
  const spots = useOrderedSpots(exclude);
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="interests-title">
      <RowHeader id="interests-title" eyebrow={t("eyebrow")} title={t("title")} subline={t("subline")} seeAll={{ href: "/next", label: t("seeAll"), ariaLabel: t("seeAllLabel") }} />
      <ScrollRow>
        {spots.slice(0, ROW_SPOTS).map((spot) => (
          <div key={spot.destinationId} className={ROW_CARD}>
            <DemandCard spot={spot} />
          </div>
        ))}
        <div className={ROW_CARD}>
          <AddPlaceCard onAdd={() => setAdding(true)} />
        </div>
      </ScrollRow>
      <AddPlaceSheet open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

/** "Somewhere else?" at the end of the row: the fallback card's look, opens the place search. */
export function AddPlaceCard({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("explore.interests");
  return (
    <button type="button" onClick={onAdd} className={cn("lift-card flex min-h-56 w-full flex-col items-start justify-end gap-3 rounded-3xl p-5 text-left", FALLBACK_SURFACE)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-surface text-ink">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="text-h2 tracking-tight text-ink">{t("somewhereElse")}</span>
    </button>
  );
}

/** "I'm interested" for a spot: on/off for the current user – after logging in, if needed. */
function useInterestToggle(spot: DemandSpot) {
  const store = useStore();
  const interested = interestIn(store.interests, store.currentUserId, spot) !== undefined;
  const toggle = () => {
    if (store.currentUserId) store.toggleInterest(spot, store.currentUserId);
  };
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

/** A demand card's avatars at most. */
const MAX_AVATARS = 4;

/**
 * A demand spot as a photo card, 16:10, 24px radius: the place's photo with the House cards' gradient. Bottom left in
 * white the city and a line with up to four overlapping avatars, how many people want to go and when; bottom right
 * "I'm interested" and "Host it". Too narrow for both side by side (the /next grid, phones): under each other. `tile`:
 * fills a grid cell beside the House cards, as tall as they are. The avatars open the list of people; logged out, they're
 * blurred and ask to log in first.
 */
export function DemandCard({ spot, tile = false }: { spot: DestinationSpot; tile?: boolean }) {
  const t = useTranslations("explore.interests");
  const format = useFormatter();
  const store = useStore();
  const requireAuth = useRequireAuth();
  const { interested, toggle } = useInterestToggle(spot);
  const thisYear = useThisYear();
  const when = monthSpan(format, spot, thisYear) ?? (spot.anytime > 0 ? t("anytimeShort") : null);
  const optedIn = useOptedInPeople(spot);
  const loggedIn = store.currentUserId !== null;
  const avatars = optedIn.filter((p) => p.user.photos[0]).slice(0, MAX_AVATARS);
  const [listing, setListing] = useState(false);
  const range = spot.months.length > 0 ? { from: monthRange(spot.months[0].month).from, to: monthRange(spot.months.at(-1)!.month).to } : {};
  const { destination } = spot;
  const cover = destination.coverImage;
  // Without an account "I'm interested" asks for an email, here on the card.
  const [asking, setAsking] = useState(false);
  const onInterested = () => (loggedIn ? toggle() : setAsking(true));
  const openPeople = () => (loggedIn ? setListing(true) : requireAuth(() => setListing(true), t("loginToSeeFor", { place: spot.placeName })));
  return (
    <div
      className={cn(
        "@container relative isolate w-full overflow-hidden rounded-3xl", cover ? "bg-ink" : FALLBACK_SURFACE,
        // In the grid it lifts itself like the House cards beside it; in a row, .lift-row lifts it (the same element).
        tile
          ? "h-full transition-[scale,box-shadow] duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:hover:scale-[1.02] md:hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:has-focus-visible:scale-[1.02] md:has-focus-visible:shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
          : "lift-card aspect-16/10",
      )}
    >
      {cover && <Img src={cover} alt={spot.country ? `${spot.placeName}, ${spot.country}` : spot.placeName} fill sizes={tile ? "400px" : "(min-width: 768px) 560px, 85vw"} className="object-cover" />}
      {cover && <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />}
      {destination.imageSource === "pexels" && destination.photographer && (
        <a href={destination.photographer.url} target="_blank" rel="noopener noreferrer" className={cn("absolute bottom-1.5 right-5 text-small text-white/60 hover:text-white", cardTextShadow)}>
          {t("photoCredit", { name: destination.photographer.name })}
        </a>
      )}
      <div className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 @min-[480px]:flex-row @min-[480px]:items-end @min-[480px]:justify-between @min-[480px]:gap-3", cover ? cn("text-white", cardTextShadow) : "text-ink", destination.imageSource === "pexels" && "pb-7")}>
        <div className="min-w-0">
          {cover ? (
            <h3 className={cn("truncate text-h3", cardTitle)}>{spot.placeName}</h3>
          ) : (
            <>
              <h3 className="truncate text-h2 tracking-tight text-ink">{spot.placeName}</h3>
              <p className="text-small text-muted">{spot.country}</p>
            </>
          )}
          <div className="mt-2 flex items-center gap-2">
            {avatars.length > 0 && (
              <button
                type="button"
                onClick={openPeople}
                aria-label={loggedIn ? t("seePeople", { count: optedIn.length, place: spot.placeName }) : t("loginToSeeFor", { place: spot.placeName })}
                className="flex shrink-0 -space-x-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {avatars.map(({ user }) => (
                  <span key={user.id} className="relative block size-7 overflow-hidden rounded-full border-2 border-white">
                    <Img src={user.photos[0]} alt="" fill sizes="28px" className={cn("object-cover object-[center_30%]", !loggedIn && "scale-110 blur-[3px]")} />
                  </span>
                ))}
              </button>
            )}
            <p className={cn("min-w-0 text-small", cover ? "text-white/85" : "text-muted")}>
              {t("wantToGo", { count: spot.count })}
              {when && ` · ${when}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* A surface capsule; on is shown by the check. Smaller text than a button: the line beside it stays on one line. */}
          <button type="button" aria-pressed={interested} onClick={onInterested} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-3.5 text-small font-semibold text-ink transition-colors hover:bg-bg">
            {interested && <Check className="size-4 shrink-0" aria-hidden />}
            {interested ? t("interestedOn") : t("interested")}
          </button>
          <Link href={createHref({ region: spot.country, city: spot.placeName, ...range })} className={cn("inline-flex h-9 items-center whitespace-nowrap text-small font-semibold underline-offset-4 hover:underline", cover ? "text-white" : "text-ink")}>
            {t("host")}
          </Link>
        </div>
      </div>
      {/* To the body: the row's transform and the card's filter would otherwise trap a fixed sheet inside the card. */}
      {asking &&
        createPortal(
          <Sheet open onClose={() => setAsking(false)} title={t("interestTitle", { place: spot.placeName })}>
            <DestinationInterestForm initial={destination} onDone={() => setAsking(false)} />
          </Sheet>,
          document.body,
        )}
      {listing && createPortal(<PeopleSheet open onClose={() => setListing(false)} spot={spot} people={loggedIn ? optedIn : []} thisYear={thisYear} />, document.body)}
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

/** "Somewhere else?": the place search, months, "Count me in". Nothing typed is saved. */
export function AddPlaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("explore.interests");
  return (
    <Sheet open={open} onClose={onClose} title={t("somewhereElse")} subtitle={t("add.subtitle")}>
      {/* Remounted per open, so it always starts empty. */}
      {open && <DestinationInterestForm onDone={onClose} />}
    </Sheet>
  );
}

export { DestinationInterestForm as AddPlaceForm };
