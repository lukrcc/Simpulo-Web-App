import { Compass, House, MessageCircle, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/my-stays" | "/inbox" | "/profile";
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/my-stays", label: "Houses", icon: House },
  { href: "/inbox", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export function isNavActive(href: NavItem["href"], pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname.startsWith("/stays");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Routes that show their own sticky CTA instead of the mobile tab bar. */
export function hidesTabBar(pathname: string): boolean {
  return pathname.startsWith("/stays/");
}
