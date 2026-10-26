"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Logo } from "./Logo";
import { OpenHousePlus, openHouseClass } from "@/components/ui/OpenHouseButton";
import { cn } from "@/lib/utils";
import { useMobileChrome } from "./mobileChrome";

/**
 * Mobile header (< md) for logged-out visitors in the browser – they get no tab bar. A normal row above the page
 * (not sticky), so full-bleed heroes simply start below it. In a browser tab the top safe-area inset is 0, but it
 * is respected anyway. Logged in or installed, the tab bar takes over and this renders nothing.
 */
export function MobileHeader() {
  const mode = useMobileChrome();
  const requireAuth = useRequireAuth();
  const t = useTranslations("nav");
  if (mode !== "header") return null;

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
