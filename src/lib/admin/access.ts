"use client";

// Who may open /admin – the one place the UI asks (useIsAdmin). The mock: the logged-in user's `role` (Lukas is "admin"), and in dev the
// Dev menu's "Admin role" switch (off = treated as a user, /admin is a 404).
//
// ⚠ This only decides what the UI shows. The real protection comes in phase 4: a Firebase custom claim (`admin: true`, set by a Function),
// Security Rules on the admin collections (waitlist, hostApplications, adminLog) that require it, and the same check in every Function that
// reads or changes them. Nothing admin-only may reach a browser without that claim.
import { useDevSetting } from "@/lib/devSettings";
import { getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";

export const isAdminUser = (user: Pick<User, "role"> | undefined, adminRoleOn: boolean) => adminRoleOn && user?.role === "admin";

/**
 * Whether the current user is an admin – null while it isn't known yet: on the server, while hydrating, and until the store has looked up
 * the mock login (`sessionRestored`, its mount effect).
 */
export function useIsAdmin(): boolean | null {
  const store = useStore();
  const adminRoleOn = useDevSetting("adminRole");
  if (!store.sessionRestored) return null;
  return isAdminUser(getCurrentUser(store), adminRoleOn);
}
