"use client";

// Every deadline step the clock takes (lib/deadlines.ts) goes into the admin log as "System" – once per step, also when the clock ticks
// again before the store has marked it. TODO(backend): the Cloud Function writes the log itself.
import { appendAdminLog } from "./admin/store";
import { deadlineKey, type DeadlineEvent } from "./deadlines";
import type { Stay, User } from "./types";

const logged = new Set<string>();
export const SYSTEM_ACTOR = "system";

export function logDeadlineSteps(events: readonly DeadlineEvent[], data: { stays: readonly Stay[]; users: readonly User[] }) {
  for (const e of events) {
    const key = deadlineKey(e);
    if (logged.has(key)) continue;
    logged.add(key);
    const stay = data.stays.find((s) => s.id === e.stayId);
    const guest = data.users.find((u) => u.id === e.guestId)?.name.split(" ")[0] ?? e.guestId;
    // The target as the log shows it: step · House · the guest it's about (the step's German label comes from admin.log.deadline.<step>).
    appendAdminLog("deadline_step", `${e.step}${e.superseded ? " (überholt)" : ""} · ${stay?.title ?? e.stayId} · ${guest}`, SYSTEM_ACTOR, e.stayId);
  }
}
