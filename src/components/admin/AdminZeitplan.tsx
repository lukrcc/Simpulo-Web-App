"use client";
import { AdminButton } from "./AdminButton";

// Admin › Zeitplan (/admin/zeitplan, HEUTE after Aufgaben, CLAUDE.md "Zeitplan"): capsules Zeitleiste (neutral, the default) · Code (lilac)
// · Marketing (yellow) · Vorbereitung (orange) · Launch (pink) – the timeline's four lanes, each its own capsule in its unit colour
// (config/admin-tiles.ts "zeitplan"): the lane's milestones or due dates with their to-dos (ticked off as before). A bar on the timeline
// opens its lane with the entry marked (?focus=). Right in the tab bar one small line: next milestone, launch. All dates and milestones from
// config/roadmap.ts, the preparation from config/setup-todos.ts, the marketing weeks from config/marketing.ts – ONE to-do model
// (lib/roadmap.ts planTodos), every status, note and milestone state stored through the adapter, every change logged (useAdminActions).
// Old links (?tab=now|milestones|todos with &due= or &milestone=) land on the matching capsule.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { FALLBACK_RULES, LAUNCH_PHASES } from "@/config/marketing";
import { CODE_MILESTONES, LAUNCH, TODO_DUES, TODO_STATUSES, type TodoStatus } from "@/config/roadmap";
import { useAdminActions } from "@/lib/admin/actions";
import { launchProgress } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { setAdminSearch, useAdminSearch, useAdminTab } from "@/lib/admin/urlState";
import { day, num } from "@/lib/i18n/adminFormat";
import { daysBetween, daysToLaunch, dueProgress, isOpenTodo, isOverdue, nextMilestone, PLAN_GROUPS, planGroupLabel, planMilestones, planTodos, roadmapTodos, weekStart, type PlanGroup, type PlanMilestone, type PlanTodo } from "@/lib/roadmap";
import { cn } from "@/lib/utils";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { StatusDot } from "./AdminCharts";
import { AdminSort, AdminTabs } from "./AdminLayout";
import { RoadmapTimeline, useMilestoneName } from "./AdminRoadmap";
import { AdminShell } from "./AdminShell";
import { withUnits } from "./tileRoutes";

type Lane = "code" | "marketing" | "prep" | "launch";
type Tab = "timeline" | Lane;
const TABS: readonly Tab[] = ["timeline", "code", "marketing", "prep", "launch"];

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

/** The lane a milestone belongs to (an old ?milestone= link). */
const laneOf = (id: string): Lane => (CODE_MILESTONES.some((m) => m.id === id) ? "code" : id === "launch" ? "launch" : "marketing");

export function AdminZeitplan() {
  const t = useTranslations("admin.zeitplan");
  const params = useAdminSearch();
  // Old links: ?tab=now → Zeitleiste, ?tab=milestones → Code, ?tab=todos (&due= → Vorbereitung, &milestone= → its lane) – with the entry marked.
  const raw = params.get("tab");
  const due = params.get("due");
  const milestone = params.get("milestone");
  useEffect(() => {
    if (raw === "todos" || raw === "milestones" || raw === "now" || due || milestone) {
      const tab = milestone ? laneOf(milestone) : due || raw === "todos" ? "prep" : raw === "milestones" ? "code" : null;
      setAdminSearch({ tab, focus: milestone ?? due ?? null, due: null, milestone: null }, { replace: true });
    }
  }, [raw, due, milestone]);
  const { tab, focus, open } = useAdminTab<Tab>(TABS, "timeline");
  return (
    <AdminShell
      title={t("title")}
      tabs={<AdminTabs label={t("tabsLabel")} value={tab} onChange={(v) => open(v)} tabs={withUnits("zeitplan", TABS.map((value) => ({ value, label: t(`tabs.${value}`), tooltip: value === "timeline" ? undefined : t(`tabInfo.${value}`) })))} />}
      aside={<CountdownLine />}
    >
      {tab === "timeline" ? (
        <RoadmapTimeline onOpen={(lane, f) => open(lane, f)} />
      ) : tab === "prep" ? (
        <PrepView />
      ) : tab === "launch" ? (
        <LaunchView />
      ) : (
        <LaneView lane={tab} focus={focus} />
      )}
    </AdminShell>
  );
}

// ── The countdowns ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Right in the tab bar, one small line of text (no tiles): "Nächster Meilenstein in 8 Tagen · Launch in 162 Tagen";
 * the milestone's name in the tooltip.
 */
