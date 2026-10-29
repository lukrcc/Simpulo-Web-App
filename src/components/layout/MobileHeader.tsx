"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Logo } from "./Logo";
import { OpenHousePlus, openHouseClass } from "@/components/ui/OpenHouseButton";
import { cn } from "@/lib/utils";
import { useMobileChrome } from "./mobileChrome";
import { hidesTabBar } from "./nav";
import { NotificationBell } from "./NotificationBell";

/**
 * Mobile header (< md). Logged out in the browser: wordmark · Log in · "+" (they get no tab bar). Logged in (tab bar
 * below): a slim row with the wordmark and the notification bell top-right – not on the full-screen routes that hide
 * the tab bar too (House page, chat, create / edit). A normal row above the page (not sticky), so full-bleed heroes
 * simply start below it. The top safe-area inset is respected (it's 0 in a browser tab).
 */
export function MobileHeader() {
  const mode = useMobileChrome();
  const requireAuth = useRequireAuth();
  const t = useTranslations("nav");
  if (mode !== "header") {
    return (
      <Suspense fallback={null}>
        <MemberHeader />
      </Suspense>
    );
  }

  return (
    <header className="pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex h-16 items-center justify-between gap-4 px-4">
        <Logo />
        <div className="flex items-center gap-5">
          <button type="button" onClick={() => requireAuth()} className="text-sm font-medium text-ink">
            {t("logIn")}
          </button>
          <Link
            href="/create"
            aria-label={t("openHouse")}
            className={cn(openHouseClass, "open-house-btn--round")}
          >
            <OpenHousePlus />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Logged in: wordmark + bell (usePathname needs its own boundary on dynamic routes). */
function MemberHeader() {
  const pathname = usePathname();
  if (hidesTabBar(pathname)) return null;
  return (
    <header className="pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <Logo />
        <NotificationBell />
      </div>
    </header>
  );
}
