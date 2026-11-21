"use client";

// The arc's arrival (CLAUDE.md "Bogen › Ankommen"): "I'm here" (the crew sees who has arrived), the first night's question cards (a full-
// screen deck – asked out loud, nothing saved but the signal that it started) and the House agreement (three votes, one option preset each,
// the result after 24 hours, the host confirms). Used in the House chat's Simpulo cards and in the Plan, Moments and Manage tabs.
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { useToast } from "@/components/ui/Toast";
import { CLOSING_CARDS, QUESTION_CARDS, QUESTION_LEVELS, type QuestionLevel } from "@/config/question-cards";
import { track } from "@/lib/analytics";
import { agreementOf, arcDateLabel, arrivedAt, useArcNow } from "@/lib/arc";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── I'm here ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "I'm here" for you, and who of the crew is here ("3 of 5 here", their faces; the rest muted). */
export function ArrivedPanel({ stay, compact = false }: { stay: Stay; compact?: boolean }) {
  const t = useTranslations("house.arrival");
  const store = useStore();
  const now = useArcNow(stay);
  const crew = getCrew(store, stay);
  const me = store.users.find((u) => u.id === store.currentUserId);
  const mine = me ? arrivedAt(store, me, stay, now) : null;
  const here = crew.map((u) => ({ user: u, at: arrivedAt(store, u, stay, now) }));
  const count = here.filter((h) => h.at).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {mine ? (
          <>
            <span className="text-body font-semibold text-ink">{t("youreHere")} ✓</span>
            <Button size="sm" variant="tertiary" onClick={() => store.setArrived(stay.id, false)}>
              {t("undo")}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              // The moment (the Dev menu's simulated House day, if set – lib/arc.ts useArcNow).
              store.setArrived(stay.id, true, new Date(now).toISOString());
              store.setArcStep(stay.id, "arrive", "done");
              track("arc_action_done", { house: stay.id, step: "arrive" });
            }}
          >
            {t("here")}
          </Button>
        )}
        <span className="text-small text-muted">{t("count", { here: count, total: crew.length })}</span>
      </div>
      {!compact && (
        <ul className="flex flex-col gap-2">
          {here.map(({ user, at }) => (
            <li key={user.id} className="flex items-center gap-3">
              <Avatar user={user} size="sm" className={at ? undefined : "opacity-45"} />
              <span className="w-24 shrink-0 truncate text-body font-semibold text-ink">{user.name.split(" ")[0]}</span>
              <span className={cn("text-body", at ? "text-ink" : "text-muted")}>{at ? t("hereAt", { time: arcDateLabel(stay, Date.parse(at)) }) : t("notYet")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── First night ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The host starts the first night (or the 19:00 card comes); everyone opens the cards. Kept: only when it started. */
export function FirstNightPanel({ stay, isHost }: { stay: Stay; isHost: boolean }) {
  const t = useTranslations("house.firstNight");
  const store = useStore();
  const now = useArcNow(stay);
  const [open, setOpen] = useState(false);
  const started = stay.firstNightStartedAt;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-muted">{t("hint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        {isHost && !started ? (
          <Button
            size="sm"
            onClick={() => {
              store.startFirstNight(stay.id, new Date(now).toISOString());
              store.setArcStep(stay.id, "firstNight", "done");
              track("arc_action_done", { house: stay.id, step: "firstNight", started: true });
              setOpen(true);
            }}
          >
            {t("start")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant={started ? "secondary" : "primary"}
            onClick={() => {
              store.setArcStep(stay.id, "firstNight", "done");
              track("arc_action_done", { house: stay.id, step: "firstNight" });
              setOpen(true);
            }}
          >
            {t("open")}
          </Button>
        )}
        {started && <span className="text-small text-muted">{t("started", { time: arcDateLabel(stay, Date.parse(started)) })}</span>}
      </div>
      <QuestionDeck open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/**
 * The question cards, full screen: a level switch (Light · Deeper · Personal), one big card, swipe or tap ‹ › (arrow keys too), the hint
 * on top "Ask out loud. Nothing here is saved." – nothing is stored, no answers exist.
 */
export function QuestionDeck({ open, onClose, deck = "firstNight" }: { open: boolean; onClose: () => void; /** "closing": the closing circle's three questions, no levels */ deck?: "firstNight" | "closing" }) {
  const t = useTranslations("house.firstNight");
  const tg = useTranslations("house.goodbye");
  const tq = useTranslations("house.questions");
  const [level, setLevel] = useState<QuestionLevel>("light");
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const closing = deck === "closing";
  const cards = closing ? CLOSING_CARDS : QUESTION_CARDS[level];
  const cardKey = (id: string) => (closing ? `closing.${id}` : `${level}.${id}`) as "light.realReason";
  const go = (by: 1 | -1) => setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + by)));

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min((closing ? CLOSING_CARDS : QUESTION_CARDS[level]).length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, level, closing]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={closing ? tg("closingTitle") : t("title")} data-question-deck className="fixed inset-0 z-80 flex flex-col bg-stage text-stage-text">
      <div className="flex items-center justify-between gap-4 px-(--page-margin) pt-[calc(var(--safe-top)+16px)]">
        <p className="text-small text-stage-text/70">{t("hint")}</p>
        <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-11 items-center justify-center rounded-full bg-stage-text/10 hover:bg-stage-text/16">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className={cn("mt-4 flex justify-center px-(--page-margin)", closing && "hidden")}>
        <CapsuleGroup
          label={t("title")}
          value={level}
          onChange={(next) => {
            setLevel(next);
            setIndex(0);
          }}
          className="w-fit max-w-full"
          options={QUESTION_LEVELS.map((l) => ({ value: l, content: t(`levels.${l}`) }))}
        />
      </div>
      <div
        className="flex flex-1 items-center justify-center gap-4 px-(--page-margin) py-8"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label={t("previous")} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-stage-text/10 disabled:opacity-30 max-md:hidden">
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label={t("next")} data-no-tooltip className="flex aspect-[4/5] w-full max-w-[440px] select-none flex-col justify-between rounded-[28px] bg-stage-text p-8 text-left text-stage shadow-(--shadow-float)">
          <span className="text-eyebrow uppercase opacity-60">{closing ? tg("closingTitle") : t(`levels.${level}`)}</span>
          <span className="text-h1">{tq(cardKey(cards[index]))}</span>
          <span className="text-small opacity-60">{t("counter", { n: index + 1, total: cards.length })}</span>
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === cards.length - 1} aria-label={t("next")} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-stage-text/10 disabled:opacity-30 max-md:hidden">
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Moments: the question cards, any evening. */
export function QuestionCardsEntry() {
  const t = useTranslations("house.firstNight");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] card-soft p-5">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{t("again")}</p>
        <p className="text-small text-muted">{t("againHint")}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
      <QuestionDeck open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ── House agreement ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The House agreement: three questions, one option preset each (whoever doesn't vote leaves it); your vote changes until the votes close
 * (24 h after the card); then the result stands – the host confirms it. `compact`: in the chat card.
 */
export function AgreementPanel({ stay, isHost, compact = false }: { stay: Stay; isHost: boolean; compact?: boolean }) {
  const t = useTranslations("house.agreement");
  const tTasks = useTranslations("house.before.tasks");
  const store = useStore();
  const showToast = useToast();
  const now = useArcNow(stay);
  const a = agreementOf(store, stay, now);
  const host = findUser(store, stay.hostId)?.name.split(" ")[0] ?? "";
  const locked = a.closed || Boolean(a.confirmedAt);
  return (
    <div className="flex flex-col gap-4">
      {a.questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-2">
          <p className="text-body font-semibold text-ink">{t(`questions.${q.id}` as "questions.quiet")}</p>
          {locked ? (
            <p className="text-body text-ink">
              {t("closed")}: <span className="font-semibold">{t(`options.${q.id}.${q.result}` as "options.quiet.23")}</span>
              {!compact && <span className="text-small text-muted"> · {q.options.map((o) => `${t(`options.${q.id}.${o}` as "options.quiet.23")} ${q.counts[o] ?? 0}`).join(" · ")}</span>}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <CapsuleGroup
                size="sm"
                label={t(`questions.${q.id}` as "questions.quiet")}
                value={q.mine ?? q.preset}
                onChange={(option) => {
                  store.voteAgreement(stay.id, q.id, option);
                  store.setArcStep(stay.id, "agreement", "done");
                  track("arc_action_done", { house: stay.id, step: "agreement" });
                }}
                className="w-fit max-w-full"
                options={q.options.map((o) => ({ value: o, content: `${t(`options.${q.id}.${o}` as "options.quiet.23")}${o === q.preset ? ` · ${t("preset")}` : ""}` }))}
              />
              {!compact && <span className="text-small text-muted">{q.options.map((o) => `${t(`options.${q.id}.${o}` as "options.quiet.23")} ${q.counts[o] ?? 0}`).join(" · ")}</span>}
            </div>
          )}
        </div>
      ))}
      <p className="text-small text-muted">
        {a.confirmedAt ? t("confirmed", { host }) : locked ? t("visibility") : `${t("closes", { date: arcDateLabel(stay, a.closesAt) })} · ${t("visibility")}`}
      </p>
      {isHost && !a.confirmedAt && !compact && (
        <div>
          <Button
            size="sm"
            disabled={!a.closed}
            onClick={() => {
              store.confirmAgreement(stay.id);
              showToast(tTasks("agreementConfirmed"));
            }}
          >
            {tTasks("agreementConfirm")}
          </Button>
          {!a.closed && <p className="mt-2 text-small text-muted">{tTasks("agreementOpen", { date: arcDateLabel(stay, a.closesAt) })}</p>}
        </div>
      )}
    </div>
  );
}
