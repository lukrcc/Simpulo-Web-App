"use client";

import { ArrowLeft, ArrowUpRight, Check, Lightbulb, Plus, UserPlus, Vote } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EXPLORE_SPACING } from "@/config/explore";
import { Fragment, useEffect, useState, type ReactNode, type RefObject } from "react";
import { Shelf } from "@/components/ui/Shelf";
import { HouseCard } from "@/components/HouseCard";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { useCrewFaceOf } from "@/components/ui/useCrewFaces";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { useViewerAmount, useViewerPriceLabel } from "@/components/ui/PriceLine";
import { RowHead } from "@/components/ui/CardRow";
import { useFormat } from "@/i18n/format";
import { isListedStay } from "@/lib/launch";
import { convertApprox } from "@/lib/rates";
import { findUser, getCrew, isBlocked, isCrewMember, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, firstName, googleMapsUrl, isCityOpen, mapQuery, openSpots, typicalDayOf } from "@/lib/utils";
import { previewForUrl } from "@/lib/data";
import { platformOf } from "@/lib/platforms";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { ListingInfo } from "./AccommodationTile";
import { HouseMap } from "./HouseMap";

/** Under a section's eyebrow in the page's left column. */
const ROW = "mt-4";
const MAX_MORE_HOUSES = 12;


