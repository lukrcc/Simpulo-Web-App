"use client";

// The arc in the House area (CLAUDE.md "Bogen"): the Arc bar on top of Plan (Before · Arrival · Together · Goodbye · After, the current phase
// lit, the next step with its date) and the step panel a Simpulo card opens (?arc=step): title, text, who sees it, its action, Skip.
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { USES_MOCK_DATA } from "@/lib/appMode";
import { Button } from "@/components/ui/ActionButton";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Input";
import { ARC_PHASES, ARC_STEPS, type ArcPhase } from "@/config/arc";
import { track } from "@/lib/analytics";
import { arcDateLabel, arcStateOf, crewDoneCount, useArc } from "@/lib/arc";
import { ARC_STEP_EVENT } from "@/config/notifications";
import { notify } from "@/lib/notify";
import { shortNameOf } from "@/lib/shortName";
import { settingsOf, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";


/**
 * The Arc bar: the five phases; under it the next open step with its date (House time). With `onSelect` the phases are tabs (the Plan tab,
 * CLAUDE.md "Plan nach Arc-Phasen"): the chosen one a graphite bar and graphite words, the others grey; the current phase keeps a small mark.
 */
export function ArcBar({ stay, selected, onSelect }: { stay: Stay; selected?: ArcPhase; onSelect?: (phase: ArcPhase) => void }) {
  const t = useTranslations("house.arc");
  const arc = useArc(stay);
  if (!arc) return null;
  const current = ARC_PHASES.indexOf(arc.phase);
  const shown = selected ?? arc.phase;
  return (
    <section aria-label={t("label")} data-arc-bar className="card-soft rounded-[20px] p-5">
      <ol role={onSelect ? "tablist" : undefined} className="grid grid-cols-5 gap-2">
        {ARC_PHASES.map((phase, i) => {
          const on = phase === shown;
          const inner = (
            <>
              <span className={cn("block h-1.5 rounded-full transition-colors duration-150", on ? "bg-ink" : i < current ? "bg-ink/25" : "bg-ink/10")} />
              <span className={cn("mt-2 block truncate text-small", on ? "font-semibold text-ink" : "text-muted")}>
                {t(`phases.${phase}`)}
                {i === current && !on && <span aria-hidden> ·</span>}
              </span>
            </>
          );
          return (
            <li key={phase} aria-current={i === current ? "step" : undefined} className="min-w-0">
              {onSelect ? (
                <button type="button" role="tab" aria-selected={on} onClick={() => onSelect(phase)} className="block w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
                  {inner}
                </button>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-body text-ink">
        {arc.next ? t("next", { title: t(`steps.${arc.next.step.id}.title` as "steps.welcome.title", { title: stay.title }), date: arcDateLabel(stay, arc.next.at) }) : t("allDone")}
      </p>
    </section>
  );
}

/** Steps with their own form in the tab (below the panel). */
const FORM_STEPS: readonly string[] = ["intention", "gettingThere", "hostCheckIn", "arrive", "firstNight", "agreement", "moment", "halftime", "peakPlan", "peakVote", "closing", "again", "chosen", "albumReady", "doItAgain", "thirtyDays"];

/** The step a card opened (?arc=step): its words, who sees what comes of it, and its action – Done (a private note for "write") or Skip. */
export function ArcStepPanel({ stay, stepId }: { stay: Stay; stepId: string }) {
  const t = useTranslations("house.arc");
  const store = useStore();
  const arc = useArc(stay);
  const step = ARC_STEPS.find((s) => s.id === stepId);
  const me = store.users.find((u) => u.id === store.currentUserId);
  const state = arcStateOf(me, stay.id, stepId);
  const saved = settingsOf(me).arcNotes?.[stay.id]?.[stepId] ?? "";
  const [note, setNote] = useState(saved);
  if (!step || !arc) return null;
  const due = arc.schedule.find((d) => d.step.id === stepId);
  const count = crewDoneCount(store, stay, stepId, due?.at ?? arc.now, arc.now);
  const write = step.action === "write" && step.visibility === "private";
  // Steps whose form lives in the tab itself (the intention in Me, the arrival in Plan, the check-in in Manage): saving there marks them done.
  const formInTab = FORM_STEPS.includes(stepId);
  const done = (text?: string) => {
    store.setArcStep(stay.id, stepId, "done", text);
    track("arc_action_done", { house: stay.id, step: stepId });
  };
  return (
    <section data-arc-step={stepId} className="rounded-[20px] border border-ink/10 bg-(--surface) p-5">
      <p className="text-eyebrow uppercase text-(--text-faint)">{t("sender")}</p>
      <h2 className="mt-1 text-h3 text-ink">{t(`steps.${stepId}.title` as "steps.welcome.title", { title: stay.title })}</h2>
      <p className="mt-1 text-body text-muted">{t(`steps.${stepId}.text` as "steps.welcome.text")}</p>
      <p className="mt-2 text-small text-muted">{t(`visibility.${step.visibility}`)}</p>
      {state === "open" && formInTab ? (
        <div className="mt-4">
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => {
              store.setArcStep(stay.id, stepId, "skipped");
              track("arc_step_skipped", { house: stay.id, step: stepId });
            }}
          >
            {t("skip")}
          </Button>
        </div>
      ) : state === "open" ? (
        <div className="mt-4 flex flex-col gap-3">
          {write && <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} rows={3} maxLength={280} />}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={write && note.trim() === ""} onClick={() => done(write ? note.trim() : undefined)}>
              {write ? t("save") : t("markDone")}
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => {
                store.setArcStep(stay.id, stepId, "skipped");
                track("arc_step_skipped", { house: stay.id, step: stepId });
              }}
            >
              {t("skip")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-body font-semibold text-ink">
            {state === "done" && <Check aria-hidden className="size-4" />}
            {state === "done" ? t("done", { done: count.done, of: count.of }) : t("skipped")}
          </span>
          {write && saved && <p className="w-full text-body text-ink">“{saved}”</p>}
          <Button size="sm" variant="tertiary" onClick={() => store.setArcStep(stay.id, stepId, "open")}>
            {t("undo")}
          </Button>
        </div>
      )}
    </section>
  );
}

/** "Mute Simpulo tips" (Me): no Simpulo cards in any House chat – the Arc bar stays. */
export function ArcMute({ compact = false }: { /** As a row on top of the head's "···" menu */ compact?: boolean } = {}) {
  const t = useTranslations("house.arc");
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const muted = Boolean(settingsOf(me).arcMuted);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className={cn("text-body text-ink", !compact && "font-semibold")}>{t("mute")}</p>
        {!compact && <p className="text-small text-muted">{t("muteHint")}</p>}
      </div>
      <Switch
        on={muted}
        label={t("mute")}
        onChange={(on) => {
          store.setArcMuted(on);
          if (on) track("arc_step_skipped", { muted: true });
        }}
      />
    </div>
  );
}

/**
 * The arc's email channel, in the mock: each due step with an email goes once to the Dev log (lib/notify/channels/email – console, log,
 * the demo's toast). TODO(email): sent by the backend at the step's moment, not when the House area is opened.
 */
export function useArcEmails(stay: Stay) {
  const t = useTranslations("house.arc");
  const store = useStore();
  const arc = useArc(stay);
  const me = store.currentUserId;
  useEffect(() => {
    // Mock e-mails only (dev, demo): in production the backend sends them – nothing is stored here.
    // Through the catalogue (config/notifications.ts): each step its entry (the day after, the album, Do it again …, else "arcStep"),
    // email and push by the House tips' switches; the in-app part is the card in the House chat (recorded).
    const user = store.users.find((u) => u.id === me);
    if (!arc || !me || !USES_MOCK_DATA) return;
    for (const d of arc.due) {
      if (!d.step.channels.includes("email")) continue;
      const key = `simpulo:arc-mail:${me}:${stay.id}:${d.step.id}`;
      try {
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, "1");
      } catch {
        continue;
      }
      notify(me, ARC_STEP_EVENT[d.step.id] ?? "arcStep", {
        recorded: true,
        house: shortNameOf(stay),
        text: `${stay.title}: ${t(`steps.${d.step.id}.title` as "steps.welcome.title", { title: stay.title })}`,
        body: t(`steps.${d.step.id}.text` as "steps.welcome.text"),
        url: `/h/${stay.id}?tab=${d.step.tab}&arc=${d.step.id}`,
        prefs: settingsOf(user).notifications,
        quiet: settingsOf(user).quietHours,
      });
    }
  }, [arc, me, stay, t, store.users]);
}
