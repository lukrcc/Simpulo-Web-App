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
  /** Messages: the window's whole height under the bar, no margins, no footer; the list is 380px, the detail reaches the window's edge. The list scrolls itself. */
  fullHeight?: boolean;
}

// Desktop: each column scrolls on its own (thin hover scrollbar, see .scroll-pane); nothing else scrolls.
const column = "split:scroll-pane split:h-full split:min-h-0";

/**
 * Houses and Messages: list (4/12) and detail (8/12) side by side on desktop, list only on mobile.
 * On desktop the page is exactly the window, with the one-line footer under it: only the columns scroll.
 * `data-app-pane="desktop"` drops the main's bottom padding (globals.css).
 */
export function MasterDetail({ title, list, detail, detailFill = false, fixedList = false, fullHeight = false }: MasterDetailProps) {
  if (fullHeight) {
    return (
      <div data-app-pane="desktop" className="split:-mt-4 split:grid split:h-[calc(100dvh-var(--header-h)-var(--band-h))] split:grid-cols-[calc(var(--list-gutter)+380px)_minmax(0,1fr)] split:overflow-hidden [--list-gutter:max(var(--page-margin),calc((100vw-1680px)/2))]">
        <div aria-label={title} className="mx-auto w-[min(100%-2*var(--page-margin),1680px)] min-w-0 pt-6 md:pt-8 split:mx-0 split:flex split:h-full split:min-h-0 split:w-auto split:flex-col split:pb-4 split:pl-(--list-gutter) split:pr-3 split:pt-3">
          {list}
        </div>
        <div className="hidden min-w-0 split:block split:h-full split:min-h-0">{detail}</div>
      </div>
    );
  }
  return (
    <Container className={cn("pt-6 md:pt-8 split:h-[calc(100dvh-var(--header-total)-var(--slim-footer-h))] split:overflow-hidden split:pb-6", fixedList ? "split:pt-0" : "split:pt-8")}>
      <div data-app-pane="desktop" className={cn("split:grid split:h-full split:gap-6", fixedList ? "split:grid-cols-[380px_minmax(0,1fr)]" : "split:grid-cols-12")}>
        {/* No page title – the list starts 32px under the header; the name stays as the region's label. */}
        <div aria-label={title} className={cn("min-w-0", !fixedList && "split:col-span-4", "split:pr-2", column)}>
          {list}
        </div>
        <div
          className={cn(
            "hidden min-w-0",
            !fixedList && "split:col-span-8",
            detailFill ? "split:flex split:h-full split:min-h-0 split:flex-col split:overflow-hidden" : cn("split:block", column),
          )}
        >
          {detail}
        </div>
      </div>
    </Container>
  );
}
