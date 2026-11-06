"use client";

import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock, Home, Languages, Plus, Sparkles, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import { Shelf } from "@/components/ui/Shelf";
import { StayCard } from "@/components/StayCard";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { CrewLine } from "@/components/ui/CrewLine";
import { IconButton } from "@/components/ui/IconButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SocialTiles } from "@/components/ui/SocialRow";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { openVote } from "@/lib/crewVotes";
import type { MemberStage } from "@/lib/joinFlow";
import { isListedStay } from "@/lib/launch";
import { inCommonWith, medianReplyMinutes, profileViewFor } from "@/lib/profilePrivacy";
import { convertApprox } from "@/lib/rates";
import { findUser, getCrew, isBlocked, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, firstName, googleMapsUrl, isCityOpen, mapQuery, openSpots, stayNights, typicalDayOf } from "@/lib/utils";
import { AccommodationTile } from "./AccommodationTile";
import { HostPreview, useHoverPreview } from "./HostPreview";
import { EMBED_CAPSULE, HouseMap, mapIsEmbed } from "./HouseMap";

const SECTION = "mt-(--space-section)";
/** Under a section's eyebrow in the page's left column. */
const ROW = "mt-3";
const MAX_MORE_HOUSES = 12;


function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-small text-muted">{label}</dt>
        <dd className="mt-0.5 text-body font-semibold text-ink">{children}</dd>
      </div>
    </div>
  );
}

/** Who's hosting, left, and what you share with them, right. All of the left leads to their profile, except the social links, which are their own. */
function HouseHostLine({ host }: { host: User }) {
  const t = useTranslations("house.page");
  const tCard = useTranslations("house.hostCard");
  const format = useFormat();
  const store = useStore();
  const hosted = store.stays.filter((s) => s.hostId === host.id && s.visibility !== "unlisted" && (s.status === "published" || s.status === "booked" || s.status === "completed")).length;
  const blockRef = useRef<HTMLDivElement>(null);
  const preview = useHoverPreview();
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div ref={blockRef} className="relative -mx-2 flex min-w-60 flex-1 items-start gap-3 p-2">
        <Link {...preview.anchorProps} href={`/u/${host.id}`} aria-label={tCard("profile", { name: host.name })} className="absolute inset-0 rounded-[14px] transition-colors duration-150 hover:bg-(--chip-bg-hover)" />
        <PersonPhoto src={host.photos[0]} alt="" size={48} className="pointer-events-none relative size-12 shrink-0" />
        <div className="pointer-events-none relative min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 text-body font-semibold text-ink">
            <span className="truncate">{t("hostedByShort", { name: firstName(host) })}</span>
            {host.verified && <VerifiedBadge />}
          </p>
          <p className="text-small text-muted">
            {format.ageAndCountry(host)}
            {hosted > 0 && ` · ${t("hostedCount", { count: hosted })}`}
          </p>
          <SocialTiles user={host} className="pointer-events-auto mt-2" />
        </div>
      </div>
      <HostFit host={host} />
      {preview.open && <HostPreview host={host} anchor={blockRef} {...preview.previewProps} />}
    </div>
  );
}

