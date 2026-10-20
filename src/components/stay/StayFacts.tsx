import type { Stay } from "@/lib/types";
import { formatDateRange, pluralize, stayNights } from "@/lib/utils";
import { PlaceMap } from "./PlaceMap";

/** Title block: House title, dates and length, then where it is (with the map). */
export function StayFacts({ stay }: { stay: Stay }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{stay.title}</h1>
      <p className="mt-2 text-neutral-600">
        {formatDateRange(stay.startDate, stay.endDate)} · {pluralize(stayNights(stay), "night")}
      </p>
      <div className="mt-5">
        <PlaceMap stay={stay} />
      </div>
    </div>
  );
}
