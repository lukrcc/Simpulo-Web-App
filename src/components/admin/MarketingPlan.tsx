"use client";

// Admin › Marketing – the pre-launch plan in the existing topic views (CLAUDE.md "Admin › Marketing – Pre-Launch-Plan"): Countdown (the
// plan as bars, the tasks to tick), Pipeline (the three stages with goal and actual, the weekly goal), Bedarf (goal ÷ rate = contacts),
// Partner (the founding host offer), Content (the founder format, the Moments programme). Every text, date and goal: config/admin/marketing-plan.ts.
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminSection } from "@/components/admin/AdminShell";
import { FOUNDING_HOST } from "@/config/policies";
import { FOUNDER_FORMAT, FOUNDING_OFFER, MOMENTS_PROGRAM, NEED, PLAN_LABELS as L, PLAN_LAUNCH, PLAN_PHASES, STAGES, STAGE_STEPS, WEEKLY_GOAL, stageOf, type PlanPhase } from "@/config/admin/marketing-plan";
import { useAdminActions } from "@/lib/admin/actions";
import { mondayOf } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import type { MarketingContact } from "@/lib/data";
import { isFoundingHost } from "@/lib/founding";
import { day, num, share } from "@/lib/i18n/adminFormat";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
const taskKey = (phase: string, task: string) => `plan:${phase}:${task}`;

// ─── Numbers (also the cards' sub-numbers) ─────────────────────────────────────────────────────────────────────────────────────────

/** Where the plan stands today: the phase (or before / launched), days to launch, open tasks of the phase. */
export function usePlanState() {
  const { today } = useAdminInputs();
  const data = useAdminData();
  const done = data.launchTasks ?? {};
  const current = PLAN_PHASES.find((p) => today >= p.from && today <= p.to) ?? PLAN_PHASES.find((p) => today < p.from) ?? null;
  const state: "before" | "running" | "launched" = today >= PLAN_LAUNCH.date ? "launched" : today < PLAN_PHASES[0].from ? "before" : "running";
  const daysToLaunch = Math.max(0, Math.round((at(PLAN_LAUNCH.date) - at(today)) / DAY));
  const openTasks = current ? current.tasks.filter((t) => !done[taskKey(current.key, t.id)]).length : 0;
  return { today, current, state, daysToLaunch, openTasks, done };
}

/** The three stages: contacts · replies · calls · Houses opened, and this week's messages and calls. */
export function stageNumbers(contacts: readonly MarketingContact[], today: string) {
  const written = contacts.filter((c) => c.firstMessageAt);
  const stages = STAGES.map((stage) => {
    const of = written.filter((c) => stageOf(c) === stage.key);
    const counts = Object.fromEntries(STAGE_STEPS.map((s) => [s.key, "statuses" in s ? of.filter((c) => (s.statuses as readonly string[]).includes(c.status)).length : of.length])) as Record<(typeof STAGE_STEPS)[number]["key"], number>;
    return { stage, counts };
  });
  const monday = mondayOf(today);
  const sunday = new Date(at(monday) + 6 * DAY).toISOString().slice(0, 10);
  const thisWeek = written.filter((c) => c.firstMessageAt! >= monday && c.firstMessageAt! <= sunday);
  return {
    stages,
    contacted: written.length,
    replied: written.filter((c) => ["replied", "demo", "house"].includes(c.status)).length,
    houses: written.filter((c) => c.status === "house").length,
    week: { messages: thisWeek.length, calls: thisWeek.filter((c) => c.status === "demo" || c.status === "house").length },
  };
}

/** Goal ÷ rate = contacts needed: the actual rate (Houses from the pipeline ÷ written to), the assumption and the comparisons. */
export function needRows(contacted: number, houses: number) {
  const contactsFor = (rate: number) => Math.ceil(NEED.targetHouses / rate);
  const actual = contacted > 0 && houses > 0 ? houses / contacted : null;
  return {
    actual: actual === null ? null : { rate: actual, contacts: contactsFor(actual) },
    assumed: { rate: NEED.assumedRate, contacts: contactsFor(NEED.assumedRate) },
    compare: NEED.compareRates.map((rate) => ({ rate, contacts: contactsFor(rate) })),
  };
}

/** Founding hosts taken (the numbered ones) of the limit. */
export function useFoundingSeats() {
  const store = useStore();
  return { taken: store.users.filter((u) => isFoundingHost(u)).length, limit: FOUNDING_HOST.limit };
}

// ─── 1 Countdown ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The plan as one row of bars (preparation, four phases, the launch with its buffer) – the current phase in the page colour – and the
 *  tasks of each phase to tick (stored with the admin data, in the log). */
