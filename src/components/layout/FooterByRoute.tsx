"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The full footer only here (Explore with its collections, Host, How it works); every other page ends with the one line. */
const FULL_ROUTES = ["/", "/explore", "/host", "/how-it-works"];

export function FooterByRoute({ full, slim }: { full: ReactNode; slim: ReactNode }) {
  const pathname = usePathname();
  // Open a House: the focus mode has no footer.
  if (pathname === "/create") return null;
  // Your houses (overview and one House) has no footer at all.
  if (pathname === "/your-houses" || /^\/houses\/[^/]+\/manage$/.test(pathname)) return null;
  // A profile and Messages are one screen from 1100px, with no footer under them (Impressum and Privacy are in the avatar's menu).
  if (pathname === "/profile" || pathname.startsWith("/u/") || pathname.startsWith("/messages")) return <div className="split:hidden">{slim}</div>;
  return FULL_ROUTES.includes(pathname) || pathname.startsWith("/collections/") ? full : slim;
}
