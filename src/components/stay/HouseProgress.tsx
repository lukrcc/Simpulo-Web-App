"use client";

import { CalendarPlus, Check, Clock, Home, MapPin, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { openVote } from "@/lib/crewVotes";
import { downloadIcs } from "@/lib/ics";
import { linkDomain } from "@/lib/links";
import { convertApprox } from "@/lib/rates";
import { hoursLeft } from "@/lib/requests";
import { getCrew, getMyPayment, paymentProgress, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, firstName, googleMapsUrl, openSpots } from "@/lib/utils";

const HOST_STEPS = ["open", "crew", "paid", "booked", "arrival"] as const;
const GUEST_STEPS = ["request", "pay", "booked", "arrival"] as const;
const DAY_MS = 86_400_000;
/** From this many days before the start the card is about arriving. */
const ARRIVAL_DAYS = 7;

/** The outline button of a step's card ("Add to calendar", "Directions"): no fill, a 1.5px ink edge. */
const OUTLINE = cn(buttonStyles("secondary", "md"), "border-[1.5px] border-ink bg-transparent shadow-none");

export interface Step {
  key: string;
  label: string;
  done: boolean;
}

/**
 * Where it stands, compact on one line: a dot and its word per step, joined by a line – done ink with a check (its word in the past: "Paid"),
 * the current one larger with a gentle pulse (its word the next thing to do: "Pay"), the rest an outline. Never a step marked done that isn't.
 */
export function Stepper({ steps, label }: { steps: Step[]; label: string }) {
  const t = useTranslations("houses.overview");
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol aria-label={label} className="flex items-center gap-2">
      {steps.map((step, i) => {
        const state = step.done ? "done" : i === current ? "now" : "later";
        return (
          <li key={step.key} className={cn("flex min-w-0 items-center gap-2", i < steps.length - 1 && "flex-1")}>
            <span aria-hidden className="relative flex size-5 shrink-0 items-center justify-center">
              {state === "done" && (
                <span className="flex size-5 items-center justify-center rounded-full bg-ink text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
              {state === "now" && (
                <>
                  <span className="progress-pulse absolute size-5 rounded-full bg-ink/25" />
                  <span className="relative size-3.5 rounded-full bg-ink ring-[3px] ring-bg" />
                </>
              )}
              {state === "later" && <span className="size-3 rounded-full border-2 border-ink/25" />}
            </span>
            <span className={cn("shrink-0 text-small", state === "now" ? "font-semibold text-ink" : state === "done" ? "text-ink" : "text-muted")}>
              {step.label}
              <span className="sr-only"> · {t(`state.${state}`)}</span>
            </span>
            {i < steps.length - 1 && <span aria-hidden className={cn("h-0.5 min-w-4 flex-1 rounded-full", step.done ? "bg-ink" : "bg-ink/15")} />}
          </li>
        );
      })}
    </ol>
  );
}

/** The one card under the stepper: what the current step is about and its action. At most 640px, left-aligned. */
export function StepCard({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <section id={id} className="flex max-w-[640px] scroll-mt-[calc(var(--header-total)+24px)] flex-col gap-4 rounded-[20px] bg-(--card) p-6">
      {children}
    </section>
  );
}

/** A small chip on a step's card: a countdown, a date. */
function CardChip({ children, icon: Icon = Clock }: { children: ReactNode; icon?: typeof Clock }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-ink/6 px-3 text-small font-semibold text-ink">
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}

const sentence = (text: string) => <p className="text-body-lg text-ink">{text}</p>;

/** "31h left" under two days, else "3 days left". */
function useLeft() {
  const t = useTranslations("houses.overview.next");
  return (hours: number) => (hours < 48 ? t("leftHours", { count: Math.max(1, Math.floor(hours)) }) : t("leftDays", { count: Math.floor(hours / 24) }));
}

/** The host's way: Open · Crew complete · Everyone paid · Booked · Arrival – and the card with what's to do now. */
export function HostProgress({ stay, requests, chat, onSheet, onLock }: { stay: Stay; requests: JoinRequest[]; chat: string | null; onSheet: (sheet: "requests" | "details") => void; onLock: () => void }) {
  const t = useTranslations("houses.overview");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [now] = useState(() => Date.now());
  const progress = paymentProgress(store, stay.id);
  const locked = stay.accommodationStatus === "locked";
  const done = [
    stay.status !== "draft",
    stay.spotsFilled >= stay.spotsTotal,
    progress.allPaid || Boolean(stay.allPaidAt),
    Boolean(stay.bookingConfirmedAt),
    Boolean(stay.startDate) && Date.parse(stay.startDate) <= now,
  ];
  const current = HOST_STEPS[done.findIndex((d) => !d)];
  const due = stay.paymentDueAt ? f.day(stay.paymentDueAt) : "";
  const action = (children: ReactNode) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

  const next: ReactNode =
    current === "open" ? (
      <>
        {sentence(t("next.finish"))}
        {action(<Button size="md" href={`/your-houses/${stay.id}/edit`}>{t("next.finishAction")}</Button>)}
      </>
    ) : current === "crew" ? (
      requests.length > 0 ? (
        <>
          {sentence(t("next.requests", { count: requests.length }))}
          {action(<Button size="md" onClick={() => onSheet("requests")}>{t("next.seeRequests")}</Button>)}
        </>
      ) : (
        <>
          {sentence(t("next.spotsLeft", { count: openSpots(stay) }))}
          {action(<Button size="md" onClick={() => onSheet("details")}>{t("next.invite")}</Button>)}
        </>
      )
    ) : current === "paid" ? (
      !locked ? (
        openVote(stay, "accommodation") && chat ? (
          <>
            {sentence(t("next.voting"))}
            {action(<Button size="md" href={chat}>{t("next.openChat")}</Button>)}
          </>
        ) : (
          <>
            {sentence(t("next.choosePlace"))}
            {action(<Button size="md" onClick={onLock}>{t("next.choosePlaceAction")}</Button>)}
          </>
        )
      ) : (
        <>
          {sentence(t("next.paymentsOpen", { open: progress.count - progress.paidCount, date: due }))}
          <CrewPaid stay={stay} />
          {action(<Button size="md" onClick={() => showToast(t("next.reminded"))}>{t("next.remind")}</Button>)}
        </>
      )
    ) : current === "booked" ? (
      <>
        {sentence(t("next.book"))}
        {action(<Button size="md" onClick={() => onSheet("details")}>{t("next.markBooked")}</Button>)}
      </>
    ) : current === "arrival" ? (
      <ArrivalCard stay={stay} chat={chat} now={now} />
    ) : (
      sentence(t("next.ready"))
    );

  return (
    <>
      <Stepper label={t("progress")} steps={HOST_STEPS.map((key, i) => ({ key, label: t(`steps.${key}`), done: done[i] }))} />
      <StepCard>{next}</StepCard>
    </>
  );
}

/** Everyone who pays, with a check (paid) or a clock (still open) on their face – "3 of 4 paid". */
function CrewPaid({ stay }: { stay: Stay }) {
  const store = useStore();
  const payers = getCrew(store, stay).filter((u) => store.payments.some((p) => p.stayId === stay.id && p.userId === u.id && p.status !== "refunded"));
  return (
    <ul className="flex flex-wrap gap-2">
      {payers.map((u) => {
        const paid = paymentStatus(store, stay.id, u.id) === "paid";
        return (
          <li key={u.id} className="relative">
            <Avatar user={u} size="md" className={paid ? undefined : "opacity-60"} />
            <span aria-hidden className={cn("absolute -bottom-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full ring-2 ring-(--card)", paid ? "bg-ink text-white" : "bg-ink/15 text-ink")}>
              {paid ? <Check className="size-2.5" strokeWidth={3.5} /> : <Clock className="size-2.5" strokeWidth={3} />}
            </span>
            <span className="sr-only">{`${firstName(u)}: ${paid ? "paid" : "open"}`}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** ≤ 7 days before, and on the day: "Starts in 3 days" / "Today" – Directions on the day, Open chat before. */
function ArrivalCard({ stay, chat, now }: { stay: Stay; chat: string | null; now: number }) {
  const t = useTranslations("houses.overview.card");
  const days = Math.ceil((Date.parse(`${stay.startDate}T00:00:00`) - now) / DAY_MS);
  const today = days <= 0;
  return (
    <>
      <p className="text-h2 text-ink">{today ? t("today") : t("startsIn", { count: days })}</p>
      <div className="flex flex-wrap gap-3">
        {today ? (
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener" className={buttonStyles("primary", "md")}>
            <MapPin aria-hidden />
            {t("directions")}
          </a>
        ) : (
          chat && (
            <Button size="md" href={chat}>
              <MessageCircle aria-hidden />
              {t("openChat")}
            </Button>
          )
        )}
      </div>
    </>
  );
}

/**
 * A guest's way: Requested · Pay · Booked · Arrival. The current step is named after what's next ("Pay"), done ones in the past with a check
 * ("Paid"). Under it ONE card for the current step – waiting for the host, paying, the crew paying, the place booked, arriving.
 */
export function GuestProgress({
  stay,
  request,
  host,
  onPay,
  onRespond,
  onWithdraw,
  chat,
  extra,
}: {
  stay: Stay;
  request?: JoinRequest;
  host?: User;
  onPay?: () => void;
  /** Invited: accept or decline */
  onRespond?: (accept: boolean) => void;
  onWithdraw?: () => void;
  chat: string | null;
  /** Instead of the step's card (a refund, a cancelled House) */
  extra?: ReactNode;
}) {
  const t = useTranslations("houses.overview");
  const tCard = useTranslations("houses.overview.card");
  const f = useFormat();
  const store = useStore();
  const viewer = usePreferredCurrency();
  const left = useLeft();
  const [now] = useState(() => Date.now());
  const mine = getMyPayment(store, stay.id);
  const accepted = request?.status === "accepted";
  const paid = accepted && mine?.status === "paid";
  const booked = paid && Boolean(stay.bookingConfirmedAt);
  const arrived = booked && Date.parse(stay.startDate) <= now;
  const done = [accepted, paid, booked, arrived];
  const hostName = host ? firstName(host) : "";
  const labels = {
    request: request?.status === "invited" ? t("guestFlow.invited") : accepted ? t("guestFlow.accepted") : t("guestFlow.requested"),
    pay: paid ? t("guestFlow.paid") : t("guestFlow.pay"),
    booked: booked ? t("guestFlow.booked") : t("guestFlow.booking"),
    arrival: arrived ? t("guestFlow.arrived") : t("guestFlow.arrival"),
  };
  const progress = paymentProgress(store, stay.id);
  const daysToStart = Math.ceil((Date.parse(`${stay.startDate}T00:00:00`) - now) / DAY_MS);

  let card: ReactNode;
  if (extra) card = extra;
  else if (request?.status === "invited" && onRespond) {
    card = (
      <>
        {sentence(t("next.invited", { name: hostName }))}
        <div className="flex flex-wrap gap-3">
          <Button size="md" onClick={() => onRespond(true)}>{t("next.acceptInvite")}</Button>
          <Button variant="tertiary" size="md" onClick={() => onRespond(false)}>{t("next.declineInvite")}</Button>
        </div>
      </>
    );
  } else if (request && !accepted) {
    // Requested (or asked for the waitlist): waiting for the host, with how long the request still runs.
    const waitlist = request.status === "waitlist_requested" || request.status === "waitlisted";
    card = (
      <>
        <div className="flex items-center gap-3">
          {host && <Avatar user={host} size="row" />}
          <p className="min-w-0 flex-1 text-body-lg text-ink">{request.status === "waitlisted" ? tCard("onWaitlist") : t("next.waiting", { name: hostName })}</p>
          {!waitlist && <CardChip>{left(hoursLeft(request, now))}</CardChip>}
        </div>
        {onWithdraw && (
          <button type="button" onClick={onWithdraw} className="self-start text-small font-semibold text-ink underline-offset-4 hover:underline">
            {tCard("withdraw")}
          </button>
        )}
      </>
    );
  } else if (accepted && onPay && mine && mine.status !== "paid") {
    // Pay: the amount large, in the House's currency, ≈ the viewer's beside it.
    const own = f.price(mine.total, stay.currency);
    const approx = stay.currency === viewer ? null : f.price(Math.round(convertApprox(mine.total, stay.currency, viewer)), viewer);
    const hours = stay.paymentDueAt ? Math.max(0, (Date.parse(stay.paymentDueAt) - now) / 3_600_000) : null;
    card = (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-h2 tabular-nums text-ink">
            {own}
            {approx && <span className="ml-2 text-body-lg font-normal text-muted">≈ {approx}</span>}
          </p>
          {hours !== null && <CardChip>{left(hours)}</CardChip>}
        </div>
        <div>
          <Button size="md" onClick={onPay}>{t("next.payNow")}</Button>
        </div>
      </>
    );
  } else if (accepted && !paid) {
    // In, nothing to pay yet: the crew filling up, or the place being decided.
    card = (
      <>
        {sentence(openVote(stay, "accommodation") ? t("next.voting") : tCard("payLater", { filled: stay.spotsFilled, total: stay.spotsTotal }))}
        <div className="flex flex-wrap items-center gap-3">
          {openVote(stay, "accommodation") && chat && <Button size="md" href={chat}>{t("next.openChat")}</Button>}
        </div>
      </>
    );
  } else if (paid && !booked) {
    card = progress.allPaid ? (
      sentence(tCard("waitBooking", { name: hostName }))
    ) : (
      <>
        {sentence(tCard("paidOf", { paid: progress.paidCount, total: progress.count }))}
        <CrewPaid stay={stay} />
      </>
    );
  } else if (booked && !arrived && daysToStart > ARRIVAL_DAYS) {
    card = (
      <>
        {sentence(tCard("booked", { name: hostName }))}
        <div className="flex items-center gap-3 text-body text-ink">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink/6">
            <Home aria-hidden className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            {stay.accommodationLink ? (
              <a href={stay.accommodationLink} target="_blank" rel="noopener" className="block truncate font-semibold underline-offset-4 hover:underline">
                {linkDomain(stay.accommodationLink)} ↗
              </a>
            ) : (
              <span className="block font-semibold">{tCard("place")}</span>
            )}
            <span className="block text-small text-muted">{tCard("checkIn", { date: f.day(stay.startDate) })}</span>
          </span>
        </div>
        <div>
          <button type="button" onClick={() => downloadIcs(stay)} className={OUTLINE}>
            <CalendarPlus aria-hidden />
            {tCard("addToCalendar")}
          </button>
        </div>
      </>
    );
  } else if (booked) {
    card = <ArrivalCard stay={stay} chat={chat} now={now} />;
  } else {
    card = sentence(t("next.ready"));
  }

  return (
    <>
      <Stepper label={t("progress")} steps={GUEST_STEPS.map((key, i) => ({ key, label: labels[key], done: done[i] }))} />
      <StepCard>{card}</StepCard>
    </>
  );
}
