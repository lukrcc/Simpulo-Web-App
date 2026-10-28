import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminNewHouse } from "@/components/admin/AdminHouses";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ADMIN_ENABLED } from "@/lib/growth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("adminNewHouse"), robots: { index: false, follow: false } };
}

/** Dev only (or NEXT_PUBLIC_ADMIN=true): prepare a House for a creator – the result is a claim link. */
export default function AdminNewHousePage() {
  if (!ADMIN_ENABLED) notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminNewHouse />
    </Suspense>
  );
}
