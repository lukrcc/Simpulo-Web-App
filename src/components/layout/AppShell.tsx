import { Suspense, type ReactNode } from "react";
import { DemoBand } from "@/components/demo/DemoBand";
import { DemoGuard } from "@/components/demo/DemoGuard";
import { APP_MODE } from "@/lib/appMode";
import { BottomTabBar } from "./BottomTabBar";
import { Footer } from "./Footer";
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
      {/* From md the header is fixed: the content starts 16px below its bar (80px), and its tab hangs into that space.
          Every scrolling page ends with the same space before the footer: 96px mobile, 64px desktop. Full-height
          app pages drop that padding and the footer via data-app-pane (globals.css). */}
      <main className="flex-1 pb-24 md:pt-20 md:pb-16">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </>
  );
}
