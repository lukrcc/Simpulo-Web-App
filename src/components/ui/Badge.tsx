import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 24px pill on surface-1 (the warm grey), muted 12px – for Host, "3 of 4", "1 new" and statuses. Never a bare number.
 * `onPage`: straight on the page background (bg), where surface-1 wouldn't show – surface with a line border instead.
 */
export function Badge({ children, icon, onPage = false, className }: { children: ReactNode; icon?: ReactNode; onPage?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-small font-medium text-muted [&_svg]:size-3",
        onPage ? "border border-line bg-surface" : "bg-bg",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
