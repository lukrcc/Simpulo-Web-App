import { MapPin } from "lucide-react";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Img } from "./Img";

/** Small square House thumbnail: the static map preview, or a neutral pin tile when there is none. */
export function StayThumb({ stay, size, className }: { stay: Pick<Stay, "mapPreviewUrl" | "title">; size: number; className?: string }) {
  if (!stay.mapPreviewUrl) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400", className)}>
        <MapPin className="size-6" aria-hidden />
      </span>
    );
  }
  return (
    <Img
      src={stay.mapPreviewUrl}
      alt={stay.title}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xl bg-neutral-100 object-cover", className)}
    />
  );
}
