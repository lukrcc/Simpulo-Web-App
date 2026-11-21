// The deadlines of requests and payments – one place (CLAUDE.md "Fristen"). Pure: from the data and a moment, which steps are due
// (config/policies.ts DEADLINES). Today the browser's clock runs it (lib/store.tsx, every minute and on the Dev menu's time shift – lib/clock.ts);
// later the same function runs as a Cloud Function every hour and writes the same records. Nothing here reads the clock itself.
//
//   request (since it was sent):  24 h reminder to the host · 48 h last reminder · 60 h Admin › Houses "Braucht Hilfe" · 72 h it runs out
//   payment (its 48-hour window): 24 h reminder to the guest · 44 h last reminder · 48 h the spot is free again
//
// A step is taken once (JoinRequest.deadlines / Payment.deadlines). When the clock jumps past several, the earlier notices are left out
// (superseded) – only the latest goes out; every step is still marked, and the admin log shows what was done.
import { DEADLINES, PAYMENT_POLICY, type DeadlineFlow } from "@/config/policies";
import type { NotifyEventKey } from "./data/notifications";
import type { JoinRequest, Payment, Stay } from "./types";

const HOUR_MS = 3_600_000;

export interface DeadlineEvent {
  flow: DeadlineFlow;
  step: string;
  /** The request's or the payment's id */
  targetId: string;
  stayId: string;
  /** Who it is about (the guest) */
  guestId: string;
  /** When the step was due (ISO) */
  dueAt: string;
  /** Who hears it; empty for admin-only steps */
  to: string[];
  notice: NotifyEventKey | null;
  /** A later step of the same flow is due as well: marked, but no notice */
  superseded: boolean;
}

type Data = { stays: readonly Stay[]; joinRequests: readonly JoinRequest[]; payments: readonly Payment[] };

/** When a payment's 48 hours started (its House's paymentDueAt minus the window); null when no window runs. */
export function paymentWindowStart(stay: Pick<Stay, "paymentDueAt">): number | null {
  return stay.paymentDueAt ? Date.parse(stay.paymentDueAt) - PAYMENT_POLICY.paymentWindowHours * HOUR_MS : null;
}

/** The steps of one flow that are due at `now` for something that started at `start` and has taken `done`. */
function dueSteps(flow: DeadlineFlow, start: number, now: number, done: Partial<Record<string, string>> | undefined) {
  const steps = DEADLINES[flow].filter((s) => start + s.afterHours * HOUR_MS <= now && !done?.[s.id]);
  // The latest due step with a notice is the one that speaks; earlier reminders are superseded.
  const speaking = steps.filter((s) => s.notice).at(-1)?.id;
  return steps.map((s) => ({ step: s, dueAt: new Date(start + s.afterHours * HOUR_MS).toISOString(), superseded: Boolean(s.notice) && s.id !== speaking }));
}

/** Every deadline step due at `now` – oldest first. */
export function dueDeadlines(data: Data, now: number): DeadlineEvent[] {
  const events: DeadlineEvent[] = [];
  for (const r of data.joinRequests) {
    if (r.status !== "pending") continue;
    const stay = data.stays.find((s) => s.id === r.stayId);
    if (!stay) continue;
    for (const { step, dueAt, superseded } of dueSteps("request", Date.parse(r.createdAt), now, r.deadlines)) {
      events.push({ flow: "request", step: step.id, targetId: r.id, stayId: stay.id, guestId: r.userId, dueAt, to: step.to === "host" ? [stay.hostId] : step.to === "guest" ? [r.userId] : [], notice: (step.notice as NotifyEventKey | null) ?? null, superseded });
    }
  }
  for (const p of data.payments) {
    if (p.status !== "pending") continue;
    const stay = data.stays.find((s) => s.id === p.stayId);
    // The host's own share has no spot to lose: no reminders, no lapse.
    if (!stay || p.userId === stay.hostId) continue;
    const start = paymentWindowStart(stay);
    if (start === null) continue;
    for (const { step, dueAt, superseded } of dueSteps("payment", start, now, p.deadlines)) {
      events.push({ flow: "payment", step: step.id, targetId: p.id, stayId: stay.id, guestId: p.userId, dueAt, to: step.to === "host" ? [stay.hostId] : step.to === "guest" ? [p.userId] : [], notice: (step.notice as NotifyEventKey | null) ?? null, superseded });
    }
  }
  return events.toSorted((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** A stable key per step (the admin log writes each once). */
export const deadlineKey = (e: Pick<DeadlineEvent, "flow" | "targetId" | "step">) => `${e.flow}:${e.targetId}:${e.step}`;
