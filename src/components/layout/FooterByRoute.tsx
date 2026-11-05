"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The full footer only here (Explore with its collections, Host, How it works); every other page ends with the one line. */
const FULL_ROUTES = ["/", "/explore", "/host", "/how-it-works"];

export function FooterByRoute({ full, slim }: { full: ReactNode; slim: ReactNode }) {
  const pathname = usePathname();
  // Open a House: the focus mode has no footer.
  if (pathname === "/create") return null;
  return FULL_ROUTES.includes(pathname) || pathname.startsWith("/collections/") ? full : slim;
}
