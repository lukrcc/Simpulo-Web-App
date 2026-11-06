import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PayoutsReturn } from "@/components/payouts/PayoutsReturn";

/** Where the payout onboarding comes back to: the account's state as one card. */
export default function PayoutsReturnPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayoutsReturn />
    </Suspense>
  );
}
