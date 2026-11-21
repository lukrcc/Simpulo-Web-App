"use client";

// The arc's goodbye (CLAUDE.md "Bogen › Abschied"): the closing circle on the last evening (three questions out loud – nothing saved; a Pro
// host may lead it themselves, then no card), a few written words for the crew (Moments, only the crew), the day after (private: who you'd
// live with again, your intention, the House's rating for the host, a tip for the next crew, an idea for your next House) and the reveal a
// day later: only a mutual choice ever shows – "You and Ana chose each other", both become Your people. A one-sided choice leaves no trace.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { AFTER_MIN_ANSWERS, AFTER_RATINGS, INTENTION_REACHED, type AfterRating } from "@/config/arc";
import { track } from "@/lib/analytics";
import { afterAnswers, chosenAt, mutualChoices, useArc, useArcNow } from "@/lib/arc";
import { findUser, getCrew, settingsOf, useStore } from "@/lib/store";
import type { ArcAfter, Stay, User } from "@/lib/types";
import { QuestionDeck } from "./ArcArrival";

const firstName = (u: Pick<User, "name"> | undefined) => u?.name.split(" ")[0] ?? "";
/** "Ana", "Ana and Tom", "Ana, Tom and Mia" – in the UI language. */
const names = (users: readonly User[]) => new Intl.ListFormat("en", { type: "conjunction" }).format(users.map(firstName));

