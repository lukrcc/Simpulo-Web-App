import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminZeitplan } from "@/components/admin/AdminZeitplan";

export const metadata: Metadata = { title: "Zeitplan · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx): Meilensteine, Zeitleiste und To-dos (components/admin/AdminZeitplan). */
export default function Page() {
  return (
    <Suspense>
      <AdminZeitplan />
    </Suspense>
  );
}
