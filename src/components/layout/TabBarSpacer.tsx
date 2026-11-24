"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hidesTabBar } from "./nav";

/** A route without the tab bar keeps room for its own sticky bottom bar (the House page's strip: ~76px) + 16px. */
export const OWN_BAR_SPACER = "h-[calc(92px+var(--safe-bottom))]";

/**
 * Space at the end of the footer so nothing ends under the personal bar – on every width now (CLAUDE.md "Persönliche Navigation als schwebende
 * Leiste unten"): exactly what the bar covers (--tabbar-clear; 0 where there's none). Uses
 * usePathname – render it inside a Suspense boundary with <TabBarSpacerFallback /> as the fallback.
 */
// The footer ends with --tabbar-safe (CLAUDE.md "Einheitlicher heller Abschluss"): scrolled to the bottom the bar sits centred in it, never over a link.
export function TabBarSpacer() {
  const pathname = usePathname();
  // The House page's booking bar counts in --tabbar-clear (html[data-house-bar]); other routes without the bar keep room for their own.
  return <div aria-hidden className={hidesTabBar(pathname) && !pathname.startsWith("/house/") ? cn(OWN_BAR_SPACER, "split:hidden") : "h-(--tabbar-safe)"} />;
}

export function TabBarSpacerFallback() {
  return <div aria-hidden className="h-(--tabbar-safe)" />;
}
