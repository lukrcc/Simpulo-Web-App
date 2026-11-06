"use client";

// The current user's payout account and identity check, kept fresh while the provider is still looking (every 1.5s).
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, useStore } from "../store";
import { payments } from "./index";
import type { IdentityStatus, PayoutAccountStatus } from "./types";

const POLL_MS = 1500;

function usePolled<T>(read: (() => Promise<T>) | null, busy: (value: T) => boolean): [T | null, () => void] {
  const [value, setValue] = useState<T | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!read) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const next = await read();
      if (!live) return;
      setValue(next);
      if (busy(next)) timer = setTimeout(run, POLL_MS);
    };
    void run();
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read/busy are stable per user; tick re-reads on demand
  }, [read, tick]);
  return [value, () => setTick((n) => n + 1)];
}

/** The payout account: "none" | "pending" | "action_required" | "active" (null while it's read). */
export function usePayoutAccount(): { status: PayoutAccountStatus | null; last4?: string; refresh: () => void } {
  const me = useStore().currentUserId;
  const read = useCallback(() => (me ? payments.getPayoutAccountStatus(me) : Promise.resolve({ status: "none" as const })), [me]);
  const [account, refresh] = usePolled(me ? read : null, (a) => a.status === "pending");
  return { status: account?.status ?? null, last4: account?.last4, refresh };
}

/**
 * The ID check: "none" | "processing" | "verified" | "failed". Once Stripe Identity says verified, the profile gets its check
 * (User.verified) – the one place that sets it.
 */
export function useIdentity(): { status: IdentityStatus | null; refresh: () => void } {
  const store = useStore();
  const me = getCurrentUser(store);
  const read = useCallback(() => (me ? payments.getIdentityStatus(me.id) : Promise.resolve("none" as const)), [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, refresh] = usePolled<IdentityStatus>(me ? read : null, (s) => s === "processing");
  const { updateCurrentUser } = store;
  useEffect(() => {
    if (status === "verified" && me && !me.verified) updateCurrentUser({ verified: true });
  }, [status, me, updateCurrentUser]);
  return { status, refresh };
}
