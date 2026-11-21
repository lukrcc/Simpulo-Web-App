"use client";

// The arc's middle (CLAUDE.md "Bogen › Mittendrin"): the moment of the day (a proposal for tomorrow to vote on – the agreed ones go into
// Plan › Rhythm), halftime (private – how close to your intention, what would help; a Pro host sees only the anonymous average) and the
// high point (a Pro host sets their own, otherwise the crew votes on a proposal by theme).
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { HALFTIME_MIN_ANSWERS } from "@/config/arc";
import { track } from "@/lib/analytics";
import { agreedMoments, arcDateLabel, dayMomentAt, halftimeAt, halftimeAverage, momentVotes, peakIdea, peakVotes, useArc, useArcNow } from "@/lib/arc";
import { findUser, settingsOf, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const dayLabel = (stay: Stay, date: string) => arcDateLabel(stay, Date.parse(`${date}T12:00:00Z`), false);

/** In / Not this time, the count beside it. */
function InOut({ mine, yes, onVote }: { mine: boolean | null; yes: number; onVote: (inFor: boolean) => void }) {
  const t = useTranslations("house.middle");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CapsuleGroup
        size="sm"
        label={t("in")}
        value={mine === null ? null : mine ? "in" : "out"}
        onChange={(v) => onVote(v === "in")}
        className="w-fit"
        options={[
          { value: "in" as const, content: t("in") },
          { value: "out" as const, content: t("out") },
        ]}
      />
      <span className="text-small text-muted">{t("count", { count: yes })}</span>
    </div>
  );
}

/** The moment of the day on its card (posted at `at`): "Breakfast together tomorrow at 09:00?" – in or out. */
export function DayMomentPanel({ stay, at }: { stay: Stay; at: number }) {
  const t = useTranslations("house.middle");
  const tm = useTranslations("house.dayMoments");
  const store = useStore();
  const m = dayMomentAt(stay, at);
  const v = momentVotes(store, stay, m.day);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body font-semibold text-ink">{t("proposal", { activity: tm(m.id as "breakfast"), time: hourLabel(m.hour) })}</p>
      <InOut
        mine={v.mine}
        yes={v.yes}
        onVote={(inFor) => {
          store.voteMoment(stay.id, m.day, inFor);
          store.setArcStep(stay.id, "moment", "done");
          track("arc_action_done", { house: stay.id, step: "moment" });
        }}
      />
    </div>
  );
}

