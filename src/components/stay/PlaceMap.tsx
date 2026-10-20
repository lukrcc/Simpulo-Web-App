import { ExternalLink, MapPin } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { Stay } from "@/lib/types";
import { googleMapsUrl, placeLabel } from "@/lib/utils";

/** "{city}, {region}" with a live Google Maps embed of the area and a link out. */
export function PlaceMap({ stay }: { stay: Stay }) {
  return (
    <figure>
      <figcaption className="mb-3 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <MapPin className="size-4 shrink-0 text-accent" />
          <span className="truncate">{placeLabel(stay)}</span>
        </span>
        <a href={googleMapsUrl(stay)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm", "shrink-0")}>
          Open in Google Maps
          <ExternalLink className="size-3.5" />
        </a>
      </figcaption>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#eef0ea]">
        <iframe
          src={`https://www.google.com/maps?q=${stay.lat},${stay.lng}&z=13&output=embed`}
          title={`Map of ${placeLabel(stay)}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    </figure>
  );
}
