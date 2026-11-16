import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNewHouse } from "@/components/admin/AdminHouses";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "House vorbereiten · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (the layout): prepare a House for a creator – the result is a claim link. */
export default function AdminNewHousePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminNewHouse />
    </Suspense>
  );
}
