"use client";

import { BackButton } from "@/components/ui/BackButton";
import { ArrowRight, Home, Languages, Sparkles, Users, Venus, Zap } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CrewCount, CrewRow } from "@/components/CrewRow";
import { HeroPhotos } from "@/components/HeroBand";
import { SaveButton } from "@/components/ui/SaveButton";
import { ProHostBadge } from "@/components/ui/ProHostLabel";
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
import { useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { usePeopleSignal } from "@/lib/useYourPeople";
import { firstName, housePhotos, openSpots, stayNights, stayPrice } from "@/lib/utils";

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
  /** The whole head: the floating bar comes once it has left the window */
  ref?: Ref<HTMLElement>;
  /** "Request with a friend" – the crew tile's "Bring a friend" link when several spots are open */
  onRequestWithFriend?: () => void;
}

const lineDate = (chunks: ReactNode) => <span className="font-semibold text-ink">{chunks}</span>;
/** A reply this fast (median, minutes) earns "Responds fast". */
const FAST_REPLY_MINUTES = 120;

/**
 * The House page's head as a bento: left a third, the House's photos (swipeable with dots, the heart – no host tab: the host has a tile of
 * their own); right a two-column bento – the main tile in Ember (the one dark accent: the House and its main action), "Host" on the surface
 * and "Crew" on a warm tint. Below 1100px the photo, then the tiles one under the other (phones) or the two small ones side by side.
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
  return (
    // The House as a bento (CLAUDE.md "House-Seite"): in the container (at most 1440px), 32px under the header. Left a third, the photos
    // (radius 24; on wide screens as tall as the bento, phones 4:5); right a two-column bento, gap 16 – the main tile (Ember, the full width:
    // what, when, where, the price and the actions; share and "…" top right), "Host" (surface) and "Crew" (a warm tint).
    <section ref={ref} aria-labelledby="house-title" className="page-container explore-width pt-4">
      <div className="grid gap-4 split:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* The photo as tall as the bento, at most 4:5 (its width is a third of the content less the gap). */}
        <div className="relative aspect-4/5 overflow-hidden rounded-[24px] bg-band split:aspect-auto split:h-full split:max-h-[calc((var(--explore-w)-16px)/3*1.25)] split:min-h-100">
          <HeroPhotos photos={housePhotos(stay, host)} />
          <span className="absolute right-2 top-2 z-10 flex">
            <SaveButton stay={stay} />
          </span>
        </div>
        {/* Host and Crew as tall as their content, top-aligned: the bento ends where its content ends. */}
        <div className="grid min-w-0 content-start items-start gap-4 sm:grid-cols-2">
          {/* The main tile: compact from the top – eyebrow · title 44px (two lines at most) · dates · chips · price 48px · actions · one quiet line. */}
          <div className="ember flex min-w-0 flex-col rounded-[24px] p-6 sm:col-span-2 sm:p-7">
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
            <div className="mt-6 flex flex-col">
              <HeroPrice stay={stay} />
              {notice && <p className="mt-3 text-small text-muted">{notice}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="flex min-w-0 gap-2 *:whitespace-nowrap">{cta}</div>
                {secondary}
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {note && <p className="text-small text-muted">{note}</p>}
                {payBy && <p className="text-small text-muted">{t("payBy", { date: `${format.day(payBy)} ${format.time(payBy)}` })}</p>}
                {openVote(stay, "accommodation") && <p className="text-small text-muted">{t("crewVoting")}</p>}
                {openVote(stay, "dates") && <p className="text-small text-muted">{t("crewVotingDates")}</p>}
                {showSteps && <WayIn />}
              </div>
            </div>
          </div>
          {/* Host: avatar, name, age · country, Pro badge, socials, in common (two at most), "View profile →". */}
          <div className="bg-surface flex min-w-0 flex-col gap-4 rounded-[24px] p-6">
            {host && <HostBlock host={host} stay={stay} />}
            {host && <InCommon host={host} />}
            {host && (
              <Link href={`/u/${host.id}`} className="group mt-auto inline-flex items-center gap-1.5 self-start text-body font-semibold text-ink transition-colors hover:text-ink/75">
                {tHero("viewProfile")}
                <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
          {/* Crew: a warm tint – the faces, empty circles for free spots ("+" only for the host and members), "2 of 3 in · 1 spot left". */}
          <div className="flex min-w-0 flex-col rounded-[24px] bg-(--tile-tint) p-6">
            <CrewBlock stay={stay} crew={crew} />
            {onRequestWithFriend && openSpots(stay) >= 2 && (
              <button type="button" onClick={onRequestWithFriend} data-preview-action className="group mt-4 inline-flex items-center gap-1.5 self-start text-body font-semibold text-ink transition-colors hover:text-ink/75">
                {tHero("bringFriend")}
                <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A small label over a block of the People column. */
function Label({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-eyebrow uppercase text-ink/60">{children}</p>;
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

/** HOST: the avatar 64px, name + check, "29 · Ireland"; "From your people" and "Responds fast" as chips; the socials as cream icon buttons. */
function HostBlock({ host, stay }: { host: User; stay: Stay }) {
  const t = useTranslations("house.page");
  const tHero = useTranslations("house.page.hero");
  const format = useFormat();
  const store = useStore();
  const signal = usePeopleSignal(stay);
  const minutes = medianReplyMinutes(host);
  const fromYourPeople = signal?.role === "host";
  const fast = minutes !== null && minutes <= FAST_REPLY_MINUTES;
  return (
    <div className="min-w-0">
      <Label>{tHero("hostLabel")}</Label>
      <Link href={`/u/${host.id}`} className="flex items-center gap-3 rounded-2xl transition-opacity hover:opacity-85">
        <PersonPhoto src={host.photos[0]} alt="" size={64} className="size-16 shrink-0" />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1 text-body-lg font-semibold text-ink">
            <span className="truncate">{firstName(host)}</span>
            {host.verified && <VerifiedBadge />}
          </span>
          {/* Only pro hosts (a host fee): the outline badge beside the name, with its tooltip. */}
          <ProHostBadge user={host} className="mt-1" />
          <span className="block truncate text-small text-muted">{format.ageAndCountry(host, showsAge(host, store.currentUserId))}</span>
        </span>
      </Link>
      {(fromYourPeople || fast) && (
        <ul className="mt-3 flex flex-wrap gap-2 text-small font-medium">
          {fromYourPeople && (
            <li className="ember-chip">
              <Users aria-hidden className="size-3.5" />
              {tHero("fromYourPeople")}
            </li>
          )}
          {fast && (
            <li className="ember-chip">
              <Zap aria-hidden className="size-3.5" />
              {tHero("respondsFast")}
            </li>
          )}
        </ul>
      )}
      <SocialLinks user={host} variant="full" className="mt-3" />
      <span className="sr-only">{t("hostedByShort", { name: firstName(host) })}</span>
    </div>
  );
}

/** IN COMMON: what you share with the host, the chips one under the other – two at most, the rest as "+N". Nothing shared: not there. */
function InCommon({ host }: { host: User }) {
  const t = useTranslations("house.page.hostFit");
  const tHero = useTranslations("house.page.hero");
  const format = useFormat();
  const store = useStore();
  const locale = useLocale();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const shared = inCommonWith(store, host, store.currentUserId, today);
  const list = (items: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items.slice(0, 2));
  const chips: { key: string; lead: ReactNode; text: string }[] = [
    // People you both lived with first.
    ...shared.livedWith.map((person) => ({ key: `lived-${person.id}`, lead: <PersonPhoto src={person.photos[0]} alt="" size={20} className="size-5" />, text: t("livedWith", { name: firstName(person) }) })),
    ...(shared.languages.length > 0 ? [{ key: "language", lead: <Languages className="size-3.5" aria-hidden />, text: t("languages", { languages: list(shared.languages) }) }] : []),
    ...(shared.interests.length > 0 ? [{ key: "interest", lead: <Sparkles className="size-3.5" aria-hidden />, text: t("interests", { interests: list(shared.interests.map(format.vibe)) }) }] : []),
  ];
  if (chips.length === 0) {
    // Nothing shared: how they reply and whom they lived with, under HOST already – nothing here. Logged out: the same.
    const people = profileViewFor(store, host, store.currentUserId, today).livedWith.length;
    if (people === 0) return null;
    return (
      <div className="min-w-0">
        <Label>{tHero("inCommonLabel")}</Label>
        <span className="ember-chip text-small">
          <Users aria-hidden className="size-3.5" />
          {t("people", { count: people, name: firstName(host) })}
        </span>
      </div>
    );
  }
  const rest = chips.length - 2;
  return (
    <div className="min-w-0">
      <Label>{tHero("inCommonLabel")}</Label>
      <ul className="flex flex-col items-start gap-2 text-small">
        {chips.slice(0, 2).map((chip) => (
          <li key={chip.key} className="ember-chip max-w-full">
            {chip.lead}
            <span className="truncate">{chip.text}</span>
          </li>
        ))}
        {rest > 0 && <li className="ember-chip">+{rest}</li>}
      </ul>
    </div>
  );
}

/** CREW: the host first (with the host dot), the faces, an empty circle per free spot, and "2 of 6 in · 4 spots left" (full: "Full"). */
function CrewBlock({ stay, crew }: { stay: Stay; crew: User[] }) {
  const tHero = useTranslations("house.page.hero");
  const faceOf = useCrewFaceOf(stay);
  const shown = crew.filter((member) => faceOf(member) !== "hidden");
  const hidden = crew.length - shown.length;
  return (
    <div className="min-w-0">
      <Label>{tHero("crewLabel")}</Label>
      {/* components/CrewRow: free spots are "+" circles – the host and members open the invite sheet with them. */}
      <CrewRow stay={stay} crew={shown} size="md" max={7} hiddenCount={hidden} />
      <CrewCount stay={stay} className="mt-2" />
    </div>
  );
}
