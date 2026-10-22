import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DevSwitcher } from "@/components/auth/DevSwitcher";
import { InstallNudgeProvider } from "@/components/InstallNudge";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Simpulo – Share a place. Find your people.",
    template: "%s · Simpulo",
  },
  description: "Find people to share a house with for a few weeks – hosted by real people, anywhere.",
  // Home-screen web app: draw edge-to-edge under the iOS status bar.
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Simpulo" },
  manifest: "/manifest.webmanifest",
  // Next emits the standard "mobile-web-app-capable"; older iOS only reads the Apple-prefixed tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#1E1E22",
  // Lets the page draw under the status bar; safe-area insets are handled per component.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <ToastProvider>
            <AuthProvider>
              <InstallNudgeProvider>
                <AppShell>{children}</AppShell>
              </InstallNudgeProvider>
              <DevSwitcher />
            </AuthProvider>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
