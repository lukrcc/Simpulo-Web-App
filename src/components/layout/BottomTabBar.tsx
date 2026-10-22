"use client";

import { LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { hidesTabBar, isNavActive, navItemsFor } from "./nav";

/** Floating glass tab bar on mobile (< md). Must be rendered inside a Suspense boundary (uses usePathname). */
export function BottomTabBar() {
  const pathname = usePathname();
  const loggedIn = useStore().currentUserId !== null;
  const requireAuth = useRequireAuth();
  if (hidesTabBar(pathname)) return null;

  // Logged out: Explore · How it works · Log in.
  const items = navItemsFor(loggedIn);

  return (
    <>
      {/* "Open a House" on mobile: round glass button above the tab bar (bar: 64px + 12px + safe area). */}
      {pathname !== "/create" && (
        <Link
          href="/create"
          aria-label="Open a House"
          className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-lg shadow-black/20 outline-none transition-[background-color,transform] duration-200 hover:bg-[#2A2A30] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page active:scale-[0.98] md:hidden"
        >
          <Plus className="size-[22px]" strokeWidth={2.5} />
        </Link>
      )}

      <nav className="glass fixed inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 h-16 rounded-full md:hidden">
        <ul className={cn("grid h-full", loggedIn ? "grid-cols-4" : "grid-cols-3")}>
          {items.map(({ href, label, icon: Icon }) => {
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
                  <span className={cn("my-1 size-1.5 rounded-full", active ? "bg-accent" : "bg-transparent")} aria-hidden />
                  {label}
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
                Log in
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
