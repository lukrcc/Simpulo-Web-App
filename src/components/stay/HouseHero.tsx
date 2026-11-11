"use client";

import { ArrowRight, Home, Languages, Sparkles, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode, type Ref } from "react";
import { showsAge } from "@/config/privacy";
import { CurrencySheet, currencyLabel } from "@/components/layout/CurrencyPicker";
import { HouseCard } from "@/components/HouseCard";
import { Avatar } from "@/components/ui/Avatar";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SocialIcons } from "@/components/ui/SocialRow";
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
import { cn, firstName, openSpots, stayNights, stayPrice } from "@/lib/utils";

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
}

const lineDate = (chunks: ReactNode) => <span className="font-semibold text-ink">{chunks}</span>;
/** A reply this fast (median, minutes) earns "Responds fast". */
const FAST_REPLY_MINUTES = 120;

/**
 * The House page's head: one block in two parts. Left a third, the House's photo (4:5, swipeable with dots, the heart – no host tab: the host
 * has a column of their own). Right two thirds Ember (the one global Ember) in two columns, top-aligned, 40px inside, a 1px
 * cream 10 % line between: "House" (≈ 60 %: what, when, where, chips, price, the actions and one quiet line) and "People" (≈ 40 %: HOST, IN
 * COMMON, CREW, "View profile →"). Below 1100px People moves under House (its blocks side by side); phones one column.
 */
export function HouseHero({ stay, host, crew, cta, secondary, actions, stage, showSteps, note, notice, ref }: HouseHeroProps) {
  const t = useTranslations("house.page");
  const tHero = useTranslations("house.page.hero");
  const format = useFormat();
  const languages = [...new Set([stay.language, ...(stay.languages ?? [])].filter(Boolean).map(format.language))].slice(0, 3);
  const booked = stay.accommodationStatus === "locked";
  const women = stay.who === "women" || stay.audience === "women";
  const payBy = stage === "payment_due" && stay.paymentDueAt;
  return (
    <section ref={ref} aria-labelledby="house-title" className="grid gap-4 split:grid-cols-[minmax(0,min(33.333%,448px))_minmax(0,1fr)] split:gap-5">
      {/* The photo: at least 4:5, as high as the Ember part beside it. */}
      <div className="relative mx-auto w-full max-w-130 split:max-w-none">
        <div aria-hidden className="hidden aspect-4/5 split:block" />
        <div className="split:absolute split:inset-0">
          <HouseCard stay={stay} host={host} gallery notch="none" className="split:aspect-auto split:h-full" />
        </div>
      </div>

      <div className="ember ember-scope grid min-w-0 overflow-hidden rounded-3xl split:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* House */}
        <div className="flex min-w-0 flex-col gap-4 p-6 sm:p-8 split:p-10">
          <div className="flex min-h-9 items-center justify-between gap-4">
            <p className="min-w-0 truncate text-eyebrow uppercase text-ink/60">
              {stay.customVibe?.trim() || format.vibe(stay.vibe)} · {booked ? tHero("placeBooked") : tHero("pickingTogether")}
            </p>
            {actions}
          </div>
          <h1 id="house-title" className="text-hero text-ink">
            {stay.title}
          </h1>
          <p className="text-body-lg text-muted">
            {stay.datesOpen
              ? t.rich("lineOpen", { dates: format.stayDatesLong(stay), place: format.placeLabel(stay), date: lineDate })
              : t.rich("line", { dates: format.stayDatesLong(stay), nights: format.nights(stayNights(stay)), place: format.placeLabel(stay), date: lineDate })}
          </p>
          <ul className="flex flex-wrap gap-2 text-small font-medium">
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
            {women && <li className="ember-chip">{tHero("womenOnly")}</li>}
          </ul>

          <div className="mt-auto flex flex-col gap-4 pt-4">
            <HeroPrice stay={stay} />
            {notice && <p className="text-small text-muted">{notice}</p>}
            <div className="flex flex-wrap gap-2">
              <div className="flex min-w-0 gap-2 *:whitespace-nowrap">{cta}</div>
              {secondary}
            </div>
            <div className="flex flex-col gap-1">
              {note && <p className="text-small text-muted">{note}</p>}
              {payBy && <p className="text-small text-muted">{t("payBy", { date: `${format.day(payBy)} ${format.time(payBy)}` })}</p>}
              {openVote(stay, "accommodation") && <p className="text-small text-muted">{t("crewVoting")}</p>}
              {openVote(stay, "dates") && <p className="text-small text-muted">{t("crewVotingDates")}</p>}
              {showSteps && <WayIn />}
            </div>
          </div>
        </div>

        {/* People */}
        <div className="flex min-w-0 flex-wrap gap-x-10 gap-y-6 border-t border-[#F4EEE7]/10 p-6 sm:p-8 split:flex-col split:flex-nowrap split:border-l split:border-t-0 split:p-10">
          {host && <HostBlock host={host} stay={stay} />}
          {host && <InCommon host={host} />}
          <CrewBlock stay={stay} crew={crew} />
          {host && (
            <Link href={`/u/${host.id}`} className="group inline-flex items-center gap-1.5 self-start text-body font-semibold text-ink transition-colors hover:text-ink/75 split:mt-auto">
              {tHero("viewProfile")}
              <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          )}
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
        <span className="text-h1 text-ink">{perPerson ? perPerson[1] : label}</span>
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
      <SocialIcons user={host} className="mt-3" />
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

/** CREW: the faces, then an empty circle per free spot, and "2 of 6 spots left" (full: "Crew complete"). */
function CrewBlock({ stay, crew }: { stay: Stay; crew: User[] }) {
  const tHero = useTranslations("house.page.hero");
  const faceOf = useCrewFaceOf(stay);
  const open = openSpots(stay);
  const shown = crew.filter((member) => faceOf(member) !== "hidden");
  const hidden = crew.length - shown.length;
  return (
    <div className="min-w-0">
      <Label>{tHero("crewLabel")}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.slice(0, 6).map((member) => (
          <Avatar key={member.id} user={member} size="md" mode={faceOf(member)} linked={faceOf(member) !== "blurred"} />
        ))}
        {hidden > 0 && <span className="flex size-10 items-center justify-center rounded-full bg-(--chip-bg) text-small font-semibold text-ink">+{hidden}</span>}
        {/* Never more circles than the crew has room for beside the faces shown. */}
        {Array.from({ length: Math.max(0, Math.min(open, stay.spotsTotal - crew.length, 6)) }, (_, i) => (
          <span key={i} aria-hidden className="size-10 rounded-full border-[1.5px] border-dashed border-[#F4EEE7]/35" />
        ))}
      </div>
      <p className={cn("mt-2 text-small", open > 0 ? "text-ink" : "text-muted")}>{open > 0 ? tHero("spotsLeftOf", { open, total: stay.spotsTotal }) : tHero("crewComplete")}</p>
    </div>
  );
}
