import { Tooltip } from "@/components/ui/Tooltip";
import { Suspense, type ReactNode } from "react";
import { DemoBand } from "@/components/demo/DemoBand";
import { DemoGuard } from "@/components/demo/DemoGuard";
import { APP_MODE } from "@/lib/appMode";
import { BottomTabBar } from "./BottomTabBar";
import { Footer, SlimFooter } from "./Footer";
import { FooterByRoute } from "./FooterByRoute";
import { HouseTransitions } from "./HouseTransitions";
import { SiteHeader } from "./header/SiteHeader";
import { MobileHeader } from "./MobileHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* No glow patches behind the page any more: nothing fades into the page's ground (hard edges, CLAUDE.md "Farbsystem").
          The 1px mark at the page's top: while it shows, the header's glass is a little more opaque (SiteHeader, IntersectionObserver). */}
      <div aria-hidden data-top-mark className="pointer-events-none absolute left-0 top-0 h-2 w-px" />
      <Tooltip />
      <Suspense fallback={null}>
        <HouseTransitions />
      </Suspense>
      {/* From md, the installed app's status bar (black-translucent) lies over the page: a graphite strip as tall as its safe area continues the
          header under it (0px in a browser tab). */}
      <div aria-hidden data-status-bar className="sticky top-0 z-50 hidden h-(--safe-top) bg-graphite md:block" />
      {APP_MODE === "demo" && (
        <>
          <DemoBand />
          <DemoGuard />
        </>
      )}
      <SiteHeader />
      <MobileHeader />
      {/* From md the header is fixed: the content starts 16px below its bar (72px), and its tab hangs into that space.
          Every scrolling page ends with the same space before the footer: 96px mobile, --space-section desktop. Full-height
          app pages drop that padding and the footer via data-app-pane (globals.css). */}
      <main className="flex-1 pb-24 md:pt-16 md:pb-(--space-section)">{children}</main>
      {/* usePathname suspends on dynamic routes during prerender. */}
      <Suspense fallback={<SlimFooter />}>
        <FooterByRoute full={<Footer />} slim={<SlimFooter />} />
      </Suspense>
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </>
  );
}
