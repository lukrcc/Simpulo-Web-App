"use client";

import { usePlatformPhase } from "@/config/platform";
import { getHouseOutcomes, getLedger, getMetricsHistory } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import type { AdminInputs } from "./metrics";
import { useAdminData } from "./store";

/** What lib/admin/metrics.ts computes from: the store's Houses, requests and "Lived with", the admin collections, today. */
export function useAdminInputs(): AdminInputs {
  const { stays, users, joinRequests, livedWith, payments, reports, threads } = useStore();
  const phase = usePlatformPhase();
  const admin = useAdminData();
  // The browser's clock (no clock reads while rendering on the server); the admin areas only render in the browser anyway (AdminFrame).
  const now = useNow();
  return { stays, users, reports, joinRequests, livedWith, payments, threads, admin, history: getMetricsHistory(), outcomes: getHouseOutcomes(), ledger: getLedger(), phase, today: new Date(now ?? 0).toISOString().slice(0, 10) };
}
