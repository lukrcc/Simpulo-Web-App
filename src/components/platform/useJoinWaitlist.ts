"use client";

import { openWaitlist, type WaitlistPrefill } from "@/lib/waitlistSignup";

/** Where "Become a Founding Host", "Host one like this", "Host here" and "Apply to host" lead: the host application (/apply). */
export const HOST_APPLY_HREF = "/apply";

/**
 * "Join the waitlist" (pre-launch and beta): opens the waitlist sheet (components/platform/WaitlistSheet.tsx) with what's known – the
 * place, theme and month of a search, and where it was opened from.
 */
export function useJoinWaitlist(base: WaitlistPrefill = {}) {
  return (prefill?: WaitlistPrefill | Event | { nativeEvent: unknown }) => {
    const extra = prefill && !("nativeEvent" in prefill) && !(prefill instanceof Event) ? prefill : {};
    openWaitlist({ ...base, ...extra });
  };
}
