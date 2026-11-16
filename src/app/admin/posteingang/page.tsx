import type { Metadata } from "next";
import { AdminInbox } from "@/components/admin/AdminInbox";

export const metadata: Metadata = { title: "Posteingang · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx): Heute and Support in one (components/admin/AdminInbox). */
export default function Page() {
  return <AdminInbox />;
}
