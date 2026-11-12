import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSupport } from "@/components/admin/AdminSupport";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (the layout): the "Something went wrong" cases (mock). */
export default function AdminSupportPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminSupport />
    </Suspense>
  );
}
