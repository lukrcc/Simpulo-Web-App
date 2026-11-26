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
  /** Messages from 744px: the list is folded away – the chat card takes the whole width */
  listCollapsed?: boolean;
  /** Messages from 744px: what sits top left in the chat card (the list's fold button) */
  cardCorner?: ReactNode;
}

// Desktop: each column scrolls on its own (thin hover scrollbar, see .scroll-pane); nothing else scrolls.
const column = "split:scroll-pane split:h-full split:min-h-0";

/**
 * Houses and Messages: list (4/12) and detail (8/12) side by side on desktop, list only on mobile.
 * On desktop the page is exactly the window, with the one-line footer under it: only the columns scroll.
 * `data-app-pane="desktop"` drops the main's bottom padding (globals.css).
 */
export function MasterDetail({ title, list, detail, detailFill = false, fixedList = false, fullHeight = false, listCollapsed = false, cardCorner }: MasterDetailProps) {
  if (fullHeight) {
    return (
      // Messages (CLAUDE.md "Messages: Chat als schwebende Karte"): header + the columns + the light end (--tabbar-safe) = exactly one screen.
      // The list on the page's ground; the chat a floating card – radius 24, 16px to the list, the header, the right edge and the tab bar (it
      // sits 12px inside --tabbar-safe, so the card keeps 4px more), no edge, no shadow. Folded list: the card takes the whole width.
      <div data-app-pane="desktop" data-messenger data-list-collapsed={listCollapsed ? "" : undefined}>
        <div className={cn("min-h-[calc(100dvh-var(--header-total))] md:grid md:h-[calc(100dvh-var(--header-h)-var(--band-h)-var(--tabbar-safe))] md:min-h-0 md:overflow-hidden [--list-gutter:max(16px,calc((100vw-1680px)/2))]", listCollapsed ? "md:grid-cols-[minmax(0,1fr)]" : "md:grid-cols-[320px_minmax(0,1fr)] split:grid-cols-[calc(var(--list-gutter)+clamp(320px,24vw,400px))_minmax(0,1fr)]")}>
          <div aria-label={title} className={cn("mx-auto w-[min(100%-2*var(--page-margin),1680px)] min-w-0 pt-6 md:mx-0 md:flex md:h-full md:min-h-0 md:w-auto md:flex-col md:pb-1 md:pl-4 md:pt-4 split:pl-(--list-gutter)", listCollapsed && "md:hidden")}>
            {list}
          </div>
          <div className="hidden min-w-0 md:block md:h-full md:min-h-0 md:pb-1 md:pl-4 md:pr-4 md:pt-4">
            <div data-chat-card className="relative h-full min-h-0 overflow-hidden rounded-[24px]">
              {detail}
              {cardCorner && <div className="absolute left-3 top-3 z-30">{cardCorner}</div>}
            </div>
          </div>
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
