import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

interface MasterDetailProps {
  title: string;
  /** Left column: the list. Full width below lg. */
  list: ReactNode;
  /** Right column, lg and up only (below lg a row opens its own detail page). */
  detail: ReactNode;
  /** Desktop: the list sits on a white panel (Houses) instead of the page background (Messages). */
  panel?: boolean;
  /**
   * Desktop: the detail fills the column and scrolls itself (chat: pinned header, scrolling messages, composer)
   * instead of the whole column being one scroll pane.
   */
  detailFill?: boolean;
}

// Desktop: each column scrolls on its own (thin hover scrollbar, see .scroll-pane); nothing else scrolls.
const column = "lg:scroll-pane lg:h-full lg:min-h-0";

/**
 * Houses and Messages: list (4/12) and detail (8/12) side by side on desktop, list only on mobile.
 * On desktop the page is exactly the viewport under the header – `data-app-pane="desktop"` also hides the footer and the
 * main's bottom padding (globals.css).
 */
export function MasterDetail({ title, list, detail, panel = false, detailFill = false }: MasterDetailProps) {
  return (
    <Container className="pt-6 md:pt-10 lg:h-[calc(100dvh-var(--header-h))] lg:overflow-hidden lg:py-6">
      <div data-app-pane="desktop" className="lg:grid lg:h-full lg:grid-cols-12 lg:gap-6">
        <div className={cn("min-w-0 lg:col-span-4", panel ? "lg:rounded-[24px] lg:bg-white lg:p-4" : "lg:pr-2", column)}>
          {/* The title lives in the list column, so it scrolls with the list and starts level with the detail. */}
          <h1 className={cn("mb-6 text-2xl font-bold tracking-tight md:text-3xl", panel && "lg:mb-4 lg:text-2xl")}>{title}</h1>
          {list}
        </div>
        <div
          className={cn(
            "hidden min-w-0 lg:col-span-8",
            detailFill ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden" : cn("lg:block", column),
          )}
        >
          {detail}
        </div>
      </div>
    </Container>
  );
}
