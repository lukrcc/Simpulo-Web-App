"use client";

import { useEffect, useState } from "react";
import type { Earnings } from "../earnings";
import { payments } from "./index";
import type { Balance, PayoutRecord, PayoutSource } from "./types";

/** What the mock derives payouts from: the host's Houses (lib/earnings.ts). Stripe ignores it and reads its own records. */
export function payoutSourceOf(earnings: Earnings): PayoutSource {
  return { payouts: earnings.payouts, next: earnings.next ? { date: earnings.next.date, amount: earnings.next.amount } : null, pending: earnings.pending, currency: earnings.currency };
}

/** The payout history from the provider (null while it loads). */
export function usePayouts(userId: string | null, earnings: Earnings): PayoutRecord[] | null {
  const [records, setRecords] = useState<PayoutRecord[] | null>(null);
  const key = JSON.stringify(earnings.payouts.map((p) => p.id));
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void payments.getPayouts(userId, payoutSourceOf(earnings)).then((next) => live && setRecords(next));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when the payouts change, not on every render's new object
  }, [userId, key]);
  return records;
}

/** The balance from the provider: pending and the next payout (null while it loads). */
export function useBalance(userId: string | null, earnings: Earnings): Balance | null {
  const [balance, setBalance] = useState<Balance | null>(null);
  const key = `${earnings.pending}-${earnings.next?.date ?? ""}`;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void payments.getBalance(userId, payoutSourceOf(earnings)).then((next) => live && setBalance(next));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see usePayouts
  }, [userId, key]);
  return balance;
}
