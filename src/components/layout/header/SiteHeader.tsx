"use client";
import { HeaderBack } from "@/components/layout/HeaderBack";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import { CompactSearch } from "./CompactSearch";
import { HeaderCenterNav } from "./HeaderCenter";
import { setAdminHeaderSlot, setHeaderSlot } from "@/lib/headerSlot";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";
import { headerActionStyles } from "@/components/ui/ActionButton";
import { Logo } from "@/components/layout/Logo";
import { useStore } from "@/lib/store";

/*
 * Header sizes – do not change without explicit instruction.
 *
 * ONE bar on every page (from 1100px and in the admin --header-bar-h = one capsule height --header-pill-h + the same gap above and below + the foot line; 64px on tablets; --header-h), fixed at the top, transparent graphite glass (.40, at the very top .62), full width, a 1px line white 10 % at
 * its foot, above the page (only dialogs go over it); the content gets its height as padding-top. It never moves while scrolling. The same on
 * every page: the wordmark (→ Explore) · in the middle Explore's quick search, elsewhere the capsule "Where to next?" (the same Where/When
 * sheet, then Explore with the filter) · right the text tabs Explore · Your houses · Messages, the avatar (its account menu, AvatarMenu)
 * and "Open a House" as a thin outline button. The tab you're on a filled capsule cream 12 % (no edge). Below 1100px the tabs are icons
 * with a tooltip and "Open a House" only its "+".
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
  // Phones keep their own MobileHeader on /get – the focus header only from md (it showed the wordmark twice).
  if (pathname === "/get" || pathname === "/get/card")
    return (
      <div className="hidden md:block">
        <FocusHeader exit={false} />
      </div>
    );
  return <SiteHeaderView pathname={pathname} />;
}

function SiteHeaderView({ pathname }: { pathname: string | null }) {
  // "Open a House" – before the launch without an accepted application "Apply to host" (to /apply).
  const openEntry = useOpenHouseEntry();
  const store = useStore();
  // Explore's header (its quick search in the bar's slot): /explore, and / once signed in – visitors get the start page there (Landing), with
  // the "Where to next?" search of every other page.
  // Explore's header (its quick search in the bar's slot, driving the page's own filters): /explore, / once signed in, and every "See all"
  // page (/collections/…, CLAUDE.md "Aufräumen – ein Design").
  const explorePage = pathname === "/explore" || Boolean(pathname?.startsWith("/collections/")) || (pathname === "/" && Boolean(store.sessionRestored && store.currentUserId));
  // Only "⌕ Search" on the pages of one thing of yours or one House: the House page, Your houses, Messages, the profile, Open a House.
  const compactCenter = Boolean(pathname && /^\/(house|h|your-houses|messages|profile|u|me|create)(\/|$)/.test(pathname));
  // The admin: the same compact bar (--header-bar-h, data-admin → --header-h in globals.css) and its own search (⌘K, AdminCommandSearch portalled into the slot).
  const adminPage = pathname === "/admin" || Boolean(pathname?.startsWith("/admin/"));
  // At the very top (scrollY < 8) the glass is a little more opaque: an IntersectionObserver on AppShell's 1px mark – no scroll listener; only
  // the colour changes (200ms), never the height or the place.
  useEffect(() => {
    const mark = document.querySelector("[data-top-mark]");
    if (!mark) return;
    const observer = new IntersectionObserver(([entry]) => document.documentElement.toggleAttribute("data-at-top", entry.isIntersecting));
    observer.observe(mark);
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute("data-at-top");
    };
  }, []);


  return (
    // ONE bar on every page: the wordmark · in the middle Explore's quick search (ExploreFeed's portal) or, elsewhere, the capsule "Where to
    // next?" · right the tabs Explore · Your houses · Messages, the avatar and "Open a House".
    <header data-site-header data-admin={adminPage || undefined} className="header-glass glass-bar fixed inset-x-0 top-(--band-h) z-40 hidden h-(--header-h) md:block">
      {/* Logo · 32px · the groups, 20px apart, left-aligned from the logo · what's left over · 20px at least · the right group, flush right. */}
      {/* From 1100px a three-part grid (CLAUDE.md "Kopfleiste zentriert"): 1fr auto 1fr – the logo flush left, the right group flush right,
          the middle exactly in the window's middle (it moves together before it would move off the middle, HeaderCenter). */}
      <div data-header-row className="bar-width flex h-full items-center split:grid split:grid-cols-[1fr_auto_1fr]">
        <div data-header-left className="flex shrink-0 items-center split:justify-self-start">
          {/* The installed app (tablets, desktop): the way back on sub-pages, left of the wordmark (HeaderBack). */}
          <HeaderBack className="mr-2" />
          <Logo className="mr-6 shrink-0 split:mr-0" />
        </div>
        {/* Three groups over the full width (CLAUDE.md "Kopfleiste neu geordnet"): the logo · the middle, centred between the logo and the
            right group (Explore's quick search, or the same entries leading to Explore on every other page) · the navigation. */}
        {explorePage ? (
          <div ref={setHeaderSlot} data-explore-slot className="flex min-w-0 flex-1 items-center justify-center max-split:hidden split:justify-self-center [--control-h:36px]" />
        ) : adminPage ? (
          <div ref={setAdminHeaderSlot} data-admin-slot className="flex min-w-0 flex-1 max-split:hidden" />
        ) : (
          <div data-center-slot className="flex min-w-0 flex-1 items-center justify-center max-split:hidden split:justify-self-center">
            {/* The full group – compact ("⌕ Search" alone) only on the House page, Your houses, Messages, the profile, Open a House. */}
            <HeaderCenterNav compact={compactCenter} />
          </div>
        )}
        {/* Below 1100px (tablets): ONE light search field across the width with the filter button inside (CompactSearch) – Explore's quick
            search, the theme chips and the navigation are elsewhere then (the chip row under the header, the tab bar). */}
        {!adminPage && <CompactSearch className="split:hidden" />}
        {/* Right, in this order: the tabs Explore · Your houses · Messages · the avatar · "Open a House" – 8px apart. */}
        {/* Below 1100px (tablets) the tab bar at the bottom carries the navigation (BottomTabBar) – the header holds the logo, the search and
            Explore's filters only. */}
        {/* Right only "＋ Open a House" (CLAUDE.md "Persönliche Navigation als schwebende Leiste unten"): Your houses, Messages and the avatar
            live in the floating bar at the bottom (BottomTabBar). */}
        <div data-header-right className="ml-6 flex shrink-0 items-center max-split:hidden split:justify-self-end">
          <Link href={openEntry.href} className={headerActionStyles}>
            {openEntry.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