function CountdownLine() {
  const t = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const name = useMilestoneName();
  const next = nextMilestone(today, data);
  const launch = daysToLaunch(today);
  const parts = [
    next && { key: "next", text: `${t("now.next")} ${t("inDays", { days: next.days })}`, tip: `${name(next)} · ${day(next.date)}` },
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

// ── Code · Marketing: the lane's milestones, each with its to-dos ───────────────────────────────────────────────────────────

const STATUS_DOT = { open: null, running: null, reached: "good", postponed: "warning" } as const;

function LaneView({ lane, focus }: { lane: "code" | "marketing"; focus: string | null }) {
  const t = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const todos = usePlanTodos();
  const milestones = planMilestones(data, today).filter((m) => m.kind === lane);
  // Own to-dos of this lane's group: their own section at the end.
  const own = todos.filter((x) => x.source === "own" && x.group === lane);
  return (
    <div data-lane={lane} className="flex flex-col gap-(--adm-section)">
      {milestones.map((m) => (
        <MilestoneBlock key={m.id} m={m} todos={todos.filter((x) => x.milestone === m.id)} marked={focus === m.id} />
      ))}
      <section aria-label={t("lane.own")} className="flex flex-col gap-(--adm-inner)">
        <h2 className="text-eyebrow uppercase text-(--adm-label)">{t("lane.own")}</h2>
        {own.length > 0 && <TodoList todos={own} />}
        <AddTodo onAdd={(text, dueDay, g) => actions.addOwnTodo(text, dueDay, weekStart(dueDay), g)} today={today} defaultGroup={lane} />
      </section>
    </div>
  );
}

/** One milestone: its date, name, goal, state and note – and its to-dos right under it. */
function MilestoneBlock({ m, todos, marked }: { m: PlanMilestone; todos: readonly PlanTodo[]; marked: boolean }) {
  const t = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const actions = useAdminActions();
  const name = useMilestoneName();
  const done = todos.filter((x) => x.status === "done").length;
  const days = daysBetween(today, m.date);
  const label = name(m);
  const goal = (() => {
    if (m.goal) return m.goal;
    const phase = m.kind === "launch" ? LAUNCH_PHASES.at(-1)! : LAUNCH_PHASES.find((p) => p.key === m.id);
    if (!phase) return null;
    return m.kind === "launch" ? t("milestones.goalLaunch", { houses: num(phase.targets.housesOpened), waitlist: num(phase.targets.waitlist) }) : t("milestones.goalMarketing", { contacts: num(phase.targets.contacts), houses: num(phase.targets.housesOpened), waitlist: num(phase.targets.waitlist) });
  })();
  return (
    <section data-milestone={m.id} data-milestone-status={m.status} data-focus-key={m.id} data-marked={marked || undefined} aria-label={label} className="flex flex-col gap-2">
      <div className={cn("grid gap-x-6 gap-y-2 border-b border-ink/8 pb-3 lg:grid-cols-[132px_minmax(0,1fr)_minmax(0,260px)_auto]", m.status === "reached" && "opacity-70")}>
        <div className="text-small">
          <p className="font-semibold text-ink tabular-nums">
            {day(m.date)}
            {m.uncertain && ` (${t("todos.approx")})`}
          </p>
          <p className="text-muted">{m.status === "reached" ? t("milestones.reachedOn", { date: day(m.reachedAt!.slice(0, 10)) }) : days >= 0 ? t("inDays", { days }) : t("ago", { days: -days })}</p>
        </div>
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink">{label}</p>
          {goal && <p className="text-small text-muted">{goal}</p>}
          <p className="mt-1 text-small text-muted">{todos.length === 0 ? t("milestones.noTodos") : t("milestones.todos", { done, total: todos.length })}</p>
        </div>
        <NoteField key={`${m.id}:${m.note}`} value={m.note} label={t("milestones.note")} placeholder={t("milestones.notePlaceholder")} onCommit={(note) => actions.setMilestoneNote(m.id, label, note)} />
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className="flex items-center gap-1.5 text-small text-ink" data-status-label>
            <StatusDot status={STATUS_DOT[m.status]} />
            <span className={cn(m.status === "running" && "font-semibold")}>{t(`milestones.status.${m.status}`)}</span>
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
      </div>
      {todos.length > 0 && <TodoList todos={todos} />}
    </section>
  );
}

// ── Vorbereitung: the due dates, each with its to-dos ─────────────────────────────────────────────────────────────────────────

function PrepView() {
  const t = useTranslations("admin.zeitplan");
  const { today } = useAdminInputs();
  const actions = useAdminActions();
  const todos = usePlanTodos();
  const prep = todos.filter((x) => x.source === "prep");
  // Own to-dos that aren't Code or Marketing belong to the preparation.
  const own = todos.filter((x) => x.source === "own" && x.group !== "code" && x.group !== "marketing");
  return (
    <div data-lane="prep" className="flex flex-col gap-(--adm-section)">
      {TODO_DUES.map((d) => {
        const list = prep.filter((x) => x.dueKey === d.id);
        if (!list.length) return null;
        const open = list.filter(isOpenTodo).length;
        return (
          <section key={d.id} data-due={d.id} data-focus-key={d.id} aria-label={d.label} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink/8 pb-2">
              <h2 className="text-body font-semibold text-ink">
                {d.label}
                {d.date && <span className="font-normal text-muted"> · {t("todos.dueOn", { date: day(d.date.date) })}{d.date.uncertain ? ` (${t("todos.approx")})` : ""}</span>}
              </h2>
              <span className="text-small tabular-nums text-muted">{t("lane.dueState", { done: list.length - open - list.filter((x) => x.status === "later").length, total: list.length, open })}</span>
            </div>
            <TodoList todos={list} />
          </section>
        );
      })}
      <section aria-label={t("lane.own")} className="flex flex-col gap-(--adm-inner)">
        <h2 className="text-eyebrow uppercase text-(--adm-label)">{t("lane.own")}</h2>
        {own.length > 0 && <TodoList todos={own} />}
        <AddTodo onAdd={(text, dueDay, g) => actions.addOwnTodo(text, dueDay, weekStart(dueDay), g)} today={today} defaultGroup={PLAN_GROUPS[0].id} />
      </section>
    </div>
  );
}

// ── Launch: the day, its criteria, the fallback rules ─────────────────────────────────────────────────────────────────────────

function LaunchView() {
  const t = useTranslations("admin.zeitplan");
  const tc = useTranslations("admin.overview");
  const inputs = useAdminInputs();
  const data = useAdminData();
  const todos = usePlanTodos();
  const m = planMilestones(data, inputs.today).find((x) => x.kind === "launch")!;
  const lp = launchProgress(inputs);
  const criteria = [
    { key: "houses", label: tc("criteria.houses"), p: lp.houses, unit: "" },
    { key: "hubs", label: tc("criteria.hubs", { min: lp.hubs.target }), p: lp.hubs, unit: "" },
    { key: "reservedShare", label: tc("criteria.reservedShare", { min: 2 }), p: lp.reservedShare, unit: " %" },
    { key: "waitlist", label: tc("criteria.waitlist"), p: lp.waitlist, unit: "" },
  ];
  const met = criteria.filter((c) => c.p.ratio >= 1).length;
  return (
    <div data-lane="launch" className="flex flex-col gap-(--adm-section)">
      <MilestoneBlock m={m} todos={todos.filter((x) => x.milestone === "launch")} marked={false} />
      <section aria-label={tc("launch")} data-launch-criteria>
        <h2 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">
          {tc("launch")} · {t("timeline.criteriaMet", { met, total: criteria.length })}
        </h2>
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {criteria.map((c) => (
            <li key={c.key} data-criterion={c.key} className="flex min-h-(--adm-row-h) items-center gap-3">
              <StatusDot status={c.p.ratio >= 1 ? "good" : c.p.ratio >= 0.6 ? "warning" : "critical"} />
              <span className="min-w-0 flex-1 text-body text-ink">{c.label}</span>
              <span className="text-body tabular-nums text-muted">
                {num(c.p.value)}
                {c.unit} / {num(c.p.target)}
                {c.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label={t("timeline.fallback")}>
        <h2 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{t("timeline.fallback")}</h2>
        <ul className="flex flex-col gap-1.5 text-body text-ink">
          {FALLBACK_RULES.map((r) => (
            <li key={r.id}>{r.text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** A lane's to-dos: the rows, done ones last. */
function TodoList({ todos }: { todos: readonly PlanTodo[] }) {
  const { today } = useAdminInputs();
  const ordered = todos.toSorted((a, b) => Number(a.status === "done") - Number(b.status === "done"));
  return (
    <ul className="divide-y divide-ink/8 border-b border-ink/8">
      {ordered.map((x) => (
        <TodoRow key={x.id} todo={x} today={today} />
      ))}
    </ul>
  );
}

/** A note field: saved when it loses focus (and only when it changed). */
function NoteField({ value, label, placeholder, onCommit, className }: { value: string; label: string; placeholder: string; onCommit: (value: string) => void; className?: string }) {
  const [draft, setDraft] = useState(value);
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() !== value && onCommit(draft.trim())} placeholder={placeholder} aria-label={label} className={cn("h-9 min-w-0 rounded-full bg-(--adm-cap-bg) px-3 text-small text-ink placeholder:text-muted", className)} />;
}

// ── To-dos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function AddTodo({ onAdd, today, defaultGroup }: { onAdd: (text: string, due: string, group: PlanGroup) => void; today: string; defaultGroup: PlanGroup }) {
  const t = useTranslations("admin.zeitplan");
  const [text, setText] = useState("");
  const [dueDay, setDueDay] = useState(today);
  const [group, setGroup] = useState<PlanGroup>(defaultGroup);
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

function TodoRow({ todo, today }: { todo: PlanTodo; today: string }) {
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
          {[planGroupLabel(todo.group), todo.due ? `${t("todos.dueOn", { date: day(todo.due) })}${todo.uncertain ? ` (${t("todos.approx")})` : ""}` : t("todos.noDate")].filter(Boolean).join(" · ")}
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
