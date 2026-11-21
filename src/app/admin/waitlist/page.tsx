import type { Metadata } from "next";
import { AdminWaitlist } from "@/components/admin/AdminDashboard";
import { legalChecklist } from "@/lib/legal/status";

export const metadata: Metadata = { title: "Warteliste · Admin" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx). */
export default function Page() {
  // The legal texts' state (drafts, company gaps) is read here on the server – the files live in content/legal.
  return <AdminWaitlist legal={legalChecklist()} />;
}
