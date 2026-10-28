import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHouses } from "@/components/admin/AdminHouses";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ADMIN_ENABLED } from "@/lib/growth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("adminHouses"), robots: { index: false, follow: false } };
}

/** Dev only (or NEXT_PUBLIC_ADMIN=true): Houses prepared on someone's behalf, claimed or not. */
export default function AdminHousesPage() {
  if (!ADMIN_ENABLED) notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminHouses />
    </Suspense>
  );
}