/** Plan › Rhythm: what the crew agreed on (each proposal with enough "I'm in"), with its day and hour. */
export function AgreedMoments({ stay }: { stay: Stay }) {
  const t = useTranslations("house.middle");
  const tm = useTranslations("house.dayMoments");
  const store = useStore();
  const arc = useArc(stay);
  const list = arc ? agreedMoments(store, stay, arc.due) : [];
  return (
    <div>
      <p className="text-body font-semibold text-ink">{t("agreed")}</p>
      {list.length === 0 ? (
        <p className="mt-1 text-body text-muted">{t("agreedNone")}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {list.map((m) => (
            <li key={m.day} className="flex flex-wrap items-baseline gap-x-3 text-body text-ink">
              <span className="w-40 shrink-0 tabular-nums text-muted">
                {dayLabel(stay, m.forDate)} · {hourLabel(m.hour)}
              </span>
              <span>{tm(m.id as "breakfast")}</span>
              <span className="text-small text-muted">{t("count", { count: m.count })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Halftime, private: 1–5 and (optional) what would help; once saved, "Your halftime: 4 of 5". Only the person sees it. */
export function HalftimeForm({ stay }: { stay: Stay }) {
  const t = useTranslations("house.middle");
  const store = useStore();
  const showToast = useToast();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const saved = settingsOf(me).halftime?.[stay.id];
  const [score, setScore] = useState<number | null>(saved?.score ?? null);
  const [help, setHelp] = useState(saved?.help ?? "");
  const [editing, setEditing] = useState(!saved);
  if (!editing && saved) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">{t("halftimeYours", { score: saved.score })}</p>
        {saved.help && <p className="text-body text-ink">“{saved.help}”</p>}
        <p className="text-small text-muted">{t("halftimePrivate")}</p>
        <div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t("halftimeEdit")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">{t("halftimeScore")}</p>
        <CapsuleGroup
          size="sm"
          label={t("halftimeScore")}
          value={score === null ? null : String(score) as "1"}
          onChange={(v) => setScore(Number(v))}
          className="w-fit"
          options={(["1", "2", "3", "4", "5"] as const).map((v) => ({ value: v, content: v }))}
        />
        <p className="text-small text-muted">{t("halftimeScale")}</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-body font-semibold text-ink">
          {t("halftimeHelp")}
          <span className="ml-2 text-small font-normal text-muted">{t("halftimeOptional")}</span>
        </span>
        <Textarea value={help} onChange={(e) => setHelp(e.target.value)} rows={2} maxLength={280} />
      </label>
      <p className="text-small text-muted">{t("halftimePrivate")}</p>
      <div>
        <Button
          size="sm"
          disabled={score === null}
          onClick={() => {
            store.setHalftime(stay.id, score!, help.trim() || undefined);
            store.setArcStep(stay.id, "halftime", "done");
            track("arc_action_done", { house: stay.id, step: "halftime" });
            setEditing(false);
            showToast(t("halftimeSaved"));
          }}
        >
          {t("halftimeSave")}
        </Button>
      </div>
    </div>
  );
}

/** A Pro host's halftime view: the anonymous average – only from HALFTIME_MIN_ANSWERS answers, never anyone's own number. */
export function HalftimeAverage({ stay }: { stay: Stay }) {
  const t = useTranslations("house.middle");
  const store = useStore();
  const now = useArcNow(stay);
  const a = halftimeAverage(store, stay, now >= halftimeAt(stay));
  return (
    <div className="flex flex-col gap-1">
      {a.shown && a.average !== null ? <p className="text-body font-semibold text-ink">{t("halftimeAverage", { average: a.average.toFixed(1), count: a.count })}</p> : <p className="text-body text-muted">{t("halftimeAverageWait", { min: HALFTIME_MIN_ANSWERS })}</p>}
      <p className="text-small text-muted">{t("halftimeAnon")}</p>
    </div>
  );
}

/**
 * The high point. Set by the Pro host: "{host} set the highlight" with what and when. Otherwise a proposal by theme to vote on (once its card
 * is out); a Pro host who hasn't set one gets the form (then the crew gets no proposal).
 */
export function PeakPanel({ stay, isHost, compact = false }: { stay: Stay; isHost: boolean; compact?: boolean }) {
  const t = useTranslations("house.middle");
  const tp = useTranslations("house.peakIdeas");
  const store = useStore();
  const showToast = useToast();
  const arc = useArc(stay);
  const pro = Boolean(stay.hostFeePerPerson);
  const host = findUser(store, stay.hostId)?.name.split(" ")[0] ?? "";
  const idea = peakIdea(stay);
  const voteDue = arc?.schedule.find((d) => d.step.id === "peakVote");
  const live = Boolean(arc && (isHost ? arc.schedule.some((d) => d.step.id === "peakPlan" && arc.now >= d.at) : voteDue && arc.now >= voteDue.at));
  const [text, setText] = useState(stay.peak?.hostText ?? "");
  const [date, setDate] = useState(stay.peak?.hostDate ?? stay.endDate.slice(0, 10));

  if (stay.peak?.hostText) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-small text-muted">{t("peakHost", { host })}</p>
        <p className="text-body-lg font-semibold text-ink">{stay.peak.hostText}</p>
        {stay.peak.hostDate && <p className="text-body text-muted">{dayLabel(stay, stay.peak.hostDate)}</p>}
      </div>
    );
  }
  if (isHost && pro && !compact) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-small text-muted">{t("peakSetHint")}</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label className="flex flex-col gap-1">
            <span className="text-small text-muted">{t("peakText")}</span>
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder={idea ? tp(idea as "dayTrip") : ""} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-small text-muted">{t("peakDate")}</span>
            <Input type="date" value={date} min={stay.startDate.slice(0, 10)} max={stay.endDate.slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div>
          <Button
            size="sm"
            disabled={!text.trim()}
            onClick={() => {
              store.setHostPeak(stay.id, text.trim(), date);
              store.setArcStep(stay.id, "peakPlan", "done");
              track("arc_action_done", { house: stay.id, step: "peakPlan" });
              showToast(t("peakSaved"));
            }}
          >
            {t("peakSave")}
          </Button>
        </div>
      </div>
    );
  }
  if (!idea || !live) return <p className="text-body text-muted">{t("peakNone")}</p>;
  const v = peakVotes(store, stay, live);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body font-semibold text-ink">{t("peakProposal", { activity: tp(idea as "dayTrip") })}</p>
      <InOut
        mine={v.mine}
        yes={v.yes}
        onVote={(inFor) => {
          store.votePeak(stay.id, inFor);
          store.setArcStep(stay.id, "peakVote", "done");
          track("arc_action_done", { house: stay.id, step: "peakVote" });
        }}
      />
    </div>
  );
}
