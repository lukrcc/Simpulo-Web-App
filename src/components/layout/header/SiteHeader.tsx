"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { AccountMenu } from "@/components/layout/HeaderActions";
import { Logo } from "@/components/layout/Logo";
import { isNavActive, navItemsFor } from "@/components/layout/nav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { setNotchOpen, setNotchSlot, useNotchState } from "@/lib/notchState";
import { getCurrentUser, unreadThreadCount, useStore } from "@/lib/store";
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
 *   Centre: the nav, text with a 16px icon, 14px/500, 28px apart, centred in the 64px in every state, the current page
 *     ink + 2px underline, the others muted. Logged in: Explore · Your houses · Messages (6px accent dot while unread).
 *     Logged out: Explore · Host · How it works.
 *   The tab hangs from the bar, same background. "nav": 16px deep (80px in all), as wide as the nav + 32px either side.
 *     "filters": 76px deep (140px in all), as wide as the page's content, with the page's filters in its lower part. Bottom
 *     corners 20px, concave corners into the bar 16px. Handle: bottom centre, Explore only. State: useNotchState.
 *   Bar and tab are ONE path (useNotchShape). No border: drop-shadow(0 1px 0 rgba(0,0,0,0.06)) drop-shadow(0 6px 16px
 *     rgba(0,0,0,0.05)) on the shape, so line and shadow follow its curves. Two layers from that path: the glass (a
 *     clip-path: backdrop-filter doesn't work on SVG), and the SVG for the shadow, cut out inside the shape so the opaque
 *     path doesn't show through the glass. A filter on a parent of the glass would keep it from seeing the page behind.
 * The concave tab shape exists only here and on the cards' host tab, nowhere else.
 */

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
  const glassRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const refs = useMemo(
    () => ({ header: headerRef, nav: navRef, shadow: shadowRef, path: pathRef, glass: glassRef, hit: hitRef, slot: slotRef, handle: handleRef }),
    [],
  );
  const { mode, source, handle } = useNotchState();
  const handleProps = useNotchShape(refs, mode, handle);
  const open = mode === "filters";

  useLayoutEffect(() => {
    setNotchSlot(slotRef.current);
    return () => setNotchSlot(null);
  }, []);

  // Opened by hand: Escape or a click outside closes it. In Open Houses ("auto") it stays.
  useEffect(() => {
    if (!open || source !== "manual") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) setNotchOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-site-header], [role='dialog'], [data-anchored]")) setNotchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, source]);

  return (
    <header ref={headerRef} data-site-header className="fixed inset-x-0 top-(--band-h) z-40 hidden h-(--header-h) md:block">
      <svg
        ref={shadowRef}
        aria-hidden
        style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.06)) drop-shadow(0 6px 16px rgba(0,0,0,0.05))", visibility: "hidden" }}
        className="pointer-events-none absolute inset-x-0 top-0 h-35 w-full overflow-visible"
      >
        <path ref={pathRef} />
      </svg>
      {/* Until it's measured: just the bar. */}
      <div ref={glassRef} aria-hidden data-header-shape style={{ clipPath: "inset(0 0 76px 0)" }} className="milk-glass pointer-events-none absolute inset-x-0 top-0 h-35" />
      {/* The tab below the bar takes the pointer: nothing behind it can be clicked. */}
      <div ref={hitRef} aria-hidden data-notch-hit className="absolute top-16" />
      <Container className="relative grid h-full grid-cols-[1fr_auto_1fr] grid-rows-1 items-center">
        <Logo />

        <nav ref={navRef} aria-label={t("compactLabel")} className="flex h-full items-center gap-7">
          {navItemsFor(me !== undefined, "header").map(({ href, labelKey, headerLabelKey, icon: Icon }) => {
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
                  "relative flex items-center gap-2 py-2 text-nav transition-colors",
                  current ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
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
      {/* The page's filters come here (ExploreFilterBar): the tab's lower part. */}
      <div
        ref={slotRef}
        data-notch-slot
        className="pointer-events-none absolute top-20 h-10 -translate-y-2 opacity-0 transition-[opacity,translate] duration-140 data-open:pointer-events-auto data-open:translate-y-0 data-open:opacity-100 data-open:duration-220 motion-reduce:transition-none"
      />
      {handle && (
        <button
          ref={handleRef}
          type="button"
          data-notch-handle
          aria-expanded={open}
          aria-label={t(open ? "closeFilters" : "openFilters")}
          {...handleProps}
          className="absolute flex h-5 w-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center pointer-coarse:h-7 pointer-coarse:w-16 pointer-fine:cursor-pointer"
        >
          <span data-notch-bar className="block h-1 w-8 rounded-[2px] bg-muted/40 transition-opacity duration-150 pointer-coarse:h-[5px] pointer-coarse:w-10" />
          {/* With a mouse: over the tab the handle says what it does. */}
          <span
            data-notch-capsule
            className="pointer-events-none absolute left-1/2 top-1/2 inline-flex h-7 -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-surface px-3 text-small font-semibold text-ink opacity-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-opacity duration-150 pointer-coarse:hidden"
          >
            {t("filtersHandle")}
            <ChevronDown className={cn("size-3.5", open && "rotate-180")} aria-hidden />
          </span>
        </button>
      )}
    </header>
  );
}
