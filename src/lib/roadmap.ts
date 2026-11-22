// Admin › System › Zeitplan & Vorbereitung: the schedule's logic over config/roadmap.ts – each to-do with its stored state, the due
// milestones' progress, the next milestone. Pure, no clock (today comes in).
import { CODE_MILESTONES, DEPARTURE, LAUNCH, MARKETING_START, ROADMAP_TODOS, TODO_DUES, type RoadmapTodo, type TodoDue, type TodoStatus } from "@/config/roadmap";
import type { AdminData } from "@/lib/data";

export type RoadmapTodoState = RoadmapTodo & { status: TodoStatus; note: string; cost: string | null };

/** The to-dos with their stored status, note and cost over the start values. */
export function roadmapTodos(admin: Pick<AdminData, "roadmapTodos">): RoadmapTodoState[] {
  const saved = admin.roadmapTodos ?? {};
  return ROADMAP_TODOS.map((t) => ({ ...t, status: saved[t.id]?.status ?? t.status, note: saved[t.id]?.note ?? "", cost: saved[t.id]?.cost ?? t.cost }));
}

/** Still to do: open or in progress ("bewusst später" and done are not). */
export const isOpenTodo = (t: Pick<RoadmapTodoState, "status">) => t.status === "open" || t.status === "inProgress";

/** Per due milestone: its to-dos, how many are open, whether all are done. */
export function dueProgress(todos: readonly RoadmapTodoState[]) {
  return TODO_DUES.map((d) => {
    const list = todos.filter((t) => t.due === d.id);
    const open = list.filter(isOpenTodo).length;
    return { ...d, total: list.length, open, done: list.filter((t) => t.status === "done").length, complete: list.length > 0 && open === 0 };
  });
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * The next milestone from today: a code milestone not marked as reached, the marketing start or the launch – the earliest on or after
 * today. null after all of them.
 */
export function nextMilestone(today: string, reached: Record<string, string> = {}) {
  const all = [
    ...CODE_MILESTONES.filter((m) => !reached[m.id]).map((m) => ({ id: m.id, label: `${m.label} ${m.title}`, date: m.date })),
    { id: "marketingStart", label: "Marketing-Start", date: MARKETING_START.date },
    { id: "launch", label: "Launch", date: LAUNCH.date },
  ];
  const next = all.filter((m) => m.date >= today).toSorted((a, b) => a.date.localeCompare(b.date))[0];
  return next ? { ...next, days: daysBetween(today, next.date) } : null;
}

/** Days to the departure (negative once gone). */
export const daysToDeparture = (today: string) => daysBetween(today, DEPARTURE.date);

export const dueLabel = (id: TodoDue) => TODO_DUES.find((d) => d.id === id)?.label ?? id;
