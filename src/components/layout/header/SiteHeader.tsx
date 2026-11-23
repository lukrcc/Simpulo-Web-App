"use client";
import { HeaderBack } from "@/components/layout/HeaderBack";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import { CompactSearch } from "./CompactSearch";
import { cn } from "@/lib/utils";
import { setAdminHeaderSlot, setHeaderSlot } from "@/lib/headerSlot";
import { Plus, UserRound } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { headerActionStyles } from "@/components/ui/ActionButton";
import { SearchField } from "@/components/explore/SearchFields";
import { Logo } from "@/components/layout/Logo";
import { isNavActive, navItemsFor } from "@/components/layout/nav";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { getCurrentUser, useStore } from "@/lib/store";
import { NavIcon } from "./FilledNavIcons";
import { useNeedsYou } from "@/lib/needsYou";
import { TODO_GROUP, type TodoKind } from "@/config/todo";
import { useNow } from "@/lib/useNow";
import { AvatarMenu } from "./AvatarMenu";

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
  const t = useTranslations("nav");
  // "Open a House" – before the launch without an accepted application "Apply to host" (to /apply).
  const openEntry = useOpenHouseEntry();
  const store = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const me = getCurrentUser(store);
  // One dot on Messages for anything unread there: chats or Updates (the notifications live in Messages now – no bell).
  const unreadIn = useMessagesUnread();
  // Messages is chats only: its dot shows unread chats (the notifications are in Your houses › Activity).
  const unread = unreadIn.chats;
  // "Your houses": no sign in the bar – the count (only what's time-critical) is for its aria-label: open payments and what you must answer (Pay + Reply), from the same list as the page
  // (lib/needsYou.ts, columns from config/todo.ts). "Set up" doesn't count.
  const nowMs = useNow();
  const tasks = useNeedsYou(nowMs === null ? null : new Date(nowMs).toISOString()).filter((task) => {
    const group = TODO_GROUP[task.kind as TodoKind];
    return group === "pay" || group === "reply";
  }).length;
  // Explore's header (its quick search in the bar's slot): /explore, and / once signed in – visitors get the start page there (Landing), with
  // the "Where to next?" search of every other page.
  const explorePage = pathname === "/explore" || (pathname === "/" && Boolean(store.sessionRestored && store.currentUserId));
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

  // The avatar: the account menu (AvatarMenu – Your profile · Saved · Your people · Settings · Help · Share an idea · Get the app · Admin ·
  // Log out). Logged out a person in a circle opening the login.
  const profile = me ? (
    <AvatarMenu me={me} />
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
  // The text tabs: 36px, padding 0 14px, 15px medium; from 1100px text buttons without a surface (CLAUDE.md "Kopfleiste leichter"): a light
  // surface only on hover, the page you're on a light one and semibold (--hdr-tab-* in globals.css).
  // Below 1100px the words go and each tab is a 40px circle with its icon (the tooltip is its aria-label).
  const tab = "press relative inline-flex h-(--header-pill-h) shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-nav-main text-ink transition-colors duration-150";

  return (
    // ONE bar on every page: the wordmark · in the middle Explore's quick search (ExploreFeed's portal) or, elsewhere, the capsule "Where to
    // next?" · right the tabs Explore · Your houses · Messages, the avatar and "Open a House".
    <header data-site-header data-admin={adminPage || undefined} className="header-glass fixed inset-x-0 top-(--band-h) z-40 hidden h-(--header-h) md:block">
      {/* Logo · 32px · the groups, 20px apart, left-aligned from the logo · what's left over · 20px at least · the right group, flush right. */}
      <div data-header-row className="bar-width flex h-full items-center">
        {/* The installed app (tablets, desktop): the way back on sub-pages, left of the wordmark (HeaderBack). */}
        <HeaderBack className="mr-2" />
        <Logo className="mr-8 shrink-0" />
        {explorePage ? (
          <div ref={setHeaderSlot} data-explore-slot className="flex min-w-0 flex-1 items-center gap-5 max-split:hidden [--control-h:40px]" />
        ) : adminPage ? (
          <div ref={setAdminHeaderSlot} data-admin-slot className="flex min-w-0 flex-1 max-split:hidden" />
        ) : (
          <div className="flex min-w-0 flex-1 max-split:hidden">
            <HeaderSearch />
          </div>
        )}
        {/* Below 1100px (tablets): ONE light search field across the width with the filter button inside (CompactSearch) – Explore's quick
            search, the theme chips and the navigation are elsewhere then (the chip row under the header, the tab bar). */}
        {!adminPage && <CompactSearch className="split:hidden" />}
        {/* Right, in this order: the tabs Explore · Your houses · Messages · the avatar · "Open a House" – 8px apart. */}
        {/* Below 1100px (tablets) the tab bar at the bottom carries the navigation (BottomTabBar) – the header holds the logo, the search and
            Explore's filters only. */}
        <nav aria-label={t("compactLabel")} className={cn("flex shrink-0 items-center gap-1 max-split:hidden", explorePage ? "ml-4" : "ml-5")}>
          {/* Explore: All filters | the right group – a 1px line cream 15 %, 24px high, 16px on each side. */}
          {explorePage && <span aria-hidden className="mr-2 h-6 w-px shrink-0 bg-(--header-divider)" />}
          {navItemsFor(me !== undefined, "header").map((item) => {
            const label = t(`items.${item.headerLabelKey ?? item.labelKey}`);
            // A small number in the capsule: Messages – unread chats (not messages); Your houses – open tasks. None at 0.
            const count = me === undefined ? 0 : item.labelKey === "messages" ? unread : item.labelKey === "houses" ? tasks : 0;
            const gated = me === undefined && item.audience === "member";
            const current = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={count > 0 ? t(item.labelKey === "messages" ? "itemUnread" : "itemTasks", { label, count }) : label}
                aria-current={current ? "page" : undefined}
                onClick={
                  gated
                    ? (e) => {
                        e.preventDefault();
                        requireAuth(() => router.push(item.href), { reason: item.labelKey === "messages" ? "messages" : "yourHouses" });
                      }
                    : undefined
                }
                className={cn(tab, explorePage ? "max-split:size-10 max-split:px-0" : "max-lg:size-10 max-lg:px-0", current ? "bg-(--hdr-tab-active) font-semibold" : "bg-(--hdr-tab-bg) hover:bg-(--hdr-tab-hover)")}
              >
                {/* Icons below 1100px; a tablet's wider window (1024–1099px) shows the words – except on Explore, whose filters need the room. */}
                <span className={explorePage ? "hidden max-split:contents" : "hidden max-lg:contents"}>
                  <NavIcon item={item} active={current} line />
                </span>
                <span className={explorePage ? "max-split:hidden" : "max-lg:hidden"}>{label}</span>
                {/* No numbers in the header. Messages only: unread chats show a 6px dot in --brand-action inside the capsule, 6px after the word
                    (the tab's 8px gap − 2px), centred on the text. Below 1100px (icons) the same dot inside the circle, top right of the icon.
                    Your houses shows nothing; both keep the count in their aria-label. */}
                {count > 0 && item.labelKey === "messages" && (
                  <span aria-hidden data-unread-dot className={cn("-ml-0.5 size-1.5 shrink-0 rounded-full bg-(--brand-action)", explorePage ? "max-split:absolute max-split:right-2 max-split:top-2 max-split:ml-0" : "max-lg:absolute max-lg:right-2 max-lg:top-2 max-lg:ml-0")} />
                )}
              </Link>
            );
          })}
          <span className="ml-2 flex">{profile}</span>
          {/* "Open a House": the capsule (headerActionStyles) with "+" and its words on every width the header has (tablets too, CLAUDE.md
              "Tablet"); only on Explore below 1100px its "+" alone (tooltip "Open a House") – the filters need the room. */}
          <Link href={openEntry.href} aria-label={openEntry.label} className={cn(headerActionStyles, "ml-2", explorePage && "max-split:w-9 max-split:px-0")}>
            <Plus aria-hidden strokeWidth={2.25} />
            <span className={explorePage ? "max-split:hidden" : undefined}>{openEntry.label}</span>
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
