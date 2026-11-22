"use client";
import { AdminButton } from "./AdminButton";

// Admin › Zeitplan (/admin/zeitplan, HEUTE after Aufgaben): Zeitleiste (first, the default) · Meilensteine · To-dos; right in the tab bar one
// small line with the countdowns (next milestone, departure, launch). All dates, milestones and the
// journey from config/roadmap.ts, the preparation from config/setup-todos.ts, the marketing weeks from config/marketing.ts – ONE to-do model
// (lib/roadmap.ts planTodos), every status, note and milestone state stored through the adapter, every change logged (useAdminActions).
// The tab and filters in the URL (?tab=timeline|milestones|todos – an old ?tab=now opens the timeline –, &due=, &milestone=). German, dark, the admin's tokens.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { LAUNCH_PHASES } from "@/config/marketing";
import { DEPARTURE, LAUNCH, TODO_DUES, TODO_STATUSES, type TodoDue, type TodoStatus } from "@/config/roadmap";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day, num } from "@/lib/i18n/adminFormat";
import { daysBetween, daysToDeparture, daysToLaunch, dueProgress, isOpenTodo, isOverdue, nextMilestone, PLAN_GROUPS, PLAN_SOURCES, planGroupLabel, planMilestones, planTodos, roadmapTodos, weekBuckets, weekStart, type PlanGroup, type PlanMilestone, type PlanSource, type PlanTodo } from "@/lib/roadmap";
import { cn } from "@/lib/utils";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { StatusDot } from "./AdminCharts";
import { AdminSort, AdminTabs } from "./AdminLayout";
import { RoadmapTimeline, useMilestoneName } from "./AdminRoadmap";
import { AdminShell } from "./AdminShell";

type Tab = "timeline" | "milestones" | "todos";
/** Zeitleiste first and by default; old links to "Jetzt" (?tab=now) land on it. */
const TABS: readonly Tab[] = ["timeline", "milestones", "todos"];

/** Every to-do of every source, worded (the marketing numbers as tasks from the countdown's words). */
export function usePlanTodos(): PlanTodo[] {
  const tTask = useTranslations("admin.marketing.countdown.tasks");
  const data = useAdminData();
  return planTodos(data, (metric, count) => tTask(metric, { count }));
}


/** Ticking a to-do (or setting its status): stored and logged; the last open one of a preparation due milestone logs that milestone once. */
function useSetTodoStatus() {
  const tStatus = useTranslations("admin.platform.roadmap.status");
  const data = useAdminData();
  const actions = useAdminActions();
  return (todo: PlanTodo, next: TodoStatus) => {
    if (next === todo.status) return;
    actions.setRoadmapTodoStatus(todo.id, todo.title, next, tStatus(next));
    if (todo.source === "prep" && todo.dueKey && next === "done" && isOpenTodo(todo)) {
      const d = dueProgress(roadmapTodos(data)).find((p) => p.id === todo.dueKey);
      if (d && d.open === 1) actions.logRoadmapMilestone(`Vorbereitung ${d.label}`);
    }
  };
}

export function AdminZeitplan() {
  const t = useTranslations("admin.zeitplan");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "timeline";
  const go = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };
  return (
    <AdminShell title={t("title")} tabs={<AdminTabs label={t("tabsLabel")} value={tab} onChange={(v) => go({ tab: v, due: null, milestone: null })} tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))} />} aside={<CountdownLine />}>
      {tab === "timeline" ? (
        <RoadmapTimeline onPickDue={(due) => go({ tab: "todos", due, milestone: null })} onMilestone={(milestone) => go({ tab: "todos", milestone, due: null })} onMilestones={() => go({ tab: "milestones", due: null, milestone: null })} />
      ) : tab === "milestones" ? (
        <MilestonesView onTodos={(milestone) => go({ tab: "todos", milestone, due: null })} />
      ) : (
        <TodosView due={params.get("due")} milestone={params.get("milestone")} onFilter={(key, value) => go({ [key]: value })} />
      )}
    </AdminShell>
  );
}

// ── The countdowns ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Right in the tab bar, one small line of text (no tiles): "Nächster Meilenstein in 8 Tagen · Abreise in 30 Tagen · Launch in 162 Tagen";
 * the milestone's name in the tooltip.
 */
