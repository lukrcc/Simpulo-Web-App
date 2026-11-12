"use client";

import { BackButton } from "@/components/ui/BackButton";
import { Check, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CrewCount, CrewRow } from "@/components/CrewRow";
import { HeroPhotos } from "@/components/HeroBand";
import { useState, type ReactNode, type Ref } from "react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { Button } from "@/components/ui/ActionButton";
import { RowHead } from "@/components/ui/CardRow";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useViewerAmount } from "@/components/ui/PriceLine";
import { useToast } from "@/components/ui/Toast";
import type { GuestJourney, GuestStepKey } from "@/config/house-steps";
import { useFormat } from "@/i18n/format";
import { crewInOf, getMyPayment, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, firstName, googleMapsUrl, housePhotos, openSpots } from "@/lib/utils";
import { CrewVotes } from "./CrewVotes";

/** What the current step asks: its title, one sentence, an action (or none) – for the head and the floating bar alike. */
export interface StepContent {
  title: string;
  sentence: string;
  /** `invite`: it opens the invite sheet – then the crew circles beside it only show (one way to invite per block) */
  action?: { label: string; href?: string; onClick?: () => void; external?: boolean; invite?: true };
}

/** The current step's words and action (config/house-steps.ts decides which step it is). */
export function useStepContent(stay: Stay, host: User | undefined, journey: GuestJourney, handlers: { onPay: () => void; onInvite: () => void; /** When the page opened (ISO) – the clock for the deadlines */ now: string }): StepContent {
  const t = useTranslations("house.steps");
  const format = useFormat();
  const store = useStore();
  const amount = useViewerAmount();
  const hostName = host ? firstName(host) : "";
  const hoursLeft = (iso: string | null) => (iso ? Math.max(1, Math.ceil((Date.parse(iso) - Date.parse(handlers.now)) / 3_600_000)) : null);
  switch (journey.current) {
    case "requested":
    case "accepted": {
      const hours = hoursLeft(journey.requestExpiresAt);
      return { title: t("now.waitingHost", { name: hostName }), sentence: hours ? t("now.waitingHostLine", { hours }) : t("now.waitingHostLineNoTime") };
    }
    case "crew":
      if (journey.missing > 0) return { title: t("now.waitingMore", { count: journey.missing }), sentence: t("now.waitingMoreLine"), action: { label: t("now.inviteFriend"), onClick: handlers.onInvite, invite: true } };
      return { title: t("now.pickingPlace"), sentence: t("now.pickingPlaceLine"), action: { label: t("now.vote"), href: "#house-place" } };
    case "pay": {
      const share = getMyPayment(store, stay.id)?.total ?? stay.pricePerPerson ?? 0;
      const hours = hoursLeft(journey.payBy);
      return {
        title: hours ? t("now.payShare", { hours }) : t("now.payShareNoTime"),
        sentence: t("now.payShareLine", { amount: amount(share, stay.currency) }),
        action: { label: t("now.payNow"), onClick: handlers.onPay },
      };
    }
    case "arrival":
      if (!journey.booked) return { title: t("now.hostBooks", { name: hostName }), sentence: t("now.hostBooksLine") };
      return {
        title: journey.daysToStart > 0 ? t("now.inDays", { count: journey.daysToStart }) : t("now.today"),
        sentence: t("now.bookedLine", { dates: format.stayDatesLong(stay) }),
        action: { label: t("now.directions"), href: googleMapsUrl(stay), external: true },
      };
    default:
      return { title: t("now.livedIn"), sentence: t("now.livedInLine") };
  }
}

