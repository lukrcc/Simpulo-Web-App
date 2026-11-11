"use client";

import { ArrowLeft, ArrowUpRight, Check, Lightbulb, Plus, UserPlus, Vote } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { AccommodationTile } from "./AccommodationTile";
import { EMBED_CAPSULE, HouseMap, mapIsEmbed } from "./HouseMap";

/** Every section 40px under the one before (More houses like this comes after the column). */
const SECTION = "mt-10";
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
      <blockquote className={cn(ROW, "max-w-[640px] whitespace-pre-line text-quote text-ink")}>{quote}</blockquote>
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
  const person = "flex w-[88px] flex-col items-center text-center";
  const action = onInvite ?? (canJoin ? onJoin : undefined);
  const restLabel = canJoin ? t("yourSpot") : t("openSpot");
  const spot = "flex size-18 items-center justify-center rounded-full border-2 border-dashed border-ink/15 text-ink";
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
                  <Avatar user={member} size="crew" mode="blurred" />
                </div>
              </li>
            );
          }
          return (
            <li key={member.id}>
              <Link href={`/u/${member.id}`} className={person}>
                <span className="relative">
                  <Avatar user={member} size="crew" />
                  {member.id === stay.hostId && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-(--select-bg) px-2 py-px text-small text-ink shadow-(--select-shadow)">{t("hostBadge")}</span>
                  )}
                </span>
                <span className="mt-2.5 max-w-full truncate text-body font-semibold text-ink">{firstName(member)}</span>
              </Link>
            </li>
          );
        })}
        {hiddenCount > 0 && (
          <li>
            <div className={person} aria-label={t("crewHidden", { count: hiddenCount })}>
              <span aria-hidden className="flex size-18 items-center justify-center rounded-full bg-ink/6 text-body font-semibold text-muted">
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
                  <Plus className="size-5 opacity-0 transition-opacity duration-150 group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100" />
                </span>
                {onInvite ? (
                  <span className="mt-2.5 grid max-w-full text-body font-semibold">
                    <span className="col-start-1 row-start-1 truncate text-muted transition-opacity duration-150 group-hover/spot:opacity-0 group-focus-visible/spot:opacity-0">{restLabel}</span>
                    <span className="col-start-1 row-start-1 truncate text-ink opacity-0 transition-opacity duration-150 group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100">{t("spotInviteShort")}</span>
                  </span>
                ) : (
                  <span className="mt-2.5 max-w-full truncate text-body font-semibold text-muted group-hover/spot:text-ink">{restLabel}</span>
                )}
              </button>
            ) : (
              <div className={person}>
                <span aria-hidden className={spot} />
                <span className="mt-2.5 max-w-full truncate text-body font-semibold text-muted">{restLabel}</span>
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
export function HouseFit({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const tFacts = useTranslations("house.facts");
  const looking = stay.lookingForText.trim();
  if (!looking && !stay.ageRange && stay.houseRules.length === 0) return null;
  return (
    // Side by side, one alone takes the width.
    <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 sm:[&>:only-child]:col-span-2">
      {(looking || stay.ageRange) && (
        <section aria-labelledby="house-looking">
          <RowHead id="house-looking" title={t("lookingFor")} />
          {looking && <p className={cn(ROW, "whitespace-pre-line text-body text-ink")}>{looking}</p>}
          {stay.ageRange && <p className="mt-3 text-small text-muted">{tFacts("ageRange", { min: stay.ageRange.min, max: stay.ageRange.max })}</p>}
        </section>
      )}
      {stay.houseRules.length > 0 && (
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
      )}
    </div>
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
      <ul className={cn(ROW, "grid gap-x-6 gap-y-2 md:grid-cols-2")}>
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
 * Where you'll be: map 60 % | place 40 %, the same height side by side. The map is a picture, not a tool – the whole of it opens Google Maps.
 * A place booked ("set"): no exact pin, a circle of about 500m over the area, the listing beside it (photo, title, source, "€5,340 total · 28
 * nights", "View listing ↗") and "Exact address after booking." Picking together: the area (its label says the crew decides), beside it the
 * shortlist – 2–3 candidates from the crew's vote (photo, title, price per person, link) – or, before any, "How the place is picked".
 */
export function HouseWhere({ stay, canOpenChat }: { stay: Stay; canOpenChat: boolean }) {
  const t = useTranslations("house.page");
  const tWhere = useTranslations("house.page.where2");
  const tMap = useTranslations("house.map");
  const format = useFormat();
  const { query, zoom } = mapQuery(stay);
  const booked = stay.accommodationStatus === "locked" && Boolean(stay.accommodationLink);
  const hasCoordinates = !isCityOpen(stay) && Boolean(stay.lat || stay.lng);
  const embed = mapIsEmbed(hasCoordinates);
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  const candidates = (stay.accommodationVote?.options ?? []).filter((o) => o.link).slice(0, 3);
  return (
    <section aria-labelledby="house-where">
      <RowHead id="house-where" title={t("where")} />
      <div className={cn(ROW, "grid gap-4 sm:h-80 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
        <div className="relative h-80 overflow-hidden rounded-3xl bg-line sm:h-full">
          <HouseMap lat={stay.lat} lng={stay.lng} pin={false} radius={booked ? BOOKED_RADIUS_M : undefined} query={query} hasCoordinates={hasCoordinates} zoom={Math.max(zoom - (booked ? 1 : 3), 2)} title={tMap("mapOf", { place: format.placeLabel(stay) })} />
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" aria-label={tMap("openInMaps")} className="group absolute inset-0 z-10 cursor-pointer bg-black/0 transition-colors duration-150 hover:bg-black/6">
            <span className="glass-panel absolute left-4 top-4 max-w-[calc(100%-32px)] rounded-2xl! px-3 py-2 text-small text-ink">{booked ? tWhere("around", { area }) : t("aroundArea", { area })}</span>
            {/* Over the embed (no key) it covers the embed's own camera button exactly; Google's attribution below stays free. */}
            <span
              className={cn("glass-panel absolute inline-flex items-center gap-1.5 rounded-full! px-4 text-small font-semibold text-ink transition-[translate,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.16)]", !embed && "bottom-4 right-4 h-9")}
              style={embed ? EMBED_CAPSULE : undefined}
            >
              {tMap("openInMaps")}
              <ArrowUpRight className="size-4" aria-hidden />
            </span>
          </a>
        </div>
        {booked ? <AccommodationTile stay={stay} canOpenChat={canOpenChat} /> : candidates.length > 0 ? <Shortlist stay={stay} options={candidates} /> : <HowPicked />}
      </div>
      {/* Picking together, the map's own label says it already ("… exact place decided with the crew"): no second line. */}
      {booked && <p className="mt-3 text-small text-muted">{tWhere("exactAfter")}</p>}
    </section>
  );
}

/** Picking together, before any candidates: how it goes, in three short steps – never an empty box. Top-aligned, as high as the map. */
function HowPicked() {
  const tWhere = useTranslations("house.page.where2");
  const steps = [
    { key: "join", icon: UserPlus },
    { key: "suggest", icon: Lightbulb },
    { key: "vote", icon: Vote },
  ] as const;
  return (
    <div className="card-soft flex h-full flex-col rounded-3xl p-6">
      <p className="text-body font-semibold text-ink">{tWhere("howTitle")}</p>
      <ol className="mt-4 flex flex-col gap-3">
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
    <div className="card-soft flex h-full min-h-80 flex-col rounded-3xl p-4 sm:min-h-0">
      <p className="px-2 pb-2 pt-1 text-eyebrow uppercase text-ink/55">{tWhere("shortlist")}</p>
      <ul className="flex min-h-0 flex-1 flex-col justify-between gap-2">
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
    <section aria-labelledby="house-more" className={SECTION}>
      <RowHead id="house-more" title={t("more")} />
      <Shelf>
        {more.map((s) => (
          <div key={s.id} className="w-90 shrink-0">
            <HouseCard stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} />
          </div>
        ))}
      </Shelf>
    </section>
  );
}

/** Beside the title: "…"; on phones the way back too. The heart is on the card. */
export function HouseActions({ menu, onBack }: { menu?: ReactNode; /** Phones: the way back (no header there) */ onBack: () => void }) {
  const t = useTranslations("house.page");
  return (
    <div className="flex shrink-0 items-center gap-2">
      <IconButton onClick={onBack} aria-label={t("back")} className="md:hidden">
        <ArrowLeft className="size-5" aria-hidden />
      </IconButton>
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
        "fixed bottom-4 left-1/2 z-30 flex h-16 w-[min(100%-32px,720px)] -translate-x-1/2 items-center gap-3 rounded-full border border-ink/8 bg-[rgba(251,247,242,0.72)] py-2 pl-3 pr-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-[translate,opacity] duration-300 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      {photo && (
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-line ring-1 ring-white/60">
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
