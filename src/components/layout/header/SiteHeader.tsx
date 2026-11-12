"use client";
import { cn } from "@/lib/utils";
import { canOpenHouse, usePlatformPhase } from "@/config/platform";
import { setHeaderSlot } from "@/lib/headerSlot";
import { Plus, Search, UserRound } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
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
 * every page: the wordmark · in the middle Explore's quick search or the capsule "Where to next?" · the avatar (a link to /me), Your houses,
 * Messages, "+". No text tabs, no avatar menu. Left the wordmark (same place everywhere). Explore: the quick search in the middle (Where · When, Short trips, the
 * categories, "All filters"), right round 40px buttons (Your houses, Messages), the avatar, "+". Elsewhere: the tabs exactly centred, right
 * the avatar and "Open a House".
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
  // The round icon buttons: the bar's one capsule surface – cream 8 %, no edge, hover 14 %, the page you're on 22 %.
  const round = "press relative flex size-10 items-center justify-center rounded-full text-ink transition-colors duration-150 [&_svg]:size-4";

  return (
    // ONE bar on every page: the wordmark · in the middle Explore's quick search (ExploreFeed's portal) or, elsewhere, the capsule "Where to
    // next?" (it opens Explore with Where open) · right the avatar, Your houses, Messages and "+". No text tabs.
    <header data-site-header className="header-glass fixed inset-x-0 top-(--band-h) z-40 hidden h-(--header-h) md:block">
      {/* Logo · 32px · the groups, 20px apart, left-aligned from the logo · what's left over · 20px at least · the right group, flush right. */}
      <div className="bar-width flex h-full items-center">
        <Logo className="mr-8 shrink-0" />
        {explorePage ? (
          <div ref={setHeaderSlot} data-explore-slot className="flex min-w-0 flex-1 items-center gap-5 [--control-h:40px]" />
        ) : (
          <div className="flex min-w-0 flex-1">
            {/* "Where to next?": to Explore with its Where sheet open (SearchField opens it once, after the first render, then drops ?open). */}
            <button type="button" onClick={() => router.push("/explore?open=where")} className="bar-capsule press inline-flex h-10 w-full max-w-90 items-center gap-2 rounded-full px-4 text-nav-main transition-colors duration-150">
              <Search aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{t("whereNext")}</span>
            </button>
          </div>
        )}
        {/* Right, in this order: the avatar · Your houses · Messages · "+" – all 40px, 8px apart; the page you're on a little stronger. */}
        <nav aria-label={t("compactLabel")} className={cn("flex shrink-0 items-center gap-2", explorePage ? "ml-4" : "ml-5")}>
          {/* Explore: All filters | the right group – a 1px line cream 15 %, 24px high, 16px on each side. */}
          {explorePage && <span aria-hidden className="mr-2 h-6 w-px shrink-0 bg-[rgba(244,238,231,0.15)]" />}
          <span className="flex">{profile}</span>
          {navItemsFor(me !== undefined, "header")
            .filter((item) => item.labelKey === "houses" || item.labelKey === "messages")
            .map((item) => {
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
                  className={cn(round, current ? "bg-(--hdr-corner-active)" : "bg-(--hdr-corner-bg) hover:bg-(--hdr-corner-hover)")}
                >
                  <NavIcon item={item} active={current} line />
                  {showUnread && <span aria-hidden className="absolute right-1 top-1 size-2 rounded-full bg-accent" />}
                </Link>
              );
            })}
          {/* "Open a House": the round "+", the same surface as the others (Tooltip "Open a House"). */}
          <Link href="/create" aria-label={canOpenHouse(phase) ? tOpen("label") : tPlatform("plus")} className={cn(round, "bg-(--hdr-corner-bg) hover:bg-(--hdr-corner-hover)")}>
            <Plus aria-hidden className="size-4" strokeWidth={2.25} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
