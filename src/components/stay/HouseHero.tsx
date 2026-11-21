"use client";

import { FoundingBadge } from "@/components/ui/FoundingBadge";
import { isFoundingHost } from "@/lib/founding";
import { profileHref } from "@/lib/privacy";
import { BackButton } from "@/components/ui/BackButton";
import { ArrowRight, ArrowUpRight, Building2, Home, KeyRound, Languages, Layers, MapPin, Sparkles, Users, Venus, Zap } from "lucide-react";
import { hostLivesHere } from "@/lib/ownPlaces";
import { depthOf } from "@/config/depth";
import { useDepthChoice } from "@/config/platform";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CrewRow } from "@/components/CrewRow";
import { ContextHelp } from "@/components/help/HelpFeedback";
import { HeroBand, HeroPhotos } from "@/components/HeroBand";
import { SaveButton } from "@/components/ui/SaveButton";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
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
import { stageMoodStyle, tileShade } from "@/lib/stageTint";
import { cn, firstName, googleMapsUrl, housePhotos, openSpots, stayNights, stayPrice } from "@/lib/utils";
import { Img } from "@/components/ui/Img";
import { Sheet } from "@/components/ui/Sheet";
import { placeImageOf } from "@/config/place-images";
import { cityPlaceIdOf } from "@/lib/data/places";
import { HowPicked } from "./HouseSections";
import { MEDIA } from "@/config/breakpoints";

