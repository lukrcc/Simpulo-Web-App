"use client";

// The arc's "before" (CLAUDE.md "Bogen › Vorher"): your intention (Me; the crew sees it on the Crew page – never public, never analysed),
// Getting there (Plan: your arrival, who arrives when, "share a ride?" – nothing is booked), Practical (Plan: the exact address 2 days before,
// check-in, House rules, what to bring, the Pro host's programme) and the host's tasks (Manage). All from the store (mock).
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { PanelCapsule } from "@/components/ui/PanelCapsule";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ADDRESS_DAYS_BEFORE, HOST_TASKS } from "@/config/arc";
import { track } from "@/lib/analytics";
import { arcAudienceOf, arcDateLabel, arcSchedule, arcStateOf, arrivalGap, arrivalOf, daysBeforeReached, useArcNow } from "@/lib/arc";
import { crewThreadId, findUser, getCrew, getMyPayment, settingsOf, useStore } from "@/lib/store";
import { AgreementPanel } from "./ArcArrival";
import type { ArcArrival, ArcIntention, Stay } from "@/lib/types";
import { cn, googleMapsUrl } from "@/lib/utils";

const MODES = ["plane", "train", "bus", "car", "ferry", "other"] as const;

/** A small labelled block (label small muted over the value – CLAUDE.md "Labels klein über dem Wert"). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-small text-muted">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

/** Paid (or the host): what opens after paying – the intention, the exact address. */
export function usePaidOrHost(stay: Stay): boolean {
  const store = useStore();
  return stay.hostId === store.currentUserId || getMyPayment(store, stay.id)?.status === "paid";
}

