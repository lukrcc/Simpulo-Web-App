"use client";

import { useTranslations } from "next-intl";
import { canOpenHouseAs, usePlatformPhase } from "@/config/platform";
import { getCurrentUser, useStore } from "@/lib/store";
import { HOST_APPLY_HREF } from "./useJoinWaitlist";

/**
 * Every way into "Open a House" (header, tab bar "+", footer, Your houses): Open a House when this person may (config/platform.ts
 * canOpenHouseAs) – before the launch without an accepted application "Apply to host" to /apply instead. /create itself checks the same.
 */
export function useOpenHouseEntry() {
  const tOpen = useTranslations("common.ui.openHouse");
  const tApply = useTranslations("platform.apply");
  const phase = usePlatformPhase();
  const me = getCurrentUser(useStore());
  // (the store again below – the same one; read once more for its Houses)
  const allowed = canOpenHouseAs(phase, me);
  const store = useStore();
  // The first "Open a House" of someone who never hosted (live): the host onboarding first (CLAUDE.md "Onboarding") – then /create.
  const firstTime = Boolean(me && allowed && me.settings?.onboarding?.host === undefined && !store.stays.some((s) => s.hostId === me.id && !s.isExample));
  return { allowed, href: !allowed ? HOST_APPLY_HREF : firstTime ? "/welcome/host" : "/create", label: allowed ? tOpen("label") : tApply("plus") };
}
