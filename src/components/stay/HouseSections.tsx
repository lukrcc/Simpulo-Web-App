"use client";

import { ArrowUpRight, Check, Lightbulb, MapPin, Plus, UserPlus, Vote } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EXPLORE_SPACING } from "@/config/explore";
import { Fragment, useEffect, useState, type ReactNode, type RefObject } from "react";
import { Shelf } from "@/components/ui/Shelf";
import { HouseCard } from "@/components/HouseCard";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { useCrewFaceOf } from "@/components/ui/useCrewFaces";
import { Img } from "@/components/ui/Img";
import { useViewerAmount, useViewerPriceLabel } from "@/components/ui/PriceLine";
import { RowHead } from "@/components/ui/CardRow";
import { useFormat } from "@/i18n/format";
import { isListedStay } from "@/lib/launch";
import { convertApprox } from "@/lib/rates";
import { findUser, getCrew, isBlocked, isCrewMember, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { DarkBand } from "@/components/ui/DarkBand";
import { placeImageOf } from "@/config/place-images";
import { cityPlaceIdOf } from "@/lib/data/places";
import { cn, firstName, googleMapsUrl, isCityOpen, mapQuery, openSpots, typicalDayOf } from "@/lib/utils";
import { previewForUrl } from "@/lib/data";
import { platformOf } from "@/lib/platforms";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { ListingInfo } from "./AccommodationTile";

/**
 * A typical day's time, short: no leading zero; a range of whole hours without ":00" – "07:00–11:00" → "7–11", "11:30" stays, "07:00" → "7:00",
 * "07:00–13:30" → "7:00–13:30". Words ("Morning") stay as they are.
 */
function shortTime(time: string): string {
  const parts = time.split(/\s*[–-]\s*/);
  if (!parts.every((p) => /^\d{1,2}:\d{2}$/.test(p))) return time;
  const trim = (p: string) => p.replace(/^0(\d)/, "$1");
  if (parts.length === 2 && parts.every((p) => p.endsWith(":00"))) return parts.map((p) => trim(p).replace(/:00$/, "")).join("–");
  return parts.map(trim).join("–");
}

/** Under a section's head: 12px. */
const ROW = "mt-3";

/** The House page's section heads (Apple-like): 22px semibold, ink; `aside` on the right, on the same baseline. */
function SectionHead({ id, title, aside }: { id: string; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-subhead text-ink">
        {title}
      </h2>
      {aside}
    </div>
  );
}
const MAX_MORE_HOUSES = 12;


/** Why I'm hosting: the host's own words. */
export function HouseWhy({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const quote = stay.whyText.trim();
  if (!quote) return null;
  return (
    <section aria-labelledby="house-why">
      <SectionHead id="house-why" title={t("why")} />
      {/* The host's words: 24px/1.4 regular, ink, at most 60 characters a line, no line beside it. */}
      {/* text-wrap: balance – no single word left on the last line. */}
      <p className={cn(ROW, "max-w-[60ch] whitespace-pre-line text-balance text-lead text-ink")}>{quote}</p>
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
      <SectionHead id="house-day" title={t("day")} />
      {/* A list: the time in a 128px column, muted, never wrapping ("7–11", "11:30"); what happens 17px; 12px between rows. */}
      <dl className={cn(ROW, "grid grid-cols-[128px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3")}>
        {stops.map((stop) => (
          <Fragment key={`${stop.time}-${stop.label}`}>
            <dt className="whitespace-nowrap text-body-lg text-muted tabular-nums">{shortTime(stop.time)}</dt>
            <dd className="text-body-lg text-ink">{stop.label}</dd>
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
      <SectionHead id="house-looking" title={t("lookingFor")} />
      {looking && <p className={cn(ROW, "max-w-[60ch] whitespace-pre-line text-body-lg text-ink")}>{looking}</p>}
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
      <SectionHead id="house-rules" title={t("rules")} />
      <ul className={cn(ROW, "space-y-3")}>
        {stay.houseRules.map((rule) => (
          <li key={rule} className="flex gap-2 text-body-lg text-ink">
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
      <SectionHead id="house-offer" title={t("offerTitle")} aside={<span className="text-small text-muted">{`${fee} ${t("perPerson")}`}</span>} />
      <ul className={cn(ROW, "space-y-3")}>
        {stay.hostOffer.map((item) => (
          <li key={item} className="flex gap-2 text-body-lg text-ink">
            <Check className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Where you'll be: two columns – left a static map image (560 × 320, radius 20; /api/static-map draws it with Google's Static Maps API when
 * the server has a key, a calm mock without; the approximate circle drawn in, lazy, cached), right "Around {area}", how the place gets
 * picked (together) or the listing (set), and "Open in Google Maps ↗". No interactive map, no embed.
 */
export function HouseWhere({ stay }: { stay: Stay; canOpenChat?: boolean }) {
  const t = useTranslations("house.page");
  const tWhere = useTranslations("house.page.where2");
  const tMap = useTranslations("house.map");
  const format = useFormat();
  // Booked (the host confirmed the booking): the static map with the exact place, and "Open in Google Maps". Before: no map at all.
  const booked = Boolean(stay.bookingConfirmedAt);
  const listing = stay.accommodationStatus === "locked" && stay.accommodationLink ? stay.accommodationLink : null;
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  const candidates = (stay.accommodationVote?.options ?? []).filter((o) => o.link).slice(0, 3);
  // The place's own photo (config/place-images.ts): the area if it has one, else the city. None: a calm icon, never a made-up map.
  const placeId = (stay.location.area && cityPlaceIdOf(stay.location.area)) || cityPlaceIdOf(stay.location.city || stay.city || "");
  const photo = placeId ? placeImageOf(placeId) : null;
  const side = listing ? <ListingInfo stay={stay} link={listing} /> : candidates.length > 0 ? <Shortlist stay={stay} options={candidates} /> : <HowPicked />;
  if (booked) {
    const hasCoordinates = !isCityOpen(stay) && Boolean(stay.lat || stay.lng);
    const { query, zoom } = mapQuery(stay);
    const mapParams = new URLSearchParams(hasCoordinates ? { lat: String(stay.lat), lng: String(stay.lng), zoom: "15" } : { q: decodeURIComponent(query), zoom: String(zoom) });
    return (
      <section aria-labelledby="house-where" className={cn(ROW, "grid items-center gap-8 split:grid-cols-[minmax(0,560px)_minmax(0,1fr)] split:gap-12")}>
        <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="block overflow-hidden rounded-[24px] bg-band">
          {/* eslint-disable-next-line @next/next/no-img-element -- our own cached map route (an SVG mock or Google's PNG), lazy */}
          <img src={`/api/static-map?${mapParams}`} alt={tMap("mapOf", { place: format.placeLabel(stay) })} width={560} height={320} loading="lazy" decoding="async" className="aspect-[560/320] w-full object-cover" />
        </a>
        <div className="flex max-w-90 flex-col gap-4">
          <div>
            <h2 id="house-where" className="text-eyebrow uppercase text-ink/55">
              {t("where")}
            </h2>
            <p className="mt-1 text-row text-ink">{tWhere("around", { area })}</p>
          </div>
          {side}
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className="press inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-(--action-bg) px-5 text-body font-semibold text-(--action-text) transition-colors hover:bg-(--action-hover)">
            {tMap("openInMaps")}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
      </section>
    );
  }
  return (
    // Before booking: the place as a photo across the grid (360px, radius 24), "Around Diani Beach" and "Exact place shared after booking" on it
    // bottom left (a dark gradient only at its foot); beside it (below on narrow screens) how the place is picked, or the listing.
    <section aria-labelledby="house-where" className={cn(ROW, "grid items-end gap-8 split:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] split:gap-12")}>
      {photo ? (
        <div className="relative h-90 overflow-hidden rounded-[24px] bg-band">
          <Img src={photo} alt={tWhere("photoAlt", { area })} fill sizes="(min-width: 1100px) 900px, 100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(20,16,14,0.65),transparent)]" />
          <div className="absolute bottom-6 left-6 right-6 text-on-image [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
            <h2 id="house-where" className="text-h2">{tWhere("around", { area })}</h2>
            <p className="mt-1 text-body text-on-image/85">{tWhere("exactShared")}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-[24px] bg-surface p-6">
          <MapPin aria-hidden className="size-8 text-muted" strokeWidth={1.5} />
          <div>
            <h2 id="house-where" className="text-h2 text-ink">{tWhere("around", { area })}</h2>
            <p className="mt-1 text-body text-muted">{tWhere("exactShared")}</p>
          </div>
        </div>
      )}
      <div className="flex max-w-90 flex-col gap-4">{side}</div>
    </section>
  );
}

export function HowPicked({ title = true }: { /** false: inside a sheet that already says it */ title?: boolean } = {}) {
  const tWhere = useTranslations("house.page.where2");
  const steps = [
    { key: "join", icon: UserPlus },
    { key: "suggest", icon: Lightbulb },
    { key: "vote", icon: Vote },
  ] as const;
  return (
    <div className="flex flex-col">
      {title && <p className="mb-3 text-body font-semibold text-ink">{tWhere("howTitle")}</p>}
      <ol className="flex flex-col gap-3">
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

/** Under the head's crew: who waits ("N on the waitlist", the faces) and your own place – the crew section below is gone. */
export function WaitlistLine({ stay, waitlist, myWaitlist }: { stay: Stay; waitlist: User[]; myWaitlist?: { position: number } | { requested: true } }) {
  const t = useTranslations("house.page");
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const faceOf = useCrewFaceOf(stay);
  if (waitlist.length === 0 && !myWaitlist) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-muted">
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
    // The last section: a dark band like Explore's and Your houses' (ui/DarkBand – hard edges, 64px inside, the words cream), the same shelf
    // (Shelf flat, a card exactly one grid column wide – .explore-slide), arrows as there.
    <DarkBand className="mb-0 mt-16">
      <section aria-labelledby="house-more" className="explore-root">
        {/* "See all →": Explore filtered to this category. */}
        <RowHead id="house-more" title={t("more")} seeAll={`/explore?vibe=${stay.vibe}`} />
        <Shelf variant="flat" top={EXPLORE_SPACING.headContent}>
          {more.map((s) => (
            <div key={s.id} className="explore-slide shrink-0">
              <HouseCard stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} />
            </div>
          ))}
        </Shelf>
      </section>
    </DarkBand>
  );
}

/** Beside the title: "…"; on phones the way back too. The heart is on the card. */
export function HouseActions({ menu, share }: { menu?: ReactNode; /** Share (36px, like "…"), before the menu – as in the profile's head */ share?: ReactNode; /** Kept for callers: the way back is the head's BackButton now (it was shown twice on phones) */ onBack?: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
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
  // Phones: the head's dark strip is the fixed bar there – this one stays away.
  const shown = !phone && cardGone && !atFooter;
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