/** Beside the host: what you have in common, three lines at most. Logged out or with nothing shared: how they reply and whom they lived with. */
function HostFit({ host }: { host: User }) {
  const t = useTranslations("house.page.hostFit");
  const format = useFormat();
  const store = useStore();
  const locale = useLocale();
  const today = new Date().toISOString().slice(0, 10);
  const shared = inCommonWith(store, host, store.currentUserId, today);
  const list = (items: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items.slice(0, 2));
  const icon = "size-3.5 shrink-0 text-muted";
  const lines: { key: string; lead: ReactNode; text: string }[] = [];
  if (shared.languages.length > 0) lines.push({ key: "language", lead: <Languages className={icon} aria-hidden />, text: t("languages", { languages: list(shared.languages) }) });
  if (shared.interests.length > 0) lines.push({ key: "interest", lead: <Sparkles className={icon} aria-hidden />, text: t("interests", { interests: list(shared.interests.map(format.vibe)) }) });
  if (shared.livedWith.length > 0) {
    const person = shared.livedWith[0];
    lines.push({ key: "lived", lead: <PersonPhoto src={person.photos[0]} alt="" size={20} className="size-5 shrink-0" />, text: t("livedWith", { name: firstName(person) }) });
  }
  const common = lines.length > 0;
  if (!common) {
    const minutes = medianReplyMinutes(host);
    const count = profileViewFor(store, host, store.currentUserId, today).livedWith.length;
    if (minutes !== null) lines.push({ key: "reply", lead: <Clock className={icon} aria-hidden />, text: t("replies", { time: minutes < 60 ? t("minutes", { count: minutes }) : t("hours", { count: Math.round(minutes / 60) }) }) });
    if (count > 0) lines.push({ key: "people", lead: <Users className={icon} aria-hidden />, text: t("people", { count, name: firstName(host) }) });
  }
  if (lines.length === 0) return null;
  return (
    <div data-host-fit className="ml-auto flex min-w-0 max-w-full flex-col items-end gap-1 pt-2 text-right">
      <p className="text-eyebrow uppercase text-ink/55">{t(common ? "inCommon" : "host")}</p>
      {lines.map((line) => (
        <p key={line.key} className="flex min-w-0 max-w-full items-center justify-end gap-1.5 text-small text-ink">
          {line.lead}
          <span className="truncate">{line.text}</span>
        </p>
      ))}
    </div>
  );
}

/** The four facts, two by two: no frames, an icon, the label over the value. */
export function HouseFacts({ stay, host }: { stay: Stay; host?: User }) {
  const t = useTranslations("house.page");
  const tFacts = useTranslations("house.facts");
  const format = useFormat();
  const languages = [...new Set([stay.language, ...(stay.languages ?? [])].map(format.language).concat(host?.languages ?? []))];
  const held = [stay.spotsInvited ? tFacts("invited", { count: stay.spotsInvited }) : null, stay.spotsReserved ? tFacts("reserved", { count: stay.spotsReserved }) : null].filter(Boolean).join(" · ");
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
      <Fact icon={CalendarDays} label={t("factDates")}>
        {format.stayDatesLong(stay)}
      </Fact>
      <Fact icon={Users} label={t("factCrew")}>
        {t("factCrewValue", { total: stay.spotsTotal, open: openSpots(stay) })}
        {held && <span className="block text-small font-medium text-muted">{held}</span>}
      </Fact>
      <Fact icon={Home} label={t("factIncluded")}>
        {stay.hostFeePerPerson ? t("includedWithHost") : t("includedStay")}
      </Fact>
      <Fact icon={Languages} label={t("factLanguages")}>
        {languages.join(", ")}
      </Fact>
    </dl>
  );
}

