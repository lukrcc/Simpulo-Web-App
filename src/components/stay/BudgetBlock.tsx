import { PriceLine } from "@/components/ui/PriceLine";
import type { Stay } from "@/lib/types";

/** What it costs – fixed price, rough budget or TBD. Always visible before anyone requests to join. */
export function BudgetBlock({ stay }: { stay: Stay }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <PriceLine stay={stay} size="lg" />
    </div>
  );
}
