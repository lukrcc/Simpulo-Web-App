"use client";
import { Plus } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { AccountMenu } from "@/components/layout/HeaderActions";
import { Logo } from "@/components/layout/Logo";
import { isNavActive, navItemsFor } from "@/components/layout/nav";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { activeCount } from "@/lib/exploreFilters";
import { useExploreFilters } from "@/lib/exploreFilterState";
import { closeNotchPanel, setNotchOpen, setNotchPanelSlot, setNotchSlot, useNotchState } from "@/lib/notchState";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { getCurrentUser, useStore } from "@/lib/store";
import { NavIcon } from "./FilledNavIcons";
import { headerActionStyles } from "@/components/ui/ActionButton";
import { NotchGrip } from "./NotchGrip";
import { useNotchShape } from "./useNotchShape";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";

/*
 * Header sizes – do not change without explicit instruction.
 *
 * One bar, the same on every page: 56px, fixed at the top, --header-bg with a blur, full width, above the page (only
 * dialogs go over it). The content starts 16px below it (72px in all, --header-total) and never moves with the tab.
 *   Left: wordmark 20px/700, no tagline. Right, 10px apart, centred in the 56px: logged out "Log in" 14px/500 + "Open a House" 36px, light glass,
 *     15px/600, padding 0 16px; logged in bell 32px (icon 16px, accent dot when new) + avatar 32px + "Open a House".
 *   Centre: the nav, centred in the 56px in every state: text 15px/500, icon 16px with a 1.5px line, 6px from icon to text, 28px apart (below
 *     1200px: 14px, 16px, 24px; below 1000px the icons alone, the word as a tooltip). The current page: filled icon, ink, 2px underline 6px under
 *     the text. The others: outline icon, muted 70 % (the word muted). 150ms crossfade. Logged in: Explore · Your houses · Messages (6px accent dot while unread).
 *     Logged out: Explore · Host · How it works.
 *   The tab hangs from the bar, same surface. "nav": 6px deep (62px in all), as wide as the nav + 32px either side. "filters": 52px deep (108px
 *     in all: the 32px row, 10px above and below), as wide as the page's content. Handle: Explore only, a small pill with one line on the tab's edge,
 *     half in, half out, following it in every state (32 × 12px, line 14 × 2px, in a 44 × 24px button; NotchGrip).
 *     State: useNotchState. Surface: --header-bg, one colour, on every page.
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
  // Open a House is a focus mode: only the logo and the way out. /get (getting the app) shows only the logo.
  if (pathname === "/create") return <FocusHeader />;
  if (pathname === "/get") return <FocusHeader exit={false} />;
  return <SiteHeaderView pathname={pathname} />;
}

function SiteHeaderView({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");
  const tOpen = useTranslations("common.ui.openHouse");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const me = getCurrentUser(store);
  // One dot on Messages for anything unread there: chats or Updates (the notifications live in Messages now – no bell).
  const unreadIn = useMessagesUnread();
  const unread = unreadIn.chats + unreadIn.updates;
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
  const [gripDown, setGripDown] = useState(false);
  const hoverGrip = setGripHover;

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
      <div ref={glassRef} aria-hidden data-header-shape style={{ clipPath: "inset(0 0 calc(100dvh - 56px) 0)" }} className="milk-glass pointer-events-none absolute inset-x-0 top-0 h-dvh" />
      {/* The edge: a 1px line on exact pixels, the same on straights and curves. */}
      <svg ref={lineRef} aria-hidden style={{ visibility: "hidden" }} shapeRendering="geometricPrecision" className="pointer-events-none absolute left-0 top-0 overflow-visible">
        <path ref={edgeRef} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* The tab below the bar takes the pointer: nothing behind it can be clicked. */}
      <div ref={hitRef} aria-hidden data-notch-hit className="absolute top-14" />
      <Container className="relative grid h-full grid-cols-[1fr_auto_1fr] grid-rows-1 items-center">
        <Logo />

        <nav ref={navRef} aria-label={t("compactLabel")} className="flex h-full items-center gap-6 nav:gap-7">
          {navItemsFor(me !== undefined, "header").map((item) => {
            const { href, labelKey, headerLabelKey } = item;
            const label = t(`items.${headerLabelKey ?? labelKey}`);
            const current = isNavActive(href, pathname);
            // Logged out: no dot (there's nothing of yours yet).
            const showUnread = me !== undefined && labelKey === "messages" && unread > 0;
            // Logged out, Your houses and Messages don't navigate: the auth sheet opens, and after logging in you land there.
            const gated = me === undefined && item.audience === "member";
            return (
              <Link
                data-tooltip={label}
                key={href}
                href={href}
                onClick={
                  gated
                    ? (e) => {
                        e.preventDefault();
                        requireAuth(() => router.push(href), { reason: labelKey === "messages" ? "messages" : "yourHouses" });
                      }
                    : undefined
                }
                aria-current={current ? "page" : undefined}
                aria-label={showUnread ? t("itemUnread", { label, count: unread }) : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 py-2 text-nav transition-colors nav:text-nav-main",
                  current ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
                )}
              >
                <NavIcon item={item} active={current} />
                <span className="max-nav-text:sr-only">{label}</span>
                {showUnread && <span aria-hidden className="absolute -right-2.5 top-2 size-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 justify-self-end">
          {me ? (
            <>
              <AccountMenu me={me} />
            </>
          ) : (
            <button type="button" onClick={() => requireAuth()} className="flex h-9 items-center whitespace-nowrap text-nav text-ink underline-offset-4 hover:underline">
              {t("logIn")}
            </button>
          )}
          <Link href="/create" className={headerActionStyles}>
            <Plus aria-hidden strokeWidth={2.25} />
            {tOpen("label")}
          </Link>
        </div>
      </Container>
      {/* The page's filters come here (ExploreFilterBar): the tab's lower part, cut to the shape's own path. */}
      <div ref={clipRef} data-notch-clip style={{ clipPath: "inset(0 0 calc(100dvh - 56px) 0)" }} className="pointer-events-none absolute inset-x-0 top-0 h-dvh">
        <div ref={slotRef} data-notch-slot className="pointer-events-none absolute top-[66px] h-8 opacity-0" />
        {/* The whole filter panel (ExploreFeed): the third stage, as high as it needs up to 80vh. */}
        <div ref={panelSlotRef} data-notch-panel className="pointer-events-none absolute top-[68px] opacity-0" />
      </div>
      {handle && (
        <button
          ref={handleRef}
          type="button"
          data-notch-handle
          aria-expanded={open}
          aria-label={t("dragFilters")}
          data-tooltip={t("dragFilters")}
          {...handleProps}
          onPointerEnter={(e) => e.pointerType === "mouse" && hoverGrip(true)}
          onPointerLeave={() => hoverGrip(false)}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && hoverGrip(true)}
          onBlur={() => hoverGrip(false)}
          onPointerDownCapture={() => setGripDown(true)}
          onPointerUpCapture={() => setGripDown(false)}
          onPointerCancelCapture={() => setGripDown(false)}
          style={{ cursor: gripDown ? "grabbing" : "grab" }}
          className="absolute flex h-6 w-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
        >
          <NotchGrip hover={gripHover} />
          {filtersActive && <span data-notch-dot style={{ position: "absolute", left: "calc(50% + 13.5px)", top: "calc(50% - 8.5px)", width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--accent)" }} />}
        </button>
      )}
    </header>
    </>
  );
}