interface HouseHeroProps {
  stay: Stay;
  /** The host's view: "Need help with this House?" under the facts (help in context) */
  showHelp?: boolean;
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
export function HouseHero({ stay, host, crew, cta, secondary, actions, stage, showSteps, note, notice, ref, onRequestWithFriend, showHelp = false }: HouseHeroProps) {
  const tHelp = useTranslations("help");
  const tBack = useTranslations("common");
  const t = useTranslations("house.page");
  const tHero = useTranslations("house.page.hero");
  const tDuties = useTranslations("hostDuties");
  const depthOn = useDepthChoice();
  const tDepth = useTranslations("depth.capsule");
  const tPlatform = useTranslations("platform");
  const format = useFormat();
  const languages = [...new Set([stay.language, ...(stay.languages ?? [])].filter(Boolean).map(format.language))].slice(0, 3);
  const booked = stay.accommodationStatus === "locked";
  const women = stay.who === "women" || stay.audience === "women";
  const payBy = stage === "payment_due" && stay.paymentDueAt;
  // Where, short: "Roma Norte, Mexico City" (the area and the city), else the city – never the country.
  const city = stay.location.city || stay.city || stay.region.split(",")[0];
  const placeShort = stay.location.area ? `${stay.location.area}, ${city}` : city;
  const strip = (
    // Phones and tablets (< 1100px): the booking bar – fixed at the bottom instead of the tab bar (which the House page leaves out), over the safe area; its measured
    // height is what the page keeps free under its end (--house-bar-h → --tabbar-clear, BookingBarHeight).
    <div ref={ref as Ref<HTMLDivElement>} data-house-strip className="ember ember-strip band-inset band-inset-full max-split:fixed max-split:inset-x-0 max-split:bottom-0 max-split:z-30 max-split:px-(--page-margin) max-split:pb-[calc(12px+var(--safe-bottom))] max-split:pt-3 flex shrink-0 flex-col justify-center gap-2 split:h-(--stage-bar-h) split:py-0">
      <BookingBarHeight />
      {/* Left: the price in the strip's number size (--stage-bar-num), under it small the currency and the way in ("Free to request · …").
          Right: the actions – Request to join · Request with a friend · "Message {host}". */}
      <div className="flex items-center justify-between gap-x-6 gap-y-3 md:flex-wrap">
        <div className="min-w-0">
          <HeroPrice stay={stay} />
          {/* Phones: under the price the dates (the currency line is the md+ strip's). */}
          <p className="mt-0.5 truncate text-small text-muted md:hidden">{format.stayDates(stay)}</p>
          <div className="mt-1 flex flex-col gap-0.5 max-md:hidden">
            {note && <p className="text-small text-muted">{note}</p>}
            {payBy && <p className="text-small text-muted">{t("payBy", { date: `${format.day(payBy)} ${format.time(payBy)}` })}</p>}
            {openVote(stay, "accommodation") && <p className="text-small text-muted">{t("crewVoting")}</p>}
            {openVote(stay, "dates") && <p className="text-small text-muted">{t("crewVotingDates")}</p>}
            {showSteps && <WayIn />}
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2">
          {notice && <p className="text-small text-muted max-md:hidden">{notice}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex min-w-0 gap-2 *:whitespace-nowrap">{cta}</div>
            <div className="flex gap-2 *:whitespace-nowrap max-md:hidden">{secondary}</div>
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <HeroBand
      aria-labelledby="house-title"
      // The stage rule (globals.css --stage-image-h), like Your houses: the photo and the right side in one row of that height, whatever the
      // content (the same photo width and band tone #EAE4DD); the dark action strip (--stage-bar-h) across the full width under both.
      fullStrip
      mediaFit="house"
      // The light warm cream, no photo tint – the cards carry the colour; one spacing (--stage-pad) to the photo, the right edge, on top,
      // between the cards and to the strip.
      stagePad
      stageClassName="stage-cream stage-mood"
      style={stageMoodStyle(housePhotos(stay, host)[0])}
      height="split:h-(--stage-image-h)"
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
      {/* Descenders (g, y, p) are never cut: no line-clamp (it hides the overflow), line-height 1.1 (the token), 0.1em under the last line. */}
      <h1 id="house-title" className="mt-2 pb-[0.1em] text-hero text-ink [text-wrap:balance]">
        {stay.title}
      </h1>
      {/* One line: the dates, the nights and where – the area and the city, no country. */}
      <p className="mt-3 text-h3 font-normal text-muted md:truncate">
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
        {/* A business host (Settings › Payments & payouts): guests see who they book with – CLAUDE.md "Plattform-Pflichten". */}
        {host?.hostBusiness?.kind === "business" && (
          <li className="ember-chip" data-hosted-by-business>
            <Building2 aria-hidden className="size-3.5" />
            {tDuties("hostedByBusiness")}
          </li>
        )}
        {/* "Host from your place": the host lives here and is one of the crew (lib/ownPlaces.ts). */}
        {hostLivesHere(stay) && (
          <li className="ember-chip">
            <KeyRound aria-hidden className="size-3.5" />
            {tPlatform("ownPlace.capsule")}
          </li>
        )}
        {/* The social depth (config/depth.ts) – every level here, it's one of the facts; only while the choice is on. */}
        {depthOn && (
          <li className="ember-chip">
            <Layers aria-hidden className="size-3.5" />
            {tDepth(depthOf(stay, depthOn))}
          </li>
        )}
      </ul>
      {/* Between the facts on top and the cards at the foot: the first sentence of "Why I'm hosting" as a quote – large, in quotation marks, two
          lines at most, the host's name small under it. Without a text (or without room: a low window) the air stays. */}
      <HostQuote stay={stay} host={host} />
      {/* The facts as a bento at the foot, --stage-pad over the strip: three equal cards with colours that mean something – Host blue (trust,
          a person), Spots the action orange (join in), Place a photo of the surroundings –, the same height (~168px), 20px inside, each
          clickable as a whole. */}
      {/* Tablet: two columns, the third tile across both (3 in a row would squeeze the words). */}
      <div className="grid gap-3 sm:grid-cols-3 md:max-split:grid-cols-2 md:max-split:[&>*:last-child]:col-span-2">
        {/* An example House (pre-launch, beta): no host and no crew – a neutral host card, empty circles. */}
        {stay.isExample ? <ExampleHostTile /> : host && <HostTile host={host} stay={stay} />}
        {stay.isExample ? <ExampleCrewTile stay={stay} /> : <CrewTile stay={stay} crew={crew} cta={cta} onRequestWithFriend={onRequestWithFriend} />}
        <PlaceTile stay={stay} host={host} />
      </div>
      {showHelp && <ContextHelp houseId={stay.id} action={tHelp("houseHelp")} className="mt-4" />}
    </HeroBand>
  );
}


/** Longer first sentences don't fit three lines – the House's short line instead (measured over the mock Houses). */
const QUOTE_MAX = 150;
/** The quote's sizes, largest first (of text-stage-quote), and the air it keeps above and below in the stage's middle. */
const QUOTE_STEPS = [1, 0.9, 0.8, 0.7];
const QUOTE_AIR = 16;

/** The first sentence of a text ("Why I'm hosting"): up to the first . ! or ? followed by a space or the end. */
const firstSentence = (text: string) => (text.trim().match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0] ?? text.trim());

/**
 * The stage's centre: the host's voice – the first sentence of "Why I'm hosting" (too long, or none: the House's short line, its tagline),
 * in quotation marks, large (text-stage-quote, 36–40px), three lines at most, left on the title's edge, vertically in the middle of the room
 * between the facts and the tiles; "{Host}, host" small under it. Nothing to say, or no room for all of it (a low window – measured, never
 * cut): the middle stays empty.
 */
function HostQuote({ stay, host }: { stay: Stay; host?: User }) {
  const t = useTranslations("house.page.hero");
  const sentence = stay.isExample ? "" : firstSentence(stay.whyText ?? "");
  const text = sentence && sentence.length <= QUOTE_MAX ? sentence : stay.isExample ? "" : (stay.hostNote ?? "").trim();
  const slotRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const slot = slotRef.current;
    const fig = figRef.current;
    if (!slot || !fig) return;
    // The largest step (40 → 36 → 32 → 28px at 1440) that leaves at least 16px of air above and below; none does: the middle stays empty.
    const measure = () => {
      // Below Desktop the quote stands in the flow (nothing to fit into): always shown, a smaller step.
      if (!window.matchMedia(MEDIA.desktop).matches) {
        fig.style.setProperty("--quote-scale", "0.75");
        return setFits(true);
      }
      for (const scale of QUOTE_STEPS) {
        fig.style.setProperty("--quote-scale", String(scale));
        if (fig.offsetHeight + 2 * QUOTE_AIR <= slot.clientHeight) return setFits(true);
      }
      setFits(false);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [text]);
  return (
    <div ref={slotRef} className="relative min-h-6 split:min-h-0 split:flex-1">
      {text && host && (
        <figure ref={figRef} aria-hidden={!fits || undefined} className={cn("py-6 split:absolute split:inset-x-0 split:top-1/2 split:-translate-y-1/2 split:py-0", !fits && "invisible")}>
          {/* The measure in the quote's own size: about 46 characters a line – most first sentences take two lines. */}
          <blockquote className="max-w-[46ch] text-stage-quote text-ink [font-size:calc(var(--text-stage-quote)*var(--quote-scale,1))]">{t("quote", { text })}</blockquote>
          <figcaption className="mt-2 text-small text-muted">{t("quoteBy", { name: firstName(host) })}</figcaption>
        </figure>
      )}
    </div>
  );
}

/** A text link in the dark strip: 70 % → 100 % on hover, underlined then, 150ms; a visible ring for the keyboard. */
const STRIP_LINK = "rounded-sm text-ink/70 underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

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
        <span className="text-bar-num tabular-nums text-ink">{perPerson ? perPerson[1] : label}</span>
        {perPerson && <span className="text-bar-label text-ink/60">{perPerson[2]}</span>}
      </p>
      <p className="mt-0.5 text-small text-muted max-md:hidden">
        {original} ·{" "}
        <button type="button" onClick={() => setOpen(true)} className={STRIP_LINK}>
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
      <Link href="/help#cancellation" className={STRIP_LINK}>
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

/** The three tiles: the same height (a little taller than before – 168 to 200px with the window), radius 20, 20px inside; one look (.stage-tile:
 *  a light edge on top, a soft shadow, 2px up on hover – tokens.css). */
const TILE = "stage-tile flex h-[clamp(168px,22vh,200px)] min-w-0 flex-col p-5 text-left";
/** Every tile is clickable as a whole: the pointer and a visible ring for the keyboard. */
const CARD_ACTION = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--focus-ring)";


