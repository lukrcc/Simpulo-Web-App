"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { footerOf } from "@/config/footer";

/**
 * The one footer of the route (config/footer.ts): large · slim · none. Without one the page ends right above the tab bar (globals.css
 * html[data-footer="none"] main: --tabbar-safe) – a one-screen page like the profile then needs no scrolling.
 */
export function FooterByRoute({ large, slim }: { large: ReactNode; slim: ReactNode }) {
  const variant = footerOf(usePathname(), useSearchParams());
  useEffect(() => {
    document.documentElement.dataset.footer = variant;
    return () => {
      delete document.documentElement.dataset.footer;
    };
  }, [variant]);
  return variant === "large" ? large : variant === "slim" ? slim : null;
}
