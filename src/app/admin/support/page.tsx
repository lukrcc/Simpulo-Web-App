import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminSupport } from "@/components/admin/AdminSupport";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ADMIN_ENABLED } from "@/lib/growth";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

/** Dev only: the "Something went wrong" cases (mock). */
export default function AdminSupportPage() {
  if (!ADMIN_ENABLED) notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminSupport />
    </Suspense>
  );
}
