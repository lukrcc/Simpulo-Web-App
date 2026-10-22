import { Compass, House, Lightbulb, MessageCircle, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/how-it-works" | "/my-stays" | "/inbox" | "/profile";
  /** Message key under nav.items */
  labelKey: "explore" | "howItWorks" | "houses" | "messages" | "profile";
  icon: LucideIcon;
  /** Who sees the tab: guests only, logged-in members only, or everyone */
  audience: "guest" | "member" | "all";
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "explore", icon: Compass, audience: "all" },
  { href: "/how-it-works", labelKey: "howItWorks", icon: Lightbulb, audience: "guest" },
  { href: "/my-stays", labelKey: "houses", icon: House, audience: "member" },
  { href: "/inbox", labelKey: "messages", icon: MessageCircle, audience: "member" },
  { href: "/profile", labelKey: "profile", icon: User, audience: "member" },
];

/** Logged out: Explore · How it works. Logged in: Explore · Houses · Messages · Profile. */
export function navItemsFor(loggedIn: boolean): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => item.audience === "all" || item.audience === (loggedIn ? "member" : "guest"));
}

export function isNavActive(href: NavItem["href"], pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname.startsWith("/stays");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Routes that show their own sticky CTA instead of the mobile tab bar. */
export function hidesTabBar(pathname: string): boolean {
  return pathname.startsWith("/stays/");
}
