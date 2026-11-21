"use client";

import { CreateStayForm } from "@/components/views/CreateStayForm";
import { HostApply } from "@/components/platform/HostApply";
import { canOpenHouseAs, usePlatformPhase } from "@/config/platform";
import { getCurrentUser, useStore } from "@/lib/store";

/**
 * /create: Open a House – or, before the launch without an accepted application (config/platform.ts canOpenHouseAs), "Become a host": the
 * application, or where yours stands (components/platform/HostApply.tsx – the same as /apply).
 */
export function CreateEntry() {
  const phase = usePlatformPhase();
  const me = getCurrentUser(useStore());
  if (canOpenHouseAs(phase, me)) return <CreateStayForm />;
  return <HostApply />;
}
