"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { createHref } from "@/components/create/model";
import { buttonStyles } from "@/components/ui/ActionButton";
import { ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import { Sheet } from "@/components/ui/Sheet";
import { shortMonth } from "@/components/form/MonthChips";
import { Anchored } from "@/components/ui/Anchored";
import { RollingNumber } from "@/components/ui/RollingNumber";
import type { DestinationCandidate } from "@/lib/data/destinationTypes";
import { DestinationInterestForm } from "@/components/explore/DestinationInterestForm";
import { hasCardImage, useDemandSpots, type DestinationSpot } from "@/lib/destinations";
export { useDemandSpots };
import { FLEXIBLE, interestIn, monthRange, type DemandSpot } from "@/lib/interests";
import { revealInShelf } from "@/lib/shelves";
import { useStore } from "@/lib/store";
import { cn, firstName } from "@/lib/utils";
import { cardGradient, cardTextShadow, cardTitle } from "@/components/ui/glass";
import { DestinationPanel, useDestinationPanel } from "./DestinationPanel";
import { ChangeMonthsSheet, monthSpan, useInterestPress, useOptedInPeople, useThisMonth, type VisiblePerson } from "./spotInterest";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

/** Spots in the Explore row; the rest are on /where-next. */
export const ROW_SPOTS = 12;
/** A card in the row: 560px, the phone's width keeps a peek of the next one. */
/** Destinations without a picture: stage colours instead. */
const FALLBACK_SURFACE = "bg-[linear-gradient(135deg,var(--stage-peach),var(--stage-mist))]";
export const ROW_CARD = "flex w-[min(560px,85vw)] shrink-0";

/** Your own places first (newest first) – so one you just added shows up right away – then everyone's by count. Only those with a picture. */
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
    return [...new Set([...mine, ...all])].filter((s) => hasCardImage(s) && !shownAbove.has(s.destinationId));
  }, [all, store.interests, store.currentUserId, exclude]);
}

/**
 * "Where do you want to go next?" – the most wanted places (city, how many people, when), each with "I'm interested" and
 * "Host it", "+ Add a place" last and "See all →" to /where-next. A horizontal scroll row of the top 12.
 */
export function InterestRow({ exclude = [] }: { /** Spots already shown as tiles in the grid above */ exclude?: readonly DemandSpot[] }) {
  const t = useTranslations("explore.interests");
  const spots = useOrderedSpots(exclude);
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="interests-title">
      <SectionHeader id="interests-title" eyebrow={t("eyebrow")} title={t("title")} subline={t("subline")} seeAll={{ href: "/where-next", label: t("seeAll"), ariaLabel: t("seeAllLabel") }} />
      <Shelf>
        {spots.slice(0, ROW_SPOTS).map((spot) => (
          <div key={spot.destinationId} className={ROW_CARD}>
            <DemandCard spot={spot} />
          </div>
        ))}
        <div className={ROW_CARD}>
          <AddPlaceCard onAdd={() => setAdding(true)} />
        </div>
      </Shelf>
      <AddPlaceSheet open={adding} focusOnSave onClose={() => setAdding(false)} />
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
      <span className="text-h2 text-ink">{t("somewhereElse")}</span>
    </button>
  );
}

/** How long a card keeps its ring when the search led to it. */
const CARD_RING_MS = 1200;

/**
 * Scrolls a place's card into view and rings it for a moment, once any sheet over the page is gone (it locks the scrolling).
 * `onMissing`: no card of it is on this page.
 */
export function focusDestinationCard(destinationId: string, onMissing?: () => void) {
  const started = performance.now();
  const attempt = () => {
    const waiting = document.querySelector('[role="dialog"]') !== null && performance.now() - started < 800;
    const card = [...document.querySelectorAll<HTMLElement>(`[data-destination-card="${CSS.escape(destinationId)}"]`)].find((el) => el.offsetHeight > 0);
    if (waiting || (!card && performance.now() - started < 400)) return void requestAnimationFrame(attempt);
    if (!card) return onMissing?.();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!revealInShelf(card, reduced) && performance.now() - started < 800) return void requestAnimationFrame(attempt);
    // Only the window: scrollIntoView would also move the shelf's viewport itself, under Embla's feet.
    const box = card.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top + box.height / 2 - window.innerHeight / 2, behavior: reduced ? "auto" : "smooth" });
    card.setAttribute("data-card-ring", "");
    setTimeout(() => card.removeAttribute("data-card-ring"), CARD_RING_MS);
  };
  requestAnimationFrame(attempt);
}

