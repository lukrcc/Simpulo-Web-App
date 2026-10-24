"use client";

import { LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/components/auth/AuthProvider";
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
  if (hiddenRoute || mode === "header") return null;

  // Logged out (pill only): Explore · How it works · Log in. Logged in: Explore · Houses · Messages · Profile.
  const items = navItemsFor(loggedIn);

  return (
    <>
      {/* "Open a House" on mobile: round button above the bar (pill: 64px + 12px + 12px gap; docked: 56px + 16px).
          The docked variant slides away together with the bar. */}
      {pathname !== "/create" && (
        <Link
          href="/create"
          aria-label={t("openHouse")}
          inert={scrolledAway}
          className={cn(
            "fixed right-4 z-40 flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-lg shadow-black/20 outline-none transition-[background-color,transform] duration-200 hover:bg-[#2A2A30] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page active:scale-[0.98] motion-reduce:transition-none md:hidden",
            docked ? "bottom-[calc(72px+env(safe-area-inset-bottom))]" : "bottom-[calc(88px+env(safe-area-inset-bottom))]",
            scrolledAway && "translate-y-[calc(100%+72px+env(safe-area-inset-bottom))]",
          )}
        >
          <Plus className="size-[22px]" strokeWidth={2.5} />
        </Link>
      )}

      <nav
        inert={scrolledAway}
        className={cn(
          "fixed z-40 md:hidden",
          docked
            ? "inset-x-0 bottom-0 h-[calc(56px+env(safe-area-inset-bottom))] border-t border-black/5 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none"
            : "glass inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))] h-16 rounded-full",
          scrolledAway && "translate-y-full",
        )}
      >
        <ul className={cn("grid h-full", loggedIn ? "grid-cols-4" : "grid-cols-3")}>
          {items.map(({ href, labelKey, icon: Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center text-[10px] font-medium transition-colors",
                    active ? "text-ink" : "text-zinc-500",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                  {/* Active marker: a 6px orange dot under the icon (space kept for inactive tabs). */}
                  <span
                    className={cn("size-1.5 rounded-full", docked ? "my-0.5" : "my-1", active ? "bg-accent" : "bg-transparent")}
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
                className="flex h-full w-full flex-col items-center justify-center text-[10px] font-medium text-zinc-500"
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
