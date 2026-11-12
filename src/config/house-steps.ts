// A guest's way through a House, on its own page (/h/[id]): Requested → Accepted → Crew → Pay → Arrival. The current step is the first one not
// done. Pay only comes once the crew is complete AND the place is picked (with "together", picking the place is part of the Crew step: "Crew &
// place"). The booking is the host's job: for the guest it shows as a check inside Arrival ("Booked ✓"). Words in messages (house.steps.*).
import type { JoinRequest, Payment, Stay } from "@/lib/types";

export type GuestStepKey = "requested" | "accepted" | "crew" | "pay" | "arrival";
export type StepState = "done" | "current" | "todo";

export interface GuestStep {
  key: GuestStepKey;
  state: StepState;
}

export interface GuestJourney {
  steps: GuestStep[];
  current: GuestStepKey | null;
  /** Crew: who's in of how many; how many still to come */
  filled: number;
  total: number;
  missing: number;
  /** "together": the place is picked by the crew – part of the Crew step */
  together: boolean;
  placePicked: boolean;
  /** Pay: the deadline (ISO) */
  payBy: string | null;
  /** Arrival: whole days until the start (negative: started); booked by the host */
  daysToStart: number;
  booked: boolean;
  /** Request: when the open request runs out (ISO, 48h after it came in) */
  requestExpiresAt: string | null;
}

const ORDER: readonly GuestStepKey[] = ["requested", "accepted", "crew", "pay", "arrival"];
const DAY_MS = 86_400_000;
const REQUEST_HOURS = 48;

export function guestJourney(stay: Stay, request: JoinRequest | undefined, payment: Payment | undefined, now: string, /** Who's in, host included (crewInOf) */ inCrew = stay.spotsFilled): GuestJourney {
  const together = stay.accommodationStatus !== "locked" && !stay.accommodationLink;
  const placePicked = stay.accommodationStatus === "locked";
  const filled = Math.max(stay.spotsFilled, inCrew, 1);
  const total = stay.spotsTotal;
  const crewDone = filled >= total && placePicked;
  const accepted = request?.status === "accepted";
  const paid = payment?.status === "paid";
  const over = stay.status === "completed" || stay.endDate < now.slice(0, 10);
  const done: Record<GuestStepKey, boolean> = {
    requested: Boolean(request),
    accepted,
    crew: accepted && crewDone,
    pay: accepted && crewDone && paid,
    arrival: over,
  };
  const current = ORDER.find((key) => !done[key]) ?? null;
  return {
    steps: ORDER.map((key) => ({ key, state: done[key] ? "done" : key === current ? "current" : "todo" })),
    current,
    filled,
    total,
    missing: Math.max(0, total - filled),
    together,
    placePicked,
    payBy: stay.paymentDueAt ?? null,
    daysToStart: Math.ceil((Date.parse(stay.startDate) - Date.parse(now.slice(0, 10))) / DAY_MS),
    booked: Boolean(stay.bookingConfirmedAt),
    requestExpiresAt: request?.status === "pending" ? new Date(Date.parse(request.createdAt) + REQUEST_HOURS * 3_600_000).toISOString() : null,
  };
}
