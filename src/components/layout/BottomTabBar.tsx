"use client";

import { LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { getCurrentUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AccountMenuList } from "./header/AvatarMenu";
import { hidesTabBar, isNavActive, NAV_ITEMS, type NavItem } from "./nav";

const item = (href: NavItem["href"]) => NAV_ITEMS.find((i) => i.href === href)!;

/** One cell: the icon over its word (13px), centred; active white (semibold), the others white 60 %. */
const CELL = "flex h-full w-full flex-col items-center justify-center gap-1 text-small transition-colors duration-150";

/**
 * Phones' tab bar (< md) – ONE behaviour in Safari and in the installed app (CLAUDE.md "Mobile"): docked to the bottom edge over the full
 * width, 56px + the bottom safe area (over Safari's toolbar, over the home indicator), the header's dark glass (graphite 88 %), entries spread
 * evenly. Logged out: Explore · Saved · Log in. Logged in: Explore · Houses · + (Open a House, in the middle, a little set apart – white 16 %,
 * never orange) · Messages (a small orange dot for unread chats, like the desktop) · Profile (the avatar; opens the account menu as a sheet
 * from the bottom). It stays put while scrolling. Not on focus flows or an open chat (nav.ts hidesTabBar). Render inside Suspense.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const store = useStore();
  const me = getCurrentUser(store);
  const requireAuth = useRequireAuth();
  const t = useTranslations("nav");
  const unread = useMessagesUnread().chats;
  const [account, setAccount] = useState(false);
  const hidden = hidesTabBar(pathname);
  // What the bar covers (--tabbar-clear, globals.css): phones count it by default; a route without the bar says "none".
  useEffect(() => {
    if (!hidden) return;
    document.documentElement.dataset.tabbar = "none";
    return () => {
      delete document.documentElement.dataset.tabbar;
    };
  }, [hidden]);
  if (hidden) return null;

  const tab = (href: NavItem["href"], label: string, extra?: ReactNode) => {
    const active = isNavActive(href, pathname);
    const Icon = item(href).icon;
    return (
      <li key={href} className="flex-1">
        <Link href={href} aria-current={active ? "page" : undefined} aria-label={extra ? t("itemUnread", { label, count: unread }) : undefined} className={cn(CELL, active ? "font-semibold text-ink" : "font-medium text-ink/60")}>
          <span className="relative">
            <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
            {extra}
          </span>
          {label}
        </Link>
      </li>
    );
  };
  return (
    <>
      <nav aria-label={t("compactLabel")} data-site-header data-tab-bar className="header-glass fixed inset-x-0 bottom-0 z-40 pb-(--safe-bottom) md:hidden">
        <ul className="flex h-14 items-stretch px-1">
          {tab("/", t("items.explore"))}
          {me ? (
            <>
              {tab("/your-houses", t("items.houses"))}
              <li className="flex flex-1 items-center justify-center">
                {/* Open a House: in the middle, a little set apart (the capsule's white 16 %), never orange. */}
                <Link href="/create" aria-label={t("openHouse")} className="press flex h-10 w-14 items-center justify-center rounded-full bg-(--header-pill-active) text-ink transition-colors duration-150 active:bg-(--header-pill-hover)">
                  <Plus aria-hidden className="size-6" strokeWidth={2.25} />
                </Link>
              </li>
              {tab(
                "/messages",
                t("items.messages"),
                unread > 0 ? <span aria-hidden data-unread-dot className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-(--brand-action)" /> : undefined,
              )}
              <li className="flex-1">
                <button
                  type="button"
                  onClick={() => setAccount(true)}
                  aria-haspopup="dialog"
                  aria-expanded={account}
                  className={cn(CELL, account || isNavActive("/profile", pathname) || pathname === "/me" ? "font-semibold text-ink" : "font-medium text-ink/60")}
                >
                  <span className={cn("flex size-[24px] overflow-hidden rounded-full transition-shadow", (account || isNavActive("/profile", pathname)) && "ring-2 ring-ink")}>
                    <Avatar user={me} size="xs" className="max-w-none" />
                  </span>
                  {t("items.profile")}
                </button>
              </li>
            </>
          ) : (
            <>
              {tab("/saved", t("items.saved"))}
              <li className="flex-1">
                <button type="button" onClick={() => requireAuth()} className={cn(CELL, "font-medium text-ink/60")}>
                  <LogIn aria-hidden className="size-[22px]" strokeWidth={1.75} />
                  {t("logIn")}
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
      {me && (
        <MobileSheet open={account} onClose={() => setAccount(false)} label={t("menu.label")} className="px-3">
          <div role="menu" aria-label={t("menu.label")} className="pb-3 pt-1">
            <AccountMenuList onDone={() => setAccount(false)} rowClassName="h-12" />
          </div>
        </MobileSheet>
      )}
    </>
  );
}
