"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { useExploreControls, type ExploreControls } from "@/components/explore/ExploreControls";
import { Container } from "@/components/layout/Container";
import { navItemsFor, type NavItem } from "@/components/layout/nav";
import type { ExploreFilters } from "@/lib/exploreFilters";
import { useExploreFilters } from "@/lib/exploreFilterState";
import { getCurrentUser, pendingRequestCount, unreadThreadCount, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { HeaderCompact } from "./HeaderCompact";
import { HeaderExpanded } from "./HeaderExpanded";

/*
 * Header sizes – do not change without explicit instruction.
 *
 * EXPANDED – 128px in all (72px on pages without the chip row), the 1px line under it.
 *   Row 1, 72px, items centred: wordmark 24px/700 with the tagline 13px muted right under it | the nav, centred:
 *     Explore · Your houses · Messages (logged in) or Explore · Host · How it works (logged out), 15px/500, icons
 *     16px, 28px apart, the current page ink + 2px underline | right: bell 36px (accent dot when new) + avatar 36px,
 *     8px apart, 16px to "Open a House": 40px, ink, 15px/600, padding 0 20px (logged out: "Log in" 14px/500 +
 *     "Open a House").
 *   Row 2, 56px (44px, then 12px of air): chips 36px, 14px/500, padding 0 16px, 8px apart, "All" active ink –
 *     at most 8 chips, as many as fit whole, then "More ▾" | right: Sort capsule + Filters 36px, 8px apart.
 * COMPACT – 64px: grid "auto 1fr auto auto", gap 20px, items centred.
 *   1 wordmark 24px, no tagline · 2 (min-w-0, relative) only the chips – 32px, 13px/500, padding 0 14px, gap 6px:
 *   as many as fit whole, then "More ▾" (no scrolling, no arrows; a picked chip that doesn't fit takes the last
 *   place) · 3 Sort capsule + Filters 32px, 8px apart · 4 one flex row, gap
 *   8px: Explore · Your houses · Messages · bell as 32px circles (surface, line border, 16px icon; the current page
 *   ink) – marks only as an 8px accent dot at the top right with 2px of bg around it · avatar 32px · "Open a House"
 *   as a 32px ink capsule, 13px/600, padding 0 14px. Logged out: Explore · Host · How it works · login circle ·
 *   "Open a House".
 * ARCHITECTURE – cross-fade, no morph: a fixed bar (overflow hidden, bg + blur, line) whose height is --header-h
 *   (128 → 64px, 400ms cubic-bezier(0.32, 0.72, 0, 1)); in it the two layouts, both absolute at the top, shown or
 *   hidden by opacity alone (250ms; the hidden one aria-hidden, inert, pointer-events none). The page's padding-top
 *   is 128px on Explore, 72px elsewhere (--header-slot). Compact past 120px of scroll, expanded again below 40px.
 *   prefers-reduced-motion: no transitions.
 */

/** Scrolled past this, Explore's header goes compact … */
const COMPACT_FROM_PX = 120;
/** … and back above this it expands again – the gap between the two keeps it from flickering. */
const EXPAND_BELOW_PX = 40;

/** Pages with the chip row (Explore registers it – ExploreControls) and the compact state. */
export function hasExploreRow(pathname: string | null): boolean {
  return pathname === "/" || pathname === "/explore" || (pathname?.startsWith("/collections/") ?? false);
}

/** What both layouts render from. */
export interface HeaderData {
  pathname: string | null;
  loggedIn: boolean;
  me: User | undefined;
  items: readonly NavItem[];
  /** Threads with unread messages */
  unread: number;
  /** Requests waiting on the Houses you host */
  pendingRequests: number;
  /** Explore's chips and shortcuts – null until Explore has registered them */
  controls: ExploreControls | null;
  /** The URL's filter state (the picked categories, the sort) */
  filters: ExploreFilters;
  requireAuth: () => void;
}

/** The site header (desktop, ≥ md; phones have their own chrome). */
export function SiteHeader() {
  // usePathname suspends on dynamic routes during prerender, so it gets its own boundary.
  return (
    <Suspense fallback={<SiteHeaderView pathname={null} />}>
      <SiteHeaderByRoute />
    </Suspense>
  );
}

function SiteHeaderByRoute() {
  return <SiteHeaderView pathname={usePathname()} />;
}

function SiteHeaderView({ pathname }: { pathname: string | null }) {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const me = getCurrentUser(store);
  const loggedIn = me !== undefined;
  const exploreRow = hasExploreRow(pathname);
  const compact = useCompactHeader(exploreRow);
  const controls = useExploreControls();
  const filters = useExploreFilters();
  const data: HeaderData = {
    pathname,
    loggedIn,
    me,
    items: navItemsFor(loggedIn, "header"),
    unread: unreadThreadCount(store),
    pendingRequests: me ? store.stays.filter((s) => s.hostId === me.id).reduce((n, s) => n + pendingRequestCount(store, s.id), 0) : 0,
    controls: exploreRow ? controls : null,
    filters,
    requireAuth: () => requireAuth(),
  };

  return (
    <header
      data-site-header
      data-rows={exploreRow ? "2" : "1"}
      data-state={compact ? "compact" : "expanded"}
      className="hdr fixed inset-x-0 top-0 z-40 hidden h-(--header-h) overflow-hidden bg-bg/80 backdrop-blur-xl after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line md:block"
    >
      <Layer active={!compact}>
        <HeaderExpanded data={data} exploreRow={exploreRow} />
      </Layer>
      {exploreRow && (
        <Layer active={compact}>
          <HeaderCompact data={data} />
        </Layer>
      )}
    </header>
  );
}

/** The two layouts' classes – complete static strings (no assembled opacity values), both absolute at the bar's top. */
const LAYER_SHOWN = "absolute inset-x-0 top-0 opacity-100 transition-opacity duration-250 motion-reduce:transition-none";
const LAYER_HIDDEN = "absolute inset-x-0 top-0 opacity-0 pointer-events-none transition-opacity duration-250 motion-reduce:transition-none";

/** One of the two layouts: shown or hidden by opacity alone, unreachable while hidden. */
function Layer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={active ? LAYER_SHOWN : LAYER_HIDDEN} data-header-layer={active ? "shown" : "hidden"} aria-hidden={!active} inert={!active || undefined}>
      <Container>{children}</Container>
    </div>
  );
}

/**
 * Explore's compact header: on once scrollY > 120, off again below 40 (hysteresis). A passive scroll listener, read
 * once per frame. Off below md and wherever `enabled` is false (pages without the chip row).
 */
function useCompactHeader(enabled: boolean): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    let frame = 0;
    let current = false;
    const apply = (next: boolean) => {
      if (next === current) return;
      current = next;
      setCompact(next);
    };
    const read = () => {
      frame = 0;
      if (!desktop.matches) return apply(false);
      const y = window.scrollY;
      if (y > COMPACT_FROM_PX) apply(true);
      else if (y < EXPAND_BELOW_PX) apply(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    desktop.addEventListener("change", read);
    return () => {
      window.removeEventListener("scroll", onScroll);
      desktop.removeEventListener("change", read);
      cancelAnimationFrame(frame);
      apply(false);
    };
  }, [enabled]);
  return enabled && compact;
}
