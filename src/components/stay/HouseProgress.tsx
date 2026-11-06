"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/ActionButton";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { openVote } from "@/lib/crewVotes";
import { getMyPayment, paymentProgress, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";

const HOST_STEPS = ["open", "crew", "paid", "booked", "arrival"] as const;
const GUEST_STEPS = ["requested", "accepted", "paid", "booked", "arrival"] as const;

/**
 * Where it stands, as a stepper across the full width: five steps on one line – done ink with a check, the current one larger with a gentle
 * pulse, the rest an outline – and under it what's next, a sentence and a button. No picture behind it.
 */
function Stepper({ labels, done, next, label }: { labels: { key: string; text: string }[]; done: boolean[]; next: ReactNode; label: string }) {
  const t = useTranslations("houses.overview");
  const current = done.findIndex((d) => !d);
  return (
    <section aria-label={label} className="flex flex-col gap-6">
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map(({ key, text }, i) => {
          const state = done[i] ? "done" : i === current ? "now" : "later";
          return (
            <li key={key} className="relative flex flex-col items-center gap-3 text-center">
              {/* The line to the next step, from this dot's centre to the next one's: ink where it's been walked. */}
              {i < labels.length - 1 && <span aria-hidden className={cn("absolute left-1/2 top-[11px] h-0.5 w-full", done[i] ? "bg-ink" : "bg-ink/15")} />}
              <span aria-hidden className="relative flex size-6 items-center justify-center">
                {state === "done" && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-ink text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
                {state === "now" && (
                  <>
                    <span className="progress-pulse absolute size-6 rounded-full bg-ink/25" />
                    <span className="relative size-4 rounded-full bg-ink ring-4 ring-bg" />
                  </>
                )}
                {state === "later" && <span className="size-3.5 rounded-full border-2 border-ink/25 bg-bg" />}
              </span>
              <span className={cn("px-1 text-small", state === "now" ? "font-semibold text-ink" : state === "done" ? "text-ink" : "text-muted")}>
                {text}
                <span className="sr-only"> · {t(`state.${state}`)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {next && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{next}</div>}
    </section>
  );
}

const sentence = (text: string) => <p className="text-body-lg text-ink">{text}</p>;

/** The host's way: Open · Crew complete · Everyone paid · Booked · Arrival – and what's to do now. */
export function HostProgress({ stay, requests, chat, onTab, onLock }: { stay: Stay; requests: JoinRequest[]; chat: string | null; onTab: (tab: "requests" | "payments" | "share") => void; onLock: () => void }) {
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

  const next: ReactNode =
    current === "open" ? (
      <>
        {sentence(t("next.finish"))}
        <Button size="sm" href={`/my-stays/${stay.id}/edit`}>{t("next.finishAction")}</Button>
      </>
    ) : current === "crew" ? (
      requests.length > 0 ? (
        <>
          {sentence(t("next.requests", { count: requests.length }))}
          <Button variant="secondary" size="sm" onClick={() => onTab("requests")}>{t("next.seeRequests")}</Button>
        </>
      ) : (
        <>
          {sentence(t("next.spotsLeft", { count: openSpots(stay) }))}
          <Button variant="secondary" size="sm" onClick={() => onTab("share")}>{t("next.invite")}</Button>
        </>
      )
    ) : current === "paid" ? (
      !locked ? (
        openVote(stay, "accommodation") && chat ? (
          <>
            {sentence(t("next.voting"))}
            <Button variant="secondary" size="sm" href={chat}>{t("next.openChat")}</Button>
          </>
        ) : (
          <>
            {sentence(t("next.choosePlace"))}
            <Button variant="secondary" size="sm" onClick={onLock}>{t("next.choosePlaceAction")}</Button>
          </>
        )
      ) : (
        <>
          {sentence(t("next.paymentsOpen", { open: progress.count - progress.paidCount, date: due }))}
          <Button variant="secondary" size="sm" onClick={() => showToast(t("next.reminded"))}>{t("next.remind")}</Button>
        </>
      )
    ) : current === "booked" ? (
      <>
        {sentence(t("next.book"))}
        <Button variant="secondary" size="sm" onClick={() => onTab("payments")}>{t("next.markBooked")}</Button>
      </>
    ) : current === "arrival" ? (
      sentence(t("next.ready"))
    ) : null;

  return <Stepper label={t("progress")} labels={HOST_STEPS.map((key) => ({ key, text: t(`steps.${key}`) }))} done={done} next={next} />;
}

/** A guest's own way: Requested · Accepted · Paid · Booked · Arrival – and what's to do now. */
export function GuestProgress({ stay, request, hostName, onPay, chat }: { stay: Stay; request?: JoinRequest; hostName: string; onPay?: () => void; chat: string | null }) {
  const t = useTranslations("houses.overview");
  const f = useFormat();
  const store = useStore();
  const [now] = useState(() => Date.now());
  const mine = getMyPayment(store, stay.id);
  const accepted = request?.status === "accepted";
  const done = [
    Boolean(request) && request?.status !== "invited",
    accepted,
    accepted && mine?.status === "paid",
    accepted && Boolean(stay.bookingConfirmedAt),
    accepted && Boolean(stay.startDate) && Date.parse(stay.startDate) <= now,
  ];
  const due = stay.paymentDueAt ? f.day(stay.paymentDueAt) : null;
  const next: ReactNode =
    request?.status === "pending" ? (
      sentence(t("next.waiting", { name: hostName }))
    ) : onPay && due ? (
      <>
        {sentence(t("next.yourShare", { date: due }))}
        <Button size="sm" onClick={onPay}>{t("next.payNow")}</Button>
      </>
    ) : openVote(stay, "accommodation") && chat ? (
      <>
        {sentence(t("next.voting"))}
        <Button variant="secondary" size="sm" href={chat}>{t("next.openChat")}</Button>
      </>
    ) : accepted && !mine ? (
      sentence(t("paymentsLater"))
    ) : done[3] && !done[4] ? (
      sentence(t("next.ready"))
    ) : null;
  return <Stepper label={t("progress")} labels={GUEST_STEPS.map((key) => ({ key, text: t(`guestSteps.${key}`) }))} done={done} next={next} />;
}
