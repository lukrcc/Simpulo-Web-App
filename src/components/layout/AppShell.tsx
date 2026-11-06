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
import { PageGlow } from "./PageGlow";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PageGlow />
      </Suspense>
      <Tooltip />
      <Suspense fallback={null}>
        <HouseTransitions />
      </Suspense>
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
      <main className="flex-1 pb-24 md:pt-18 md:pb-(--space-section)">{children}</main>
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
