import type { Metadata } from "next";
import { AdminPlatform } from "@/components/admin/AdminAreas";
import { launchFacts } from "@/lib/launchChecks";

export const metadata: Metadata = { title: "System · Admin" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx). */
export default function Page() {
  // What only the server sees for the launch checklist (legal drafts, preview gate, Stripe key set, the width test's report).
  return <AdminPlatform facts={launchFacts()} />;
}
