"use client";

import { useFeatureFlag } from "@/lib/featureFlags";

/** Renders its children only with featureFlags.hostPremium – e.g. the footer's "Pro hosts" link. */
export function IfHostPremium({ children }: { children: React.ReactNode }) {
  return useFeatureFlag("hostPremium") ? children : null;
}
