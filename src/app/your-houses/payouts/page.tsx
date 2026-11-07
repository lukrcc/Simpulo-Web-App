import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PayoutsPage } from "@/components/views/Payouts";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Payouts", robots: PRIVATE_ROBOTS };

/** Your houses › Payouts: the payout account, this year, payouts per month, every payout. */
export default function YourPayoutsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayoutsPage />
    </Suspense>
  );
}
