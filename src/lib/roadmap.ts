// Admin › Zeitplan: the schedule's logic over config/roadmap.ts – the milestones (M1–M6, the four marketing phases, the launch) with their
// state, and ONE to-do model from every source: Vorbereitung (config/setup-todos.ts), Code (the tasks of M1–M6), Marketing (the weekly
// tasks of the strategy, config/marketing.ts) and own to-dos (added by hand – in Zeitplan or in the Marketing countdown). Every status,
// note and cost is stored in AdminData.roadmapTodos (older ticks of the countdown – launchTasks, marketingSteps – are still read). Pure, no
// clock (today comes in).
import { CODE_MILESTONES, DEPARTURE, LAUNCH, ROADMAP_RANGE, TODO_DUES, type MilestoneStatus, type TodoDue, type TodoStatus } from "@/config/roadmap";
import { SETUP_GROUPS, SETUP_TODOS, type SetupGroup, type SetupTodo } from "@/config/setup-todos";
import { MARKETING_NEXT_STEPS, STRATEGY_WEEK_TASKS } from "@/config/marketing";
import { strategyDates, strategyPhases, weekTarget } from "@/lib/admin/metrics";
import type { AdminData } from "@/lib/data";

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** Monday of the week a day falls in. */
export const weekStart = (d: string) => addDays(d, -((new Date(Date.parse(`${d}T00:00:00Z`)).getUTCDay() + 6) % 7));

// ── Milestones ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PlanMilestone {
  id: string;
  kind: "code" | "marketing" | "launch";
  /** Code: "M1" and its title; marketing: the phase's name (its weeks in `weeks`); launch: empty – the page words them (admin.zeitplan) */
  label: string;
  title: string;
  weeks?: { from: number; to: number };
  /** Its stretch: from the previous milestone (or the phase's first day) to its date */
  from: string;
  date: string;
  uncertain?: boolean;
  /** One sentence – null: written by the page from the numbers (marketing phases, launch) */
  goal: string | null;
  status: MilestoneStatus;
  reachedAt: string | null;
  note: string;
}