/** A demand card's avatars at most. */
const MAX_AVATARS = 4;

/**
 * A demand spot as a photo card, 16:10, 24px radius: the place's photo with the House cards' gradient. Bottom left in
 * white the city and a line with up to four overlapping avatars, how many people want to go and when; bottom right
 * "I'm interested" and "Host it". Too narrow for both side by side (the Profile grid, phones): under each other. `tile`:
 * fills a grid cell beside the House cards, as tall as they are. The avatars open the list of people; logged out, they're
 * blurred and ask to log in first.
 */
export function DemandCard({ spot, tile = false }: { spot: DestinationSpot; tile?: boolean }) {
  const t = useTranslations("explore.interests");
  const tPage = useTranslations("explore.whereNext");
  const format = useFormatter();
  const store = useStore();
  const requireAuth = useRequireAuth();
  const thisMonth = useThisMonth();
  const when = monthSpan(format, spot, thisMonth) ?? (spot.anytime > 0 ? t("anytimeShort") : null);
  const optedIn = useOptedInPeople(spot);
  // You first: that's where your avatar lands.
  const avatars = optedIn.filter((p) => p.user.photos[0]).toSorted((a, b) => Number(b.user.id === store.currentUserId) - Number(a.user.id === store.currentUserId)).slice(0, MAX_AVATARS);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stackRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const { interested, loggedIn, asking, setAsking, press, leave } = useInterestPress(spot, { card: cardRef, button: buttonRef, stack: stackRef });
  const panel = useDestinationPanel();

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  const [listing, setListing] = useState(false);
  const range = spot.months.length > 0 ? { from: monthRange(spot.months[0].month).from, to: monthRange(spot.months.at(-1)!.month).to } : {};
  const { destination } = spot;
  const cover = destination.coverImage;
  const onInterested = () => press(() => setMenuOpen((open) => !open));
  const openPeople = () => (loggedIn ? setListing(true) : requireAuth(() => setListing(true), t("loginToSeeFor", { place: spot.placeName })));
  return (
    <div
      ref={cardRef}
      data-destination-card={spot.destinationId}
      className={cn(
        "@container relative isolate w-full overflow-hidden rounded-3xl", cover ? "bg-ink" : FALLBACK_SURFACE,
        // In the grid it lifts itself like the House cards beside it; on a shelf, .shelf lifts it (the same element).
        tile
          ? "h-full transition-[scale,box-shadow] duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:hover:scale-[1.02] md:hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:has-focus-visible:scale-[1.02] md:has-focus-visible:shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
          : "lift-card aspect-16/10",
      )}
    >
      {cover && <Img src={cover} alt={spot.country ? `${spot.placeName}, ${spot.country}` : spot.placeName} fill sizes={tile ? "400px" : "(min-width: 768px) 560px, 85vw"} className="object-cover" />}
      {cover && <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />}
      {/* The whole card opens the place's panel; what's on it has its own click. */}
      <button type="button" onClick={panel.show} aria-label={tPage("openDetails", { place: spot.placeName })} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
      {destination.imageSource === "pexels" && destination.photographer && (
        <a href={destination.photographer.url} target="_blank" rel="noopener noreferrer" className={cn("absolute bottom-1.5 right-5 text-small text-white/60 hover:text-white", cardTextShadow)}>
          {t("photoCredit", { name: destination.photographer.name })}
        </a>
      )}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 [&_a]:pointer-events-auto [&_button]:pointer-events-auto @min-[480px]:flex-row @min-[480px]:items-end @min-[480px]:justify-between @min-[480px]:gap-3", cover ? cn("text-white", cardTextShadow) : "text-ink", destination.imageSource === "pexels" && "pb-7")}>
        <div className="min-w-0">
          {cover ? (
            <h3 className={cn("truncate text-h3", cardTitle)}>{spot.placeName}</h3>
          ) : (
            <>
              <h3 className="truncate text-h2 text-ink">{spot.placeName}</h3>
              <p className="text-small text-muted">{spot.country}</p>
            </>
          )}
          <div className="mt-2 flex items-center gap-2">
            {avatars.length > 0 && (
              <button
                ref={stackRef}
                type="button"
                onClick={openPeople}
                aria-label={loggedIn ? t("seePeople", { count: optedIn.length, place: spot.placeName }) : t("loginToSeeFor", { place: spot.placeName })}
                className="flex shrink-0 -space-x-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {avatars.map(({ user }) => (
                  <span key={user.id} data-my-avatar={user.id === store.currentUserId ? "" : undefined} className="relative block size-7 overflow-hidden rounded-full border-2 border-white">
                    <Img src={user.photos[0]} alt="" fill sizes="28px" className={cn("object-cover object-[center_30%]", !loggedIn && "scale-110 blur-[3px]")} />
                  </span>
                ))}
              </button>
            )}
            <p className={cn("min-w-0 truncate text-small", cover ? "text-white/85" : "text-muted")}>
              {t.rich("wantToGo", { count: spot.count, num: () => <RollingNumber value={spot.count} /> })}
              {when && ` · ${when}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* A surface capsule; on is shown by the check. Smaller text than a button: the line beside it stays on one line. */}
          <button ref={buttonRef} type="button" aria-pressed={interested} aria-haspopup={interested ? "menu" : undefined} aria-expanded={interested ? menuOpen : undefined} onClick={onInterested} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-3.5 text-small font-semibold text-ink transition-colors hover:bg-bg">
            {interested ? t("interestedOn") : t("interested")}
            {interested && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
          </button>
          {menuOpen && (
            <Anchored anchor={buttonRef} ref={menuRef} align="end">
              <div role="menu" className="glass-panel animate-fade-in w-44 overflow-hidden rounded-[20px]! py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setChanging(true);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-body text-ink hover:bg-white/50"
                >
                  {t("changeMonths")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    leave();
                  }}
                  className="block w-full px-4 py-2.5 text-left text-body text-ink hover:bg-white/50"
                >
                  {t("removeInterest")}
                </button>
              </div>
            </Anchored>
          )}
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
      {listing && createPortal(<PeopleSheet open onClose={() => setListing(false)} spot={spot} people={loggedIn ? optedIn : []} thisYear={thisMonth.slice(0, 4)} />, document.body)}
      {changing && createPortal(<ChangeMonthsSheet spot={spot} onClose={() => setChanging(false)} />, document.body)}
      {panel.mounted && <DestinationPanel spot={spot} open={panel.open} onClose={panel.close} onClosed={panel.gone} />}
    </div>
  );
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
      <ul className="">
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

/**
 * "Somewhere else?": the place search, months, "Count me in". Nothing typed is saved. `focusOnSave`: a place that has a card closes
 * the sheet and goes to it (on another page if it's not on this one); without a card it only says so.
 */
export function AddPlaceSheet({ open, onClose, initial, focusOnSave = false }: { open: boolean; onClose: () => void; initial?: DestinationCandidate; focusOnSave?: boolean }) {
  const t = useTranslations("explore.interests");
  const router = useRouter();
  return (
    <Sheet open={open} onClose={onClose} title={t("somewhereElse")} subtitle={t("add.subtitle")}>
      {/* Remounted per open, so it always starts empty. */}
      {open && (
        <DestinationInterestForm
          initial={initial}
          onDone={onClose}
          onCardFound={
            focusOnSave
              ? (id) => {
                  onClose();
                  focusDestinationCard(id, () => router.push(`/where-next?focus=${encodeURIComponent(id)}`));
                }
              : undefined
          }
        />
      )}
    </Sheet>
  );
}

export { DestinationInterestForm as AddPlaceForm };