/** Why I'm hosting: the host's own words. */
export function HouseWhy({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const quote = stay.whyText.trim();
  if (!quote) return null;
  return (
    <section aria-labelledby="house-why">
      <RowHead id="house-why" title={t("why")} />
      <blockquote className={cn(ROW, "max-w-[64ch] whitespace-pre-line text-row font-medium text-ink")}>{quote}</blockquote>
    </section>
  );
}

/**
 * The crew as a row of faces (72px): the host first with a "Host" capsule, then the members, then one dashed circle per open spot – exactly
 * crewSize (host included) − people in. Someone in the crew invites through a circle (a link that holds the spot for 48h); someone who could
 * join asks for it there. Under them the waitlist, when there is one: mini faces and how many – your own place if you're on it.
 */
export function HouseCrew({ stay, crew, waitlist, myWaitlist, canJoin, onJoin, onInvite }: { stay: Stay; crew: User[]; /** The accepted waitlist, in order */ waitlist: User[]; /** The viewer's own place (#2), or that their request is open */ myWaitlist?: { position: number } | { requested: true }; canJoin: boolean; onJoin: () => void; /** In the crew, and the House is open */ onInvite?: () => void }) {
  const t = useTranslations("house.page");
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const person = "flex w-18 flex-col items-center text-center";
  const action = onInvite ?? (canJoin ? onJoin : undefined);
  const restLabel = canJoin ? t("yourSpot") : t("openSpot");
  const spot = "flex size-14 items-center justify-center rounded-full border-[1.5px] border-dashed border-ink/25 text-ink";
  // As the viewer may see each (config/privacy.ts): hidden ones collapse into one neutral "+N", blurred ones have no name and no link.
  const faceOf = useCrewFaceOf(stay);
  const hiddenCount = crew.filter((member) => faceOf(member) === "hidden").length;
  // Spots held by an invite from Open a House (48h): "Reserved for Anna" – the name only for the host and the crew, else "Reserved".
  const reserved = store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "invited");
  const insider = store.currentUserId !== null && isCrewMember(store, stay, store.currentUserId);
  return (
    <section aria-labelledby="house-crew">
      <RowHead id="house-crew" title={t("crew")} />
      <ul className={cn(ROW, "flex flex-wrap gap-x-4 gap-y-5")}>
        {crew.map((member) => {
          const mode = faceOf(member);
          if (mode === "hidden") return null;
          if (mode === "blurred") {
            return (
              <li key={member.id}>
                <div className={person}>
                  <Avatar user={member} size="lg" mode="blurred" />
                </div>
              </li>
            );
          }
          return (
            <li key={member.id}>
              <Link href={`/u/${member.id}`} className={person}>
                <span className="relative">
                  <Avatar user={member} size="lg" />
                  {member.id === stay.hostId && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-(--select-bg) px-2 py-px text-small text-ink shadow-(--select-shadow)">{t("hostBadge")}</span>
                  )}
                </span>
                <span className="mt-2 max-w-full truncate text-small font-semibold text-ink">{firstName(member)}</span>
              </Link>
            </li>
          );
        })}
        {hiddenCount > 0 && (
          <li>
            <div className={person} aria-label={t("crewHidden", { count: hiddenCount })}>
              <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-ink/6 text-body font-semibold text-muted">
                +{hiddenCount}
              </span>
            </div>
          </li>
        )}
        {reserved.map((r) => {
          const guest = insider ? findUser(store, r.userId) : undefined;
          return (
            <li key={r.id}>
              <div className={person} aria-label={guest ? t("reservedFor", { name: firstName(guest) }) : t("reserved")}>
                <span aria-hidden className={cn(spot, "overflow-hidden p-1")}>
                  {guest && <Avatar user={guest} size="lg" className="opacity-55" />}
                </span>
                <span className="mt-2.5 line-clamp-2 max-w-full text-small text-muted">{guest ? t("reservedFor", { name: firstName(guest) }) : t("reserved")}</span>
              </div>
            </li>
          );
        })}
        {Array.from({ length: openSpots(stay) }, (_, i) => (
          <li key={i}>
            {action ? (
              <button type="button" onClick={action} data-preview-action aria-label={onInvite ? t("spotInvite") : undefined} className={cn(person, "group/spot")}>
                <span aria-hidden className={cn(spot, "transition-colors duration-150 group-hover/spot:border-transparent group-hover/spot:bg-(--chip-bg) group-focus-visible/spot:border-transparent group-focus-visible/spot:bg-(--chip-bg)")}>
                  {/* Host and members: "+" (invite); visitors: an empty circle, "Your spot". */}
                  {onInvite && <Plus className="size-5 text-ink/55" />}
                </span>
                {onInvite ? (
                  <span className="mt-2 max-w-full truncate text-small font-semibold text-muted group-hover/spot:text-ink">{t("spotInviteShort")}</span>
                ) : (
                  <span className="mt-2 max-w-full truncate text-small font-semibold text-muted group-hover/spot:text-ink">{restLabel}</span>
                )}
              </button>
            ) : (
              <div className={person}>
                <span aria-hidden className={spot} />
                <span className="mt-2 max-w-full truncate text-small font-semibold text-muted">{restLabel}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {(waitlist.length > 0 || myWaitlist) && (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-muted">
          {waitlist.length > 0 && (
            <span className="flex items-center gap-2">
              <AvatarStack users={waitlist} size="mini" max={4} linked faceOf={faceOf} />
              <span>{t("onWaitlist", { count: waitlist.length })}</span>
            </span>
          )}
          {myWaitlist && (
            <span className="font-semibold text-ink">
              {"position" in myWaitlist ? t("yourWaitlistPlace", { position: myWaitlist.position }) : t("yourWaitlistRequest", { name: host ? firstName(host) : "" })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/** A typical day as a list: the time on the left, what happens on the right. */
export function HouseDay({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const stops = typicalDayOf(stay);
  if (stops.length === 0) return null;
  return (
    <section aria-labelledby="house-day">
      <RowHead id="house-day" title={t("day")} />
      <dl className={cn(ROW, "grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2")}>
        {stops.map((stop) => (
          <Fragment key={`${stop.time}-${stop.label}`}>
            <dt className="text-small text-muted">{stop.time}</dt>
            <dd className="text-body text-ink">{stop.label}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

/** Who I'm looking for, then House rules: two short blocks, no cards. */
/** Who I'm looking for (and the crew's age), in the left column. Text at most 64 characters a line. */
export function HouseLooking({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const tFacts = useTranslations("house.facts");
  const looking = stay.lookingForText.trim();
  if (!looking && !stay.ageRange) return null;
  return (
    <section aria-labelledby="house-looking">
      <RowHead id="house-looking" title={t("lookingFor")} />
      {looking && <p className={cn(ROW, "max-w-[64ch] whitespace-pre-line text-body text-ink")}>{looking}</p>}
      {stay.ageRange && <p className="mt-3 text-small text-muted">{tFacts("ageRange", { min: stay.ageRange.min, max: stay.ageRange.max })}</p>}
    </section>
  );
}

/** House rules, in the right column: a check each. */
export function HouseRules({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  if (stay.houseRules.length === 0) return null;
  return (
    <section aria-labelledby="house-rules">
      <RowHead id="house-rules" title={t("rules")} />
      <ul className={cn(ROW, "space-y-2")}>
        {stay.houseRules.map((rule) => (
          <li key={rule} className="flex gap-2 text-body text-ink">
            <Check className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the host fee pays for (only with one): a checklist, the fee in the viewer's currency. */
export function HouseOffer({ stay }: { stay: Stay }) {
  const t = useTranslations("growth.premium");
  const format = useFormat();
  const currency = usePreferredCurrency() ?? "EUR";
  if (!stay.hostFeePerPerson || !stay.hostOffer?.length) return null;
  const fee = format.price(convertApprox(stay.hostFeePerPerson, stay.currency, currency), currency);
  return (
    <section aria-labelledby="house-offer">
      <RowHead id="house-offer" title={t("offerTitle")} aside={<span className="text-small text-muted">{`${fee} ${t("perPerson")}`}</span>} />
      <ul className={cn(ROW, "space-y-2")}>
        {stay.hostOffer.map((item) => (
          <li key={item} className="flex gap-2 text-body text-ink">
            <Check className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Where you'll be – the place as a full-width strip: the map over the whole window, 440px high, no rounding; the approximate circle stays,
 * nothing written on it. On it, on the page's grid at the left, a glass field (rgba(251,247,242,.82) + blur 16, radius 20, 360px): "Around
 * Roma Norte", then – picking together – the shortlist or the three steps, or – booked – the listing, and at the bottom "Open in Google Maps ↗"
 * (ink, cream text). The map behind it opens Google Maps too.
 */
export function HouseWhere({ stay }: { stay: Stay; canOpenChat?: boolean }) {
  const t = useTranslations("house.page");
  const tWhere = useTranslations("house.page.where2");
  const tMap = useTranslations("house.map");
  const format = useFormat();
  const { query, zoom } = mapQuery(stay);
  const booked = stay.accommodationStatus === "locked" && Boolean(stay.accommodationLink);
  const hasCoordinates = !isCityOpen(stay) && Boolean(stay.lat || stay.lng);
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  const candidates = (stay.accommodationVote?.options ?? []).filter((o) => o.link).slice(0, 3);
  return (
    <section aria-labelledby="house-where" className="relative mt-14 h-110 overflow-hidden bg-line">
      <h2 id="house-where" className="sr-only">
        {t("where")}
      </h2>
      <HouseMap lat={stay.lat} lng={stay.lng} pin={false} radius={booked ? BOOKED_RADIUS_M : undefined} query={query} hasCoordinates={hasCoordinates} zoom={Math.max(zoom - (booked ? 1 : 3), 2)} title={tMap("mapOf", { place: format.placeLabel(stay) })} />
      <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="absolute inset-0 z-10" />
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="page-container explore-width flex h-full items-center">
          <div className="pointer-events-auto flex max-h-[calc(100%-48px)] w-full max-w-90 flex-col gap-4 overflow-y-auto rounded-[20px] border border-(--glass-solid)/60 bg-(--glass-bg) p-5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-[16px]">
            <div>
              <p className="text-eyebrow uppercase text-ink/55">{t("where")}</p>
              <p className="mt-1 text-h3 text-ink">{tWhere("around", { area })}</p>
            </div>
            {booked ? <ListingInfo stay={stay} link={stay.accommodationLink!} /> : candidates.length > 0 ? <Shortlist stay={stay} options={candidates} /> : <HowPicked />}
            {booked && <p className="text-small text-muted">{tWhere("exactAfter")}</p>}
            <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className="press inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-(--action-bg) px-5 text-body font-semibold text-(--action-text) transition-colors hover:bg-(--action-hover)">
              {tMap("openInMaps")}
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowPicked() {
  const tWhere = useTranslations("house.page.where2");
  const steps = [
    { key: "join", icon: UserPlus },
    { key: "suggest", icon: Lightbulb },
    { key: "vote", icon: Vote },
  ] as const;
  return (
    <div className="flex flex-col">
      <p className="text-body font-semibold text-ink">{tWhere("howTitle")}</p>
      <ol className="mt-3 flex flex-col gap-3">
        {steps.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3 text-body text-ink">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink/70">
              <Icon className="size-4" />
            </span>
            {tWhere(`howSteps.${key}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A booked place's circle: about 500m – the area, never the address. */
const BOOKED_RADIUS_M = 500;

/** Picking together: the candidates so far, each a row – photo, title, price per person, the listing in a new tab. */
function Shortlist({ stay, options }: { stay: Stay; options: { id: string; link?: string; pricePerPerson?: number }[] }) {
  const tWhere = useTranslations("house.page.where2");
  return (
    <div className="-mx-2 flex flex-col">
      <p className="px-2 pb-1 text-eyebrow uppercase text-ink/55">{tWhere("shortlist")}</p>
      <ul className="flex flex-col gap-1">
        {options.map((option, i) => (
          <li key={option.id}>
            <ShortlistRow stay={stay} link={option.link!} price={option.pricePerPerson} index={i + 1} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShortlistRow({ stay, link, price, index }: { stay: Stay; link: string; price?: number; index: number }) {
  const tWhere = useTranslations("house.page.where2");
  const amount = useViewerAmount();
  const preview = previewForUrl(link, tWhere("option", { index }));
  const platform = platformOf(link);
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl p-2 transition-colors duration-150 hover:bg-(--chip-bg-hover)">
      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-ink/6">
        {preview.imageUrl && <Img src={preview.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-ink">{preview.title}</span>
        <span className="block truncate text-small text-muted">
          {platform.name}
          {price ? ` · ${tWhere("perPerson", { price: amount(price, stay.currency) })}` : ""}
        </span>
      </span>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
    </a>
  );
}

/** More Houses of the same category or in the same city: the same place first. */
export function HouseMore({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const store = useStore();
  const score = (s: Stay) => Number(s.vibe === stay.vibe) + Number(s.city === stay.city);
  const more = store.stays
    .filter((s) => s.id !== stay.id && isListedStay(s) && score(s) > 0 && !isBlocked(store, s.hostId))
    .toSorted((a, b) => score(b) - score(a) || a.startDate.localeCompare(b.startDate))
    .slice(0, MAX_MORE_HOUSES);
  if (more.length === 0) return null;
  return (
    // The same row as Explore's shelves (Shelf flat, a card exactly one grid column wide – .explore-slide), arrows as there.
    <section aria-labelledby="house-more" className="explore-root mt-14">
      <RowHead id="house-more" title={t("more")} />
      <Shelf variant="flat" top={EXPLORE_SPACING.headContent}>
        {more.map((s) => (
          <div key={s.id} className="explore-slide shrink-0">
            <HouseCard stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} />
          </div>
        ))}
      </Shelf>
    </section>
  );
}

/** Beside the title: "…"; on phones the way back too. The heart is on the card. */
export function HouseActions({ menu, share, onBack }: { menu?: ReactNode; /** Share (36px, like "…"), before the menu – as in the profile's head */ share?: ReactNode; /** Phones: the way back (no header there) */ onBack: () => void }) {
  const t = useTranslations("house.page");
  return (
    <div className="flex shrink-0 items-center gap-2">
      <IconButton onClick={onBack} aria-label={t("back")} className="md:hidden">
        <ArrowLeft className="size-5" aria-hidden />
      </IconButton>
      {share}
      {menu}
    </div>
  );
}

/** At the top of the request: what you're asking to join, in one glance. */
export function RequestSummary({ stay, photo }: { stay: Stay; photo?: string }) {
  const format = useFormat();
  const price = useViewerPriceLabel(stay);
  return (
    <div className="flex items-center gap-3">
      {photo && (
        <span className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-ink/5">
          <Img src={photo} alt="" fill sizes="56px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-body font-semibold text-ink">{stay.title}</p>
        <p className="truncate text-small text-muted">{`${format.stayDates(stay)} · ${stay.city} · ${price}`}</p>
      </div>
    </div>
  );
}

/**
 * The floating Join capsule – light glass (rgba(251,247,242,0.72) + blur 20px, a 1px ink 8 % edge, a soft shadow), centred, at most 720px,
 * 16px above the bottom: from md once the whole head has left the window (IntersectionObserver), out of the footer's way, gone again when the
 * head comes back; on phones always. Photo 40px, title ink, price muted, the main action ink.
 */
export function HouseJoinBar({ stay, photo, joinCardRef, cta, line }: { stay: Stay; photo?: string; joinCardRef: RefObject<HTMLElement | null>; cta: ReactNode; /** Instead of the price: a member's current step */ line?: string }) {
  // Phones: always there (the head's actions scroll away at once); from md once the head's actions have left the window.
  const phone = useMediaQuery("(max-width: 47.99rem)");
  const price = useViewerPriceLabel(stay);
  const [cardGone, setCardGone] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  useEffect(() => {
    const card = joinCardRef.current;
    const footer = document.querySelector("footer");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === card) setCardGone(!entry.isIntersecting);
        else setAtFooter(entry.isIntersecting);
      }
    });
    if (card) observer.observe(card);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [joinCardRef]);
  const shown = phone || (cardGone && !atFooter);
  return (
    <div
      data-join-bar
      inert={!shown}
      className={cn(
        "fixed bottom-[calc(var(--tabbar-clear)+16px)] left-1/2 z-30 flex h-16 w-[min(100%-32px,720px)] -translate-x-1/2 items-center gap-3 rounded-full border border-ink/8 bg-(--glass-bg) py-2 pl-3 pr-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-[translate,opacity] duration-300 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      {photo && (
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-line ring-1 ring-surface/60">
          <Img src={photo} alt="" fill sizes="40px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{stay.title}</p>
        <p className="truncate text-small text-muted">{line ?? price}</p>
      </div>
      {cta}
    </div>
  );
}
