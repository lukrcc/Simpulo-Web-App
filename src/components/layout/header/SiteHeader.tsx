"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { AccountMenu } from "@/components/layout/HeaderActions";
import { Logo } from "@/components/layout/Logo";
import { isNavActive, navItemsFor } from "@/components/layout/nav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { activeCount } from "@/lib/exploreFilters";
import { useExploreFilters } from "@/lib/exploreFilterState";
import { closeNotchPanel, setNotchOpen, setNotchPanelSlot, setNotchSlot, useNotchState } from "@/lib/notchState";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { getCurrentUser, unreadThreadCount, useStore } from "@/lib/store";
import { NavIcon } from "./FilledNavIcons";
import { NotchGrip } from "./NotchGrip";
import { useNotchShape } from "./useNotchShape";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";

/*
 * Header sizes – do not change without explicit instruction.
 *
 * One bar, the same on every page: 64px, fixed at the top, --header-bg with a blur, full width, above the page (only
 * dialogs go over it). The content starts 16px below it (80px in all, --header-total) and never moves with the tab.
 *   Left: wordmark 22px/700, no tagline. Right: logged out "Log in" 14px/500 + "Open a House" 36px, ink, 14px/600, padding
 *     0 20px; logged in bell 36px (accent dot when new) + avatar 36px, 8px apart, 16px to "Open a House". Centred in the 64px.
 *   Centre: the nav, centred in the 64px in every state: text 16px/500, icon 20px, 8px from icon to text, 36px apart (below
 *     1200px: 14px, 16px, 24px; below 1000px the icons alone, the word as a tooltip). The current page: filled icon, ink, 2px underline. The others: outline
 *     icon, muted. 150ms crossfade. Logged in: Explore · Your houses · Messages (6px accent dot while unread). Logged out:
 *     Explore · Host · How it works.
 *   The tab hangs from the bar, same surface. "nav": 6px deep (70px in all), as wide as the nav + 32px either side, its handle
 *     10px under the underline and 6px over the edge. "filters": 76px deep (140px in all), as wide as the page's content, with
 *     the page's filters in its lower part, the handle 6px over the edge. Handle: Explore only, one polyline (NotchGrip).
 *     State: useNotchState. Surface: --header-bg, a horizontal gradient across the whole width, on every page.
 *   Bar and tab are ONE path (useNotchShape), on whole pixels, as true circular arcs: concave 12px, convex 16px, in every
 *     state; only width and depth animate. Three layers from it, no other surface: the glass (a clip-path: backdrop-filter
 *     doesn't work on SVG), under it a soft shadow (black 4 %, blur 8px, 4px down, cut out inside the shape), over it the
 *     edge, a 1px line rgba(0,0,0,0.08) half a pixel outside the shape, so it lies on one pixel row.
 * The concave tab shape exists only here and on the cards' host tab, nowhere else.
 */
import { FocusHeader } from "./FocusHeader";

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
  const pathname = usePathname();
  // Open a House is a focus mode: only the logo and the way out.
  return pathname === "/create" ? <FocusHeader /> : <SiteHeaderView pathname={pathname} />;
}

