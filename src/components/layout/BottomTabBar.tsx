"use client";

import { LogIn, Moon, Plus, Sun, UserPlus } from "lucide-react";
import { useThemeToggle } from "@/components/settings/ThemeSwitch";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/useHydrated";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { filledIconOf } from "./header/FilledNavIcons";
import { hidesTabBar, isNavActive, NAV_ITEMS, type NavItem } from "./nav";

const item = (href: NavItem["href"]) => NAV_ITEMS.find((i) => i.href === href)!;

/** Phones: one cell, the icon over its word (13px), centred. From 744px: a capsule entry, the icon beside its word. */
const CELL =
  "press bar-cell flex h-full w-full flex-col items-center justify-center gap-1 text-small transition-colors duration-200 md:h-9 md:w-auto md:flex-row md:gap-2 md:rounded-full md:px-3.5 md:text-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";
/** The page you're on: the primary text colour with a soft surface (from 744px); the others grey. */
/** The page you're on: only the primary text colour and the filled icon – no surface (CLAUDE.md "Tab-Leiste im iOS-Glas-Stil"). */
const ON = "font-semibold text-ink";
// (From 1100px the words sit on the glass: inactive the secondary grey, the one you're on the primary colour – no surface.)
const OFF = "font-medium text-muted hover:text-ink";

/**
 * "Your Simpulo" – the personal navigation, ONE component for every width (CLAUDE.md "Persönliche Navigation als schwebende Leiste unten"):
 * Explore · Your houses · Messages (unread chats as a badge) · the avatar "Profile" – straight to your own profile page, the centre for your
 * account (CLAUDE.md "Profil ohne Pop-up"; no menu). Logged out: Explore · Log in · Sign up. The header keeps only the discovery and "Open a House".
 *  · Phones (< 744px): the fixed tab bar at the bottom over the full width, 56px + the safe area, icon over word; it stays put. Here (and on
 *    tablets, whose header has no "Open a House") the "+" sits in the middle.
 *  · From 744px: a floating capsule, centred, 20px above the window's edge (and its safe area), 44px high (compact about 40), 6px inside,
 *    14px medium words, 18px icons, the avatar 22px; from 1100px a lighter glass with a hairline edge and a very soft shadow, icon beside
 *    word. A fixed form (CLAUDE.md "Schwebende Leiste: feste Form"): always there, always the same size, no animation while scrolling. Never
 *    over an open panel, sheet or dialog.
 * Pages end above it (--tabbar-clear, globals.css). Not on focus flows or an open chat (nav.ts hidesTabBar). Render inside Suspense.
 */
/**
 * Unread chats on Messages, like iOS (CLAUDE.md "Messages-Badge wie bei iOS", "Badge kleiner und sauber"): a small capsule at the icon's top
 * right, overlapping it a little, never reaching the word – 14px high, at least 14px wide (one digit: a circle); neutral, no red (CLAUDE.md
 * "Badge minimalistisch und neutral"): graphite with a white number (light), light grey with a dark one (dark) – --badge-bg / --badge-fg; no
 * ring, no shadow; 10px semibold, tabular figures, exactly centred; from 10 "9+". None without unread chats.
 */