function CountdownLine() {
  const t = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const name = useMilestoneName();
  const next = nextMilestone(today, data);
  const departure = daysToDeparture(today);
  const launch = daysToLaunch(today);
  const parts = [
    next && { key: "next", text: `${t("now.next")} ${t("inDays", { days: next.days })}`, tip: `${name(next)} · ${day(next.date)}` },
    { key: "departure", text: departure >= 0 ? `${t("now.departure")} ${t("inDays", { days: departure })}` : t("now.departed"), tip: day(DEPARTURE.date) },
    { key: "launch", text: `${t("now.launch")} ${t("inDays", { days: launch })}`, tip: day(LAUNCH.date) },
  ].filter((p): p is { key: string; text: string; tip: string } => Boolean(p));
  return (
    <p data-countdowns className="text-small whitespace-nowrap text-muted">
      {parts.map((p, i) => (
        <span key={p.key}>
          {i > 0 && <span aria-hidden> · </span>}
          <span data-tooltip-info={p.tip}>
            {p.text}
            <span className="sr-only"> ({p.tip})</span>
          </span>
        </span>
      ))}
    </p>
  );
}

// ── Meilensteine ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

const STATUS_DOT = { open: null, running: null, reached: "good", postponed: "warning" } as const;

function MilestonesView({ onTodos }: { onTodos: (milestone: string) => void }) {
  const t = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const todos = usePlanTodos();
  const name = useMilestoneName();
  const milestones = planMilestones(data, today);
  const goalOf = (m: PlanMilestone) => {
    if (m.goal) return m.goal;
    const phase = m.kind === "launch" ? LAUNCH_PHASES.at(-1)! : LAUNCH_PHASES.find((p) => p.key === m.id);
    if (!phase) return null;
    return m.kind === "launch" ? t("milestones.goalLaunch", { houses: num(phase.targets.housesOpened), waitlist: num(phase.targets.waitlist) }) : t("milestones.goalMarketing", { contacts: num(phase.targets.contacts), houses: num(phase.targets.housesOpened), waitlist: num(phase.targets.waitlist) });
  };
  return (
    <ul data-milestones className="divide-y divide-ink/8 border-y border-ink/8">
      {milestones.map((m) => {
        const list = todos.filter((x) => x.milestone === m.id);
        const done = list.filter((x) => x.status === "done").length;
        const days = daysBetween(today, m.date);
        const label = name(m);
        return (
          <li key={m.id} data-milestone={m.id} data-milestone-status={m.status} className={cn("grid gap-x-6 gap-y-2 py-3 lg:grid-cols-[132px_minmax(0,1fr)_minmax(0,260px)_auto]", m.status === "reached" && "opacity-70")}>
            <div className="text-small">
              <p className="font-semibold text-ink tabular-nums">
                {day(m.date)}
                {m.uncertain && ` (${t("todos.approx")})`}
              </p>
              <p className="text-muted">{m.status === "reached" ? t("milestones.reachedOn", { date: day(m.reachedAt!.slice(0, 10)) }) : days >= 0 ? t("inDays", { days }) : t("ago", { days: -days })}</p>
            </div>
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">{label}</p>
              {goalOf(m) && <p className="text-small text-muted">{goalOf(m)}</p>}
              <p className="mt-1 text-small text-muted">
                {list.length === 0 ? (
                  t("milestones.noTodos")
                ) : (
                  <button type="button" onClick={() => onTodos(m.id)} className="text-ink hover:underline">
                    {t("milestones.todos", { done, total: list.length })} · {t("milestones.showTodos")}
                  </button>
                )}
              </p>
            </div>
            <NoteField key={`${m.id}:${m.note}`} value={m.note} label={t("milestones.note")} placeholder={t("milestones.notePlaceholder")} onCommit={(note) => actions.setMilestoneNote(m.id, label, note)} />
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="flex items-center gap-1.5 text-small text-ink" data-status-label>
                <StatusDot status={STATUS_DOT[m.status]} />
                <span className={cn(m.status === "running" && "font-semibold text-adm-chart-1")}>{t(`milestones.status.${m.status}`)}</span>
              </span>
              <AdminButton variant="secondary" onClick={() => actions.setRoadmapReached(m.id, label, m.status !== "reached")}>
                {m.status === "reached" ? t("milestones.undoReached") : t("milestones.markReached")}
              </AdminButton>
              {m.status !== "reached" && (
                <AdminButton variant="secondary" onClick={() => actions.setMilestonePostponed(m.id, label, m.status !== "postponed")}>
                  {m.status === "postponed" ? t("milestones.unpostpone") : t("milestones.postpone")}
                </AdminButton>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A note field: saved when it loses focus (and only when it changed). */
function NoteField({ value, label, placeholder, onCommit, className }: { value: string; label: string; placeholder: string; onCommit: (value: string) => void; className?: string }) {
  const [draft, setDraft] = useState(value);
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() !== value && onCommit(draft.trim())} placeholder={placeholder} aria-label={label} className={cn("h-9 min-w-0 rounded-full bg-(--adm-cap-bg) px-3 text-small text-ink placeholder:text-muted", className)} />;
}

// ── To-dos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type DueFilter = "all" | "overdue" | "thisWeek" | "nextWeek" | "noDate" | TodoDue;
type StatusFilter = TodoStatus | "all" | "notDone";

function TodosView({ due: dueParam, milestone, onFilter }: { due: string | null; milestone: string | null; onFilter: (key: "due" | "milestone", value: string | null) => void }) {
  const t = useTranslations("admin.zeitplan");
  const tStatus = useTranslations("admin.platform.roadmap.status");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const todos = usePlanTodos();
  const name = useMilestoneName();
  const milestones = planMilestones(data, today);
  const [source, setSource] = useState<PlanSource | "all">("all");
  const [group, setGroup] = useState<PlanGroup | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("notDone");
  const [shown, setShown] = useState(40);
  const due: DueFilter = (dueParam as DueFilter | null) ?? "all";
  const milestoneId = milestone;
  const weeks = weekBuckets(todos, today);
  const inWeek = (x: PlanTodo, list: readonly PlanTodo[]) => list.some((y) => y.id === x.id);
  const filtered = todos.filter(
    (x) =>
      (source === "all" || x.source === source) &&
      (group === "all" || x.group === group) &&
      (status === "all" || (status === "notDone" ? x.status !== "done" : x.status === status)) &&
      (!milestoneId || x.milestone === milestoneId) &&
      (due === "all" || (due === "overdue" ? isOverdue(x, today) : due === "thisWeek" ? inWeek(x, weeks.thisWeek) : due === "nextWeek" ? inWeek(x, weeks.nextWeek) : due === "noDate" ? !x.due : x.dueKey === due)),
  );
  const openCount = filtered.filter(isOpenTodo).length;
  return (
    <div data-plan-todos className="flex flex-col gap-(--adm-inner)">
      <div className="flex flex-wrap items-center gap-2">
        <AdminSort label={t("todos.source")} value={source} onChange={setSource} options={[{ value: "all" as const, label: t("todos.all") }, ...PLAN_SOURCES.map((s) => ({ value: s, label: t(`todos.sources.${s}`) }))]} />
        <AdminSort label={t("todos.group")} value={group} onChange={setGroup} options={[{ value: "all" as const, label: t("todos.all") }, ...PLAN_GROUPS.map((g) => ({ value: g.id, label: g.label }))]} />
        <AdminSort label={t("todos.status")} value={status} onChange={setStatus} options={[{ value: "notDone" as const, label: t("todos.openOnly") }, { value: "all" as const, label: t("todos.all") }, ...TODO_STATUSES.map((s) => ({ value: s, label: tStatus(s) }))]} />
        <AdminSort
          label={t("todos.due")}
          value={due}
          onChange={(v) => {
            onFilter("milestone", null);
            onFilter("due", v === "all" ? null : v);
          }}
          options={[{ value: "all" as const, label: t("todos.all") }, ...(["overdue", "thisWeek", "nextWeek", "noDate"] as const).map((v) => ({ value: v, label: t(`todos.dueOptions.${v}`) })), ...TODO_DUES.map((d) => ({ value: d.id, label: d.label }))]}
        />
        <AdminSort label={t("todos.milestone")} value={milestoneId ?? "all"} onChange={(v) => onFilter("milestone", v === "all" ? null : v)} options={[{ value: "all", label: t("todos.all") }, ...milestones.map((m) => ({ value: m.id, label: name(m) }))]} />
        <span className="ml-auto text-small tabular-nums text-muted">
          {t("todos.count", { count: filtered.length })} · {t("todos.openCount", { count: openCount })}
        </span>
      </div>
      <AddTodo onAdd={(text, dueDay, g) => actions.addOwnTodo(text, dueDay, weekStart(dueDay), g)} today={today} />
      {filtered.length === 0 ? (
        <p className="text-body text-muted">{t("todos.empty")}</p>
      ) : (
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {filtered.slice(0, shown).map((x) => (
            <TodoRow key={x.id} todo={x} today={today} milestoneName={x.milestone ? name(milestones.find((m) => m.id === x.milestone) ?? { kind: "code", label: x.milestone, title: "" }) : null} />
          ))}
        </ul>
      )}
      {filtered.length > shown && (
        <AdminButton variant="secondary" className="self-start" onClick={() => setShown((n) => n + 40)}>
          {t("todos.more", { count: Math.min(40, filtered.length - shown) })}
        </AdminButton>
      )}
    </div>
  );
}

function AddTodo({ onAdd, today }: { onAdd: (text: string, due: string, group: PlanGroup) => void; today: string }) {
  const t = useTranslations("admin.zeitplan");
  const [text, setText] = useState("");
  const [dueDay, setDueDay] = useState(today);
  const [group, setGroup] = useState<PlanGroup>("marketing");
  const ready = text.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dueDay);
  return (
    <form
      data-add-todo
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onAdd(text.trim(), dueDay, group);
        setText("");
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("todos.addTitle")} aria-label={t("todos.addTitle")} className="h-9 min-w-[min(100%,280px)] flex-1 rounded-full bg-(--adm-cap-bg) px-4 text-body text-ink placeholder:text-muted" />
      <input type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} aria-label={t("todos.addDue")} className="h-9 rounded-full bg-(--adm-cap-bg) px-3 text-small text-ink [color-scheme:dark]" />
      <AdminSort label={t("todos.addGroup")} value={group} onChange={setGroup} options={PLAN_GROUPS.map((g) => ({ value: g.id, label: g.label }))} />
      <AdminButton variant="secondary" type="submit" disabled={!ready}>
        <Plus aria-hidden className="size-4" />
        {t("todos.add")}
      </AdminButton>
    </form>
  );
}

function TodoRow({ todo, today, milestoneName }: { todo: PlanTodo; today: string; milestoneName: string | null }) {
  const t = useTranslations("admin.zeitplan");
  const tStatus = useTranslations("admin.platform.roadmap.status");
  const tRoadmap = useTranslations("admin.platform.roadmap");
  const actions = useAdminActions();
  const setStatus = useSetTodoStatus();
  return (
    <li data-plan-todo={todo.id} data-todo-source={todo.source} data-todo-status={todo.status} className="grid gap-x-6 gap-y-2 py-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)_auto]">
      <div className="min-w-0">
        <p className={cn("text-body font-semibold", todo.status === "done" ? "text-muted line-through" : "text-ink")}>{todo.title}</p>
        <p className="text-small text-muted">
          {[t(`todos.sources.${todo.source}`), planGroupLabel(todo.group), todo.due ? `${t("todos.dueOn", { date: day(todo.due) })}${todo.uncertain ? ` (${t("todos.approx")})` : ""}` : t("todos.noDate"), milestoneName].filter(Boolean).join(" · ")}
          {isOverdue(todo, today) && <span className="font-semibold text-adm-critical"> · {t("now.overdue")}</span>}
          {todo.link && (
            <>
              {" · "}
              <Link href={todo.link} className="text-ink hover:underline">
                {tRoadmap("open")} →
              </Link>
            </>
          )}
        </p>
      </div>
      <NoteField key={`${todo.id}:${todo.note}`} value={todo.note} label={tRoadmap("note")} placeholder={tRoadmap("notePlaceholder")} onCommit={(note) => actions.setRoadmapTodoField(todo.id, todo.title, "note", note, tRoadmap("what.note"))} />
      <div className="flex items-center gap-2">
        <CapsuleGroup size="sm" label={todo.title} value={todo.status} onChange={(s) => setStatus(todo, s)} options={TODO_STATUSES.map((s) => ({ value: s, content: tStatus(s) }))} />
        {todo.removable && (
          <button type="button" aria-label={t("todos.remove")} onClick={() => actions.deleteLaunchTask(todo.id, todo.title)} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}
