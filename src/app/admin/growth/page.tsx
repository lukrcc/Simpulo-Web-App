import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AdminGrowth } from "@/components/admin/AdminGrowth";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("adminGrowth"), robots: { index: false, follow: false } };
}

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
