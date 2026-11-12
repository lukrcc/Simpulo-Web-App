"use client";

import { useEffect } from "react";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { OpenHousePlus, openHouseClass } from "@/components/ui/OpenHouseButton";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useHideOnScroll, useMobileChrome } from "./mobileChrome";
import { hidesTabBar, isNavActive, navItemsFor } from "./nav";

/**
 * Mobile tab bar (< md). Must be rendered inside a Suspense boundary (uses usePathname).
 * - Installed app ("pill"): floating glass pill, 64px, 12px above the bottom edge.
 * - Logged in in the browser ("docked"): full-width bar on the bottom edge, 56px + safe area; hides on scroll down.
 * - Logged out in the browser ("header"): none – MobileHeader carries Log in and "+".
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const mode = useMobileChrome();
  const loggedIn = useStore().currentUserId !== null;
  const requireAuth = useRequireAuth();
  const t = useTranslations("nav");
  const hiddenRoute = hidesTabBar(pathname);
  const docked = mode === "docked";
  const scrolledAway = useHideOnScroll(pathname, docked && !hiddenRoute);
  const unreadIn = useMessagesUnread();
  // Messages is chats only: its dot shows unread chats (the notifications are in Your houses › Activity).
  const unread = unreadIn.chats;
  // What floats at the bottom of a page (the House's join bar) keeps clear of the bar: data-tabbar on <html> → --tabbar-clear (globals.css).
  const shown = hiddenRoute || mode === "header" ? "none" : mode;
  useEffect(() => {
    document.documentElement.dataset.tabbar = shown;
    return () => {
      delete document.documentElement.dataset.tabbar;
    };
  }, [shown]);
  if (hiddenRoute || mode === "header") return null;

  // Logged out (pill only): Explore · How it works · Log in. Logged in: Explore · Houses · Messages · Profile.
  const items = navItemsFor(loggedIn);

  return (
    <>
      {/* "Open a House" on mobile: round button above the bar (pill: 64px + 12px + 12px gap; docked: 56px + 16px).
          The docked variant slides away together with the bar. */}
      {/* Not on a House page: there its join bar is the screen's one main action (and would sit under the round button). */}
      {pathname !== "/create" && !pathname.startsWith("/h/") && !pathname.startsWith("/house/") && (
        <Link
          href="/create"
          aria-label={t("openHouse")}
          inert={scrolledAway}
          className={cn(
            openHouseClass,
            "open-house-btn--round fixed right-4 z-40 md:hidden",
            docked ? "bottom-[calc(72px+var(--safe-bottom))]" : "bottom-[calc(88px+var(--safe-bottom))]",
            scrolledAway && "translate-y-[calc(100%+72px+var(--safe-bottom))]",
          )}
        >
          <OpenHousePlus />
        </Link>
      )}

      <nav
        inert={scrolledAway}
        className={cn(
          "fixed z-40 md:hidden",
          docked
            ? "inset-x-0 bottom-0 h-[calc(56px+var(--safe-bottom))] bg-surface/90 pb-[var(--safe-bottom)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none"
            : "glass inset-x-4 bottom-[calc(12px+var(--safe-bottom))] h-16 rounded-full",
          scrolledAway && "translate-y-full",
        )}
      >
        <ul className={cn("grid h-full", loggedIn ? "grid-cols-5" : "grid-cols-4")}>
          {items.map(({ href, labelKey, icon: Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center text-small font-medium transition-colors",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                    {labelKey === "messages" && unread > 0 && <span aria-hidden className="absolute -right-1 -top-0.5 size-2 rounded-full border-2 border-surface bg-accent" />}
                  </span>
                  {/* Active marker: a 6px ink dot under the icon (space kept for inactive tabs). */}
                  <span
                    className={cn("size-1.5 rounded-full", docked ? "my-0.5" : "my-1", active ? "bg-ink" : "bg-transparent")}
                    aria-hidden
                  />
                  {t(`items.${labelKey}`)}
                </Link>
              </li>
            );
          })}
          {!loggedIn && (
            <li>
              <button
                type="button"
                onClick={() => requireAuth()}
                className="flex h-full w-full flex-col items-center justify-center text-small font-medium text-muted"
              >
                <LogIn className="size-[22px]" strokeWidth={1.75} />
                <span className="my-1 size-1.5" aria-hidden />
                {t("logIn")}
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
