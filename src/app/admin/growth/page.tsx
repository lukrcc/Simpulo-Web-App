import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminGrowth } from "@/components/admin/AdminGrowth";
import { legalChecklist } from "@/lib/legal/status";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Wachstum · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (the layout): funnel per channel, referrer and House. */
export default function AdminGrowthPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {/* The legal texts' state (Warteliste › Launch-Kriterien) is read here on the server – the files live in content/legal. */}
      <AdminGrowth legal={legalChecklist()} />
    </Suspense>
  );
}
