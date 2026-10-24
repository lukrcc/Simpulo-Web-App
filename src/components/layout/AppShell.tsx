import { Suspense, type ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { Footer } from "./Footer";
import { MobileHeader } from "./MobileHeader";
import { TopHeader } from "./TopHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopHeader />
      <MobileHeader />
      {/* Every scrolling page ends with the same space before the footer: 96px mobile, 64px desktop. Full-height
          app pages drop that padding and the footer via data-app-pane (globals.css). */}
      <main className="flex-1 pb-24 md:pb-16">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </>
  );
}
