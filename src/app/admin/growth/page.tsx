import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminGrowth } from "@/components/admin/AdminGrowth";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Admin · Wachstum", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (the layout): funnel per channel, referrer and House. */
export default function AdminGrowthPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminGrowth />
    </Suspense>
  );
}
