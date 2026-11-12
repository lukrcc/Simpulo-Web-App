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
  /** Messages: the window's whole height under the bar, no footer; the list 380px with 24px inside on both sides, the detail edge to edge (top, right, bottom), every corner square. The list scrolls itself. */
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
      // The list: 24px inside on both sides (beyond 1680px its left edge stays on the container's); the chat edge to edge – right under the
      // header's bar, to the window's right and bottom edges – every corner square.
      // Messages – light like every page: the list on the surface, the chat on the page's ground, a 1px line ink 8 % between them. The
      // list clamp(320px, 24vw, 400px) wide, fixed; the chat fills the rest. Nothing set outside this page.
      <div data-app-pane="desktop" className="min-h-[calc(100dvh-var(--header-total))] split:grid split:h-[calc(100dvh-var(--header-h)-var(--band-h))] split:min-h-0 split:grid-cols-[calc(var(--list-gutter)+clamp(320px,24vw,400px))_minmax(0,1fr)] split:overflow-hidden [--list-gutter:max(24px,calc((100vw-1680px)/2))]">
        <div aria-label={title} className="mx-auto w-[min(100%-2*var(--page-margin),1680px)] min-w-0 pt-6 md:pt-8 split:mx-0 split:flex split:h-full split:min-h-0 split:w-auto split:flex-col split:border-r split:border-ink/8 bg-surface split:pb-4 split:pl-(--list-gutter) split:pr-6 split:pt-4">
          {list}
        </div>
        <div className="hidden min-w-0 split:block split:h-full split:min-h-0">
          <div className="h-full min-h-0 overflow-hidden">{detail}</div>
        </div>
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
