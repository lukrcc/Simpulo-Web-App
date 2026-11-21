"use client";

import { CompactSearch } from "./header/CompactSearch";
import { HeaderBack } from "@/components/layout/HeaderBack";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { hidesMobileHeader } from "./nav";

/**
 * Phones' header (< md), the same in Safari and in the installed app, logged in or out: the wordmark left, then ONE light search field across
 * the rest with the filter button inside (CompactSearch – "Where to next?" opens as a sheet from the bottom). No account buttons – they live in the tab bar. Graphite like the desktop header, 56px, under the status bar's
 * graphite strip (AppShell, --safe-top: 0 in a browser tab); no veil, no gradient. A normal row above the page (not sticky). Not on flows with their own head.
 */
export function MobileHeader() {
  return (
    <Suspense fallback={<Bar />}>
      <RoutedHeader />
    </Suspense>
  );
}

function RoutedHeader() {
  const pathname = usePathname();
  if (hidesMobileHeader(pathname)) return null;
  return <Bar search={<CompactSearch />} />;
}

function Bar({ search }: { search?: React.ReactNode }) {
  return (
    <header data-site-header data-mobile-header className="bg-graphite text-ink md:hidden">
      <div className="flex h-14 items-center gap-3 px-(--page-margin)">
        {/* The installed app: the way back on sub-pages, left of the wordmark (HeaderBack). */}
        <span className="flex shrink-0 items-center gap-1">
          <HeaderBack />
          <Logo />
        </span>
        {search}
      </div>
    </header>
  );
}