function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden
      data-unread-badge
      className={cn(
        // 14px high; one digit a circle, "9+" a capsule with 4px each side; the number exactly centred (flex, line height 1 – text-badge).
        "absolute -right-[5px] -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--badge-bg) text-badge font-semibold text-(--badge-fg) tabular-nums",
        count > 9 && "px-1",
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const store = useStore();
  const me = getCurrentUser(store);
  const requireAuth = useRequireAuth();
  const t = useTranslations("nav");
  const tMenu = useTranslations("nav.menu");
  const unread = useMessagesUnread().chats;
  // The "+": Open a House – before the launch without an accepted application "Apply to host".
  const openEntry = useOpenHouseEntry();
  const navRef = useRef<HTMLElement>(null);
  const hidden = hidesTabBar(pathname);
  const hydrated = useHydrated();
  // What the bar covers (--tabbar-clear, globals.css): it counts by default; a route without the bar says "none".
  useEffect(() => {
    if (!hidden) return;
    document.documentElement.dataset.tabbar = "none";
    return () => {
      delete document.documentElement.dataset.tabbar;
    };
  }, [hidden]);
  // The admin keeps its own navigation (side list, "Bereiche") from 744px – no bar there (phones keep it).
  const admin = pathname.startsWith("/admin");
  useEffect(() => {
    if (!admin) return;
    document.documentElement.dataset.tabbarTablet = "none";
    return () => {
      delete document.documentElement.dataset.tabbarTablet;
    };
  }, [admin]);

  if (hidden) return null;

  const tab = (href: NavItem["href"], label: string, extra?: ReactNode) => {
    const active = isNavActive(href, pathname);
    const Icon = active ? filledIconOf(item(href)) : item(href).icon;
    return (
      <li key={href} className="flex-1 md:flex-none">
        <Link href={href} aria-current={active ? "page" : undefined} aria-label={extra ? t("itemUnreadCount", { label, count: unread }) : undefined} className={cn(CELL, active ? ON : OFF)}>
          <span className="relative flex">
            <Icon aria-hidden className="size-[22px] md:size-[18px]" strokeWidth={active ? 1.5 : 1.75} />
            {extra}
          </span>
          <span className="bar-label">{label}</span>
        </Link>
      </li>
    );
  };
  // Straight under <body> (a portal once hydrated): no parent with transform, filter or overflow can break its glass.
  const bar = (
      <nav
        ref={navRef}
        aria-label={t("yourSimpulo")}
        data-site-header
        data-tab-bar
        className={cn(
          "header-glass glass-bar tab-bar fixed inset-x-0 bottom-0 z-40 pb-(--safe-bottom)",
          "md:inset-x-auto md:left-0 md:right-0 md:mx-auto md:bottom-[calc(12px+var(--safe-bottom))] md:w-fit md:max-w-[calc(100%-32px)] md:rounded-full md:px-1.5 md:pb-0 md:shadow-(--shadow-float) split:shadow-none",
          admin && "md:hidden",
        )}
      >
        <ul className="flex h-14 items-stretch px-1 md:h-11 md:items-center md:gap-0.5 md:px-0">
          {tab("/", t("items.explore"))}
          {me ? (
            <>
              {tab("/your-houses", t("items.yourHouses"))}
              {/* Open a House: phones and tablets only (their header has none) – in the middle, never orange. */}
              <li className="flex flex-1 items-center justify-center split:hidden md:flex-none">
                <Link href={openEntry.href} aria-label={openEntry.allowed ? t("openHouse") : openEntry.label} className="press flex h-10 w-14 items-center justify-center rounded-full bg-(--header-pill-active) text-ink md:h-8 md:w-11 transition-colors duration-150 active:bg-(--header-pill-hover)">
                  <Plus aria-hidden className="size-6" strokeWidth={2.25} />
                </Link>
              </li>
              {tab(
                "/messages",
                t("items.messages"),
                unread > 0 ? <UnreadBadge count={unread} /> : undefined,
              )}
              {/* Profile: straight to your own profile page – the centre for your account (CLAUDE.md "Profil ohne Pop-up"), no menu. */}
              <li className="flex-1 md:flex-none">
                <Link
                  href="/profile"
                  aria-current={isNavActive("/profile", pathname) || pathname === "/me" ? "page" : undefined}
                  className={cn(CELL, isNavActive("/profile", pathname) || pathname === "/me" ? ON : OFF)}
                >
                  <span className={cn("flex size-6 overflow-hidden rounded-full transition-shadow md:size-[22px]", isNavActive("/profile", pathname) && "ring-2 ring-ink/40")}>
                    <Avatar user={me} size="xs" className="max-w-none" />
                  </span>
                  <span className="bar-label">{t("items.profile")}</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="flex-1 md:flex-none">
                <button type="button" onClick={() => requireAuth(undefined, { reason: "login" })} className={cn(CELL, OFF)}>
                  <LogIn aria-hidden className="size-[22px] md:size-[18px]" strokeWidth={1.75} />
                  <span className="bar-label">{t("logIn")}</span>
                </button>
              </li>
              <li className="flex-1 md:flex-none">
                <button type="button" onClick={() => requireAuth(undefined, { reason: "signup" })} className={cn(CELL, OFF)}>
                  <UserPlus aria-hidden className="size-[22px] md:size-[18px]" strokeWidth={1.75} />
                  <span className="bar-label">{tMenu("signUp")}</span>
                </button>
              </li>
            </>
          )}
          {/* Light ↔ dark at the end (CLAUDE.md "Hell/Dunkel in die Tab-Leiste"), after a fine upright line; the icon shows where it goes –
              the moon in the light mode, the sun in the dark one. From 744px; phones have it in Settings (no room). */}
          <li aria-hidden className="mx-1 h-5 w-px self-center bg-line max-md:hidden" />
          <li className="max-md:hidden">
            <ThemeToggleButton />
          </li>
        </ul>
      </nav>
  );
  return (
    <>
      {hydrated ? createPortal(bar, document.body) : bar}
    </>
  );
}

/** The tab bar's light/dark button: the same size and colour as the other icons (18px, the inactive grey, the primary on hover); its words
 *  (aria-label and the tooltip) say where it goes – "Dark mode" / "Light mode". */
function ThemeToggleButton() {
  const t = useTranslations("settings.ui.appearance");
  const { mode, toggle } = useThemeToggle();
  const Icon = mode === "dark" ? Sun : Moon;
  return (
    <button type="button" onClick={toggle} aria-label={mode === "dark" ? t("toLight") : t("toDark")} className={cn(CELL, OFF, "md:px-2.5")}>
      <Icon aria-hidden className="size-[22px] md:size-[18px]" strokeWidth={1.75} />
    </button>
  );
}
