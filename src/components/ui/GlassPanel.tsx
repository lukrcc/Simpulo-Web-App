import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * The one material for what floats over a page: panels, sheets, popovers, modals and menus. Warm frosted glass (--glass-* tokens,
 * .glass-panel in globals.css), 28px radius.
 */
export function GlassPanel({ className, children, ref, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement>; children: ReactNode }) {
  return (
    <div ref={ref} className={cn("glass-panel", className)} {...props}>
      {children}
    </div>
  );
}
