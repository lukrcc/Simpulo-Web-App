import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFunding } from "@/components/admin/AdminFunding";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Finanzierung · Admin" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx). Suspense: AdminFunding reads the search params (?tab=structure). */
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminFunding />
    </Suspense>
  );
}
