import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHouses } from "@/components/admin/AdminHouses";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Vorbereitete Houses · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (the layout): Houses prepared on someone's behalf, claimed or not. */
export default function AdminHousesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminHouses />
    </Suspense>
  );
}
