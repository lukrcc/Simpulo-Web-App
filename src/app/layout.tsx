import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DevSwitcher } from "@/components/auth/DevSwitcher";
import { InstallNudgeProvider } from "@/components/InstallNudge";
import { NotificationToasts } from "@/components/NotificationToasts";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE_URL } from "@/lib/seo";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

// Self-hosted at build time by next/font – the browser never requests a Google domain. Tailwind's font-sans reads the
// variable (globals.css).
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    // Canonical and Open Graph URLs are absolute: NEXT_PUBLIC_SITE_URL, else https://simpulo.app (src/lib/seo.ts).
    metadataBase: SITE_URL,
    title: { default: t("siteTitle"), template: t("titleTemplate") },
    description: t("siteDescription"),
    // Home-screen web app: draw edge-to-edge under the iOS status bar.
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Simpulo" },
    manifest: "/manifest.webmanifest",
    // The smiley on a white circle (transparent corners): SVG first, PNG fallbacks; the Apple icon keeps a square
    // background (iOS rounds it itself and drops transparency). "-v2" in the names, so Safari drops its cached icon.
    icons: {
      icon: [
        { url: "/favicon-v2.svg", type: "image/svg+xml" },
        { url: "/favicon-v2-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-v2-192.png", sizes: "192x192", type: "image/png" },
        { url: "/favicon-v2-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" }],
    },
    // Next emits the standard "mobile-web-app-capable"; older iOS only reads the Apple-prefixed tag.
    other: { "apple-mobile-web-app-capable": "yes" },
    // Gated test deployment: never indexed. (SITE_PASSWORD is runtime-only on App Hosting, so prerendered pages may
    // miss this tag – src/proxy.ts adds an X-Robots-Tag header to every response for exactly that case.)
    ...(process.env.SITE_PASSWORD && { robots: { index: false, follow: false } }),
  };
}

export const viewport: Viewport = {
  // Renders <meta name="theme-color" content="#F2F0EB"> – the page background (--bg).
  themeColor: "#F2F0EB",
  // Lets the page draw under the status bar; safe-area insets are handled per component.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Messages and formats come from src/i18n/request.ts. */}
        <NextIntlClientProvider>
        <StoreProvider>
          <ToastProvider>
            <AuthProvider>
              <InstallNudgeProvider>
                <AppShell>{children}</AppShell>
              </InstallNudgeProvider>
              <DevSwitcher />
              <NotificationToasts />
            </AuthProvider>
          </ToastProvider>
        </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
