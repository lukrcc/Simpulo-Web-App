"use client";

// A Simpulo card in the House chat (CLAUDE.md "Bogen"): an arc step that's due (config/arc.ts, lib/arc.ts) – sender "Simpulo", title, a short
// text, its action (opens the tab that keeps the result, ?tab=…&arc=…) and "Skip". Done: "Done · 4 of 5". Never stored as a message: the
// list adds it when it's due. Signals only (seen, done, skipped) – never what anyone wrote.
import { againHref } from "@/components/create/model";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/ActionButton";
import { ARC_STEPS } from "@/config/arc";
import { track } from "@/lib/analytics";
import { agreementOf, arcStateOf, crewDoneCount } from "@/lib/arc";
import { useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { AgreementPanel, ArrivedPanel, FirstNightPanel } from "@/components/stay/ArcArrival";
import { DayMomentPanel, PeakPanel } from "@/components/stay/ArcMiddle";
import { ChosenLink, ClosingPanel, useChosenTitle } from "@/components/stay/ArcGoodbye";
import { AlbumAsk, AlbumReady } from "@/components/stay/Album";
import { DoItAgainPanel } from "@/components/stay/ArcAfterwards";
import { cn } from "@/lib/utils";

/** Cards already counted as seen in this page load (memory only). */
const seenCards = new Set<string>();

export function ArcChatCard({ stay, stepId, at, now }: { stay: Stay; stepId: string; at: number; now: number }) {
  const t = useTranslations("house.arc");
  const store = useStore();
  const step = ARC_STEPS.find((s) => s.id === stepId);
  const me = store.users.find((u) => u.id === store.currentUserId);
  const state = arcStateOf(me, stay.id, stepId);
  // "You and Ana chose each other" – the card names the people (only mutual choices).
  const chosenTitle = useChosenTitle(stay);

  // "Card seen" once per House and step and page load (a signal, data point arc.cardSeen) – kept in memory, nothing stored.
  useEffect(() => {
    const key = `${stay.id}:${stepId}`;
    if (seenCards.has(key)) return;
    seenCards.add(key);
    track("arc_card_seen", { house: stay.id, step: stepId });
  }, [stay.id, stepId]);

  if (!step) return null;
  const count = crewDoneCount(store, stay, stepId, at, now);
  const isHost = stay.hostId === store.currentUserId;
  // Three steps act right in the card: "I'm here", the first night's cards, the House agreement's votes.
  // …and the moment of the day and the high point's proposal (a vote each), and the closing circle's cards.
  const inline =
    stepId === "arrive" ? (
      <ArrivedPanel stay={stay} compact />
    ) : stepId === "firstNight" ? (
      <FirstNightPanel stay={stay} isHost={isHost} />
    ) : stepId === "agreement" ? (
      <AgreementPanel stay={stay} isHost={isHost} compact />
    ) : stepId === "moment" ? (
      <DayMomentPanel stay={stay} at={at} />
    ) : stepId === "peakVote" ? (
      <PeakPanel stay={stay} isHost={isHost} compact />
    ) : stepId === "closing" ? (
      <ClosingPanel stay={stay} isHost={isHost} compact />
    ) : stepId === "chosen" ? (
      <ChosenLink />
    ) : stepId === "albumReady" ? (
      <AlbumReady stay={stay} />
    ) : stepId === "doItAgain" ? (
      <DoItAgainPanel stay={stay} compact />
    ) : stepId === "anniversary" ? (
      // A year on: the album and "Do it again" (the old crew picked in Fill your House) – no skip needed, it's a hello.
      <div className="flex flex-wrap gap-2">
        <Link href={`/h/${stay.id}?tab=moments`} className={buttonStyles("primary", "sm")}>
          {t("steps.anniversary.action")}
        </Link>
        <Link href={againHref(stay.id)} className={buttonStyles("secondary", "sm")}>
          {t("steps.anniversary.doItAgain")}
        </Link>
      </div>
    ) : null;
  const href = `/h/${stay.id}?tab=${step.tab}&arc=${stepId}`;
  return (
    <div data-arc-card={stepId} className="mx-auto my-3 w-full max-w-[420px] rounded-[20px] border border-ink/8 bg-(--surface) p-4 shadow-(--shadow-sm)">
      <p className="flex items-center gap-1.5 text-eyebrow uppercase text-(--text-faint)">
        <Sparkles aria-hidden className="size-3.5" />
        {t("sender")}
      </p>
      <p className="mt-1.5 text-body font-semibold text-ink">{stepId === "chosen" && chosenTitle ? chosenTitle : t(`steps.${stepId}.title` as "steps.welcome.title", { title: stay.title })}</p>
      <p className="mt-0.5 text-small text-muted">{t(`steps.${stepId}.text` as "steps.welcome.text")}</p>
      {inline && (
        <div className="mt-3 flex flex-col gap-2">
          {inline}
          {state === "open" && stepId !== "chosen" && stepId !== "albumReady" && stepId !== "anniversary" && !(stepId === "agreement" && agreementOf(store, stay, now).closed) && (
            <button
              type="button"
              onClick={() => {
                store.setArcStep(stay.id, stepId, "skipped");
                track("arc_step_skipped", { house: stay.id, step: stepId });
              }}
              className={cn(buttonStyles("tertiary", "sm"), "self-start")}
            >
              {t("skip")}
            </button>
          )}
        </div>
      )}
      <div className={cn("mt-3 flex flex-wrap items-center gap-2", inline && "hidden")}>
        {state === "open" ? (
          <>
            <Link href={href} className={buttonStyles("primary", "sm")}>
              {t(`steps.${stepId}.action` as "steps.welcome.action")}
            </Link>
            <button
              type="button"
              onClick={() => {
                store.setArcStep(stay.id, stepId, "skipped");
                track("arc_step_skipped", { house: stay.id, step: stepId });
              }}
              className={buttonStyles("tertiary", "sm")}
            >
              {t("skip")}
            </button>
          </>
        ) : (
          <Link href={href} className={cn("text-small font-semibold underline-offset-4 hover:underline", state === "done" ? "text-ink" : "text-muted")}>
            {state === "done" ? t("done", { done: count.done, of: count.of }) : t("skipped")}
          </Link>
        )}
        {state === "open" && count.done > 0 && <span className="text-small text-muted">{t("done", { done: count.done, of: count.of })}</span>}
      </div>
      {/* The last evening and the day after: "Add 3 photos to the album" – inside the card (one Simpulo card a day). */}
      {(stepId === "closing" || stepId === "again") && (
        <div className="mt-3">
          <AlbumAsk stay={stay} />
        </div>
      )}
    </div>
  );
}
