import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DevSwitcher } from "@/components/auth/DevSwitcher";
import { InstallNudgeProvider } from "@/components/InstallNudge";
import { NotificationToasts } from "@/components/NotificationToasts";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

/** Public base URL for metadata, or undefined (invalid values are ignored rather than breaking every page). */
function siteUrlFromEnv(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

const siteUrl = siteUrlFromEnv();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    // Absolute URLs for Open Graph come from NEXT_PUBLIC_SITE_URL when set (e.g. https://simpulo.app). Unset, Next
    // falls back to its own default for the current environment – nothing here hard-codes a host.
    ...(siteUrl && { metadataBase: siteUrl }),
    title: { default: t("siteTitle"), template: t("titleTemplate") },
    description: t("siteDescription"),
    // Home-screen web app: draw edge-to-edge under the iOS status bar.
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Simpulo" },
    manifest: "/manifest.webmanifest",
    // Next emits the standard "mobile-web-app-capable"; older iOS only reads the Apple-prefixed tag.
    other: { "apple-mobile-web-app-capable": "yes" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1E1E22",
  // Lets the page draw under the status bar; safe-area insets are handled per component.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
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
