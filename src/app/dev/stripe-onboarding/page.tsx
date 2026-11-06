import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { OnboardingSimulation } from "@/components/dev/Simulations";

export default function StripeOnboardingSimulationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OnboardingSimulation />
    </Suspense>
  );
}