/**
 * Host: the host's photo filling the tile (object-cover, the face at the top), under the words a run of the photo's own dark colour
 * (tileShade – 4.5 : 1 for white even over a white photo); white words: name + Verified, "{age} · {country}", one thing in common, the socials
 * white. Without a photo the muted petrol → indigo (.card-host). The whole tile opens the profile, ↗ top right.
 */
function HostTile({ host, stay }: { host: User; stay: Stay }) {
  const tTiles = useTranslations("house.page.tiles");
  const format = useFormat();
  const store = useStore();
  const photo = host.photos[0];
  return (
    <Link
      href={profileHref(host.id)}
      aria-label={tTiles("profile", { name: firstName(host) })}
      style={photo ? ({ "--tile-shade": tileShade(photo) } as CSSProperties) : undefined}
      className={cn(TILE, CARD_ACTION, "group", photo ? "tile-photo" : "card-host")}
    >
      {photo && (
        <>
          <Img src={photo} alt="" fill sizes={`${MEDIA.desktop} 360px, 100vw`} className="object-cover object-[center_22%]" />
          <span aria-hidden className="tile-photo-shade absolute inset-0" />
        </>
      )}
      <ArrowUpRight aria-hidden className="absolute right-4 top-4 size-4 text-ink/80 transition-colors group-hover:text-ink" />
      <span className="relative mt-auto flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1 text-h3 text-ink">
          <span className="truncate">{firstName(host)}</span>
          {host.verified && <VerifiedBadge />}
        </span>
        {isFoundingHost(host) && <FoundingBadge label className="text-ink" />}
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-small text-muted">{format.ageAndCountry(host, showsAge(host, store.currentUserId))}</span>
          <SocialLinks user={host} variant="icons" tone="dark" nested />
        </span>
        <InCommon host={host} stay={stay} />
      </span>
    </Link>
  );
}

