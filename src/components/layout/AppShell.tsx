import { HelpFeedbackSheet } from "@/components/help/HelpFeedback";
import { GetAppDialog } from "@/components/GetAppDialog";
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
      {/* "Help & feedback": one sheet for the whole app, opened from the footer and Settings (lib/support/feedback.ts). */}
      <HelpFeedbackSheet />
      <GetAppDialog />
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
      {/* From md the header is fixed: the content starts below its bar. Every scrolling page ends with the same room before the footer:
          --footer-gap (64px after a light last section, 0 after a dark one – globals.css); phones 96px for the tab bar. Full-height app pages
          drop that padding and the footer via data-app-pane (globals.css). Phones: never less than the tab bar covers (--tabbar-clear) + 24px. */}
      <main className="flex-1 pb-[max(6rem,calc(var(--tabbar-clear)+1.5rem))] md:pt-16 md:pb-(--footer-gap)">{children}</main>
      {/* usePathname suspends on dynamic routes during prerender. */}
      <Suspense fallback={<SlimFooter />}>
        <FooterByRoute large={<Footer />} slim={<SlimFooter />} />
      </Suspense>
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </>
  );
}