// ── The closing circle ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The last evening: open the three closing questions; a Pro host can lead it themselves (then the crew gets no card). */
export function ClosingPanel({ stay, isHost, compact = false }: { stay: Stay; isHost: boolean; compact?: boolean }) {
  const t = useTranslations("house.goodbye");
  const store = useStore();
  const [open, setOpen] = useState(false);
  const pro = Boolean(stay.hostFeePerPerson);
  const host = firstName(findUser(store, stay.hostId));
  return (
    <div className="flex flex-col gap-4">
      {stay.closingLed && !isHost ? <p className="text-body text-muted">{t("closingLedBy", { host })}</p> : !compact && <p className="text-body text-muted">{t("closingHint")}</p>}
      <div>
        <Button
          size="sm"
          onClick={() => {
            store.setArcStep(stay.id, "closing", "done");
            track("arc_action_done", { house: stay.id, step: "closing" });
            setOpen(true);
          }}
        >
          {t("closingOpen")}
        </Button>
      </div>
      {isHost && pro && !compact && (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">{t("closingLead")}</p>
            <p className="text-small text-muted">{t("closingLeadHint")}</p>
          </div>
          <Switch on={Boolean(stay.closingLed)} label={t("closingLead")} onChange={(on) => {
              store.setClosingLed(stay.id, on);
              track("arc_closing_led", { house: stay.id, led: on });
            }} />
        </div>
      )}
      {!compact && <CrewWordsForm stay={stay} />}
      <QuestionDeck deck="closing" open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** "Leave a few words for the crew" – written, optional; only the crew sees it (Moments). */
export function CrewWordsForm({ stay }: { stay: Stay }) {
  const t = useTranslations("house.goodbye");
  const store = useStore();
  const showToast = useToast();
  const mine = store.currentUserId ? stay.crewWords?.[store.currentUserId]?.text : undefined;
  const [text, setText] = useState(mine ?? "");
  const [editing, setEditing] = useState(!mine);
  if (!editing && mine) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">{t("wordsTitle")}</p>
        <p className="text-body text-ink">“{mine}”</p>
        <p className="text-small text-muted">{t("wordsHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t("wordsEdit")}
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => {
              store.setCrewWords(stay.id, "");
              setText("");
              setEditing(true);
            }}
          >
            {t("wordsRemove")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-body font-semibold text-ink">{t("wordsTitle")}</span>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={280} />
      <span className="text-small text-muted">{t("wordsHint")}</span>
      <span>
        <Button
          size="sm"
          disabled={!text.trim()}
          onClick={() => {
            store.setCrewWords(stay.id, text);
            setEditing(false);
            showToast(t("wordsSaved"));
          }}
        >
          {t("wordsSave")}
        </Button>
      </span>
    </label>
  );
}

/** Moments: the crew's words from the last evening – only the crew sees them. */
export function CrewWordsList({ stay }: { stay: Stay }) {
  const t = useTranslations("house.goodbye");
  const store = useStore();
  const words = Object.entries(stay.crewWords ?? {})
    .map(([id, w]) => ({ user: findUser(store, id), ...w }))
    .filter((w): w is { user: User; text: string; at: string } => Boolean(w.user))
    .toSorted((a, b) => a.at.localeCompare(b.at));
  if (words.length === 0) return <p className="text-body text-muted">{t("wordsNone")}</p>;
  return (
    <ul className="flex flex-col gap-5">
      {words.map((w) => (
        <li key={w.user.id} className="flex gap-3">
          <Avatar user={w.user} size="sm" />
          <div className="min-w-0">
            <p className="text-small font-semibold text-ink">{firstName(w.user)}</p>
            <p className="text-body-lg text-ink">“{w.text}”</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── The day after ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Scale({ label, value, onChange }: { label: string; value: number | undefined; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="text-body text-ink">{label}</span>
      <CapsuleGroup
        size="sm"
        label={label}
        value={value ? (String(value) as "1") : null}
        onChange={(v) => onChange(Number(v))}
        className="w-fit"
        options={(["1", "2", "3", "4", "5"] as const).map((v) => ({ value: v, content: v }))}
      />
    </div>
  );
}

/**
 * The day after, private: who you'd live with again (several), your intention reached?, and – guests only – the House's rating with one
 * sentence for the host, a tip for the next crew (public only when ticked) and an idea for your next House (a signal for matching).
 */
export function AfterForm({ stay, isHost }: { stay: Stay; isHost: boolean }) {
  const t = useTranslations("house.goodbye");
  const store = useStore();
  const showToast = useToast();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const saved = settingsOf(me).after?.[stay.id];
  const crew = getCrew(store, stay).filter((u) => u.id !== store.currentUserId);
  const host = firstName(findUser(store, stay.hostId));
  const [draft, setDraft] = useState<Omit<ArcAfter, "at">>(() => ({ again: saved?.again ?? [], intention: saved?.intention, ratings: saved?.ratings ?? {}, note: saved?.note ?? "", tip: saved?.tip ?? "", tipPublic: saved?.tipPublic ?? false, idea: saved?.idea ?? "" }));
  const [editing, setEditing] = useState(!saved);
  const set = (patch: Partial<Omit<ArcAfter, "at">>) => setDraft((d) => ({ ...d, ...patch }));

  if (!editing && saved) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">{t("savedTitle")}</p>
        <p className="text-body text-muted">{t("savedAgain", { count: saved.again.length })}</p>
        <div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        </div>
      </div>
    );
  }
  const optional = <span className="ml-2 text-small font-normal text-muted">{t("optional")}</span>;
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-body font-semibold text-ink">{t("againQ")}</legend>
        <ul className="mt-3 flex flex-col gap-2">
          {crew.map((u) => {
            const on = draft.again.includes(u.id);
            return (
              <li key={u.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox checked={on} onChange={() => set({ again: on ? draft.again.filter((id) => id !== u.id) : [...draft.again, u.id] })} />
                  <Avatar user={u} size="sm" />
                  <span className="text-body text-ink">{firstName(u)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="text-small text-muted">{t("againHint")}</p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">{t("intentionQ")}</p>
        <CapsuleGroup
          size="sm"
          label={t("intentionQ")}
          value={draft.intention ?? null}
          onChange={(v) => set({ intention: v })}
          className="w-fit"
          options={INTENTION_REACHED.map((v) => ({ value: v, content: t(`intention.${v}`) }))}
        />
        <p className="text-small text-muted">{t("privateHint")}</p>
      </div>

      {!isHost && (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-body font-semibold text-ink">{t("rateTitle")}</p>
            {AFTER_RATINGS.map((r) => (
              <Scale key={r} label={t(`ratings.${r}`)} value={draft.ratings?.[r]} onChange={(n) => set({ ratings: { ...draft.ratings, [r]: n } })} />
            ))}
            <p className="text-small text-muted">{t("ratingScale")}</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-body font-semibold text-ink">
              {t("noteQ", { host })}
              {optional}
            </span>
            <Textarea value={draft.note ?? ""} onChange={(e) => set({ note: e.target.value })} rows={2} maxLength={200} />
            <span className="text-small text-muted">{t("noteHint", { host })}</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-body font-semibold text-ink">
                {t("tipQ")}
                {optional}
              </span>
              <Textarea value={draft.tip ?? ""} onChange={(e) => set({ tip: e.target.value })} rows={2} maxLength={200} />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <Checkbox checked={Boolean(draft.tipPublic)} disabled={!draft.tip?.trim()} onChange={(e) => set({ tipPublic: e.target.checked })} />
              <span className="text-body text-ink">{t("tipPublic")}</span>
            </label>
            <span className="text-small text-muted">{t("tipHint")}</span>
          </div>
        </>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-body font-semibold text-ink">
          {t("ideaQ")}
          {optional}
        </span>
        <Textarea value={draft.idea ?? ""} onChange={(e) => set({ idea: e.target.value })} rows={2} maxLength={200} />
        <span className="text-small text-muted">{t("ideaHint")}</span>
      </label>

      <div>
        <Button
          size="sm"
          onClick={() => {
            const trim = (v?: string) => v?.trim() || undefined;
            store.setAfter(stay.id, { ...draft, note: trim(draft.note), tip: trim(draft.tip), tipPublic: Boolean(trim(draft.tip) && draft.tipPublic), idea: trim(draft.idea) });
            store.setArcStep(stay.id, "again", "done");
            // Signals only (data points after.*): how many chosen, which parts answered – never the words.
            track("arc_action_done", { house: stay.id, step: "again", chosen: draft.again.length, intention: Boolean(draft.intention), rated: Object.keys(draft.ratings ?? {}).length, tip: Boolean(trim(draft.tip)), tipPublic: Boolean(trim(draft.tip) && draft.tipPublic), idea: Boolean(trim(draft.idea)) });
            setEditing(false);
            showToast(t("saved"));
          }}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

// ── Chosen each other ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The reveal (CHOSEN_AFTER_DAYS after the House): every mutual choice becomes Your people – "Lived with", confirmed both ways. Runs where
 * the arc runs (House area, House chat). TODO(backend): a Function at the reveal, for both sides at once.
 */
export function useChosenReveal(stay: Stay | null) {
  const store = useStore();
  const now = useArcNow(stay);
  const me = store.currentUserId;
  const mutual = stay ? mutualChoices(store, stay, me) : [];
  // Recorded for this House both ways (they may be Your people from an earlier House already – the newest House counts).
  const recorded = (a: string, b: string) => store.livedWith.some((l) => l.houseId === stay?.id && l.userId === a && l.otherUserId === b && l.confirmedAt);
  const pending = stay && me && now >= chosenAt(stay) ? mutual.filter((u) => !recorded(me, u.id) || !recorded(u.id, me)).map((u) => u.id) : [];
  const key = pending.join(",");
  const { revealChosen } = store;
  useEffect(() => {
    if (!stay || !key) return;
    revealChosen(stay.id, key.split(","), stay.endDate);
  }, [stay, key, revealChosen]);
}

/** "You and Ana chose each other" – only mutual choices, never anything one-sided. */
export function ChosenPanel({ stay }: { stay: Stay }) {
  const t = useTranslations("house.goodbye");
  const arc = useArc(stay);
  const mutual = arc?.mutual ?? [];
  if (mutual.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex -space-x-2">
        {mutual.map((u) => (
          <Avatar key={u.id} user={u} size="md" className="ring-2 ring-(--surface)" />
        ))}
      </div>
      <p className="text-body-lg font-semibold text-ink">{t("chosenTitle", { names: names(mutual) })}</p>
      <p className="text-body text-muted">{t("chosenText")}</p>
      <Link href="/people" className="text-body font-semibold text-ink underline-offset-4 hover:underline">
        {t("chosenPeople")} →
      </Link>
    </div>
  );
}

/** In the "chosen" card: "You're each other's people now." and the way to them. */
export function ChosenLink() {
  const t = useTranslations("house.goodbye");
  return (
    <p className="text-body text-muted">
      {t("chosenText")}{" "}
      <Link href="/people" className="font-semibold text-ink underline-offset-4 hover:underline">
        {t("chosenPeople")} →
      </Link>
    </p>
  );
}

/** The card's title for "chosen": "You and Ana chose each other". */
export function useChosenTitle(stay: Stay): string | null {
  const t = useTranslations("house.goodbye");
  const store = useStore();
  const mutual = mutualChoices(store, stay, store.currentUserId);
  return mutual.length ? t("chosenTitle", { names: names(mutual) }) : null;
}

// ── For the host ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Manage › What your crew said (after the House): the rating averages – only from AFTER_MIN_ANSWERS answers – and the sentences for the
 * host, without names; never public. Who chose whom is never part of it.
 */
export function HostAfterSummary({ stay }: { stay: Stay }) {
  const t = useTranslations("house.goodbye");
  const store = useStore();
  const now = useArcNow(stay);
  const a = afterAnswers(store, stay, now);
  return (
    <div className="flex flex-col gap-5">
      {a.count >= AFTER_MIN_ANSWERS ? (
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {AFTER_RATINGS.map((r: AfterRating) =>
            a.averages[r] !== null ? (
              <li key={r} className="text-body text-ink">
                {t("hostAverage", { label: t(`ratings.${r}`), average: a.averages[r]!.toFixed(1) })}
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p className="text-body text-muted">{t("hostWait", { min: AFTER_MIN_ANSWERS })}</p>
      )}
      <div>
        <p className="text-body font-semibold text-ink">{t("hostNotes")}</p>
        {a.notes.length === 0 ? (
          <p className="mt-1 text-body text-muted">{t("hostNotesNone")}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {a.notes.map((n) => (
              <li key={n} className="text-body text-ink">
                “{n}”
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-small text-muted">{t("hostAnon")}</p>
    </div>
  );
}
