// Your houses › Up next: exactly ONE House – no carousel. The rule: among your sure Houses (hosting, not closed; joined and accepted), one
// that's on right now comes first (the one ending soonest); else the one starting soonest. None: the calm default picture with "Nothing
// planned yet" and the two ways on.
import { placeImageOf } from "./place-images";
import type { Stay } from "@/lib/types";

/** The calm picture when nothing is planned: a curated place photo (config/place-images.ts), never a House's. */
export const UP_NEXT_EMPTY_IMAGE = placeImageOf("ericeira") ?? placeImageOf("lisbon") ?? null;

export function upNextOf(candidates: readonly Stay[], today: string): Stay | undefined {
  const sure = candidates.filter((s) => s.status !== "closed" && s.status !== "completed" && s.endDate >= today);
  const running = sure.filter((s) => s.startDate <= today).toSorted((a, b) => a.endDate.localeCompare(b.endDate));
  return running[0] ?? sure.toSorted((a, b) => a.startDate.localeCompare(b.startDate))[0];
}