export function PrelaunchPlan() {
  const { today, current, done } = usePlanState();
  const actions = useAdminActions();
  const start = at(PLAN_PHASES[0].from);
  const end = at(PLAN_LAUNCH.bufferTo);
  const span = end - start + DAY;
  const pos = (d: string) => `${((at(d) - start) / span) * 100}%`;
  const width = (from: string, to: string) => `${((at(to) - at(from) + DAY) / span) * 100}%`;
  const todayIn = at(today) >= start && at(today) <= end;
  return (
    <AdminSection title={L.timeline}>
      <div className="relative h-14">
        {PLAN_PHASES.map((p) => (
          <div key={p.key} className="absolute inset-y-0 px-0.5" style={{ left: pos(p.from), width: width(p.from, p.to) }}>
            <div className={cn("flex h-full flex-col justify-center rounded-lg px-2", p.key === current?.key ? "bg-(--adm-page-fill) text-(--adm-page-on,var(--adm-icon-on))" : "bg-(--adm-tile-bg) text-ink")}>
              <span className="truncate text-small font-semibold">{p.title}</span>
              <span className={cn("truncate text-small", p.key === current?.key ? "opacity-85" : "text-(--adm-label)")}>{p.short}</span>
            </div>
          </div>
        ))}
        <div className="absolute inset-y-0 px-0.5" style={{ left: pos(PLAN_LAUNCH.date), width: width(PLAN_LAUNCH.date, PLAN_LAUNCH.bufferTo) }}>
          <div className="flex h-full flex-col justify-center rounded-lg border border-dashed border-(--adm-page-color) px-2 text-ink">
            <span className="truncate text-small font-semibold">{PLAN_LAUNCH.label}</span>
            <span className="truncate text-small text-(--adm-label)">
              {day(PLAN_LAUNCH.date)} · {PLAN_LAUNCH.bufferLabel} {day(PLAN_LAUNCH.bufferTo)}
            </span>
          </div>
        </div>
        {todayIn && <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded bg-(--adm-cur)" style={{ left: pos(today) }} title={L.today} />}
      </div>
      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
        {PLAN_PHASES.map((p) => (
          <PhaseTasks key={p.key} phase={p} current={p.key === current?.key} done={done} onToggle={(id, text, on) => actions.setLaunchTask(taskKey(p.key, id), `${p.title}: ${text}`, on)} />
        ))}
      </div>
    </AdminSection>
  );
}

function PhaseTasks({ phase, current, done, onToggle }: { phase: PlanPhase; current: boolean; done: Record<string, string>; onToggle: (id: string, text: string, on: boolean) => void }) {
  const finished = phase.tasks.filter((t) => done[taskKey(phase.key, t.id)]).length;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className={cn("text-body font-semibold", current ? "text-(--adm-page-color)" : "text-ink")}>{phase.title}</span>
        <span className="text-small text-(--adm-label)">
          {day(phase.from)} – {day(phase.to)} · {num(finished)}/{num(phase.tasks.length)} {L.done}
        </span>
      </p>
      <ul className="mt-2 flex flex-col">
        {phase.tasks.map((task) => {
          const on = Boolean(done[taskKey(phase.key, task.id)]);
          return (
            <li key={task.id}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(task.id, task.text, !on)} className="adm-press flex min-h-9 w-full items-center gap-2.5 rounded-md text-left text-small">
                <span className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-(--adm-page-color) bg-(--adm-page-fill) text-(--adm-page-on,var(--adm-icon-on))" : "border-ink/25")}>
                  {on && <Check aria-hidden className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn(on ? "text-(--adm-label) line-through" : "text-ink")}>{task.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── 2 Pipeline ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function StageTargets() {
  const data = useAdminData();
  const { today } = useAdminInputs();
  const n = stageNumbers(data.marketingContacts, today);
  const goal = (g: { from: number; to: number | null }) => (g.to === null ? `${num(g.from)}+` : `${num(g.from)}–${num(g.to)}`);
  return (
    <AdminSection
      title={L.stages}
      aside={
        <p className="text-small text-(--adm-label)">
          {L.week}: <span className="font-semibold text-ink">{num(n.week.messages)}</span> {L.messages} ({L.goal} {goal(WEEKLY_GOAL.messages)}) ·{" "}
          <span className="font-semibold text-ink">{num(n.week.calls)}</span> {L.calls} ({L.goal} {goal(WEEKLY_GOAL.calls)})
        </p>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-small">
          <thead>
            <tr className="text-left text-(--adm-label)">
              <th className="py-2 pr-4 font-normal" />
              <th className="py-2 pr-4 font-normal">{L.goal}</th>
              {STAGE_STEPS.map((s) => (
                <th key={s.key} className="py-2 pr-4 text-right font-normal">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {n.stages.map(({ stage, counts }) => (
              <tr key={stage.key} className="border-t border-(--line)">
                <td className="py-3 pr-4">
                  <p className="font-semibold text-ink">
                    <span className="text-(--adm-page-color)">{stage.key}</span> · {stage.title}
                  </p>
                  <p className="text-(--adm-label)">
                    {stage.who} · {stage.how}
                  </p>
                </td>
                <td className="py-3 pr-4 tabular-nums text-ink">{goal(stage.goal)}</td>
                {STAGE_STEPS.map((s) => (
                  <td key={s.key} className={cn("py-3 pr-4 text-right tabular-nums", s.key === "houses" ? "font-semibold text-ink" : "text-ink")}>
                    {num(counts[s.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminSection>
  );
}

// ─── 3 Bedarf ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function NeedCalc() {
  const data = useAdminData();
  const { today } = useAdminInputs();
  const n = stageNumbers(data.marketingContacts, today);
  const rows = needRows(n.contacted, n.houses);
  const line = (rate: number, contacts: number) => fill(L.needLine, { houses: num(NEED.targetHouses), rate: share(rate), contacts: num(contacts) });
  const all = [
    ...(rows.actual ? [{ key: "actual", label: L.needNow, ...rows.actual }] : []),
    { key: "assumed", label: L.needAssumed, ...rows.assumed },
    ...rows.compare.map((r, i) => ({ key: `c${i}`, label: L.needCompare, ...r })),
  ];
  return (
    <AdminSection title={L.need}>
      <ul className="flex max-w-[640px] flex-col">
        {all.map((r) => (
          <li key={r.key} className="flex items-baseline justify-between gap-4 border-t border-(--line) py-3 first:border-t-0">
            <span className="text-small text-(--adm-label)">{r.label}</span>
            <span className={cn("tabular-nums", r.key === "actual" || (!rows.actual && r.key === "assumed") ? "text-h3 text-ink" : "text-body text-ink")}>{line(r.rate, r.contacts)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-small text-(--adm-label)">
        {rows.actual ? fill(L.needWritten, { value: num(n.contacted), left: num(Math.max(0, rows.actual.contacts - n.contacted)) }) : L.needNoRate}
      </p>
    </AdminSection>
  );
}

// ─── 4 Partner ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function FoundingOffer() {
  const seats = useFoundingSeats();
  return (
    <AdminSection title={L.founding} aside={<p className="text-small text-(--adm-label)">{fill(L.foundingTaken, { taken: num(seats.taken), limit: num(seats.limit) })}</p>} className="mb-(--adm-section)">
      <ul className="flex max-w-[640px] flex-col gap-1.5">
        {FOUNDING_OFFER.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-body text-ink">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-(--adm-page-color)" />
            {item}
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}

// ─── 5 Content ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function FounderFormat() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FOUNDER_FORMAT.brief.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no clipboard: nothing to do */
    }
  };
  return (
    <AdminSection title={L.founderFormat}>
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <div>
          <h3 className="text-small font-semibold text-(--adm-label)">{L.structure}</h3>
          <ol className="mt-2 flex flex-col">
            {FOUNDER_FORMAT.structure.map((s) => (
              <li key={s.name} className="flex gap-3 py-1.5 text-small">
                <span className="w-16 shrink-0 tabular-nums text-(--adm-label)">{s.at}</span>
                <span className="text-ink">
                  <span className="font-semibold">{s.name}</span> · {s.text}
                </span>
              </li>
            ))}
          </ol>
          <h3 className="mt-6 text-small font-semibold text-(--adm-label)">{L.angles}</h3>
          <ul className="mt-2 flex flex-col">
            {FOUNDER_FORMAT.angles.map((a) => (
              <li key={a.name} className="py-1.5 text-small">
                <span className="font-semibold text-ink">{a.name}</span> <span className="text-(--adm-label)">{a.hook}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-small font-semibold text-(--adm-label)">{L.routine}</h3>
          <ul className="mt-2 flex flex-col">
            {FOUNDER_FORMAT.routine.map((r) => (
              <li key={r.what} className="flex gap-3 py-1.5 text-small">
                <span className="w-28 shrink-0 font-semibold text-ink">{r.what}</span>
                <span className="text-(--adm-label)">{r.amount}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-4">
            <h3 className="text-small font-semibold text-(--adm-label)">{L.brief}</h3>
            <AdminButton variant="secondary" onClick={copy}>
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              {copied ? L.copied : L.copyBrief}
            </AdminButton>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-small text-ink">
            {FOUNDER_FORMAT.brief.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </AdminSection>
  );
}

export function MomentsProgram() {
  return (
    <AdminSection title={L.moments} aside={<span className="rounded-full bg-(--adm-tile-bg) px-2.5 py-0.5 text-small text-(--adm-label)">{MOMENTS_PROGRAM.status}</span>}>
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-3">
        <div>
          <h3 className="text-small font-semibold text-(--adm-label)">{L.momentsFormats}</h3>
          <ul className="mt-2 flex flex-col">
            {MOMENTS_PROGRAM.formats.map((f) => (
              <li key={f.phase} className="py-1.5 text-small">
                <span className="font-semibold text-ink">{f.phase}</span> <span className="text-ink">· {f.format}</span>
                <span className="block text-(--adm-label)">{f.when}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-small font-semibold text-(--adm-label)">{L.rewards}</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-small text-ink">
            {MOMENTS_PROGRAM.rewards.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-small font-semibold text-(--adm-label)">{L.rules}</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-small text-ink">
            {MOMENTS_PROGRAM.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </AdminSection>
  );
}
