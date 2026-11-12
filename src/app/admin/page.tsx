import type { Metadata } from "next";
import { AdminCockpit } from "@/components/admin/AdminCockpit";

export const metadata: Metadata = { title: "Admin · Cockpit" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx): the start page – the Cockpit. */
export default function Page() {
  return <AdminCockpit />;
}
