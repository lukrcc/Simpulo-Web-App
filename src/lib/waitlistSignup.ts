"use client";

// The waitlist before the launch (CLAUDE.md "Warteliste"): one sheet (components/platform/WaitlistSheet.tsx, mounted once in AppShell),
// opened from anywhere with what's known (the place, the theme, the month of a search). Double opt-in: the entry waits until the link in the
// confirmation email is clicked (/waitlist/confirm); every email carries the unsubscribe link (/waitlist/unsubscribe).
import { useSyncExternalStore } from "react";
import { addWaitlistEntry } from "@/lib/admin/store";
import { track } from "@/lib/analytics";
import { notifyByEmail } from "@/lib/notify";
import type { Vibe, WaitlistEntry } from "@/lib/types";

export interface WaitlistPrefill {
  /** From an email field on the page (the landing) */
  email?: string;
  where?: string | null;
  category?: Vibe | null;
  /** "YYYY-MM" */
  month?: string | null;
  /** Where it was opened (a signal: landing, empty search, save search, footer, house) */
  from?: string;
}

let state: { open: boolean; prefill: WaitlistPrefill } = { open: false, prefill: {} };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** "Join the waitlist" – the sheet, from anywhere, with what's known. */
export function openWaitlist(prefill: WaitlistPrefill = {}) {
  state = { open: true, prefill };
  emit();
  track("waitlist_opened", { from: prefill.from ?? null });
}
export function closeWaitlist() {
  state = { ...state, open: false };
  emit();
}
export function useWaitlistSheet() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export const waitlistConfirmHref = (token: string) => `/waitlist/confirm?token=${encodeURIComponent(token)}`;
export const waitlistUnsubscribeHref = (token: string) => `/waitlist/unsubscribe?token=${encodeURIComponent(token)}`;

/**
 * Take a sign-up in: only with the consent ("Email me when Houses open here"); saved through the adapter (lib/admin/store.ts – Firestore
 * later), then the confirmation email (mock: the Dev menu's log, its link clickable). TODO(email): sent by the backend with a signed token.
 */
export function joinWaitlist(input: { email: string; where: string | null; category: Vibe | null; month: string | null; consent: true; userId?: string; source: string | null; referredBy: string | null; wantsToHost?: boolean }): WaitlistEntry {
  const entry = addWaitlistEntry({ email: input.email.trim(), where: input.where, when: input.month, interests: input.category ? [input.category] : [], wantsToHost: Boolean(input.wantsToHost), source: input.source, referredBy: input.referredBy, consent: input.consent, ...(input.userId && { userId: input.userId }) });
  if (entry.confirmedAt === null) {
    notifyByEmail(entry.userId ?? entry.email, "waitlistConfirm", { url: waitlistConfirmHref(entry.token!) });
  }
  // Signals only: where from, which parts were given – never the email.
  track("waitlist_joined", { place: Boolean(input.where), category: input.category, month: Boolean(input.month), pending: entry.confirmedAt === null });
  return entry;
}
