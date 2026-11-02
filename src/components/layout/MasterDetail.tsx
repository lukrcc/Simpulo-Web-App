import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

interface MasterDetailProps {
  title: string;
  /** Left column: the list. Full width below lg. */
  list: ReactNode;
  /** Right column, lg and up only (below lg a row opens its own detail page). */
  detail: ReactNode;
  /**
   * Desktop: the detail fills the column and scrolls itself (chat: pinned header, scrolling messages, composer)
   * instead of the whole column being one scroll pane.
   */
  detailFill?: boolean;
  /** Desktop: the list column is a fixed 380px and the detail takes the rest (Houses), instead of 4/12 + 8/12. */
  fixedList?: boolean;
}

// Desktop: each column scrolls on its own (thin hover scrollbar, see .scroll-pane); nothing else scrolls.
const column = "lg:scroll-pane lg:h-full lg:min-h-0";

/**
 * Houses and Messages: list (4/12) and detail (8/12) side by side on desktop, list only on mobile.
 * On desktop the page is exactly the viewport under the header – `data-app-pane="desktop"` also hides the footer and the
 * main's bottom padding (globals.css).
 */
export function MasterDetail({ title, list, detail, detailFill = false, fixedList = false }: MasterDetailProps) {
  return (
    <Container className="pt-6 md:pt-8 lg:h-[calc(100dvh-var(--header-h))] lg:overflow-hidden lg:pb-6 lg:pt-8">
      <div data-app-pane="desktop" className={cn("lg:grid lg:h-full lg:gap-6", fixedList ? "lg:grid-cols-[380px_minmax(0,1fr)]" : "lg:grid-cols-12")}>
        {/* No page title – the list starts 32px under the header; the name stays as the region's label. */}
        <div aria-label={title} className={cn("min-w-0", !fixedList && "lg:col-span-4", "lg:pr-2", column)}>
          {list}
        </div>
        <div
          className={cn(
            "hidden min-w-0",
            !fixedList && "lg:col-span-8",
            detailFill ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden" : cn("lg:block", column),
          )}
        >
          {detail}
        </div>
      </div>
    </Container>
  );
}
