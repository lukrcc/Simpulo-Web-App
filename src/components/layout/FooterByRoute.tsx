"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LegalLine } from "./LegalLine";

/** The full footer only here (Explore with its collections); every other page ends with the one line. */
const FULL_ROUTES = ["/", "/explore"];

export function FooterByRoute({ full, slim }: { full: ReactNode; slim: ReactNode }) {
  const pathname = usePathname();
  // Open a House: the focus mode has no footer – its legal line sits in the left column, under Back/Next (CreateStayForm).
  if (pathname === "/create") return null;
  // Your houses (overview, one House, editing, payouts) has no footer: the legal line, centred at the bottom.
  if (pathname === "/your-houses" || pathname.startsWith("/your-houses/")) return <LegalLine align="center" className="pb-8 pt-2" />;
  // A profile is one screen from 1100px, with no footer under it: the legal line in the 32px left below the bento instead.
  if (pathname === "/profile" || pathname.startsWith("/u/")) {
    return (
      <>
        <div className="split:hidden">{slim}</div>
        <LegalLine align="center" className="hidden h-8 split:flex" />
      </>
    );
  }
  // Messages is one screen from 1100px too: the legal line sits at the bottom of its chat list (InboxList).
  if (pathname.startsWith("/messages")) return <div className="split:hidden">{slim}</div>;
  return FULL_ROUTES.includes(pathname) || pathname.startsWith("/collections/") ? full : slim;
}
