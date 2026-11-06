import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { IdentitySimulation } from "@/components/dev/Simulations";

export default function IdentityCheckSimulationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IdentitySimulation />
    </Suspense>
  );
}
