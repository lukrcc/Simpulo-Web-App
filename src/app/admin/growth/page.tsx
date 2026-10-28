import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminGrowth } from "@/components/admin/AdminGrowth";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ADMIN_ENABLED } from "@/lib/growth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("adminGrowth"), robots: { index: false, follow: false } };
}

/** Dev only (or NEXT_PUBLIC_ADMIN=true): funnel per channel, referrer and House. */
export default function AdminGrowthPage() {
  if (!ADMIN_ENABLED) notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminGrowth />
    </Suspense>
  );
}