/** M1–M6, the marketing phases (weeks 1–2 … 7–8) and the launch, in date order, each with its state (reached · postponed · running · open). */
export function planMilestones(admin: Pick<AdminData, "roadmapReached" | "roadmapMilestones">, today: string): PlanMilestone[] {
  const reached = admin.roadmapReached ?? {};
  const stored = admin.roadmapMilestones ?? {};
  const phases = strategyPhases(strategyDates().start);
  const raw: Omit<PlanMilestone, "status" | "reachedAt" | "note">[] = [
    ...CODE_MILESTONES.map((m, i) => ({ id: m.id, kind: "code" as const, label: m.label, title: m.title, from: i === 0 ? ROADMAP_RANGE.from : CODE_MILESTONES[i - 1].date, date: m.date, uncertain: m.uncertain, goal: m.goal })),
    ...phases.map((p) => ({ id: p.key, kind: "marketing" as const, label: "", title: p.label, weeks: p.weeks, from: p.from, date: p.to, goal: null })),
    { id: "launch", kind: "launch" as const, label: "", title: "", from: addDays(phases.at(-1)!.to, 1), date: LAUNCH.date, uncertain: LAUNCH.uncertain, goal: null },
  ];
  return raw
    .map((m) => {
      const at = reached[m.id] ?? null;
      const status: MilestoneStatus = at ? "reached" : stored[m.id]?.postponed ? "postponed" : m.from <= today && today <= m.date ? "running" : "open";
      return { ...m, status, reachedAt: at, note: stored[m.id]?.note ?? "" };
    })
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

/** The next milestone not reached, on or after today (a postponed one counts – it's still ahead); null after all. */
export function nextMilestone(today: string, admin: Pick<AdminData, "roadmapReached" | "roadmapMilestones"> = {}) {
  const next = planMilestones(admin, today).find((m) => m.status !== "reached" && m.date >= today);
  return next ? { ...next, days: daysBetween(today, next.date) } : null;
}

/** Days to the departure (negative once gone). */
export const daysToDeparture = (today: string) => daysBetween(today, DEPARTURE.date);
export const daysToLaunch = (today: string) => daysBetween(today, LAUNCH.date);

// ── To-dos: one model from every source ─────────────────────────────────────────────────────────────────────────────────────

export type PlanSource = "prep" | "code" | "marketing" | "own";
export const PLAN_SOURCES: readonly PlanSource[] = ["prep", "code", "marketing", "own"];
/** The groups: the preparation's five, plus Code and Marketing (own to-dos pick one of them). */
export type PlanGroup = SetupGroup | "code" | "marketing";
export const PLAN_GROUPS: readonly { id: PlanGroup; label: string }[] = [...SETUP_GROUPS, { id: "code", label: "Code" }, { id: "marketing", label: "Marketing" }];
export const planGroupLabel = (id: string) => PLAN_GROUPS.find((g) => g.id === id)?.label ?? id;

export interface PlanTodo {
  /** The key its state is stored under (AdminData.roadmapTodos) */
  id: string;
  title: string;
  /** One line (the preparation's) */
  text?: string;
  source: PlanSource;
  group: PlanGroup;
  /** The milestone it belongs to (code: M1–M6, marketing: its phase) – null for preparation and own ones */
  milestone: string | null;
  /** Due date (YYYY-MM-DD) – null: no date ("später") */
  due: string | null;
  uncertain?: boolean;
  /** The preparation's due milestone ("vor Abreise") – the timeline's diamonds filter by it */
  dueKey: TodoDue | null;
  status: TodoStatus;
  note: string;
  cost: string | null;
  link?: string;
  /** Own to-dos can be removed */
  removable?: boolean;
}

/** A setup to-do with its stored state (the preparation list, the launch checklist, the marketing countdown's "vor öffentlicher Landingpage"). */
export type RoadmapTodoState = SetupTodo & { status: TodoStatus; note: string; cost: string | null };

/** The preparation to-dos with their stored status, note and cost over the start values. */
export function roadmapTodos(admin: Pick<AdminData, "roadmapTodos">): RoadmapTodoState[] {
  const saved = admin.roadmapTodos ?? {};
  return SETUP_TODOS.map((t) => ({ ...t, status: saved[t.id]?.status ?? t.status, note: saved[t.id]?.note ?? "", cost: saved[t.id]?.cost ?? t.cost }));
}

/** Still to do: open or in progress ("bewusst später" and done are not). */
export const isOpenTodo = (t: Pick<PlanTodo, "status">) => t.status === "open" || t.status === "inProgress";

/** Per due milestone of the preparation: its to-dos, how many are open, whether all are done. */
export function dueProgress(todos: readonly RoadmapTodoState[]) {
  return TODO_DUES.map((d) => {
    const list = todos.filter((t) => t.due === d.id);
    const open = list.filter(isOpenTodo).length;
    return { ...d, total: list.length, open, done: list.filter((t) => t.status === "done").length, complete: list.length > 0 && open === 0 };
  });
}

export const dueLabel = (id: TodoDue) => TODO_DUES.find((d) => d.id === id)?.label ?? id;

type PlanData = Pick<AdminData, "roadmapTodos" | "launchTasks" | "marketingSteps" | "launchCustomTasks">;

/**
 * Every to-do from every source, by due date (undated last). Marketing: per strategy week its numbers as tasks (contacts, shorts, Houses,
 * partners – `marketingText` words them) and the phase's steps (weekly ones per week, one-offs due at the phase's end); keys as the
 * countdown always had them ("<week's first day>:<id>"), so older ticks still count.
 */
export function planTodos(admin: PlanData, marketingText: (metric: (typeof STRATEGY_WEEK_TASKS)[number], count: number) => string): PlanTodo[] {
  const saved = admin.roadmapTodos ?? {};
  const legacy = admin.launchTasks ?? {};
  const stateOf = (id: string, start: TodoStatus, legacyDone = false) => ({ status: saved[id]?.status ?? (legacyDone ? "done" : start), note: saved[id]?.note ?? "", cost: saved[id]?.cost ?? null });
  const out: PlanTodo[] = [];

  for (const t of roadmapTodos(admin)) {
    const due = TODO_DUES.find((d) => d.id === t.due)?.date ?? null;
    out.push({ id: t.id, title: t.title, text: t.text, source: "prep", group: t.group, milestone: null, due: due?.date ?? null, uncertain: due?.uncertain, dueKey: t.due, status: t.status, note: t.note, cost: t.cost, link: t.link });
  }
  for (const m of CODE_MILESTONES) {
    for (const task of m.tasks) {
      const id = `code:${m.id}:${task.id}`;
      out.push({ id, title: task.title, source: "code", group: "code", milestone: m.id, due: m.date, uncertain: m.uncertain, dueKey: null, ...stateOf(id, "open") });
    }
  }
  const start = strategyDates().start;
  for (const phase of strategyPhases(start)) {
    for (let w = phase.weeks.from; w <= phase.weeks.to; w++) {
      const monday = addDays(start, (w - 1) * 7);
      const sunday = addDays(monday, 6);
      for (const metric of STRATEGY_WEEK_TASKS) {
        const count = weekTarget(metric, monday, start);
        if (count <= 0) continue;
        const id = `${monday}:${metric}`;
        out.push({ id, title: marketingText(metric, count), source: "marketing", group: "marketing", milestone: phase.key, due: sunday, dueKey: null, ...stateOf(id, "open", Boolean(legacy[id])) });
      }
      for (const step of MARKETING_NEXT_STEPS.filter((s) => s.phase === phase.key && s.weekly)) {
        const id = `${monday}:${step.id}`;
        out.push({ id, title: step.text, source: "marketing", group: "marketing", milestone: phase.key, due: sunday, dueKey: null, ...stateOf(id, "open", Boolean(legacy[id])) });
      }
    }
    for (const step of MARKETING_NEXT_STEPS.filter((s) => s.phase === phase.key && !s.weekly)) {
      const id = `step:${step.id}`;
      out.push({ id, title: step.text, source: "marketing", group: "marketing", milestone: phase.key, due: phase.to, dueKey: null, ...stateOf(id, "open", Boolean(admin.marketingSteps?.[step.id])) });
    }
  }
  for (const c of admin.launchCustomTasks ?? []) {
    const due = c.due ?? addDays(c.week, 6);
    out.push({ id: c.id, title: c.text, source: "own", group: (PLAN_GROUPS.some((g) => g.id === c.group) ? c.group : "marketing") as PlanGroup, milestone: null, due, dueKey: null, removable: true, ...stateOf(c.id, "open", Boolean(legacy[`${c.week}:${c.id}`])) });
  }
  return out.toSorted((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

/** Due this week (Monday to Sunday of today) – with everything still open from before (overdue) – and next week. */
export function weekBuckets(todos: readonly PlanTodo[], today: string) {
  const monday = weekStart(today);
  const sunday = addDays(monday, 6);
  const nextSunday = addDays(monday, 13);
  return {
    thisWeek: todos.filter((t) => t.due && t.due <= sunday && (t.due >= monday || isOpenTodo(t))),
    nextWeek: todos.filter((t) => t.due && t.due > sunday && t.due <= nextSunday),
    range: { monday, sunday, nextMonday: addDays(monday, 7), nextSunday },
  };
}

/** Overdue: still open and its date before today. */
export const isOverdue = (t: PlanTodo, today: string) => Boolean(t.due && t.due < today && isOpenTodo(t));
