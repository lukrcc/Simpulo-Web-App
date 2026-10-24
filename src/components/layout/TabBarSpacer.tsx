"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMobileChrome } from "./mobileChrome";
import { hidesTabBar } from "./nav";

/** Floating pill (64px, 12px above the bottom) + 16px; also clears the House page's sticky CTA. */
export const PILL_SPACER = "h-[calc(92px+env(safe-area-inset-bottom))]";

/**
 * Mobile-only space at the end of the footer so nothing hides behind the bottom bar. Uses usePathname – render it
 * inside a Suspense boundary with <TabBarSpacerFallback /> as the fallback.
 */
export function TabBarSpacer() {
  const pathname = usePathname();
  const mode = useMobileChrome();
  return (
    <div
      aria-hidden
      className={cn(
        "md:hidden",
        // Routes without the tab bar have their own sticky CTA – keep the pill's clearance there in every mode.
        hidesTabBar(pathname) || mode === "pill"
          ? PILL_SPACER
          : mode === "docked"
            ? "h-[calc(72px+env(safe-area-inset-bottom))]" // docked bar 56px + 16px
            : "h-[env(safe-area-inset-bottom)]", // logged out: no bar
      )}
    />
  );
}

export function TabBarSpacerFallback() {
  return <div aria-hidden className={cn("md:hidden", PILL_SPACER)} />;
}
