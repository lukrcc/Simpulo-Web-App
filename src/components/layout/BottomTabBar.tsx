"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, hidesTabBar, isNavActive } from "./nav";

/** Mobile-only tab bar (< md). Must be rendered inside a Suspense boundary (uses usePathname). */
export function BottomTabBar() {
  const pathname = usePathname();
  if (hidesTabBar(pathname)) return null;

  const activeIndex = NAV_ITEMS.findIndex(({ href }) => isNavActive(href, pathname));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="relative grid grid-cols-4">
        {/* One orange underline above the active icon; it slides between the four equal columns. */}
        {activeIndex >= 0 && (
          <li
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 flex w-1/4 justify-center transition-transform duration-250 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="h-0.5 w-8 rounded-full bg-accent" />
          </li>
        )}
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-zinc-500",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
