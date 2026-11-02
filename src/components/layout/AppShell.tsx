import { Suspense, type ReactNode } from "react";
import { ExploreControlsProvider } from "@/components/explore/ExploreControls";
import { BottomTabBar } from "./BottomTabBar";
import { ExploreIndex } from "./ExploreIndex";
import { Footer } from "./Footer";
import { SiteHeader } from "./header/SiteHeader";
import { MobileHeader } from "./MobileHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ExploreControlsProvider>
      <SiteHeader />
      <MobileHeader />
      {/* The desktop header is fixed: the page starts under it (--header-slot: 128px on Explore, 72px elsewhere).
          Every scrolling page ends with the same space before the footer: 96px mobile, 64px desktop. Full-height
          app pages drop that padding and the footer via data-app-pane (globals.css). */}
      <main className="flex-1 pb-24 md:pt-(--header-slot) md:pb-16">{children}</main>
      <ExploreIndex />
      <Footer />
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </ExploreControlsProvider>
  );
}
