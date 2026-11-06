import { StayCard } from "@/components/StayCard";
import type { Stay, User } from "@/lib/types";

/**
 * The House page's card: the grid's card, large and 3:4, only the photos, the heart and the host's tab. The photos change by swipe or drag, the
 * arrows on hover, ← → and the dots; nothing opens. Beside the content it stays under the header and is never taller than the window; below 1100px
 * at most 520px, centred.
 */
export function HouseCard({ stay, host }: { stay: Stay; host?: User }) {
  return (
    <div className="mx-auto w-full max-w-130 split:sticky split:top-[calc(var(--header-h)+var(--band-h)+24px)] split:mx-0 split:w-full split:max-w-none">
      <StayCard stay={stay} host={host} gallery />
    </div>
  );
}
