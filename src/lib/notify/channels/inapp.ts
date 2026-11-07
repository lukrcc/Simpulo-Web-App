// In-app: Messages › Updates. A notification here is a record in the store (AppNotification); the store's reducer makes them with
// records() (pure), everything outside the reducer goes through notify() and the sink the StoreProvider's bridge registers.
// Later: the same documents in Firebase (users/{uid}/notifications).
import type { AppNotification, NotifyEventKey } from "@/lib/data/notifications";

export interface InAppInput {
  key: NotifyEventKey;
  values: Record<string, string | number>;
  /** Shared by everyone who gets the same event */
  eventId: string;
  stayId?: string;
  threadId?: string;
  href?: string;
}

/** One record per recipient (each person at most once). */
export function records(to: readonly string[], input: InAppInput, createdAt = new Date().toISOString()): AppNotification[] {
  return [...new Set(to)].filter(Boolean).map((userId) => ({
    id: `n-${input.eventId}-${userId}`,
    userId,
    eventId: `n-${input.eventId}`,
    key: input.key,
    values: input.values,
    createdAt,
    ...(input.stayId && { stayId: input.stayId }),
    ...(input.threadId && { threadId: input.threadId }),
    ...(input.href && { href: input.href }),
  }));
}

type Sink = (records: AppNotification[]) => void;
let sink: Sink | null = null;
/** The store registers where new records go (NotifyBridge). */
export function setInAppSink(next: Sink | null) {
  sink = next;
}

/** Writes into the Updates list. `sent: true` – push and email were handled by notify() already, the bridge doesn't send them again. */
export function deliver(userId: string, input: InAppInput) {
  sink?.(records([userId], input).map((r) => ({ ...r, sent: true as const })));
}
