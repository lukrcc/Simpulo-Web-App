import { Suspense } from "react";
import { Container } from "./Container";
import { HeaderActions } from "./HeaderActions";
import { HeaderShrink } from "./HeaderShrink";
import { Logo } from "./Logo";
import { NavLinks, NavLinksFallback } from "./NavLinks";

/**
 * Desktop-only header (≥ md). Below md: MobileHeader (logged out, browser) or the tab bar. Scrolled past 40px it goes
 * compact (HeaderShrink): the bar shrinks to --header-bar-h and the claim fades out. The header itself keeps its
 * --header-h slot, so nothing below it moves – the freed strip is transparent and lets clicks through.
 */
export function TopHeader() {
  // Glass bar: content scrolls under it – .glass blurs (with and without -webkit-), on a 72% page tint so it reads the
  // same in Chrome and Safari. Only a bottom hairline instead of the full glass border – drawn as a pseudo-element,
  // so the bar stays exactly --header-bar-h tall (a border would add 1px).
  return (
    <>
      <HeaderShrink />
      <header className="pointer-events-none sticky top-0 z-40 hidden h-(--header-h) md:block">
        <div className="glass pointer-events-auto relative h-(--header-bar-h) rounded-none border-0 bg-[rgba(245,244,241,0.72)] transition-[height] duration-200 ease-out after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-black/5 motion-reduce:transition-none">
          <Container className="grid h-full grid-cols-[1fr_auto_1fr] items-center">
            <Logo />
            {/* usePathname suspends on dynamic routes during prerender, so it needs its own boundary. */}
            <Suspense fallback={<NavLinksFallback />}>
              <NavLinks />
            </Suspense>
            <HeaderActions />
          </Container>
        </div>
      </header>
    </>
  );
}
