// Admin › Heute ("Was ist heute zu tun?"): ONE list of what needs doing, from every source – open safety tickets · failed payments · tax
// deadlines in the next 7 days ·
// Houses at risk · new host applications (pre-launch and beta only) · host warnings · the other support tickets. In that order (safety,
// money, Houses, applications, hosts, support), within a kind the oldest first. A task marked done is gone; one put off ("Später") comes
// back tomorrow (AdminData.taskStates). Pure: the components render it, lib/admin/actions.ts changes it (and logs).
import type { MarketingPartner, PaymentIssue } from "@/lib/data";
import type { HostApplication, ModerationNotice, Report, Stay, SupportTicket } from "@/lib/types";
import { TAX_DEADLINES } from "@/config/admin";
import { taxDeadlines, type TaxDeadline } from "./ledger";
import { atRiskHouses, hostOverview, isOpenTicket, launchCriteriaMet, partnerStepDue, type AdminInputs, type HostOverview, type NeedsYou, type RiskReason } from "./metrics";

export const TASK_KINDS = ["report", "appeal", "safety", "money", "deadline", "atRisk", "application", "hostWarning", "partnerStep", "support"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export type AdminTask =
  | { id: string; kind: "report"; createdAt: string; report: Report }
  /** An appeal against a statement of reasons (/notices) – open until decided */
  | { id: string; kind: "appeal"; createdAt: string; notice: ModerationNotice }
  | { id: string; kind: "safety" | "support"; createdAt: string; ticket: SupportTicket }
  | { id: string; kind: "money"; createdAt: string; issue: PaymentIssue; stay: Stay | undefined }
  | { id: string; kind: "deadline"; createdAt: string; deadline: TaxDeadline }
  | { id: string; kind: "atRisk"; createdAt: string; stay: Stay; reasons: readonly RiskReason[] }
  | { id: string; kind: "application"; createdAt: string; application: HostApplication }
  | { id: string; kind: "hostWarning"; createdAt: string; host: HostOverview }
  | { id: string; kind: "partnerStep"; createdAt: string; partner: MarketingPartner };

const DAY_MS = 86_400_000;
const daysBefore = (today: string, days: number) => new Date(Date.parse(`${today}T12:00:00Z`) - days * DAY_MS).toISOString();

/** Every task from every source, the tickets given (open ones, or the finished ones), in the list's order. */
function buildTasks(inputs: AdminInputs, paymentIssues: readonly PaymentIssue[], open: readonly SupportTicket[]): AdminTask[] {
  const tasks: AdminTask[] = [
    // Reports (Melden): open until the admin decides – first of all.
    ...inputs.reports.filter((r) => !r.decision).map((report): AdminTask => ({ id: `report:${report.id}`, kind: "report", createdAt: report.createdAt, report })),
    ...inputs.notices.filter((n) => n.appeal && !n.appeal.decision).map((notice): AdminTask => ({ id: `appeal:${notice.id}`, kind: "appeal", createdAt: notice.appeal!.at, notice })),
    ...open.filter((t) => t.category === "safety").map((ticket): AdminTask => ({ id: `ticket:${ticket.id}`, kind: "safety", createdAt: ticket.createdAt, ticket })),
    ...paymentIssues.map((issue): AdminTask => ({ id: `payment:${issue.id}`, kind: "money", createdAt: issue.at, issue, stay: inputs.stays.find((s) => s.id === issue.stayId) })),
    // A tax deadline shows up `showInTodayDays` (7) days before it (Geld › Steuern › Fristen).
    ...taxDeadlines(inputs.today, TAX_DEADLINES.showInTodayDays).map((deadline): AdminTask => ({ id: `deadline:${deadline.id}`, kind: "deadline", createdAt: deadline.date, deadline })),
    // A House at risk is as old as it has been quiet (or today).
    ...atRiskHouses(inputs).map(({ stay, reasons }): AdminTask => {
      const quiet = reasons.find((r) => r.key === "quiet");
      return { id: `house:${stay.id}`, kind: "atRisk", createdAt: daysBefore(inputs.today, quiet?.key === "quiet" ? quiet.days : 0), stay, reasons };
    }),
    ...(inputs.phase === "live" ? [] : inputs.admin.applications.filter((a) => a.status === "new")).map((application): AdminTask => ({ id: `application:${application.id}`, kind: "application", createdAt: application.createdAt, application })),
    ...hostOverview(inputs)
      // A safety report on their House is already its own task.
      .filter((h) => h.warnings.some((w) => w !== "safety"))
      .map((host): AdminTask => ({ id: `host:${host.user.id}`, kind: "hostWarning", createdAt: host.newest || daysBefore(inputs.today, 0), host })),
    // A partner's next step that is due (Marketing › Partner): as old as its due day; the id carries the step, so a new step is a new task.
    ...(inputs.admin.marketingPartners ?? [])
      .filter((p) => partnerStepDue(p, inputs.today))
      .map((partner): AdminTask => ({ id: `partner:${partner.id}:${partner.nextStep!.due}:${partner.nextStep!.text.length}`, kind: "partnerStep", createdAt: `${partner.nextStep!.due}T09:00:00.000Z`, partner })),
    ...open.filter((t) => t.category !== "safety").map((ticket): AdminTask => ({ id: `ticket:${ticket.id}`, kind: "support", createdAt: ticket.createdAt, ticket })),
  ];
  return tasks.toSorted(byKindThenAge);
}

const byKindThenAge = (a: AdminTask, b: AdminTask) => TASK_KINDS.indexOf(a.kind) - TASK_KINDS.indexOf(b.kind) || a.createdAt.localeCompare(b.createdAt);

/** Every open task, in order; done ones and the ones put off until after today left out. */
export function adminTasks(inputs: AdminInputs, paymentIssues: readonly PaymentIssue[]): AdminTask[] {
  const state = inputs.admin.taskStates;
  return buildTasks(inputs, paymentIssues, inputs.admin.tickets.filter(isOpenTicket)).filter((task) => !state[task.id]?.done && !(state[task.id]?.snoozedUntil && state[task.id]!.snoozedUntil! > inputs.today));
}

/** Posteingang › Erledigt: tasks marked done and the finished tickets (answered, closed, done – not merged duplicates), in the same order. */
export function doneAdminTasks(inputs: AdminInputs, paymentIssues: readonly PaymentIssue[]): AdminTask[] {
  const state = inputs.admin.taskStates;
  const finished = inputs.admin.tickets.filter((t) => !t.mergedInto && !isOpenTicket(t));
  const marked = buildTasks(inputs, paymentIssues, inputs.admin.tickets.filter(isOpenTicket)).filter((task) => state[task.id]?.done);
  const tickets = finished.map((ticket): AdminTask => ({ id: `ticket:${ticket.id}`, kind: ticket.category === "safety" ? "safety" : "support", createdAt: ticket.createdAt, ticket }));
  const decided = inputs.reports.filter((r) => r.decision).map((report): AdminTask => ({ id: `report:${report.id}`, kind: "report", createdAt: report.createdAt, report }));
  const appeals = inputs.notices.filter((n) => n.appeal?.decision).map((notice): AdminTask => ({ id: `appeal:${notice.id}`, kind: "appeal", createdAt: notice.appeal!.at, notice }));
  return [...marked, ...tickets, ...decided, ...appeals].toSorted(byKindThenAge);
}

/** The day after today (YYYY-MM-DD) – "Später" shows a task again then. */
export const tomorrowOf = (today: string) => new Date(Date.parse(`${today}T12:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

/**
 * THE counts of what needs you, from the task list only – so every counter agrees and a ticket counts once: the side list's "Heute" (all
 * tasks), "Support" (safety + other tickets), "Bewerbungen" (new applications), and the capsules of "Braucht dich" on the overview (their sum
 * is "Heute"). A task done or put off leaves every counter at once.
 */
export function taskCounts(tasks: readonly AdminTask[]) {
  const by = Object.fromEntries(TASK_KINDS.map((k) => [k, tasks.filter((t) => t.kind === k).length])) as Record<TaskKind, number>;
  return { total: tasks.length, byKind: by, support: by.safety + by.support, applications: by.application, safetyOpen: by.safety + by.report + by.appeal > 0 };
}

/** "Braucht dich": one capsule per kind with open tasks, in the list's order (0 left out); in pre-launch and beta then the launch criteria. */
export function needsYou(tasks: readonly AdminTask[], inputs: Pick<AdminInputs, "stays" | "admin" | "phase">): NeedsYou[] {
  const { byKind } = taskCounts(tasks);
  const keyOf = { report: "safety", appeal: "safety", safety: "safety", money: "money", deadline: "deadline", atRisk: "atRisk", application: "applications", hostWarning: "hostWarning", partnerStep: "partners", support: "tickets" } as const;
  const needs: NeedsYou[] = TASK_KINDS.filter((k) => byKind[k] > 0).map((k) => ({ key: keyOf[k], count: byKind[k] }));
  if (inputs.phase !== "live") {
    const { met, total } = launchCriteriaMet(inputs);
    if (met < total) needs.push({ key: "launch", count: total - met, met, total });
  }
  return needs;
}
