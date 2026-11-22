import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminInbox } from "@/components/admin/AdminInbox";

export const metadata: Metadata = { title: "Aufgaben · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx): the one place where something needs doing (components/admin/AdminInbox). */
export default function Page() {
  return (
    <Suspense>
      <AdminInbox />
    </Suspense>
  );
}