// ── Intention ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "Your intention": one question (the one to answer – skippable) and two optional ones; saved → the arc step is done. */
export function IntentionForm({ stay }: { stay: Stay }) {
  const t = useTranslations("house.before.intention");
  const store = useStore();
  const showToast = useToast();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const saved = settingsOf(me).intentions?.[stay.id];
  const [editing, setEditing] = useState(!saved?.main);
  const [draft, setDraft] = useState<ArcIntention>({ main: saved?.main ?? "", teach: saved?.teach ?? "", askMe: saved?.askMe ?? "" });
  const paid = usePaidOrHost(stay);
  if (!paid) return <p className="text-body text-muted">{t("afterPay")}</p>;
  if (!editing && saved?.main) {
    return (
      <div className="flex flex-col gap-4">
        <IntentionView intention={saved} />
        <p className="text-small text-muted">{t("visibility")}</p>
        <div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        </div>
      </div>
    );
  }
  const area = (key: keyof ArcIntention, optional = false) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-body font-semibold text-ink">
        {t(key as "main")}
        {optional && <span className="ml-2 text-small font-normal text-muted">{t("optional")}</span>}
      </span>
      <Textarea value={draft[key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} rows={key === "main" ? 3 : 2} maxLength={280} />
    </label>
  );
  return (
    <div className="flex flex-col gap-5">
      {area("main")}
      {area("teach", true)}
      {area("askMe", true)}
      <p className="text-small text-muted">{t("visibility")}</p>
      <div>
        <Button
          size="sm"
          disabled={!draft.main?.trim()}
          onClick={() => {
            store.setIntention(stay.id, { main: draft.main?.trim(), teach: draft.teach?.trim() || undefined, askMe: draft.askMe?.trim() || undefined });
            store.setArcStep(stay.id, "intention", "done");
            track("arc_action_done", { house: stay.id, step: "intention" });
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

/** An intention as read on the Crew page: the answer – or "Not written yet" – and the optional two when there. */
export function IntentionView({ intention, onImage = false }: { intention: ArcIntention | null; onImage?: boolean }) {
  const t = useTranslations("house.before");
  const muted = onImage ? "text-on-image/75" : "text-muted";
  return (
    <div className="flex flex-col gap-2">
      <Field label={t("crew.intention")}>
        <p className={cn("text-body", intention?.main ? "" : muted)}>{intention?.main ? `“${intention.main}”` : t("intention.notWritten")}</p>
      </Field>
      {intention?.teach && (
        <Field label={t("crew.teach")}>
          <p className="text-body">{intention.teach}</p>
        </Field>
      )}
      {intention?.askMe && (
        <Field label={t("crew.askMe")}>
          <p className="text-body">{intention.askMe}</p>
        </Field>
      )}
    </div>
  );
}

/** "Say hi": opens the House chat with "Hi, I'm {name} – " in the field (sessionStorage – the chat's composer takes it once). */
export function sayHiDraft(threadId: string, text: string) {
  try {
    sessionStorage.setItem(`simpulo:draft:${threadId}`, text);
  } catch {
    // no draft – the chat still opens
  }
}

// ── Getting there ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Your arrival (date, time, how, where) and who arrives when; a nearby arrival with the same means suggests sharing a ride. */
export function GettingThere({ stay }: { stay: Stay }) {
  const t = useTranslations("house.before.arrival");
  const store = useStore();
  const showToast = useToast();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const mine = me ? arrivalOf(store, me, stay) : null;
  const [editing, setEditing] = useState(!mine);
  const [draft, setDraft] = useState<ArcArrival>(mine ?? { date: stay.startDate.slice(0, 10), time: "", mode: "plane", place: "" });
  const crew = getCrew(store, stay).filter((u) => u.id !== store.currentUserId);
  const others = crew.map((u) => ({ user: u, arrival: arrivalOf(store, u, stay) }));
  const listed = others.filter((o) => o.arrival).toSorted((a, b) => `${a.arrival!.date}${a.arrival!.time}`.localeCompare(`${b.arrival!.date}${b.arrival!.time}`));
  const missing = others.filter((o) => !o.arrival);
  const ride = mine
    ? listed.flatMap((o) => {
        const gap = arrivalGap(mine, o.arrival!);
        return gap !== null && Math.abs(gap) <= 60 && o.arrival!.mode === mine.mode ? [{ ...o, gap }] : [];
      })
    : [];
  const verb = (mode: ArcArrival["mode"]) => (mode === "plane" ? t("lands") : t("arrives"));
  const save = () => {
    store.setArrival(stay.id, { ...draft, place: draft.place.trim() });
    store.setArcStep(stay.id, "gettingThere", "done");
    track("arc_action_done", { house: stay.id, step: "gettingThere" });
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Yours. */}
      <div>
        <p className="text-body font-semibold text-ink">{t("yours")}</p>
        {editing ? (
          <div className="mt-3 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-small text-muted">{t("date")}</span>
                <Input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-small text-muted">{t("time")}</span>
                <Input type="time" value={draft.time} onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))} />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-small text-muted">{t("mode")}</span>
              {/* The panels' capsules: chosen graphite with white words, no edge (CLAUDE.md "Plan-Reiter"). */}
              <div role="radiogroup" aria-label={t("mode")} className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <PanelCapsule key={m} role="radio" aria-checked={draft.mode === m} on={draft.mode === m} onClick={() => setDraft((d) => ({ ...d, mode: m }))}>
                    {t(`modes.${m}`)}
                  </PanelCapsule>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-small text-muted">{t("place")}</span>
              <Input value={draft.place} placeholder={t("placeHint")} onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))} maxLength={80} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" disabled={!draft.date || !draft.time} onClick={save}>
                {t("save")}
              </Button>
              <span className="text-small text-muted">{t("noBooking")}</span>
            </div>
          </div>
        ) : (
          mine && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-body-lg text-ink">
                {arcDateLabel(stay, Date.parse(`${mine.date}T12:00:00Z`), false)} · {mine.time} · {t(`modes.${mine.mode}`)}
                {mine.place && ` · ${mine.place}`}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                {t("edit")}
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                onClick={() => {
                  store.setArrival(stay.id, null);
                  setEditing(true);
                  showToast(t("remove"));
                }}
              >
                {t("remove")}
              </Button>
            </div>
          )
        )}
        {ride.map((o) => (
          <p key={o.user.id} className="mt-3 rounded-2xl bg-(--success)/12 px-4 py-2.5 text-body text-ink">
            {o.gap === 0
              ? t("same", { name: o.user.name.split(" ")[0], verb: verb(o.arrival!.mode) })
              : t("ride", { name: o.user.name.split(" ")[0], verb: verb(o.arrival!.mode), minutes: Math.abs(o.gap), when: o.gap > 0 ? t("after") : t("before") })}
          </p>
        ))}
      </div>

      {/* Everyone else. */}
      <div>
        <p className="text-body font-semibold text-ink">{t("who")}</p>
        {listed.length === 0 && missing.length === 0 ? (
          <p className="mt-2 text-body text-muted">{t("none")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {listed.map((o) => (
              <li key={o.user.id} className="flex items-center gap-3">
                <Avatar user={o.user} size="sm" />
                <span className="w-24 shrink-0 truncate text-body font-semibold text-ink">{o.user.name.split(" ")[0]}</span>
                <span className="min-w-0 truncate text-body text-ink">
                  {arcDateLabel(stay, Date.parse(`${o.arrival!.date}T12:00:00Z`), false)} · {o.arrival!.time} · {t(`modes.${o.arrival!.mode}`)}
                  {o.arrival!.place && ` · ${o.arrival!.place}`}
                </span>
              </li>
            ))}
            {missing.map((o) => (
              <li key={o.user.id} className="flex items-center gap-3">
                <Avatar user={o.user} size="sm" />
                <span className="w-24 shrink-0 truncate text-body font-semibold text-ink">{o.user.name.split(" ")[0]}</span>
                <span className="text-body text-muted">{t("notYet")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Practical ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The exact address (paid, from 2 days before; the host always), check-in, House rules, what to bring – and the Pro host's programme. */
export function Practical({ stay, isHost, onHostAdd }: { stay: Stay; isHost: boolean; /** The host's empty check-in / what to bring: "Add check-in info" → the task in Manage */ onHostAdd?: () => void }) {
  const t = useTranslations("house.before.practical");
  const store = useStore();
  const now = useArcNow(stay);
  const paid = usePaidOrHost(stay);
  const host = findUser(store, stay.hostId);
  const hostName = host?.name.split(" ")[0] ?? "";
  const showAddress = isHost || (paid && daysBeforeReached(stay, ADDRESS_DAYS_BEFORE, now));
  const pro = Boolean(stay.hostFeePerPerson);
  const p = stay.practical;
  // Guests read "Not shared yet – {host} adds it …"; the host gets the way to add it (the check-in task in Manage).
  const later = isHost && onHostAdd ? <PanelCapsule onClick={onHostAdd}>{t("addCheckIn")}</PanelCapsule> : <p className="text-body text-muted">{t("notShared", { host: hostName })}</p>;
  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      <Field label={t("address")}>
        {showAddress ? (
          <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className="text-body-lg font-semibold text-ink underline-offset-4 hover:underline">
            {[stay.location.area, stay.location.city ?? stay.city, stay.location.country].filter(Boolean).join(", ")} ↗
          </a>
        ) : (
          <p className="text-body text-muted">{paid ? t("addressLater", { days: ADDRESS_DAYS_BEFORE }) : t("addressAfterPay", { days: ADDRESS_DAYS_BEFORE })}</p>
        )}
      </Field>
      <Field label={t("checkIn")}>{p?.checkIn ? <p className="whitespace-pre-line text-body text-ink">{p.checkIn}</p> : later}</Field>
      <Field label={t("rules")}>
        {stay.houseRules.length ? (
          <ul className="flex flex-col gap-1">
            {stay.houseRules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-body text-ink">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
                {rule}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted">{t("noRules")}</p>
        )}
      </Field>
      <Field label={t("bring")}>{p?.bring ? <p className="whitespace-pre-line text-body text-ink">{p.bring}</p> : later}</Field>
      {pro && (
        <div className="sm:col-span-2">
          <Field label={t("programme")}>{p?.programme ? <p className="whitespace-pre-line text-body text-ink">{p.programme}</p> : later}</Field>
        </div>
      )}
    </dl>
  );
}

// ── Host tasks ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Manage › Host tasks: a Share host's three (check-in, first night, closing round), a Pro host also the programme; one active at a time – the
 * first not done –, each with its due date (House time); the progress on top. The check-in task is filled in right here.
 */
/** The host's tasks (check-in, welcome, the agreement, a Pro host's programme): each with its due time and whether it's done; the active one. */
export function useHostTaskList(stay: Stay) {
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const audience = arcAudienceOf(stay, stay.hostId);
  const schedule = arcSchedule(stay, audience, null);
  const tasks = HOST_TASKS.filter((task) => !task.pro || audience === "hostPro").map((task) => {
    const due = schedule.find((d) => d.step.id === task.step)?.at ?? null;
    const done = task.field
      ? Boolean(stay.practical?.[task.field]?.trim())
      : task.id === "agreement"
        ? Boolean(stay.agreement?.confirmedAt)
        : arcStateOf(me, stay.id, "hostWelcome") !== "open";
    return { task, due, done };
  });
  return { tasks, active: tasks.find((x) => !x.done) ?? null, doneCount: tasks.filter((x) => x.done).length };
}

export function HostTasks({ stay }: { stay: Stay }) {
  const t = useTranslations("house.before.tasks");
  const store = useStore();
  const showToast = useToast();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const audience = arcAudienceOf(stay, stay.hostId);
  const schedule = arcSchedule(stay, audience, null);
  const tasks = HOST_TASKS.filter((task) => !task.pro || audience === "hostPro").map((task) => {
    const due = schedule.find((d) => d.step.id === task.step)?.at ?? null;
    // Done: a filled field (check-in, programme), the confirmed agreement, or the welcome sent (or skipped – it's optional).
    const done = task.field
      ? Boolean(stay.practical?.[task.field]?.trim())
      : task.id === "agreement"
        ? Boolean(stay.agreement?.confirmedAt)
        : arcStateOf(me, stay.id, "hostWelcome") !== "open";
    return { task, due, done };
  });
  const active = tasks.find((x) => !x.done) ?? null;
  const doneCount = tasks.filter((x) => x.done).length;
  const [checkIn, setCheckIn] = useState(stay.practical?.checkIn ?? "");
  const [bring, setBring] = useState(stay.practical?.bring ?? "");
  const [programme, setProgramme] = useState(stay.practical?.programme ?? "");
  const [welcome, setWelcome] = useState(() => t("welcomeTemplate", { title: stay.title }));
  const saved = () => showToast(t("saved"));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-ink/70" style={{ width: `${(doneCount / Math.max(1, tasks.length)) * 100}%` }} />
        </div>
        <span className="text-small text-muted">{t("progress", { done: doneCount, total: tasks.length })}</span>
      </div>
      <ol className="flex flex-col gap-2">
        {tasks.map(({ task, due, done }, i) => {
          const isActive = active?.task.id === task.id;
          return (
            <li key={task.id} className={cn("rounded-[20px] p-4", isActive ? "card-soft ring-1 ring-ink/12" : "")}>
              <div className="flex items-start gap-3">
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-small font-semibold", done ? "bg-success text-on-signal" : isActive ? "bg-ink text-inverse" : "bg-ink/8 text-muted")}>
                  {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-3 text-body font-semibold text-ink">
                    {t(`items.${task.id}.title`)}
                    {task.optional && <span className="text-small font-normal text-muted">{t("optional")}</span>}
                    <span className="text-small font-normal text-muted">{done ? (task.id === "welcome" && arcStateOf(me, stay.id, "hostWelcome") === "skipped" ? t("skipped") : t("done")) : isActive ? t("active") : t("later")}{due !== null && !done ? ` · ${t("due", { date: arcDateLabel(stay, due, false) })}` : ""}</span>
                  </p>
                  <p className="text-small text-muted">{t(`items.${task.id}.text`)}</p>
                  {isActive && task.id === "checkIn" && (
                    <div className="mt-4 flex flex-col gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-small text-muted">{t("checkInField")}</span>
                        <Textarea value={checkIn} onChange={(e) => setCheckIn(e.target.value)} placeholder={t("checkInPlaceholder")} rows={3} maxLength={600} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-small text-muted">{t("bringField")}</span>
                        <Textarea value={bring} onChange={(e) => setBring(e.target.value)} placeholder={t("bringPlaceholder")} rows={2} maxLength={400} />
                      </label>
                      <div>
                        <Button
                          size="sm"
                          disabled={!checkIn.trim()}
                          onClick={() => {
                            store.setPractical(stay.id, { checkIn: checkIn.trim(), bring: bring.trim() || undefined });
                            store.setArcStep(stay.id, "hostCheckIn", "done");
                            track("arc_action_done", { house: stay.id, step: "hostCheckIn" });
                            saved();
                          }}
                        >
                          {t("save")}
                        </Button>
                      </div>
                    </div>
                  )}
                  {isActive && task.id === "welcome" && (
                    <div className="mt-4 flex flex-col gap-3">
                      <Textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} rows={4} maxLength={600} />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={!welcome.trim()}
                          onClick={() => {
                            store.sendMessage(crewThreadId(stay.id), welcome.trim());
                            store.setArcStep(stay.id, "hostWelcome", "done");
                            track("arc_action_done", { house: stay.id, step: "hostWelcome" });
                            showToast(t("welcomeSent"));
                          }}
                        >
                          {t("welcomeSend")}
                        </Button>
                        <Button size="sm" variant="tertiary" onClick={() => store.setArcStep(stay.id, "hostWelcome", "skipped")}>
                          {t("skip")}
                        </Button>
                      </div>
                    </div>
                  )}
                  {isActive && task.id === "agreement" && (
                    <div className="mt-4">
                      <AgreementPanel stay={stay} isHost />
                    </div>
                  )}
                  {isActive && task.id === "programme" && (
                    <div className="mt-4 flex flex-col gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-small text-muted">{t("programmeField")}</span>
                        <Textarea value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder={t("programmePlaceholder")} rows={4} maxLength={1200} />
                      </label>
                      <div>
                        <Button
                          size="sm"
                          disabled={!programme.trim()}
                          onClick={() => {
                            store.setPractical(stay.id, { programme: programme.trim() });
                            saved();
                          }}
                        >
                          {t("save")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
