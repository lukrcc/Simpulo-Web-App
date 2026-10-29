import { Compass, House, Lightbulb, Megaphone, MessageCircle, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/host" | "/how-it-works" | "/my-stays" | "/inbox" | "/profile";
  /** Message key under nav.items */
  labelKey: "explore" | "host" | "howItWorks" | "houses" | "messages" | "profile";
  icon: LucideIcon;
  /** Who sees the tab: guests only, logged-in members only, or everyone */
  audience: "guest" | "member" | "all";
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "explore", icon: Compass, audience: "all" },
  // The page for potential hosts.
  { href: "/host", labelKey: "host", icon: Megaphone, audience: "guest" },
  { href: "/how-it-works", labelKey: "howItWorks", icon: Lightbulb, audience: "guest" },
  { href: "/my-stays", labelKey: "houses", icon: House, audience: "member" },
  { href: "/inbox", labelKey: "messages", icon: MessageCircle, audience: "member" },
  { href: "/profile", labelKey: "profile", icon: User, audience: "member" },
];

/** Logged out: Explore · Host · How it works. Logged in: Explore · Houses · Messages · Profile. */
export function navItemsFor(loggedIn: boolean): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => item.audience === "all" || item.audience === (loggedIn ? "member" : "guest"));
}

export function isNavActive(href: NavItem["href"], pathname: string | null): boolean {
  if (!pathname) return false;
  // Explore covers the feed, House pages and the city / vibe landing pages.
  if (href === "/") return pathname === "/" || pathname === "/explore" || /^\/(house|houses|co-living)\//.test(pathname);
  // People lives under Houses (its segment there, and /people).
  if (href === "/my-stays" && pathname === "/people") return true;
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
    /^\/inbox\/[^/]+/.test(pathname) ||
    pathname === "/create" ||
    /^\/my-stays\/[^/]+\/edit$/.test(pathname) ||
    pathname === "/profile/edit"
  );
}