function SiteHeaderView({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");
  const tOpen = useTranslations("common.ui.openHouse");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const me = getCurrentUser(store);
  const unread = unreadThreadCount(store);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const shadowRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const lineRef = useRef<SVGSVGElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const panelSlotRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const refs = useMemo(
    () => ({ header: headerRef, nav: navRef, shadow: shadowRef, path: pathRef, line: lineRef, edge: edgeRef, glass: glassRef, scrim: scrimRef, clip: clipRef, hit: hitRef, slot: slotRef, panelSlot: panelSlotRef, handle: handleRef }),
    [],
  );
  const { mode, source, handle, auto } = useNotchState();
  const handleProps = useNotchShape(refs, mode, source, handle, auto);
  const open = mode !== "nav";
  const closeTab = () => (mode === "panel" ? closeNotchPanel() : setNotchOpen(false));
  const filtersActive = activeCount(useExploreFilters()) > 0;
  const [gripHover, setGripHover] = useState(false);

  useLayoutEffect(() => {
    setNotchSlot(slotRef.current);
    setNotchPanelSlot(panelSlotRef.current);
    return () => {
      setNotchSlot(null);
      setNotchPanelSlot(null);
    };
  }, []);

  // The whole panel: the page behind it stays where it is.
  useEffect(() => (mode === "panel" ? lockScroll() : undefined), [mode]);

  // Opened by hand: Escape or a click outside closes it. In Open Houses ("auto") it stays.
  useEffect(() => {
    if (!open || source !== "manual") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector('[role="dialog"]')) return;
      if (mode === "panel") closeNotchPanel();
      else setNotchOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest("[data-site-header], [role='dialog'], [data-anchored]")) return;
      if (mode === "panel") closeNotchPanel();
      else setNotchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, source, mode]);

  return (
    <>
    {/* Under a tab opened by hand, over the page. Its strength comes with the tab (useNotchShape). */}
    <div ref={scrimRef} aria-hidden data-notch-scrim onClick={closeTab} style={{ opacity: 0, pointerEvents: "none" }} className="fixed inset-0 z-39 hidden bg-[rgba(34,30,27,0.12)] backdrop-blur-[6px] md:block" />
    <header ref={headerRef} data-site-header className="fixed inset-x-0 top-(--band-h) z-40 hidden h-(--header-h) md:block">
      {/* The soft shadow: the same shape, blurred and lower, cut away inside the shape so nothing gathers in the curves. */}
      <svg ref={shadowRef} aria-hidden style={{ filter: "blur(8px)", opacity: 0.04, visibility: "hidden" }} className="pointer-events-none absolute left-0 top-0 overflow-visible">
        <g transform="translate(0 4)">
          <path ref={pathRef} fill="#000" />
        </g>
      </svg>
      {/* The one surface. Until it's measured: just the bar. */}
      <div ref={glassRef} aria-hidden data-header-shape style={{ clipPath: "inset(0 0 calc(100dvh - 64px) 0)" }} className="milk-glass pointer-events-none absolute inset-x-0 top-0 h-dvh" />
      {/* The edge: a 1px line on exact pixels, the same on straights and curves. */}
      <svg ref={lineRef} aria-hidden style={{ visibility: "hidden" }} shapeRendering="geometricPrecision" className="pointer-events-none absolute left-0 top-0 overflow-visible">
        <path ref={edgeRef} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* The tab below the bar takes the pointer: nothing behind it can be clicked. */}
      <div ref={hitRef} aria-hidden data-notch-hit className="absolute top-16" />
      <Container className="relative grid h-full grid-cols-[1fr_auto_1fr] grid-rows-1 items-center">
        <Logo />

        <nav ref={navRef} aria-label={t("compactLabel")} className="flex h-full items-center gap-6 nav:gap-9">
          {navItemsFor(me !== undefined, "header").map((item) => {
            const { href, labelKey, headerLabelKey } = item;
            const label = t(`items.${headerLabelKey ?? labelKey}`);
            const current = isNavActive(href, pathname);
            const showUnread = labelKey === "messages" && unread > 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                aria-label={showUnread ? t("itemUnread", { label, count: unread }) : undefined}
                className={cn(
                  "group/nav relative flex items-center gap-2 py-2 text-nav transition-colors nav:text-nav-main",
                  current ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
                )}
              >
                <NavIcon item={item} active={current} />
                <span className="max-nav-text:sr-only">{label}</span>
                <span aria-hidden className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap glass-panel rounded-lg! px-2.5 py-1 text-small text-ink opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100 nav-text:hidden">
                  {label}
                </span>
                {showUnread && <span aria-hidden className="absolute -right-2.5 top-2 size-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          {me ? (
            <>
              <NotificationBell variant="header" />
              <AccountMenu me={me} />
            </>
          ) : (
            <button type="button" onClick={() => requireAuth()} className="flex h-9 items-center whitespace-nowrap text-nav text-ink underline-offset-4 hover:underline">
              {t("logIn")}
            </button>
          )}
          <Link href="/create" className="ml-2 inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-ink px-5 text-nav font-semibold text-surface transition-colors hover:bg-ink/90">
            {tOpen("label")}
          </Link>
        </div>
      </Container>
      {/* The page's filters come here (ExploreFilterBar): the tab's lower part, cut to the shape's own path. */}
      <div ref={clipRef} data-notch-clip style={{ clipPath: "inset(0 0 calc(100dvh - 64px) 0)" }} className="pointer-events-none absolute inset-x-0 top-0 h-dvh">
        <div ref={slotRef} data-notch-slot className="pointer-events-none absolute top-20 h-10 opacity-0" />
        {/* The whole filter panel (ExploreFeed): the third stage, as high as it needs up to 80vh. */}
        <div ref={panelSlotRef} data-notch-panel className="pointer-events-none absolute top-19 opacity-0" />
      </div>
      {handle && (
        <button
          ref={handleRef}
          type="button"
          data-notch-handle
          aria-expanded={open}
          aria-label={t(open ? "closeFilters" : "openFilters")}
          {...handleProps}
          onPointerEnter={(e) => e.pointerType === "mouse" && setGripHover(true)}
          onPointerLeave={() => setGripHover(false)}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && setGripHover(true)}
          onBlur={() => setGripHover(false)}
          className="absolute flex h-5 w-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center pointer-coarse:h-7 pointer-coarse:w-16 pointer-fine:cursor-pointer"
        >
          <NotchGrip open={open} hover={gripHover} />
          {filtersActive && <span data-notch-dot className="absolute -right-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent pointer-coarse:right-1" />}
          <span
            data-notch-tip
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap glass-panel rounded-lg! px-2.5 py-1 text-small text-ink opacity-0 transition-opacity duration-150 pointer-coarse:hidden"
          >
            {t(open ? "closeFilters" : "openFilters")}
          </span>
        </button>
      )}
    </header>
    </>
  );
}
