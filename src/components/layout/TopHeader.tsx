import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { NavLinks, NavLinksFallback } from "./NavLinks";

/** Desktop-only header (≥ md). */
export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-neutral-100 bg-white/90 backdrop-blur md:block">
      <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-8">
        <Logo />
        {/* usePathname suspends on dynamic routes during prerender, so it needs its own boundary. */}
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
        <div className="flex justify-end">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[#2E2E33] active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Open a House
          </Link>
        </div>
      </div>
    </header>
  );
}
