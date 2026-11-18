import type { LucideIcon } from "lucide-react";
import { NAV_ICONS } from "@/config/nav";

export interface NavItem {
  href: "/" | "/your-houses" | "/messages" | "/profile" | "/saved";
  /** Message key under nav.items */
  labelKey: "explore" | "host" | "howItWorks" | "houses" | "messages" | "profile" | "saved";
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
  { href: "/your-houses", labelKey: "houses", headerLabelKey: "yourHouses", icon: NAV_ICONS.houses, audience: "member" },
  { href: "/messages", labelKey: "messages", icon: NAV_ICONS.messages, audience: "member" },
  { href: "/profile", labelKey: "profile", icon: NAV_ICONS.profile, audience: "member", tabBarOnly: true },
  // Logged out on phones: their saved Houses (the heart on every card).
  { href: "/saved", labelKey: "saved", icon: NAV_ICONS.saved, audience: "guest", tabBarOnly: true },
];

/**
 * Desktop header, logged in or out the same: Explore · Your houses · Messages (Profile is in the avatar menu; logged out the two member
 * tabs open the auth sheet instead). Phones' tab bar (BottomTabBar): logged in Explore · Houses · [+] · Messages · Profile; logged out
 * Explore · Saved · [Log in].
 */
export function navItemsFor(loggedIn: boolean, place: "header" | "tabBar" = "tabBar"): readonly NavItem[] {
  if (place === "header") return NAV_ITEMS.filter((item) => item.audience !== "guest" && !item.tabBarOnly);
  return NAV_ITEMS.filter((item) => item.audience === "all" || item.audience === (loggedIn ? "member" : "guest"));
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
 * Phones (< md), the same in Safari and in the installed app (CLAUDE.md "Mobile"): a slim graphite header (wordmark · search) and the tab bar
 * at the bottom. Focus flows and an open chat have neither tab bar nor (where they bring their own head) the header.
 */
/** Focus flows with their own head: Open a House (FocusHeader), editing a House, Edit profile / onboarding, an open chat. */
function hasOwnHead(pathname: string): boolean {
  return pathname === "/create" || /^\/messages\/[^/]+/.test(pathname) || /^\/your-houses\/[^/]+\/edit$/.test(pathname) || pathname === "/settings/profile";
}

/** The mobile header: everywhere except where a flow brings its own head. */
export function hidesMobileHeader(pathname: string): boolean {
  return hasOwnHead(pathname);
}

/**
 * No tab bar: the focus flows (Open a House, editing, Edit profile / onboarding, the welcome step, the password page), an open chat, the
 * public House page (its action strip is the screen's bottom bar) and /get. Requests, payments and login are sheets over their page – they
 * cover the bar.
 */
export function hidesTabBar(pathname: string): boolean {
  return hasOwnHead(pathname) || pathname.startsWith("/house/") || pathname === "/get" || pathname === "/welcome" || pathname === "/preview";
}
