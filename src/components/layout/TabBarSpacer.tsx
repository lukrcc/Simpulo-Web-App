"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hidesTabBar } from "./nav";

/** A route without the tab bar keeps room for its own sticky bottom bar (the House page's strip: ~76px) + 16px. */
export const OWN_BAR_SPACER = "h-[calc(92px+var(--safe-bottom))]";

/**
 * Below 1100px (phones and tablets – both have the tab bar) space at the end of the footer so nothing ends under the tab bar: exactly what the bar covers (--tabbar-clear). Uses
 * usePathname – render it inside a Suspense boundary with <TabBarSpacerFallback /> as the fallback.
 */
export function TabBarSpacer() {
  const pathname = usePathname();
  // The House page's booking bar counts in --tabbar-clear (html[data-house-bar]); other routes without the bar keep room for their own.
  return <div aria-hidden className={cn("split:hidden", hidesTabBar(pathname) && !pathname.startsWith("/house/") ? OWN_BAR_SPACER : "h-(--tabbar-clear)")} />;
}

export function TabBarSpacerFallback() {
  return <div aria-hidden className="h-(--tabbar-clear) split:hidden" />;
}
