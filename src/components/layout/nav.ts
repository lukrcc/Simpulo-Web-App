import type { LucideIcon } from "lucide-react";
import { NAV_ICONS } from "@/config/nav";

export interface NavItem {
  href: "/" | "/how-it-works" | "/your-houses" | "/messages" | "/profile";
  /** Message key under nav.items */
  labelKey: "explore" | "host" | "howItWorks" | "houses" | "messages" | "profile";
  icon: LucideIcon;
  /** Who sees the tab: guests only, logged-in members only, or everyone */
  audience: "guest" | "member" | "all";
  /** The desktop header's own label (message key under nav.items), e.g. "Your houses" – the tab bar keeps labelKey */
  headerLabelKey?: "yourHouses";
  /** Phones' tab bar only – on desktop the avatar menu leads there */
  tabBarOnly?: true;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "explore", icon: NAV_ICONS.explore, audience: "all" },
  { href: "/how-it-works", labelKey: "howItWorks", icon: NAV_ICONS.howItWorks, audience: "guest" },
  { href: "/your-houses", labelKey: "houses", headerLabelKey: "yourHouses", icon: NAV_ICONS.houses, audience: "member" },
  { href: "/messages", labelKey: "messages", icon: NAV_ICONS.messages, audience: "member" },
  { href: "/profile", labelKey: "profile", icon: NAV_ICONS.profile, audience: "member", tabBarOnly: true },
];

/**
 * Logged out: Explore · Host · How it works. Logged in – desktop header: Explore · Your houses · Messages
 * (Profile is in the avatar menu); phones' tab bar: Explore · Houses · Messages · Profile.
 */
export function navItemsFor(loggedIn: boolean, place: "header" | "tabBar" = "tabBar"): readonly NavItem[] {
  return NAV_ITEMS.filter(
    (item) => (item.audience === "all" || item.audience === (loggedIn ? "member" : "guest")) && !(place === "header" && item.tabBarOnly),
  );
}

export function isNavActive(href: NavItem["href"], pathname: string | null): boolean {
  if (!pathname) return false;
  // Your houses: /your-houses and everything under it (one House, editing).
  if (href === "/your-houses") return pathname === "/your-houses" || pathname.startsWith("/your-houses/");
  // Explore covers the feed, House pages and the city landing pages.
  if (href === "/") return pathname === "/" || pathname === "/explore" || /^\/(house|co-living)\//.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile navigation (< md):
 * - "header": logged out in the browser – a mobile header (wordmark · Log in · +), no tab bar
 * - "docked": logged in in the browser – a tab bar docked to the bottom edge that hides on scroll down
 * - "pill": installed app (display-mode: standalone) – the floating glass pill, logged in or not
 */
export type MobileChrome = "header" | "docked" | "pill";

export function mobileChromeFor(standalone: boolean, loggedIn: boolean): MobileChrome {
  if (standalone) return "pill";
  return loggedIn ? "docked" : "header";
}

/**
 * Pages with their own sticky bottom bar (House page: Join; Create / edit House / Edit profile: Next or Save) or
 * a full-height layout (a chat thread) hide the mobile tab bar. Explore, Houses, Messages and Profile keep it.
 */
export function hidesTabBar(pathname: string): boolean {
  return (
    pathname.startsWith("/house/") ||
    /^\/messages\/[^/]+/.test(pathname) ||
    pathname === "/create" ||
    pathname === "/get" ||
    /^\/your-houses\/[^/]+\/edit$/.test(pathname) ||
    pathname === "/profile/edit"
  );
}
