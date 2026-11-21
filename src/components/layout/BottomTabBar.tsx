"use client";

import { LogIn, Plus } from "lucide-react";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsPhone } from "@/lib/useMediaQuery";
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
 * The tab bar below 1100px – phones AND tablets (CLAUDE.md "Navigation nach Breite"; from 1100px the desktop header). Phones' tab bar (< md) – ONE behaviour in Safari and in the installed app (CLAUDE.md "Mobile"): docked to the bottom edge over the full
 * width, 56px + the bottom safe area (over Safari's toolbar, over the home indicator), the header's dark glass (graphite 88 %), entries spread
 * evenly. Logged out: Explore · Saved · Log in. Logged in: Explore · Houses · + (Open a House, in the middle, a little set apart – white 16 %,
 * never orange) · Messages (a small orange dot for unread chats, like the desktop) · Profile (the avatar; opens the account menu as a sheet
 * from the bottom). It stays put while scrolling. Not on focus flows or an open chat (nav.ts hidesTabBar). Render inside Suspense.
 * Tablets (744–1099px): the same entries as a floating capsule, centred, at most 560px, 16px above the bottom edge and its safe area; "Houses"
 * says "Your houses"; Profile opens the account menu as a popover above its tab (the header's dark glass), not as a sheet.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const store = useStore();
  const me = getCurrentUser(store);
  const requireAuth = useRequireAuth();
  const t = useTranslations("nav");
  const unread = useMessagesUnread().chats;
  // The "+": Open a House – before the launch without an accepted application "Apply to host".
  const openEntry = useOpenHouseEntry();
  const [account, setAccount] = useState(false);
  const phone = useIsPhone();
  const profileRef = useRef<HTMLButtonElement>(null);
  const hidden = hidesTabBar(pathname);
  // What the bar covers (--tabbar-clear, globals.css): phones count it by default; a route without the bar says "none".
  useEffect(() => {
    if (!hidden) return;
    document.documentElement.dataset.tabbar = "none";
    return () => {
      delete document.documentElement.dataset.tabbar;
    };
  }, [hidden]);
  // The admin keeps its own navigation (side list, "Bereiche") from 744px – no tab bar there on tablets (phones keep it).
  const admin = pathname.startsWith("/admin");
  useEffect(() => {
    if (!admin) return;
    document.documentElement.dataset.tabbarTablet = "none";
    return () => {
      delete document.documentElement.dataset.tabbarTablet;
    };
  }, [admin]);
  if (hidden) return null;

  /** `wide`: the word on tablets, where there's room ("Your houses"). */
  const tab = (href: NavItem["href"], label: string, extra?: ReactNode, wide?: string) => {
    const active = isNavActive(href, pathname);
    const Icon = item(href).icon;
    return (
      <li key={href} className="flex-1">
        <Link href={href} aria-current={active ? "page" : undefined} aria-label={extra ? t("itemUnread", { label, count: unread }) : undefined} className={cn(CELL, active ? "font-semibold text-ink" : "font-medium text-ink/60")}>
          <span className="relative">
            <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
            {extra}
          </span>
          {wide ? (
            <>
              <span className="md:hidden">{label}</span>
              <span className="max-md:hidden">{wide}</span>
            </>
          ) : (
            label
          )}
        </Link>
      </li>
    );
  };
  return (
    <>
      <nav
        aria-label={t("compactLabel")}
        data-site-header
        data-tab-bar
        className={cn("header-glass fixed inset-x-0 bottom-0 z-40 pb-(--safe-bottom) md:inset-x-0 md:mx-auto md:bottom-[calc(16px+var(--safe-bottom))] md:w-[min(560px,calc(100%-32px))] md:overflow-hidden md:rounded-full md:pb-0 split:hidden", admin && "md:hidden")}
      >
        <ul className="flex h-14 items-stretch px-1 md:px-3">
          {tab("/", t("items.explore"))}
          {me ? (
            <>
              {tab("/your-houses", t("items.houses"), undefined, t("items.yourHouses"))}
              <li className="flex flex-1 items-center justify-center">
                {/* Open a House: in the middle, a little set apart (the capsule's white 16 %), never orange. */}
                <Link href={openEntry.href} aria-label={openEntry.allowed ? t("openHouse") : openEntry.label} className="press flex h-10 w-14 items-center justify-center rounded-full bg-(--header-pill-active) text-ink transition-colors duration-150 active:bg-(--header-pill-hover)">
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
                  ref={profileRef}
                  type="button"
                  onClick={() => setAccount((open) => !open)}
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
      {me && !phone && account && <AccountPopover anchor={profileRef} label={t("menu.label")} onClose={() => setAccount(false)} />}
      {me && phone && (
        <MobileSheet open={account} onClose={() => setAccount(false)} label={t("menu.label")} className="px-3">
          <div role="menu" aria-label={t("menu.label")} className="pb-3 pt-1">
            <AccountMenuList onDone={() => setAccount(false)} rowClassName="h-12" />
          </div>
        </MobileSheet>
      )}
    </>
  );
}

/**
 * Tablets: the account menu as a popover above the Profile tab – the header's dark glass (.bar-menu, like the desktop's avatar menu), 256px,
 * right edges flush with the tab, 8px above the bar. A tap beside it, Escape or a pick closes it.
 */
function AccountPopover({ anchor, label, onClose }: { anchor: React.RefObject<HTMLButtonElement | null>; label: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    // Placed above the bar, again on resize (the window turning).
    const place = () => {
      const bar = anchor.current?.closest("[data-tab-bar]")?.getBoundingClientRect();
      const r = anchor.current?.getBoundingClientRect();
      if (!bar || !r) return;
      setStyle({ position: "fixed", bottom: window.innerHeight - bar.top + 8, right: Math.max(8, document.documentElement.clientWidth - Math.min(bar.right, r.right + 40)) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !anchor.current?.contains(target)) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [anchor, onClose]);
  if (!style) return null;
  return createPortal(
    <div ref={panel} style={style} data-site-header className="bar-menu z-72 w-72" role="menu" aria-label={label}>
      <AccountMenuList onDone={onClose} />
    </div>,
    document.body,
  );
}
