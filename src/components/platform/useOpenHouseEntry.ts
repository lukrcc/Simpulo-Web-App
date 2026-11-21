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
  const allowed = canOpenHouseAs(phase, me);
  return { allowed, href: allowed ? "/create" : HOST_APPLY_HREF, label: allowed ? tOpen("label") : tApply("plus") };
}
