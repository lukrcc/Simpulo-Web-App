import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Location as plain text with a small pin – the only map on a card. */
export function PlaceText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}