/** The steps across, cream: done a check, current an orange dot, still to come a ring (cream 30 %). Phones: the dots and the current title only. */
function Stepper({ journey }: { journey: GuestJourney }) {
  const t = useTranslations("house.steps");
  const label = (key: GuestStepKey) => (key === "crew" ? t("crew", { filled: journey.filled, total: journey.total }) : t(key));
  return (
    <ol aria-label={t("label")} className="flex items-start gap-2">
      {journey.steps.map((step, i) => (
        <li key={step.key} data-step={step.key} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined} className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                step.state === "done" ? "bg-ink text-inverse" : step.state === "current" ? "bg-accent/20" : "border-[1.5px] border-ink/30",
              )}
            >
              {step.state === "done" && <Check className="size-3" strokeWidth={3} />}
              {step.state === "current" && <span className="size-2 rounded-full bg-accent" />}
            </span>
            {i < journey.steps.length - 1 && <span aria-hidden className={cn("h-px flex-1", step.state === "done" ? "bg-ink/60" : "bg-ink/15")} />}
          </span>
          <span className={cn("max-sm:hidden", step.state === "todo" ? "text-ink/50" : "text-ink")}>
            <span className={cn("block truncate text-small", step.state === "current" && "font-semibold")}>{label(step.key)}</span>
            {step.key === "crew" && journey.together && <span className="block truncate text-small text-ink/50">{t("crewAndPlace")}</span>}
            {step.key === "arrival" && journey.booked && <span className="block truncate text-small text-ink/60">{t("bookedCheck")}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A member's head (requested, accepted, paid, booked): the same block – the photo a third, Ember two thirds – but instead of the price and
 * "Request to join": the title, dates · place, top right "Open chat" (cream outline) and "…" (Leave House, Report); the steps across; under
 * them the current step large (its title 28px, the sentence muted, its action a cream button) beside the crew's faces with the empty spots.
 */
export function MemberHero({ stay, host, crew, journey, content, chatHref, onLeave, ref }: { stay: Stay; host?: User; crew: User[]; journey: GuestJourney; content: StepContent; chatHref: string | null; onLeave: () => void; ref?: Ref<HTMLElement> }) {
  const tBack = useTranslations("common");
  const t = useTranslations("house.steps");
  const format = useFormat();
  return (
    // The same bento frame as the visitor's (HouseHero): the photos left (radius 24, as tall as the tile), the member's way through the House
    // as the one Ember tile right – the main action of this page.
    <section ref={ref} aria-labelledby="house-title" className="page-container explore-width pt-4">
      <div className="grid gap-4 split:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="relative aspect-4/5 overflow-hidden rounded-[24px] bg-band split:aspect-auto split:h-full split:max-h-[calc((var(--explore-w)-16px)/3*1.25)] split:min-h-100">
          <HeroPhotos photos={housePhotos(stay, host)} />
        </div>
        <div className="ember min-w-0 rounded-[24px] p-6 sm:p-8">
      <div className="flex h-full min-w-0 flex-col gap-6">
        {/* Phones: the actions sit above the title, so the title gets the whole width. */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {/* The way back: phones and the installed app. */}
              <BackButton fallback="/your-houses" label={tBack("back")} />
              <p className="text-eyebrow uppercase text-ink/60">{stay.customVibe?.trim() || format.vibe(stay.vibe)}</p>
            </div>
            <h1 id="house-title" className="mt-2 line-clamp-2 text-hero text-ink">
              {stay.title}
            </h1>
            {/* As in the visitor's head: 20px, one line, the area and the city – no country. */}
            <p className="mt-3 truncate text-h3 font-normal text-muted">
              {format.stayDatesLong(stay)} · {stay.location.area ? `${stay.location.area}, ${stay.location.city || stay.city}` : stay.location.city || stay.city || stay.region.split(",")[0]}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {chatHref && (
              <Button variant="creamOutline" size="sm" href={chatHref}>
                <MessageCircle aria-hidden />
                {t("openChat")}
              </Button>
            )}
            <SafetyMenu target={{ kind: "stay", id: stay.id }} extraItems={[{ label: t("leave"), danger: true, onSelect: onLeave }]} buttonClassName={iconButtonStyles("sm")} />
          </div>
        </div>

        <Stepper journey={journey} />
        {/* Phones: only the dots and the current step's name. */}
        {journey.current && (
          <p className="-mt-3 text-small font-semibold text-ink sm:hidden">
            {journey.current === "crew" ? t("crew", { filled: journey.filled, total: journey.total }) : t(journey.current)}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-[480px]">
            <p className="text-h2 text-ink">{content.title}</p>
            <p className="mt-1 text-body text-muted">{content.sentence}</p>
            {content.action && (
              <div className="mt-4">
                {content.action.href ? (
                  <Button variant="cream" size="lg" href={content.action.href} external={content.action.external}>
                    {content.action.label}
                  </Button>
                ) : (
                  <Button variant="cream" size="lg" onClick={content.action.onClick}>
                    {content.action.label}
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <CrewRow stay={stay} crew={crew} tone="dark" size="md" max={7} interactive={!content.action?.invite} />
            <CrewCount stay={stay} />
          </div>
        </div>
      </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Under a member's head, sections instead of the old Crew / Chat / Details buttons: "Crew {x} · {n} spots open" (faces 56px with first names,
 * empty circles with "+" to invite), "Place" (only "together": the shortlist and its vote), "Practical" (the address after booking, check-in and
 * -out, the cancellation rule, what's included). The House page's usual sections follow.
 */
export function MemberSections({ stay, crew }: { stay: Stay; crew: User[] }) {
  const t = useTranslations("house.steps.sections");
  const store = useStore();
  const tPage = useTranslations("house.page");
  const format = useFormat();
  const together = stay.accommodationStatus !== "locked";
  const booked = Boolean(stay.bookingConfirmedAt);
  const fact = (label: string, value: ReactNode) => (
    <div>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-0.5 text-body font-semibold text-ink">{value}</dd>
    </div>
  );
  return (
    <>
      <section aria-labelledby="house-member-crew">
        <RowHead id="house-member-crew" title={t("crew", { filled: crewInOf(store, stay), open: openSpots(stay) })} />
        <CrewRow stay={stay} crew={crew} size="lg" names className="mt-4" />
      </section>

      {together && (
        <section id="house-place" aria-labelledby="house-member-place" className="scroll-mt-28">
          <RowHead id="house-member-place" title={t("place")} />
          <div className="mt-4">{stay.accommodationVote ? <CrewVotes stay={stay} /> : <p className="text-body text-muted">{t("placeLater")}</p>}</div>
        </section>
      )}

      <section aria-labelledby="house-member-practical">
        <RowHead id="house-member-practical" title={t("practical")} />
        <dl className="mt-4 grid max-w-[760px] gap-x-8 gap-y-5 sm:grid-cols-2">
          {fact(
            t("address"),
            booked ? (
              <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                {[stay.location.area, stay.location.city ?? stay.city].filter(Boolean).join(", ")} ↗
              </a>
            ) : (
              <span className="font-normal text-muted">{t("addressLater")}</span>
            ),
          )}
          {fact(t("checkInOut"), format.stayDatesLong(stay))}
          {fact(
            t("cancellation"),
            <Link href="/faq#cancellation" className="font-normal underline-offset-4 hover:underline">
              {t("cancellationLine")}
            </Link>,
          )}
          {fact(t("included"), stay.hostFeePerPerson ? tPage("includedWithHost") : tPage("includedStay"))}
        </dl>
      </section>
    </>
  );
}

/** "Leave House": a small confirmation; a request still open is withdrawn instead. */
export function LeaveSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("house.steps");
  const store = useStore();
  const showToast = useToast();
  const [pending] = useState(() => store.joinRequests.some((r) => r.stayId === stay.id && r.userId === store.currentUserId && r.status === "pending"));
  return (
    <ConfirmSheet
      open={open}
      title={t("leaveTitle")}
      description={t("leaveText")}
      confirmLabel={t("leave")}
      onClose={onClose}
      onConfirm={() => {
        if (pending) store.withdrawRequest(stay.id);
        else store.leaveStay(stay.id);
        onClose();
        showToast(t("leftToast"));
      }}
    />
  );
}
