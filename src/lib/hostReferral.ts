// Host brings host (CLAUDE.md "Host wirbt Host", config/policies.ts HOST_REFERRAL – prepared, off): who a host brought, how far each got,
// and when a share would start – only after the brought host's first paid stay, only one level (User.hostReferredBy is the direct referrer).
import type { Payment, Stay, User } from "./types";

export type BroughtStatus = "accepted" | "hosting" | "paidStay";

export interface BroughtHost {
  user: User;
  status: BroughtStatus;
  /** The first guest share paid in one of their Houses – from then the share would run (HOST_REFERRAL.months) */
  firstPaidAt: string | null;
}

/** When a host's first guest paid (ISO), or null. */
export function firstPaidStayOf(hostId: string, stays: readonly Stay[], payments: readonly Payment[]): string | null {
  const theirs = new Set(stays.filter((s) => s.hostId === hostId).map((s) => s.id));
  const paid = payments.filter((p) => theirs.has(p.stayId) && p.userId !== hostId && p.status === "paid" && p.paidAt).map((p) => p.paidAt!);
  return paid.length ? paid.toSorted()[0] : null;
}

export function hostsBroughtBy(referrerId: string, data: { users: readonly User[]; stays: readonly Stay[]; payments: readonly Payment[] }): BroughtHost[] {
  return data.users
    .filter((u) => u.hostReferredBy === referrerId)
    .map((user) => {
      const firstPaidAt = firstPaidStayOf(user.id, data.stays, data.payments);
      const hosting = data.stays.some((s) => s.hostId === user.id && s.status !== "draft" && s.status !== "draft_unclaimed");
      return { user, status: firstPaidAt ? ("paidStay" as const) : hosting ? ("hosting" as const) : ("accepted" as const), firstPaidAt };
    });
}

/** The /host link a host shares to bring another host: ?ref={host}&src=hostref. */
export const hostReferralPath = "/host";