/** Why I'm hosting: the host's own words. */
export function HouseWhy({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const quote = stay.whyText.trim();
  if (!quote) return null;
  return (
    <section aria-labelledby="house-why">
      <SectionHeader id="house-why" eyebrow={t("why")} />
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
  return (
    <section aria-labelledby="house-crew">
      <SectionHeader id="house-crew" eyebrow={t("crew")} />
      <ul className={cn(ROW, "flex flex-wrap gap-x-4 gap-y-5")}>
        {crew.map((member) => (
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
        ))}
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
              <AvatarStack users={waitlist} size="mini" max={4} linked />
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
      <SectionHeader id="house-day" eyebrow={t("day")} />
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
    <div className="grid gap-x-8 gap-y-(--space-section) sm:grid-cols-2 sm:[&>:only-child]:col-span-2">
      {(looking || stay.ageRange) && (
        <section aria-labelledby="house-looking">
          <SectionHeader id="house-looking" eyebrow={t("lookingFor")} />
          {looking && <p className={cn(ROW, "whitespace-pre-line text-body text-ink")}>{looking}</p>}
          {stay.ageRange && <p className="mt-3 text-small text-muted">{tFacts("ageRange", { min: stay.ageRange.min, max: stay.ageRange.max })}</p>}
        </section>
      )}
      {stay.houseRules.length > 0 && (
        <section aria-labelledby="house-rules">
          <SectionHeader id="house-rules" eyebrow={t("rules")} />
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
      <SectionHeader id="house-offer" eyebrow={t("offerTitle")} action={<span className="text-small text-muted">{fee} {t("perPerson")}</span>} />
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
 * Where: one row, 300px, map 70 % | place 30 %. The map is a picture, not a tool: the whole of it opens Google Maps, zoomed out so the city or
 * region reads; booked with a pin, not yet a soft circle over the neighbourhood. Beside it the place (AccommodationTile).
 */
export function HouseWhere({ stay, canOpenChat }: { stay: Stay; canOpenChat: boolean }) {
  const t = useTranslations("house.page");
  const tMap = useTranslations("house.map");
  const format = useFormat();
  const { query, zoom } = mapQuery(stay);
  const locked = stay.accommodationStatus === "locked" && Boolean(stay.accommodationLink);
  const hasCoordinates = !isCityOpen(stay) && Boolean(stay.lat || stay.lng);
  const embed = mapIsEmbed(hasCoordinates);
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  return (
    <section aria-labelledby="house-where">
      <SectionHeader id="house-where" eyebrow={t("where")} />
      <div className={cn(ROW, "grid gap-4 sm:h-75 sm:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]")}>
        <div className="relative h-75 overflow-hidden rounded-3xl bg-line sm:h-full">
          <HouseMap lat={stay.lat} lng={stay.lng} pin={locked} query={query} hasCoordinates={hasCoordinates} zoom={Math.max(zoom - 3, 2)} title={tMap("mapOf", { place: format.placeLabel(stay) })} />
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" aria-label={tMap("openInMaps")} className="group absolute inset-0 z-10 cursor-pointer bg-black/0 transition-colors duration-150 hover:bg-black/6">
            {!locked && <span className="glass-panel absolute left-4 top-4 max-w-[calc(100%-32px)] rounded-2xl! px-3 py-2 text-small text-ink">{t("aroundArea", { area })}</span>}
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
        <AccommodationTile stay={stay} canOpenChat={canOpenChat} />
      </div>
    </section>
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
      <SectionHeader id="house-more" eyebrow={t("more")} />
      <Shelf>
        {more.map((s) => (
          <div key={s.id} className="w-90 shrink-0">
            <StayCard stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} compact />
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

/** The way in, one small line: 1 Request · 2 Host accepts · 3 Pay when complete. Once you've asked, where you are stands out. */
function JoinSteps({ stage }: { stage: MemberStage | null }) {
  const t = useTranslations("house.page.steps");
  const current = stage === "requested" ? 1 : stage === "accepted" || stage === "payment_due" ? 2 : -1;
  return (
    <ol aria-label={t("label")} className="flex flex-wrap items-center gap-x-1.5 text-small text-muted">
      {(["request", "accepts", "pay"] as const).map((step, i) => (
        <li key={step} aria-current={i === current ? "step" : undefined} className={cn("whitespace-nowrap", i === current && "font-semibold text-ink")}>
          {i > 0 && <span aria-hidden className="mr-1.5 font-medium text-muted">·</span>}
          {i + 1} {t(step)}
        </li>
      ))}
    </ol>
  );
}

const lineDate = (chunks: ReactNode) => <span className="font-semibold text-ink">{chunks}</span>;

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
 * The booking card, the page's one container: what it is, the host, what it costs with the way in, how joining goes. The floating capsule
 * comes when `ref`'s block has left the window.
 */
export function HouseSummary({ stay, host, crew, cta, secondary, actions, stage, showSteps, note, ref }: { stay: Stay; host?: User; crew: User[]; cta: ReactNode; /** Message and Invite */ secondary: ReactNode; actions: ReactNode; stage: MemberStage | null; showSteps: boolean; /** A line under the actions, e.g. how the waitlist works */ note?: string; ref?: Ref<HTMLDivElement> }) {
  const t = useTranslations("house.page");
  const format = useFormat();
  const label = useViewerPriceLabel(stay);
  // "£640–810 pp": the amount large, "pp" small. "Price set with crew" stays whole.
  const perPerson = /^(.*\S)\s+(pp)$/.exec(label);
  const payBy = stage === "payment_due" && stay.paymentDueAt;
  return (
    <GlassPanel className="card-soft flex flex-col gap-5 rounded-3xl! p-10">
      <div>
        <div className="flex min-h-9 items-center justify-between gap-4">
          <p className="min-w-0 truncate text-eyebrow uppercase text-ink/55">{stay.customVibe?.trim() || format.vibe(stay.vibe)}</p>
          {actions}
        </div>
        <h1 className="mt-1 text-h1 text-ink">{stay.title}</h1>
        <p className="mt-2 text-body-lg text-muted">
          {stay.datesOpen
            ? t.rich("lineOpen", { dates: format.stayDatesLong(stay), place: format.placeLabel(stay), date: lineDate })
            : t.rich("line", { dates: format.stayDatesLong(stay), nights: format.nights(stayNights(stay)), place: format.placeLabel(stay), date: lineDate })}
        </p>
      </div>
      {host && <HouseHostLine host={host} />}
      <div ref={ref} className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5">
            <span className="text-h2 text-ink">{perPerson ? perPerson[1] : label}</span>
            {perPerson && <span className="text-small text-muted">{perPerson[2]}</span>}
          </p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <AvatarStack users={crew} size="sm" max={5} linked />
            <CrewLine stay={stay} />
          </div>
        </div>
        {/* One row from the left, each as wide as its words; on a narrow card it wraps. */}
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-0 gap-2 *:whitespace-nowrap">{cta}</div>
          {secondary}
        </div>
      </div>
      {(payBy || note || openVote(stay, "accommodation") || openVote(stay, "dates") || showSteps) && (
        <div className="flex flex-col gap-1.5">
          {note && <p className="text-small text-muted">{note}</p>}
          {payBy && <p className="text-small text-muted">{t("payBy", { date: `${format.day(payBy)} ${format.time(payBy)}` })}</p>}
          {openVote(stay, "accommodation") && <p className="text-small text-muted">{t("crewVoting")}</p>}
          {openVote(stay, "dates") && <p className="text-small text-muted">{t("crewVotingDates")}</p>}
          {showSteps && <JoinSteps stage={stage} />}
        </div>
      )}
    </GlassPanel>
  );
}

/**
 * The floating Join capsule, at every size: once the block with the price and the buttons has left the window, and out of the footer's way. Thumbnail,
 * title, price and the main action.
 */
export function HouseJoinBar({ stay, photo, joinCardRef, cta }: { stay: Stay; photo?: string; joinCardRef: RefObject<HTMLElement | null>; cta: ReactNode }) {
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
  const shown = cardGone && !atFooter;
  return (
    <div
      inert={!shown}
      className={cn(
        "glass-float fixed bottom-6 left-1/2 z-30 flex h-16 w-[min(100%-32px,640px)] -translate-x-1/2 items-center gap-3 rounded-full py-2 pl-2 pr-3 transition-[translate,opacity] duration-300 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      {photo && (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-line ring-1 ring-white/60">
          <Img src={photo} alt="" fill sizes="48px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{stay.title}</p>
        <p className="truncate text-small text-ink/70">{price}</p>
      </div>
      {cta}
    </div>
  );
}
