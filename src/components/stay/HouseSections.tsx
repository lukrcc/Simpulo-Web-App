"use client";

import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Home, Languages, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState, type ReactNode, type Ref, type RefObject } from "react";
import { Shelf } from "@/components/ui/Shelf";
import { StayCard } from "@/components/StayCard";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { CrewLine } from "@/components/ui/CrewLine";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SocialRow } from "@/components/ui/SocialRow";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { openVote } from "@/lib/crewVotes";
import type { MemberStage } from "@/lib/joinFlow";
import { isListedStay } from "@/lib/launch";
import { crewThreadId } from "@/lib/links";
import { convertApprox } from "@/lib/rates";
import { findUser, getCrew, isBlocked, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, firstName, googleMapsUrl, isCityOpen, mapQuery, openSpots, stayNights, typicalDayOf } from "@/lib/utils";
import { AccommodationSection } from "./AccommodationSection";
import { HouseMap } from "./HouseMap";

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

/** Who's hosting, in one row. Avatar, name and "View profile" all link to the profile. */
function HouseHostLine({ host }: { host: User }) {
  const t = useTranslations("house.page");
  const tCard = useTranslations("house.hostCard");
  const profile = `/u/${host.id}`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link href={profile} className="shrink-0 rounded-full" aria-label={tCard("profile", { name: host.name })}>
        <PersonPhoto src={host.photos[0]} alt={host.name} size={44} className="size-11" />
      </Link>
      <div className="flex min-w-0 items-center gap-1">
        <Link href={profile} className="truncate text-body font-semibold text-ink hover:underline">
          {t("hostedByShort", { name: firstName(host) })}
        </Link>
        {host.verified && <VerifiedBadge />}
      </div>
      <SocialRow user={host} size="sm" />
      <Link href={profile} className={buttonStyles("tertiary", "md", "ml-auto")}>
        {tCard("viewProfile")}
      </Link>
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

/** The crew as a row of faces: the host first, then the members, then one dashed circle per open spot. */
export function HouseCrew({ stay, crew, canJoin, onJoin }: { stay: Stay; crew: User[]; canJoin: boolean; onJoin: () => void }) {
  const t = useTranslations("house.page");
  const person = "flex w-[72px] flex-col items-center text-center";
  const spot = <span aria-hidden className="size-14 rounded-full border-2 border-dashed border-ink/15" />;
  const spotLabel = <span className="mt-2 max-w-full truncate text-small text-muted">{canJoin ? t("yourSpot") : t("openSpot")}</span>;
  return (
    <section aria-labelledby="house-crew">
      <SectionHeader id="house-crew" eyebrow={t("crew")} />
      <ul className={cn(ROW, "flex flex-wrap gap-x-4 gap-y-5")}>
        {crew.map((member) => (
          <li key={member.id}>
            <Link href={`/u/${member.id}`} className={person}>
              <Avatar user={member} size="lg" />
              <span className="mt-2 max-w-full truncate text-small text-ink">{firstName(member)}</span>
              {member.id === stay.hostId && <span className="text-small text-muted">{t("hostBadge")}</span>}
            </Link>
          </li>
        ))}
        {Array.from({ length: openSpots(stay) }, (_, i) => (
          <li key={i}>
            {canJoin ? (
              <button type="button" onClick={onJoin} data-preview-action className={person}>
                {spot}
                {spotLabel}
              </button>
            ) : (
              <div className={person}>
                {spot}
                {spotLabel}
              </div>
            )}
          </li>
        ))}
      </ul>
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
  return (
    <>
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
                <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
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
            <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The map as wide as the column, 260px, and over it (not on it) how the place stands. Booked: a pin. Not yet: no pin, a soft circle over the
 * neighbourhood, and that the crew decides (or how many options they are voting on).
 */
export function HouseWhere({ stay, chatLinkCount, canOpenChat }: { stay: Stay; chatLinkCount: number; canOpenChat: boolean }) {
  const t = useTranslations("house.page");
  const tMap = useTranslations("house.map");
  const tSection = useTranslations("house.accommodationSection");
  const format = useFormat();
  const { query, zoom } = mapQuery(stay);
  const locked = stay.accommodationStatus === "locked" && Boolean(stay.accommodationLink);
  const vote = openVote(stay, "accommodation");
  const hasCoordinates = !isCityOpen(stay) && Boolean(stay.lat || stay.lng);
  const area = stay.location.area ?? stay.location.city ?? stay.region;
  return (
    <section aria-labelledby="house-where">
      <SectionHeader
        id="house-where"
        eyebrow={t("where")}
        action={
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className={buttonStyles("tertiary", "md")}>
            {tMap("openInMaps")}
            <ArrowUpRight aria-hidden />
          </a>
        }
      />
      <div className={ROW}>
        {locked ? (
          <AccommodationSection stay={stay} chatLinkCount={chatLinkCount} canOpenChat={canOpenChat} inCard />
        ) : (
          <p className="flex flex-wrap items-center gap-x-3 text-small text-muted">
            {vote ? t("crewVotingOptions", { count: vote.options.length }) : t("aroundArea", { area })}
            {canOpenChat && (
              <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonStyles("tertiary", "sm")}>
                {tSection("openCrewChat")}
              </Link>
            )}
          </p>
        )}
      </div>
      <div className="relative mt-3 h-65 overflow-hidden rounded-3xl bg-line">
        <HouseMap lat={stay.lat} lng={stay.lng} pin={locked} query={query} hasCoordinates={hasCoordinates} zoom={Math.max(zoom - 1, 2)} title={tMap("mapOf", { place: format.placeLabel(stay) })} />
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

/** The heart and "…", at the top right of the content column; on phones the way back too. */
export function HouseActions({ save, menu, onBack }: { save: ReactNode; menu?: ReactNode; /** Phones: the way back (no header there) */ onBack: () => void }) {
  const t = useTranslations("house.page");
  return (
    <div className="flex shrink-0 items-center gap-2">
      <IconButton onClick={onBack} aria-label={t("back")} className="md:hidden">
        <ArrowLeft className="size-5" aria-hidden />
      </IconButton>
      {save}
      {menu}
    </div>
  );
}

/** The way in, small: 1 Request · 2 Host accepts · 3 Pay when the crew is complete. Once you've asked, where you are is in accent. */
function JoinSteps({ stage }: { stage: MemberStage | null }) {
  const t = useTranslations("house.page.steps");
  const current = stage === "requested" ? 1 : stage === "accepted" || stage === "payment_due" ? 2 : -1;
  return (
    <ol aria-label={t("label")} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {(["request", "accepts", "pay"] as const).map((step, i) => (
        <li key={step} aria-current={i === current ? "step" : undefined} className={cn("flex items-center gap-1 text-small", i === current ? "text-accent" : "text-muted")}>
          <span aria-hidden className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full", i === current ? "bg-accent text-white" : "bg-ink/5")}>
            {i + 1}
          </span>
          {t(step)}
        </li>
      ))}
    </ol>
  );
}

/** What it is, the host, and what it costs with the way in. The floating capsule comes when `ref`'s block has left the window. */
export function HouseSummary({ stay, host, crew, cta, invite, message, actions, stage, showSteps, ref }: { stay: Stay; host?: User; crew: User[]; cta: ReactNode; invite: ReactNode; message?: ReactNode; actions: ReactNode; stage: MemberStage | null; showSteps: boolean; ref?: Ref<HTMLDivElement> }) {
  const t = useTranslations("house.page");
  const format = useFormat();
  const price = useViewerPriceLabel(stay);
  const payBy = stage === "payment_due" && stay.paymentDueAt;
  return (
    <>
      <div>
        <div className="flex min-h-10 items-center justify-between gap-4">
          <p className="min-w-0 truncate text-eyebrow uppercase text-accent">{stay.customVibe?.trim() || format.vibe(stay.vibe)}</p>
          {actions}
        </div>
        <h1 className="mt-2 text-h1 text-ink">{stay.title}</h1>
        <p className="mt-2 text-body-lg text-muted">
          {stay.datesOpen ? t("lineOpen", { dates: format.stayDatesLong(stay), place: format.placeLabel(stay) }) : t("line", { dates: format.stayDatesLong(stay), nights: format.nights(stayNights(stay)), place: format.placeLabel(stay) })}
        </p>
      </div>
      {host && <HouseHostLine host={host} />}
      <div ref={ref}>
        <p className="text-h2 text-ink">{price}</p>
        <div className="mt-3 flex items-center gap-3">
          <AvatarStack users={crew} size="sm" max={5} linked />
          <CrewLine stay={stay} />
        </div>
        <div className="mt-5 flex flex-col gap-2 *:w-full">
          {cta}
          {invite}
          {message}
        </div>
        <div className="mt-3 flex flex-col gap-2 empty:hidden">
          {payBy && <p className="text-small text-muted">{t("payBy", { date: `${format.day(payBy)} ${format.time(payBy)}` })}</p>}
          {openVote(stay, "accommodation") && <p className="text-small text-muted">{t("crewVoting")}</p>}
          {openVote(stay, "dates") && <p className="text-small text-muted">{t("crewVotingDates")}</p>}
          {showSteps && <JoinSteps stage={stage} />}
        </div>
      </div>
    </>
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
        "milk-glass fixed bottom-6 left-1/2 z-30 flex h-16 w-[min(100%-32px,640px)] -translate-x-1/2 items-center gap-3 rounded-full py-3 pl-3 pr-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-[translate,opacity] duration-300 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      {photo && (
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-line">
          <Img src={photo} alt="" fill sizes="40px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{stay.title}</p>
        <p className="truncate text-small text-muted">{price}</p>
      </div>
      {cta}
    </div>
  );
}
