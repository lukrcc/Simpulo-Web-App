import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  /** Page body: adds the standard top spacing under the header. */
  page?: boolean;
  /**
   * "narrow" keeps single-column content (lists, chat, forms, text) at a readable measure – still left-aligned on
   * the container's edge, so every page lines up with the header and the feed grid.
   */
  width?: "full" | "narrow" | "text";
  className?: string;
}

const MEASURE = { full: undefined, narrow: "max-w-[720px]", text: "max-w-[680px]" } as const;

/** The one layout token: at most 1680px, with the window's fluid margin (.page-container). Pages never set their own widths or paddings. */
export function Container({ children, page = false, width = "full", className }: ContainerProps) {
  const measure = MEASURE[width];
  return (
    <div className={cn("page-container", page && "pt-6 md:pt-10", className)}>
      {measure ? <div className={measure}>{children}</div> : children}
    </div>
  );
}
