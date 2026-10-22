import { Suspense, type ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { Footer } from "./Footer";
import { TopHeader } from "./TopHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopHeader />
      {/* Bottom padding keeps content clear of the floating mobile tab bar (64px + 12px + safe area) / sticky CTA. */}
      <main className="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </>
  );
}
