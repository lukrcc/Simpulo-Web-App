"use client";

// Every admin action – and each writes its line in the admin log. No admin component changes data any other way.
import { setPlatformPhase } from "@/config/platform";
import { getCurrentUser, useStore } from "@/lib/store";
import type { ApplicationStatus, HostApplication, PlatformPhase } from "@/lib/types";
import { appendAdminLog, setApplicationStatus } from "./store";

export function useAdminActions() {
  const store = useStore();
  const by = getCurrentUser(store)?.id ?? "unknown";
  return {
    /** Yes / Maybe / No on an application. "Yes" makes the applicant a founding host; moving away from "Yes" takes it back. */
    decide(application: HostApplication, status: ApplicationStatus) {
      if (application.status === status) return;
      setApplicationStatus(application.id, status);
      appendAdminLog("application_decided", `${application.name} · ${status}`, by);
      if (application.userId && (status === "yes" || application.status === "yes")) {
        store.setFoundingHost(application.userId, status === "yes");
        if (status === "yes") appendAdminLog("founding_host_added", application.name, by);
      }
    },
    /** The platform phase – the same storage as the Dev menu's switch; the page reloads with that phase's data. */
    changePhase(phase: PlatformPhase) {
      appendAdminLog("phase_changed", phase, by);
      setPlatformPhase(phase);
      window.location.reload();
    },
  };
}
