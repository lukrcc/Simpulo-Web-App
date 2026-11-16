"use client";

// Needs you – every open task of the signed-in person, the ONE list behind Your houses' Pay · Reply · Set up and the header's number on
// "Your houses" (so both always agree). The rules:
//   a task on a House you host or are part of (lib/houseTasks cardTaskOf – before the launch and in the beta without the paying ones)
//   · one "Pick one" while two acceptances overlap (lib/overlap) · "Fill N spots" for each of your Houses starting soon and under half full
//   · "Set up payouts" while a host has no payout account (or Stripe needs a step) · "Verify your ID" for guests who don't host
//   · "Finish your profile" while the bio is empty or there are fewer than two photos.
import { readDraft } from "@/components/create/model";
import { canPay, usePlatformPhase } from "@/config/platform";
import { earningsFor } from "@/lib/earnings";
import { cardTaskOf, needsFill, type CardTask } from "@/lib/houseTasks";
import { acceptedOverlaps } from "@/lib/overlap";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { getCurrentUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { useHydrated } from "@/lib/useHydrated";

export type NeedsYouTask =
  | { key: string; kind: CardTask["kind"]; stay: Stay; task: CardTask }
  | { key: "overlaps"; kind: "overlap"; overlaps: [Stay, Stay][] }
  | { key: string; kind: "fill"; stay: Stay }
  | { key: "payouts"; kind: "payouts" }
  | { key: "verify"; kind: "verify" }
  | { key: "profile"; kind: "profile" };

const LIVE_REQUEST = ["accepted", "pending", "invited", "waitlist_requested", "waitlisted"];

/** A House's open task for its card and Needs you – without the paying ones before the launch and in the beta (config/platform.ts canPay). */
export function useCardTask() {
  const store = useStore();
  const payOk = canPay(usePlatformPhase());
  return (stay: Stay, now: string) => {
    const task = cardTaskOf(store, stay, now);
    return task && task.kind === "pay" && !payOk ? null : task;
  };
}

/**
 * The open tasks, in the order Your houses lists them. `localDraft`: the page knows its own Open a House draft (it can delete it); anyone
 * else reads it from this browser once hydrated.
 */
export function useNeedsYou(now: string | null, localDraft?: boolean): NeedsYouTask[] {
  const store = useStore();
  const hydrated = useHydrated();
  const payout = usePayoutAccount();
  const taskOf = useCardTask();
  const payOk = canPay(usePlatformPhase());
  const me = store.currentUserId;
  const meUser = getCurrentUser(store);
  if (!me || !now) return [];
  const today = now.slice(0, 10);
  const over = (s: Stay) => s.status === "completed" || s.endDate < today;
  const hosting = store.stays.filter((s) => !s.isExample && s.hostId === me && (s.status === "published" || s.status === "booked" || s.status === "closed") && !over(s));
  const drafts = store.stays.filter((s) => s.hostId === me && s.status === "draft");
  const joined = store.joinRequests
    .filter((r) => r.userId === me && LIVE_REQUEST.includes(r.status))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) ? [stay] : [];
    });
  const ownDraft = localDraft ?? (hydrated ? (() => {
    const draft = readDraft();
    return Boolean(draft && (!draft.ownerId || draft.ownerId === me));
  })() : false);
  const past = store.stays.filter((s) => !s.isExample && over(s) && s.hostId === me);
  const hasHosted = hosting.length > 0 || drafts.length > 0 || ownDraft || earningsFor(store, me, today).any || past.length > 0;
  const payoutSetup = payOk && hasHosted && (payout.status === "none" || payout.status === "action_required");
  const profileSetup = meUser !== undefined && (!meUser.bio.trim() || meUser.photos.length < 2);
  const overlaps = acceptedOverlaps(store);
  return [
    ...[...hosting, ...joined].flatMap((stay): NeedsYouTask[] => {
      const task = taskOf(stay, now);
      return task ? [{ key: stay.id, kind: task.kind, stay, task }] : [];
    }),
    ...(overlaps.length > 0 ? [{ key: "overlaps" as const, kind: "overlap" as const, overlaps }] : []),
    ...hosting.filter((stay) => needsFill(stay, today)).map((stay) => ({ key: `${stay.id}-fill`, kind: "fill" as const, stay })),
    ...(payoutSetup ? [{ key: "payouts" as const, kind: "payouts" as const }] : []),
    ...(meUser && !meUser.verified && !hasHosted ? [{ key: "verify" as const, kind: "verify" as const }] : []),
    ...(profileSetup ? [{ key: "profile" as const, kind: "profile" as const }] : []),
  ];
}
