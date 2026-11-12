"use client";

// Feature flags (mock): defaults below, switchable per browser from the DevSwitcher (localStorage).
import { useSyncExternalStore } from "react";
import { APP_MODE } from "./appMode";

export interface FeatureFlags {
  /** Pro hosts: the host fee ("Host experience"), what it includes (hostOffer) and the "Pro host" label. Off = none of it exists. */
  hostPremium: boolean;
  /** Dev menu (payments mock): every payment is declined */
  simulatePaymentFailure: boolean;
  /** Dev menu (payments mock): the payout onboarding comes back "action required" */
  simulateOnboardingActionRequired: boolean;
  /** Dev menu: Payouts as a share host – the same Houses as if none had a host fee */
  simulateShareHost: boolean;
  /** Dev menu (payments mock): the current user hosts but has no payout account yet – "Set up payouts" in Needs you, "Payouts not set up" */
  simulateHostWithoutPayouts: boolean;
}

export type FeatureFlag = keyof FeatureFlags;

export const DEFAULT_FLAGS: FeatureFlags = {
  hostPremium: process.env.NEXT_PUBLIC_FLAG_HOST_PREMIUM !== "false",
  simulatePaymentFailure: false,
  simulateOnboardingActionRequired: false,
  simulateShareHost: false,
  simulateHostWithoutPayouts: false,
};

const FLAGS_KEY = "simpulo:flags";
const listeners = new Set<() => void>();
let current: FeatureFlags | null = null;

/**
 * The Dev menu shows two of these as one choice each (Host type, Payouts). Stored flags from the old separate switches are brought into line
 * once on reading: a share host has no host fees (hostPremium off) and Payouts as a share host; "without payouts" wins over "action needed".
 */
function migrate(flags: FeatureFlags): FeatureFlags {
  // Only the Dev menu's own choices – never in demo or production, where hostPremium follows its env default alone.
  if (APP_MODE !== "dev") return flags;
  const share = flags.simulateShareHost || !flags.hostPremium;
  const missing = flags.simulateHostWithoutPayouts;
  return { ...flags, simulateShareHost: share, hostPremium: !share, simulateHostWithoutPayouts: missing, simulateOnboardingActionRequired: !missing && flags.simulateOnboardingActionRequired };
}

function read(): FeatureFlags {
  if (current) return current;
  try {
    current = migrate({ ...DEFAULT_FLAGS, ...(JSON.parse(localStorage.getItem(FLAGS_KEY) ?? "{}") as Partial<FeatureFlags>) });
  } catch {
    current = DEFAULT_FLAGS;
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFeatureFlag(flag: FeatureFlag, on: boolean) {
  setFeatureFlags({ [flag]: on });
}

/** Several at once (one choice in the Dev menu sets two flags). */
export function setFeatureFlags(patch: Partial<FeatureFlags>) {
  current = { ...read(), ...patch };
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify(current));
  } catch {
    // not saved – still switched for this visit
  }
  for (const listener of listeners) listener();
}

/** Outside React (the payments mock): the flag as it is right now. */
export function readFeatureFlag(flag: FeatureFlag): boolean {
  return typeof window === "undefined" ? DEFAULT_FLAGS[flag] : read()[flag];
}

/** All flags; the server render (and hydration) uses the defaults. */
export function useFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_FLAGS);
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return useFeatureFlags()[flag];
}

/** Dev menu › Host type: Share (no host fees, Payouts as a share host) · Pro (host fees on). */
export type HostTypeSim = "share" | "pro";
export function setHostTypeSim(type: HostTypeSim) {
  setFeatureFlags({ simulateShareHost: type === "share", hostPremium: type === "pro" });
}
export function useHostTypeSim(): HostTypeSim {
  return useFeatureFlag("simulateShareHost") ? "share" : "pro";
}

/** Dev menu › Payouts: Ready (the mock's own account) · Missing (no payout account) · Action needed (Stripe needs one more thing). */
export type PayoutsSim = "ready" | "missing" | "action";
export function setPayoutsSim(sim: PayoutsSim) {
  setFeatureFlags({ simulateHostWithoutPayouts: sim === "missing", simulateOnboardingActionRequired: sim === "action" });
}
export function usePayoutsSim(): PayoutsSim {
  const flags = useFeatureFlags();
  return flags.simulateHostWithoutPayouts ? "missing" : flags.simulateOnboardingActionRequired ? "action" : "ready";
}
