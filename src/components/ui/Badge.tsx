import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 24px pill on surface-1 (the warm grey), muted 12px – for Host, "3 of 4", "1 new" and statuses. Never a bare number.
 */
export function Badge({ children, icon, className }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-small font-medium text-muted [&_svg]:size-3",
        "bg-bg",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
