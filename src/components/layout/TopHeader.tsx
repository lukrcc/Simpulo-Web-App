import { Suspense } from "react";
import { Container } from "./Container";
import { HeaderActions } from "./HeaderActions";
import { Logo } from "./Logo";
import { NavLinks, NavLinksFallback } from "./NavLinks";

/** Desktop-only header (≥ md). Below md: MobileHeader (logged out, browser) or the tab bar. */
export function TopHeader() {
  // Glass bar: content scrolls under it. Only a bottom hairline instead of the full glass border – drawn as a
  // pseudo-element, so the header stays exactly --header-h tall (a border would add 1px).
  return (
    <header className="glass sticky top-0 z-40 hidden rounded-none border-0 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-black/5 md:block">
      <Container className="grid h-(--header-h) grid-cols-[1fr_auto_1fr] items-center">
        <Logo />
        {/* usePathname suspends on dynamic routes during prerender, so it needs its own boundary. */}
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
        <HeaderActions />
      </Container>
    </header>
  );
}