/** An example's host card: "Example House", no face, no name, no link. */
function ExampleHostTile() {
  const t = useTranslations("platform.example");
  return (
    <div className={cn(TILE, "card-host")}>
      <span className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-ink/25 text-muted">
          <Home className="size-5" strokeWidth={1.75} />
        </span>
        <span className="text-h3 text-ink">{t("house")}</span>
      </span>
      <span className="mt-auto text-small text-muted">{t("noProfile")}</span>
    </div>
  );
}

/** An example's crew card: "Up to 5 people", the circles all empty. */
function ExampleCrewTile({ stay }: { stay: Stay }) {
  const t = useTranslations("platform.example");
  return (
    <div className={cn(TILE, "card-spots")}>
      <p className="text-h2 text-ink">{t("upTo", { count: stay.spotsTotal })}</p>
      <ul aria-hidden className="mt-auto flex -space-x-1">
        {Array.from({ length: Math.min(stay.spotsTotal, 8) }, (_, i) => (
          <li key={i} className="size-8 rounded-full border-[1.5px] border-dashed border-ink/60" />
        ))}
      </ul>
    </div>
  );
}

/**
 * Spots (the action orange – join in: .card-spots, white words): "2 spots left" large, "of 4" under it (and who waits); at the foot the faces
 * and an empty circle per free spot (components/CrewRow). The whole card opens "Who's in" – the crew with their names and the main action
 * (Request to join …). "Bring a friend" is its own light button in the card (its click doesn't open the window).
 */
