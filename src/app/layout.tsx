import { SPOTLIGHT_INTRO_KEY } from "@/config/explore";
import { COLOR_MODE_SCRIPT } from "@/lib/colorMode";
import { STANDALONE_SCRIPT } from "@/lib/install";
import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DevSwitcher } from "@/components/auth/DevSwitcher";
import { InstallPromptProvider } from "@/components/InstallPrompt";
import { NotifyBridge } from "@/components/notifications/NotifyBridge";
import { AppBadge } from "@/components/AppBadge";
import { StandaloneWelcome } from "@/components/auth/StandaloneWelcome";
import { CurrencyHint } from "@/components/layout/CurrencyHint";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE_URL } from "@/lib/seo";
import { StoreProvider } from "@/lib/store";
import "./globals.css";
import Script from "next/script";
import { HOUSE_BACK_GATE } from "@/lib/houseBackGate";
import { APP_MODE } from "@/lib/appMode";
import { siteIsGated } from "@/lib/seo";

// Self-hosted at build time by next/font – the browser never requests a Google domain. Tailwind's font-sans reads the
// variable (globals.css).
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
/** Only the large headings: display, h1, h2 (globals.css). */
const interTight = Inter_Tight({ subsets: ["latin"], display: "swap", weight: ["600", "700"], variable: "--font-display" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    // Canonical and Open Graph URLs are absolute: NEXT_PUBLIC_SITE_URL, else https://simpulo.app (src/lib/seo.ts).
    metadataBase: SITE_URL,
    title: { default: t("siteTitle"), template: t("titleTemplate") },
    description: t("siteDescription"),
    // Home-screen web app: draw edge-to-edge under the iOS status bar.
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Simpulo" },
    // The manifest is src/app/manifest.ts – Next links it itself.
    // The orbit (public/). Browser tab: the transparent favicon.svg (it follows a light or dark browser by prefers-color-scheme), PNG
    // fallbacks, the .ico for old browsers. Home screen: the app icon on black, square (iOS rounds it itself). icon-1024.png: stores later.
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    // Next emits the standard "mobile-web-app-capable"; older iOS only reads the Apple-prefixed tag.
    other: { "apple-mobile-web-app-capable": "yes" },
    // Gated test deployment: never indexed. (SITE_PASSWORD is runtime-only on App Hosting, so prerendered pages may
    // miss this tag – src/proxy.ts adds an X-Robots-Tag header to every response for exactly that case.)
    ...(siteIsGated() && { robots: { index: false, follow: false } }),
  };
}

export const viewport: Viewport = {
  // Renders <meta name="theme-color">: the header's graphite (--graphite) – the browser's bar continues it. A meta tag can't read a CSS
  // variable, so the value is written out here (like the OG images).
  themeColor: "#48423E",
  // Lets the page draw under the status bar; safe-area insets are handled per component.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-app-mode={APP_MODE} data-mode="hybrid" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} h-full antialiased`}>
      {/* relative + isolate: the frame for PageGlow's z-index −1, no overflow and no fixed height. */}
      <body className="relative isolate flex min-h-full flex-col">
        {/* Before anything paints: the Spotlight's first showing of this session starts hidden (SpotlightCoverflow). Through next/script
            (beforeInteractive, like the gate below): a bare <script> in a component is never run on the client, and React reports it – the
            "1 Issue" in Next's overlay. */}
        <Script id="spotlight-intro-gate" strategy="beforeInteractive">
          {`try{if(!sessionStorage.getItem(${JSON.stringify(SPOTLIGHT_INTRO_KEY)})&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.setAttribute("data-spot-intro","")}catch(e){}`}
        </Script>
        {/* Before anything paints: the colour mode (Dev menu "Mode": hybrid · light · dark), so a page never flashes the other one. */}
        <Script id="color-mode" strategy="beforeInteractive">
          {COLOR_MODE_SCRIPT}
        </Script>
        {/* Before anything paints: is-standalone on <html> in the installed app (and the Dev menu's simulation of it). */}
        <Script id="standalone" strategy="beforeInteractive">
          {STANDALONE_SCRIPT}
        </Script>
        {/* Before the router: the way back from a House page is marked ahead of it (src/lib/houseTransition.ts). */}
        <Script id="house-back-gate" strategy="beforeInteractive">
          {HOUSE_BACK_GATE}
        </Script>
        {/* Messages and formats come from src/i18n/request.ts. */}
        <NextIntlClientProvider>
        <StoreProvider>
          <ToastProvider>
            <AuthProvider>
              <InstallPromptProvider>
                <AppShell>{children}</AppShell>
              </InstallPromptProvider>
              <DevSwitcher />
              <NotifyBridge />
              <AppBadge />
              <StandaloneWelcome />
              <CurrencyHint />
            </AuthProvider>
          </ToastProvider>
        </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
