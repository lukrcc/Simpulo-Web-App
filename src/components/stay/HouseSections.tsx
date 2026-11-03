"use client";

import { ArrowUpRight, CalendarDays, Check, Home, Languages, LockOpen, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { ScrollRow } from "@/components/explore/CollectionRow";
import { StayCard } from "@/components/StayCard";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useFormat } from "@/i18n/format";
import { isListedStay } from "@/lib/launch";
import { crewThreadId } from "@/lib/links";
import { convertApprox } from "@/lib/rates";
import { findUser, getCrew, isBlocked, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, firstName, googleMapsUrl, isCityOpen, mapQuery, openSpots, typicalDayOf } from "@/lib/utils";
import { AccommodationSection } from "./AccommodationSection";
import { HostCard } from "./HostCard";

const SECTION = "mt-(--space-section)";
const CONTENT = "mt-(--space-inner)";
const MAX_MORE_HOUSES = 12;

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-small text-muted">{label}</dt>
        <dd className="mt-0.5 text-body font-semibold text-ink">{children}</dd>
      </div>
    </div>
  );
}

/** The four facts under the stage: no frames, an icon, the label over the value. */
export function HouseFacts({ stay, host }: { stay: Stay; host?: User }) {
  const t = useTranslations("house.page");
  const tFacts = useTranslations("house.facts");
  const format = useFormat();
  const languages = [...new Set([format.language(stay.language), ...(host?.languages ?? [])])];
  const held = [stay.spotsInvited ? tFacts("invited", { count: stay.spotsInvited }) : null, stay.spotsReserved ? tFacts("reserved", { count: stay.spotsReserved }) : null].filter(Boolean).join(" · ");
  return (
    <dl className="card-grid mt-8 [--card-cols:4] [--card-min:220px]">
      <Fact icon={CalendarDays} label={t("factDates")}>
        {format.longRange(stay.startDate, stay.endDate)}
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

/** Why I'm hosting: the host's own words large on the page, their card beside it (under it below 1100px). */
export function HouseWhy({ stay, host, message }: { stay: Stay; host?: User; message?: ReactNode }) {
  const t = useTranslations("house.page");
  const quote = stay.whyText.trim();
  if (!quote && !host) return null;
  return (
    <section aria-labelledby="house-why" className={SECTION}>
      <SectionHeader id="house-why" eyebrow={t("why")} />
      <div className={cn(CONTENT, "grid items-start gap-8 split:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] split:gap-12")}>
        {quote && <blockquote className="max-w-[640px] whitespace-pre-line text-quote text-ink">{quote}</blockquote>}
        {host && (
          <div className={cardClass}>
            <HostCard host={host} action={message} />
          </div>
        )}
      </div>
    </section>
  );
}

/** The crew as a shelf: the host first, then the members, then one dashed card per open spot. */
export function HouseCrew({ stay, crew, canJoin, onJoin }: { stay: Stay; crew: User[]; canJoin: boolean; onJoin: () => void }) {
  const t = useTranslations("house.page");
  const open = openSpots(stay);
  const card = "flex w-44 shrink-0 snap-start flex-col items-center rounded-[20px] p-5 text-center";
  return (
    <section aria-labelledby="house-crew" className={SECTION}>
      <SectionHeader id="house-crew" eyebrow={t("crew")} />
      <ScrollRow>
        {crew.map((member) => (
          <Link key={member.id} href={`/u/${member.id}`} className={cn(card, "bg-surface transition-colors hover:bg-surface/70")}>
            <PersonPhoto src={member.photos[0]} alt={member.name} size={64} className="size-16" />
            <p className="mt-3 max-w-full truncate text-body font-semibold text-ink">{firstName(member)}</p>
            <p className="max-w-full truncate text-small text-muted">{member.country}</p>
            {member.id === stay.hostId && <Badge className="mt-2">{t("hostBadge")}</Badge>}
          </Link>
        ))}
        {Array.from({ length: open }, (_, i) => (
          <div key={i} className={cn(card, "justify-center border-2 border-dashed border-line")}>
            <span aria-hidden className="size-16 rounded-full bg-ink/5" />
            <p className="mt-3 text-body font-semibold text-ink">{canJoin ? t("yourSpot") : t("openSpot")}</p>
            {canJoin && (
              <Button variant="tertiary" onClick={onJoin} data-preview-action className="mt-1">
                {t("joinSpot")}
              </Button>
            )}
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/** A typical day as stations you can run your eye along. */
export function HouseDay({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const stops = typicalDayOf(stay);
  if (stops.length === 0) return null;
  return (
    <section aria-labelledby="house-day" className={SECTION}>
      <SectionHeader id="house-day" eyebrow={t("day")} />
      <ScrollRow>
        {stops.map((stop) => (
          <div key={`${stop.time}-${stop.label}`} className="w-55 shrink-0 snap-start rounded-[20px] bg-surface p-5">
            <p className="text-small text-accent">{stop.time}</p>
            <p className="mt-1 text-body font-semibold text-ink">{stop.label}</p>
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/** Who I'm looking for + House rules: two cards of one height (under each other below 1100px). */
export function HouseFit({ stay }: { stay: Stay }) {
  const t = useTranslations("house.page");
  const tFacts = useTranslations("house.facts");
  const looking = stay.lookingForText.trim();
  if (!looking && !stay.ageRange && stay.houseRules.length === 0) return null;
  return (
    <section className={cn(SECTION, "grid gap-6 split:grid-cols-2")}>
      {(looking || stay.ageRange) && (
        <div aria-labelledby="house-looking" role="group" className={cardClass}>
          <SectionHeader id="house-looking" eyebrow={t("lookingFor")} />
          {looking && <p className="mt-4 whitespace-pre-line text-body text-ink">{looking}</p>}
          {stay.ageRange && <p className="mt-3 text-small text-muted">{tFacts("ageRange", { min: stay.ageRange.min, max: stay.ageRange.max })}</p>}
        </div>
      )}
      {stay.houseRules.length > 0 && (
        <div aria-labelledby="house-rules" role="group" className={cardClass}>
          <SectionHeader id="house-rules" eyebrow={t("rules")} />
          <ul className="mt-4 space-y-2">
            {stay.houseRules.map((rule) => (
              <li key={rule} className="flex gap-2 text-body text-ink">
                <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}
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
    <section aria-labelledby="house-offer" className={SECTION}>
      <SectionHeader id="house-offer" eyebrow={t("offerTitle")} action={<span className="text-small text-muted">{fee} {t("perPerson")}</span>} />
      <ul className={cn(CONTENT, "grid gap-x-6 gap-y-2 split:grid-cols-2")}>
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
 * The map at full width. Google's embed takes no style, so the calm look comes from a CSS filter and one zoom step further out
 * (fewer labels); the accommodation lies over it, bottom left.
 */
export function HouseWhere({ stay, chatLinkCount, canOpenChat }: { stay: Stay; chatLinkCount: number; canOpenChat: boolean }) {
  const t = useTranslations("house.page");
  const tMap = useTranslations("house.map");
  const tSection = useTranslations("house.accommodationSection");
  const format = useFormat();
  const { query, zoom } = mapQuery(stay);
  const locked = stay.accommodationStatus === "locked" && stay.accommodationLink;
  return (
    <section aria-labelledby="house-where" className={SECTION}>
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
      <div className={cn(CONTENT, "relative h-105 overflow-hidden rounded-3xl bg-line")}>
        <iframe
          src={`https://www.google.com/maps?q=${query}&z=${Math.max(zoom - 1, 2)}&output=embed`}
          title={tMap("mapOf", { place: format.placeLabel(stay) })}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0 saturate-50 brightness-[1.03] contrast-[0.95]"
        />
        <div className="absolute bottom-4 left-4 w-[min(360px,calc(100%-32px))] rounded-[20px] bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
          <p className="text-small text-muted">{t("accommodation")}</p>
          {locked ? (
            <div className="mt-2">
              <AccommodationSection stay={stay} chatLinkCount={chatLinkCount} canOpenChat={canOpenChat} inCard />
            </div>
          ) : (
            <p className="mt-1 flex items-start gap-2 text-body font-semibold text-ink">
              <LockOpen className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              {t("accommodationOpen")}
            </p>
          )}
          {!locked && canOpenChat && (
            <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonStyles("tertiary", "md", "mt-1")}>
              {tSection("openCrewChat")}
            </Link>
          )}
        </div>
      </div>
      {isCityOpen(stay) && <p className="mt-2 text-small text-muted">{tMap("areaOpen")}</p>}
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
      <ScrollRow>
        {more.map((s) => (
          <div key={s.id} className="w-90 shrink-0 snap-start">
            <StayCard stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} compact />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

/**
 * The floating Join bar: only once the whole stage has left the window, and out of the footer's way. Thumbnail, title, price
 * and the main action.
 */
export function HouseJoinBar({ stay, photo, stageRef, cta }: { stay: Stay; photo?: string; stageRef: RefObject<HTMLElement | null>; cta: ReactNode }) {
  const price = useViewerPriceLabel(stay);
  const [stageGone, setStageGone] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  useEffect(() => {
    const stage = stageRef.current;
    const footer = document.querySelector("footer");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === stage) setStageGone(!entry.isIntersecting);
        else setAtFooter(entry.isIntersecting);
      }
    });
    if (stage) observer.observe(stage);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [stageRef]);
  const shown = stageGone && !atFooter;
  return (
    <div
      data-house-join-bar
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