function CrewTile({ stay, crew, cta, onRequestWithFriend }: { stay: Stay; crew: User[]; cta?: ReactNode; onRequestWithFriend?: () => void }) {
  const tTiles = useTranslations("house.page.tiles");
  const store = useStore();
  const faceOf = useCrewFaceOf(stay);
  const [open, setOpen] = useState(false);
  const shown = crew.filter((member) => faceOf(member) !== "hidden");
  const hidden = crew.length - shown.length;
  const left = Math.max(0, Math.min(openSpots(stay), stay.spotsTotal - crewInOf(store, stay)));
  const waiting = store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "waitlisted").length;
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={tTiles("whosIn")}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(TILE, CARD_ACTION, "card-spots")}
      >
        <p className="text-h2 text-ink">
          {left > 0
            ? tTiles("spotsLeft", { count: left })
            : tTiles("full")}
        </p>
        <p className="mt-0.5 text-small text-muted">{waiting > 0 ? tTiles("ofWaitlist", { total: stay.spotsTotal, waiting }) : tTiles("of", { total: stay.spotsTotal })}</p>
        <div className="mt-auto flex items-end justify-between gap-3">
          <CrewRow stay={stay} crew={shown} size="sm" max={4} hiddenCount={hidden} className="min-w-0 flex-nowrap" />
          {onRequestWithFriend && left >= 2 && (
            <button
              type="button"
              onClick={(e) => {
                // Its own action – the card's window doesn't open.
                e.stopPropagation();
                onRequestWithFriend();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              data-preview-action
              className="group inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-stage px-3 text-small font-semibold text-on-image transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stage"
            >
              {tTiles("bringFriend")}
              <ArrowRight aria-hidden className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
      {/* "Who's in": the crew with their names, the count, and the main action. */}
      <Sheet open={open} onClose={() => setOpen(false)} title={tTiles("whosIn")}>
        <div className="flex flex-col gap-6 pb-2">
          <CrewRow stay={stay} crew={shown} size="lg" names hiddenCount={hidden} />
          <p className="text-body text-muted">{left > 0 ? tTiles("spotsLeft", { count: left }) : tTiles("full")} · {tTiles("of", { total: stay.spotsTotal })}</p>
          {cta && <div className="flex flex-wrap gap-2 *:whitespace-nowrap">{cta}</div>}
        </div>
      </Sheet>
    </>
  );
}

/**
 * Place (places show photos): a photo of the surroundings as the card's ground – the House's second photo, else the place's own (config/
 * place-images.ts) – with a dark run from the bottom, white words "Around Tonsai" and what the card does; without a photo the deeper blue.
 * The whole card: "Open in Maps ↗" (booked), "View listing ↗" (the host's own place), else "Picked together →" (a small window).
 */
function PlaceTile({ stay, host }: { stay: Stay; host?: User }) {
  const tTiles = useTranslations("house.page.tiles");
  const tPlace = useTranslations("house.page.place");
  const tWhere = useTranslations("house.page.where2");
  const [how, setHow] = useState(false);
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  const booked = Boolean(stay.bookingConfirmedAt);
  // The host's own place (booked when opened): its listing; found together: how it's picked.
  const listing = stay.accommodationStatus === "locked" && stay.accommodationLink ? stay.accommodationLink : null;
  const placeId = (stay.location.area && cityPlaceIdOf(stay.location.area)) || cityPlaceIdOf(stay.location.city || stay.city || "");
  const photo = housePhotos(stay, host)[1] ?? (placeId ? placeImageOf(placeId) : null);
  // Under the words a run of the photo's own dark colour (tileShade – 4.5 : 1 for white even over a white photo).
  const shade = photo ? ({ "--tile-shade": tileShade(photo) } as CSSProperties) : undefined;
  const body = (label: string, external: boolean) => (
    <>
      {photo ? (
        <>
          <Img src={photo} alt="" fill sizes={`${MEDIA.desktop} 360px, 100vw`} className="object-cover" />
          <span aria-hidden className="tile-photo-shade absolute inset-0" />
        </>
      ) : (
        <MapPin aria-hidden className="absolute left-5 top-5 size-6 text-muted" strokeWidth={1.75} />
      )}
      <span className="relative mt-auto flex flex-col gap-1">
        <span className="text-body-lg font-semibold text-ink">{tWhere("around", { area })}</span>
        <span className="group inline-flex items-center gap-1 text-small font-semibold text-ink">
          {label}
          {external ? <ArrowUpRight aria-hidden className="size-3.5" /> : <ArrowRight aria-hidden className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />}
        </span>
      </span>
    </>
  );
  const className = cn(TILE, CARD_ACTION, photo ? "tile-photo" : "card-place");
  if (booked || listing)
    return (
      <a href={booked ? googleMapsUrl(stay) : listing!} target="_blank" rel="noopener noreferrer" style={shade} className={className}>
        {body(booked ? tTiles("openMaps") : tTiles("viewListing"), true)}
      </a>
    );
  return (
    <>
      <button type="button" onClick={() => setHow(true)} aria-haspopup="dialog" style={shade} className={className}>
        {body(tTiles("pickedTogether"), false)}
      </button>
      <Sheet open={how} onClose={() => setHow(false)} title={tPlace("howTitle")}>
        <div className="pb-2">
          <HowPicked title={false} />
        </div>
      </Sheet>
    </>
  );
}

/**
 * Phones: how tall the booking bar is (with the safe area under it) – written to --house-bar-h on <html>, which html[data-house-bar]
 * turns into --tabbar-clear: the footer, toasts and the Dev button keep clear of it. Measured live (one or two
 * lines, a notice).
 */
function BookingBarHeight() {
  const probe = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const bar = probe.current?.parentElement;
    if (!bar) return;
    const root = document.documentElement;
    const write = () => root.style.setProperty("--house-bar-h", `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    write();
    // While it's there the tab bar steps aside on phones (html[data-house-bar], globals.css): the booking bar takes its place.
    root.setAttribute("data-house-bar", "");
    const observer = new ResizeObserver(write);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--house-bar-h");
      root.removeAttribute("data-house-bar");
    };
  }, []);
  return <span ref={probe} aria-hidden className="hidden" />;
}
