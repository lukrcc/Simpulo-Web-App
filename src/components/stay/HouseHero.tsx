"use client";

import { BackButton } from "@/components/ui/BackButton";
import { ArrowRight, ArrowUpRight, Home, Languages, MapPin, Sparkles, Users, Venus, Zap } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CrewRow } from "@/components/CrewRow";
import { HeroBand, HeroPhotos } from "@/components/HeroBand";
import { SaveButton } from "@/components/ui/SaveButton";
import { useState, type ReactNode, type Ref } from "react";
import { showsAge } from "@/config/privacy";
import { CurrencySheet, currencyLabel } from "@/components/layout/CurrencyPicker";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SocialLinks } from "@/components/SocialLinks";
import { useCrewFaceOf } from "@/components/ui/useCrewFaces";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { plainAmount } from "@/lib/currency";
import { openVote } from "@/lib/crewVotes";
import type { MemberStage } from "@/lib/joinFlow";
import { inCommonWith, medianReplyMinutes, profileViewFor } from "@/lib/profilePrivacy";
import { crewInOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { usePeopleSignal } from "@/lib/useYourPeople";
import { cn, firstName, googleMapsUrl, housePhotos, openSpots, stayNights, stayPrice } from "@/lib/utils";
import { Img } from "@/components/ui/Img";
import { Sheet } from "@/components/ui/Sheet";
import { placeImageOf } from "@/config/place-images";
import { cityPlaceIdOf } from "@/lib/data/places";
import { HowPicked } from "./HouseSections";

interface HouseHeroProps {
  stay: Stay;
  host?: User;
  crew: User[];
  /** The main action (StayCta in the head: cream) */
  cta: ReactNode;
  /** Message host and Invite: cream outlines */
  secondary: ReactNode;
  /** "…" (and on phones the way back) */
  actions: ReactNode;
  stage: MemberStage | null;
  /** The one line under the actions: "Free to request · Pay only after the host says yes · Cancellation rules" */
  showSteps: boolean;
  /** A line under the actions (the waitlist, withdrawing a request …) */
  note?: ReactNode;
  /** A calm line right above the actions ("This House is for women only.") */
  notice?: ReactNode;
  /** The dark action strip: the floating bar comes once it has left the window */
  ref?: Ref<HTMLElement>;
  /** "Request with a friend" – the crew tile's "Bring a friend" link when several spots are open */
  onRequestWithFriend?: () => void;
}

const lineDate = (chunks: ReactNode) => <span className="font-semibold text-ink">{chunks}</span>;
/** A reply this fast (median, minutes) earns "Responds fast". */
const FAST_REPLY_MINUTES = 120;

/**
 * The House page's head – the same band as Your houses' (components/HeroBand, --hero-h at least): left the photos to the window's left edge,
 * no rounding, the heart top right in them; right the light page (--bg), no cards or boxes, its content on the grid: the eyebrow, the title
 * 44px (two lines at most), "dates · nights · place", the chips, share and "…" top right; a 1px line ink 8 %; then two columns with a 1px
 * line between them – HOST (avatar 56px, name + Verified, age · country, the social capsules, in common as one line with icons, "View
 * profile →") and CREW (the CrewRow, "2 of 5 in · 3 spots left", the waitlist, "Bring a friend – request together →"). At its foot the dark
 * action strip (the global Ember) from the photo's edge to the window's right edge, a hard edge on top, flush with the photo's foot: the
 * price 48px and "KES … · Change" left, the actions right, the way in as a small line under it. Phones: the photo, the light part, host and
 * crew one under the other, and the strip as a fixed bar at the bottom. `ref` is the strip: the floating bar comes once it has left the window.
 */
export function HouseHero({ stay, host, crew, cta, secondary, actions, stage, showSteps, note, notice, ref, onRequestWithFriend }: HouseHeroProps) {
  const tBack = useTranslations("common");
  const t = useTranslations("house.page");
  const tHero = useTranslations("house.page.hero");
  const format = useFormat();
  const languages = [...new Set([stay.language, ...(stay.languages ?? [])].filter(Boolean).map(format.language))].slice(0, 3);
  const booked = stay.accommodationStatus === "locked";
  const women = stay.who === "women" || stay.audience === "women";
  const payBy = stage === "payment_due" && stay.paymentDueAt;
  // Where, short: "Roma Norte, Mexico City" (the area and the city), else the city – never the country.
  const city = stay.location.city || stay.city || stay.region.split(",")[0];
  const placeShort = stay.location.area ? `${stay.location.area}, ${city}` : city;
  const strip = (
    <div ref={ref as Ref<HTMLDivElement>} data-house-strip className="ember ember-strip band-inset max-md:fixed max-md:inset-x-0 max-md:bottom-(--tabbar-clear) max-md:z-30 max-md:px-4 max-md:py-3 flex shrink-0 flex-col justify-center gap-2 py-6 md:min-h-30">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <HeroPrice stay={stay} />
        <div className="flex min-w-0 flex-col items-end gap-2">
          {notice && <p className="text-small text-muted max-md:hidden">{notice}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex min-w-0 gap-2 *:whitespace-nowrap">{cta}</div>
            <div className="flex gap-2 max-md:hidden">{secondary}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 max-md:hidden">
        {note && <p className="text-small text-muted">{note}</p>}
        {payBy && <p className="text-small text-muted">{t("payBy", { date: `${format.day(payBy)} ${format.time(payBy)}` })}</p>}
        {openVote(stay, "accommodation") && <p className="text-small text-muted">{t("crewVoting")}</p>}
        {openVote(stay, "dates") && <p className="text-small text-muted">{t("crewVotingDates")}</p>}
        {showSteps && <WayIn />}
      </div>
    </div>
  );
  return (
    <HeroBand
      aria-labelledby="house-title"
      // As high as its content – the band ends under the tiles, no empty field before the strip; the photo as high as the right side incl. the
      // strip. The same photo width and band tone (#EAE4DD) as Your houses.
      height=""
      media={
        <>
          <HeroPhotos photos={housePhotos(stay, host)} />
          <span className="absolute right-2 top-2 z-10 flex">
            <SaveButton stay={stay} />
          </span>
        </>
      }
      footer={strip}
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        {/* The way back: phones and the installed app. */}
        <BackButton fallback="/" label={tBack("back")} />
        <p className="min-w-0 flex-1 truncate text-eyebrow uppercase text-ink/60">
          {stay.customVibe?.trim() || format.vibe(stay.vibe)} · {booked ? tHero("placeBooked") : tHero("pickingTogether")}
        </p>
        {actions}
      </div>
      <h1 id="house-title" className="mt-2 line-clamp-2 text-hero text-ink">
        {stay.title}
      </h1>
      {/* One line: the dates, the nights and where – the area and the city, no country. */}
      <p className="mt-3 truncate text-h3 font-normal text-muted">
        {stay.datesOpen
          ? t.rich("lineOpen", { dates: format.stayDatesLong(stay), place: placeShort, date: lineDate })
          : t.rich("line", { dates: format.stayDatesLong(stay), nights: format.nights(stayNights(stay)), place: placeShort, date: lineDate })}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 text-small font-medium">
        {languages.length > 0 && (
          <li className="ember-chip">
            <Languages aria-hidden className="size-3.5" />
            {languages.join(", ")}
          </li>
        )}
        <li className="ember-chip">
          <Home aria-hidden className="size-3.5" />
          {stay.hostFeePerPerson ? tHero("stayAndHost") : tHero("stayIncluded")}
        </li>
        {women && (
          <li className="ember-chip">
            <Venus aria-hidden className="size-3.5" />
            {tHero("womenOnly")}
          </li>
        )}
      </ul>
      {/* The facts as a bento, 24px under the chips (no line): three equal tiles, gap 12, radius 20, the same height (~168px), 20px inside,
          no edge or shadow – Host, Crew, Place. Phones: one under the other. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {host && <HostTile host={host} stay={stay} />}
        <CrewTile stay={stay} crew={crew} onRequestWithFriend={onRequestWithFriend} />
        <PlaceTile stay={stay} />
      </div>
    </HeroBand>
  );
}


/** "≈ €1,300 pp" large; under it "AED 5,300 · Change" (the House's own amount when it differs, else the currency shown). */
function HeroPrice({ stay }: { stay: Stay }) {
  const tCurrency = useTranslations("common.ui.currency");
  const label = useViewerPriceLabel(stay);
  const viewer = usePreferredCurrency();
  const [open, setOpen] = useState(false);
  const own = stayPrice(stay);
  const perPerson = /^(.*\S)\s+(pp)$/.exec(label);
  const original =
    viewer !== stay.currency && own.kind !== "tbd"
      ? `${stay.currency} ${own.kind === "price" ? plainAmount(own.amount, stay.currency) : `${plainAmount(own.min, stay.currency)}–${plainAmount(own.max, stay.currency)}`}`
      : currencyLabel(viewer);
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-1.5">
        <span className="text-price text-ink">{perPerson ? perPerson[1] : label}</span>
        {perPerson && <span className="text-body text-muted">{perPerson[2]}</span>}
      </p>
      <p className="mt-0.5 text-small text-muted">
        {original} ·{" "}
        <button type="button" onClick={() => setOpen(true)} className="text-ink underline-offset-4 hover:underline">
          {tCurrency("change")}
        </button>
      </p>
      <CurrencySheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** "Free to request · Pay only after the host says yes · Cancellation rules" – one quiet line. */
function WayIn() {
  const tHero = useTranslations("house.page.hero");
  const tPolicy = useTranslations("policy");
  return (
    <p className="text-small text-muted">
      {tHero("wayIn")} ·{" "}
      <Link href="/faq#cancellation" className="underline-offset-4 hover:text-ink hover:underline">
        {tPolicy("link")}
      </Link>
    </p>
  );
}

/**
 * In common, as ONE line with icons (no chips): from your people, people you both lived with, languages, interests, "Responds fast" – three at
 * most. Nothing shared: how many lived with the host, or nothing.
 */
function InCommon({ host, stay }: { host: User; stay: Stay }) {
  const t = useTranslations("house.page.hostFit");
  const tHero = useTranslations("house.page.hero");
  const format = useFormat();
  const store = useStore();
  const locale = useLocale();
  const signal = usePeopleSignal(stay);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const shared = inCommonWith(store, host, store.currentUserId, today);
  const minutes = medianReplyMinutes(host);
  const list = (items: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items.slice(0, 2));
  const people = profileViewFor(store, host, store.currentUserId, today).livedWith.length;
  const items: { key: string; lead: ReactNode; text: string }[] = [
    ...(signal?.role === "host" ? [{ key: "yours", lead: <Users className="size-3.5" aria-hidden />, text: tHero("fromYourPeople") }] : []),
    ...shared.livedWith.map((person) => ({ key: `lived-${person.id}`, lead: <PersonPhoto src={person.photos[0]} alt="" size={16} className="size-4" />, text: t("livedWith", { name: firstName(person) }) })),
    ...(shared.languages.length > 0 ? [{ key: "language", lead: <Languages className="size-3.5" aria-hidden />, text: t("languages", { languages: list(shared.languages) }) }] : []),
    ...(shared.interests.length > 0 ? [{ key: "interest", lead: <Sparkles className="size-3.5" aria-hidden />, text: t("interests", { interests: list(shared.interests.map(format.vibe)) }) }] : []),
    ...(minutes !== null && minutes <= FAST_REPLY_MINUTES ? [{ key: "fast", lead: <Zap className="size-3.5" aria-hidden />, text: tHero("respondsFast") }] : []),
    ...(shared.livedWith.length === 0 && people > 0 ? [{ key: "people", lead: <Users className="size-3.5" aria-hidden />, text: t("people", { count: people, name: firstName(host) }) }] : []),
  ].slice(0, 1);
  if (items.length === 0) return null;
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink">
      {items.map((item, i) => (
        <span key={item.key} className="inline-flex min-w-0 items-center gap-1.5">
          {i > 0 && <span aria-hidden className="mr-0.5 text-muted">·</span>}
          <span className="shrink-0 text-ink/70">{item.lead}</span>
          {item.text}
        </span>
      ))}
    </p>
  );
}

const TILE = "relative flex h-42 min-w-0 flex-col overflow-hidden rounded-[20px] p-5";

/**
 * Host (#E4DDD4): the avatar 48px, the name 20px semibold + Verified; under it the country, muted, and the socials as marks in their own
 * colours (20px, no handle – it's the tooltip); then one thing in common ("Speaks German · English"). The whole tile opens the profile, ↗ top
 * right; no "View profile" text, no capsules.
 */
function HostTile({ host, stay }: { host: User; stay: Stay }) {
  const tTiles = useTranslations("house.page.tiles");
  const format = useFormat();
  const store = useStore();
  return (
    <Link href={`/u/${host.id}`} aria-label={tTiles("profile", { name: firstName(host) })} className={cn(TILE, "group bg-(--tile-host) transition-[filter] duration-150 hover:brightness-[0.98]")}>
      <ArrowUpRight aria-hidden className="absolute right-4 top-4 size-4 text-ink/50 transition-colors group-hover:text-ink" />
      <span className="flex min-w-0 items-center gap-3 pr-6">
        <PersonPhoto src={host.photos[0]} alt="" size={48} className="size-12 shrink-0" />
        <span className="flex min-w-0 items-center gap-1 text-h3 text-ink">
          <span className="truncate">{firstName(host)}</span>
          {host.verified && <VerifiedBadge />}
        </span>
      </span>
      <span className="mt-3 flex min-w-0 items-center gap-2">
        <span className="truncate text-small text-muted">{format.ageAndCountry(host, showsAge(host, store.currentUserId))}</span>
        <SocialLinks user={host} variant="marks" nested />
      </span>
      <span className="mt-auto">
        <InCommon host={host} stay={stay} />
      </span>
    </Link>
  );
}

/**
 * Crew (#EADFD2): "2 spots left" large, "of 4" muted under it (and who waits); at the foot the faces 32px overlapping and an empty circle per
 * free spot (components/CrewRow – "+" for the host and members); "Bring a friend →" bottom right when two or more spots are open.
 */
function CrewTile({ stay, crew, onRequestWithFriend }: { stay: Stay; crew: User[]; onRequestWithFriend?: () => void }) {
  const tTiles = useTranslations("house.page.tiles");
  const store = useStore();
  const faceOf = useCrewFaceOf(stay);
  const shown = crew.filter((member) => faceOf(member) !== "hidden");
  const hidden = crew.length - shown.length;
  const left = Math.max(0, Math.min(openSpots(stay), stay.spotsTotal - crewInOf(store, stay)));
  const waiting = store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "waitlisted").length;
  return (
    <div className={cn(TILE, "bg-(--tile-crew)")}>
      <p className="text-h2 text-ink">{left > 0 ? tTiles("spotsLeft", { count: left }) : tTiles("full")}</p>
      <p className="mt-0.5 text-small text-muted">{waiting > 0 ? tTiles("ofWaitlist", { total: stay.spotsTotal, waiting }) : tTiles("of", { total: stay.spotsTotal })}</p>
      <div className="mt-auto flex items-end justify-between gap-3">
        <CrewRow stay={stay} crew={shown} size="sm" max={6} hiddenCount={hidden} />
        {onRequestWithFriend && left >= 2 && (
          <button type="button" onClick={onRequestWithFriend} data-preview-action className="group inline-flex shrink-0 items-center gap-1 text-small font-semibold text-ink transition-colors hover:text-ink/75">
            {tTiles("bringFriend")}
            <ArrowRight aria-hidden className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Place: the place's photo as the tile's ground (object-cover, config/place-images.ts – the area, else the city), a dark gradient only at its
 * foot, white words: "Around Tonsai" and one link – "Picked together →" (a small sheet with the three steps), "View listing ↗" (the host's own
 * place), "Open in Maps ↗" (booked). Without a photo: #DED6CC with the pin.
 */
function PlaceTile({ stay }: { stay: Stay }) {
  const tTiles = useTranslations("house.page.tiles");
  const tPlace = useTranslations("house.page.place");
  const tWhere = useTranslations("house.page.where2");
  const [how, setHow] = useState(false);
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  const placeId = (stay.location.area && cityPlaceIdOf(stay.location.area)) || cityPlaceIdOf(stay.location.city || stay.city || "");
  const photo = placeId ? placeImageOf(placeId) : null;
  const booked = Boolean(stay.bookingConfirmedAt);
  // The host's own place (booked when opened): its listing; found together: how it's picked.
  const listing = stay.accommodationStatus === "locked" && stay.accommodationLink ? stay.accommodationLink : null;
  const words = photo ? "text-on-image [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]" : "text-ink";
  const link = cn("group inline-flex items-center gap-1 self-start text-small font-semibold transition-opacity hover:opacity-80", words);
  return (
    <div className={cn(TILE, "justify-end", photo ? "bg-band" : "bg-(--tile-place)")}>
      {photo ? (
        <>
          <Img src={photo} alt="" fill sizes="(min-width: 1100px) 320px, 100vw" className="object-cover" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,rgba(20,16,14,0.7),transparent)]" />
        </>
      ) : (
        <MapPin aria-hidden className="absolute left-5 top-5 size-6 text-ink/50" strokeWidth={1.75} />
      )}
      <div className="relative flex flex-col gap-1">
        <p className={cn("text-body-lg font-semibold", words)}>{tWhere("around", { area })}</p>
        {booked ? (
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className={link}>
            {tTiles("openMaps")}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        ) : listing ? (
          <a href={listing} target="_blank" rel="noopener noreferrer" className={link}>
            {tTiles("viewListing")}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        ) : (
          <button type="button" onClick={() => setHow(true)} className={link}>
            {tTiles("pickedTogether")}
            <ArrowRight aria-hidden className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      <Sheet open={how} onClose={() => setHow(false)} title={tPlace("howTitle")}>
        <div className="pb-2">
          <HowPicked title={false} />
        </div>
      </Sheet>
    </div>
  );
}
