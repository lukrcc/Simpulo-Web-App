"use client";
import { cn } from "@/lib/utils";
import { canOpenHouse, usePlatformPhase } from "@/config/platform";
import { setHeaderSlot } from "@/lib/headerSlot";
import { Plus, UserRound } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { headerActionStyles } from "@/components/ui/ActionButton";
import { SearchField } from "@/components/explore/SearchFields";
import { Logo } from "@/components/layout/Logo";
import { isNavActive, navItemsFor } from "@/components/layout/nav";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { getCurrentUser, useStore } from "@/lib/store";
import { NavIcon } from "./FilledNavIcons";

/*
 * Header sizes – do not change without explicit instruction.
 *
 * ONE bar, 64px on every page, fixed at the top, transparent graphite glass (.40, at the very top .62), full width, a 1px line white 10 % at
 * its foot, above the page (only dialogs go over it); the content gets its 64px as padding-top. It never moves while scrolling. The same on
 * every page: the wordmark (→ Explore) · in the middle Explore's quick search, elsewhere the capsule "Where to next?" (the same Where/When
 * sheet, then Explore with the filter) · right the text tabs Explore · Your houses · Messages, the avatar (→ /me) and "Open a House" as a
 * thin outline button. The tab you're on a filled capsule cream 12 % (no edge). Below 1100px the tabs are icons with a tooltip and "Open a
 * House" only its "+". No avatar menu.
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
  const t = useTranslations("nav");
  const tPlatform = useTranslations("platform.apply");
  // Before the launch the "+" is "Apply as a host" (config/platform.ts).
  const phase = usePlatformPhase();
  const tOpen = useTranslations("common.ui.openHouse");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const me = getCurrentUser(store);
  // One dot on Messages for anything unread there: chats or Updates (the notifications live in Messages now – no bell).
  const unreadIn = useMessagesUnread();
  // Messages is chats only: its dot shows unread chats (the notifications are in Your houses › Activity).
  const unread = unreadIn.chats;
  const explorePage = pathname === "/" || pathname === "/explore";
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

  // The avatar: a link to your profile (/me) – no menu (Saved is a row in Your houses, Settings the gear on your profile, Log out and Get the
  // app in Settings). Logged out a person in a circle opening the login.
  const profile = me ? (
    <Link href="/me" aria-label={t("profile")} data-header-avatar className="press flex size-10 shrink-0 overflow-hidden rounded-full">
      <Avatar user={me} size="md" className="max-w-none" />
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => requireAuth(undefined, { reason: "login" })}
      aria-label={t("logIn")}
      data-header-avatar
      className="press flex size-10 items-center justify-center rounded-full bg-(--hdr-corner-bg) text-ink transition-colors duration-150 hover:bg-(--hdr-corner-hover)"
    >
      <UserRound aria-hidden className="size-4" />
    </button>
  );
  // The text tabs: 36px, padding 0 14px, 15px medium; the one you're on a filled capsule cream 12 % and semibold, hover cream 6 %.
  // Below 1100px the words go and each tab is a 40px circle with its icon (the tooltip is its aria-label).
  const tab = "press relative inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-nav-main text-ink transition-colors duration-150 max-[1099px]:size-10 max-[1099px]:px-0";

  return (
    // ONE bar on every page: the wordmark · in the middle Explore's quick search (ExploreFeed's portal) or, elsewhere, the capsule "Where to
    // next?" · right the tabs Explore · Your houses · Messages, the avatar and "Open a House".
    <header data-site-header className="header-glass fixed inset-x-0 top-(--band-h) z-40 hidden h-(--header-h) md:block">
      {/* Logo · 32px · the groups, 20px apart, left-aligned from the logo · what's left over · 20px at least · the right group, flush right. */}
      <div className="bar-width flex h-full items-center">
        <Logo className="mr-8 shrink-0" />
        {explorePage ? (
          <div ref={setHeaderSlot} data-explore-slot className="flex min-w-0 flex-1 items-center gap-5 [--control-h:40px]" />
        ) : (
          <HeaderSearch />
        )}
        {/* Right, in this order: the tabs Explore · Your houses · Messages · the avatar · "Open a House" – 8px apart. */}
        <nav aria-label={t("compactLabel")} className={cn("flex shrink-0 items-center gap-1 max-[1099px]:gap-2", explorePage ? "ml-4" : "ml-5")}>
          {/* Explore: All filters | the right group – a 1px line cream 15 %, 24px high, 16px on each side. */}
          {explorePage && <span aria-hidden className="mr-2 h-6 w-px shrink-0 bg-[rgba(244,238,231,0.15)]" />}
          {navItemsFor(me !== undefined, "header").map((item) => {
            const label = t(`items.${item.headerLabelKey ?? item.labelKey}`);
            const showUnread = me !== undefined && item.labelKey === "messages" && unread > 0;
            const gated = me === undefined && item.audience === "member";
            const current = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={showUnread ? t("itemUnread", { label, count: unread }) : label}
                aria-current={current ? "page" : undefined}
                onClick={
                  gated
                    ? (e) => {
                        e.preventDefault();
                        requireAuth(() => router.push(item.href), { reason: item.labelKey === "messages" ? "messages" : "yourHouses" });
                      }
                    : undefined
                }
                className={cn(tab, current ? "bg-(--hdr-tab-active) font-semibold" : "hover:bg-(--hdr-tab-hover)")}
              >
                <span className="hidden max-[1099px]:contents">
                  <NavIcon item={item} active={current} line />
                </span>
                <span className="max-[1099px]:hidden">{label}</span>
                {/* Unread chats: the orange dot (a signal), 8px, at the capsule's top right. */}
                {showUnread && <span aria-hidden className="absolute right-0.5 top-0.5 size-2 rounded-full bg-accent" />}
              </Link>
            );
          })}
          <span className="ml-2 flex">{profile}</span>
          {/* "Open a House": the thin outline button (headerActionStyles); below 1100px only its "+" (tooltip "Open a House"). */}
          <Link
            href="/create"
            aria-label={canOpenHouse(phase) ? tOpen("label") : tPlatform("plus")}
            className={cn(headerActionStyles, "ml-2 max-[1099px]:w-9 max-[1099px]:px-0")}
          >
            <Plus aria-hidden strokeWidth={2.25} />
            <span className="max-[1099px]:hidden">{canOpenHouse(phase) ? tOpen("label") : tPlatform("plus")}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * "Where to next?" on every page but Explore: the same Where/When sheet as Explore's search, growing out of the bar. Picking a place keeps it
 * open for the month; picking a month – or closing it with a place chosen – goes to Explore with the filter set (?place=&month=).
 */
function HeaderSearch() {
  const router = useRouter();
  const [picked, setPicked] = useState<{ place: string | null; month: string | null }>({ place: null, month: null });
  // The latest choice for the close handler (the sheet calls onClose right after the month's onChange).
  const latest = useRef(picked);
  const go = (next: { place: string | null; month: string | null }) => {
    const params = new URLSearchParams();
    if (next.place) params.set("place", next.place);
    if (next.month) params.set("month", next.month);
    setPicked({ place: null, month: null });
    latest.current = { place: null, month: null };
    router.push(params.size ? `/explore?${params}` : "/explore");
  };
  return (
    <div className="flex min-w-0 flex-1">
      <SearchField
        trigger="whereNext"
        place={picked.place}
        month={picked.month}
        onChange={(change) => {
          const next = { ...latest.current, ...change };
          latest.current = next;
          setPicked(next);
          if ("month" in change) go(next);
        }}
        onClose={() => {
          if (latest.current.place) go(latest.current);
        }}
      />
    </div>
  );
}
