import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EarningsPage } from "@/components/views/Earnings";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Earnings", robots: PRIVATE_ROBOTS };

/** Your houses › Earnings: the payout account, this year, payouts per month, every payout. */
export default function YourEarningsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EarningsPage />
    </Suspense>
  );
}
