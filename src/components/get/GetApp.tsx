"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { AndroidInstallButton, IosInstallSteps } from "@/components/InstallHint";
import { SimpuloQR } from "@/components/SimpuloQR";
import { buttonStyles } from "@/components/ui/ActionButton";
import { APP_LINKS } from "@/config/app-links";
import { useBrowser, useInstallPrompt, useIsStandalone } from "@/lib/install";
import { appLink } from "@/lib/links";

/** The device's part of /get. Nothing device-specific before hydration ("unknown"), so server and first client render agree. */
export function GetApp() {
  const t = useTranslations("install");
  const browser = useBrowser();
  const standalone = useIsStandalone();
  const prompt = useInstallPrompt();

  // Once there are real apps: straight to the store of this device.
  const store = browser.startsWith("ios") ? APP_LINKS.appStoreUrl : browser.startsWith("android") ? APP_LINKS.playStoreUrl : "";
  useEffect(() => {
    if (store && !standalone) window.location.replace(store);
  }, [store, standalone]);

  let body: React.ReactNode = null;
  if (standalone) {
    body = (
      <Link href="/" className={buttonStyles("primary", "md")}>
        {t("getOpenExplore")}
      </Link>
    );
  } else if (browser === "android-chrome" && prompt) {
    body = <AndroidInstallButton label={t("getInstall")} />;
  } else if (browser === "android-chrome" || browser === "android-other") {
    body = <p className="text-body text-muted">{t("getOpenChrome")}</p>;
  } else if (browser === "ios-safari") {
    body = <IosInstallSteps className="mx-auto w-fit text-left" />;
  } else if (browser === "ios-other") {
    body = <p className="text-body text-muted">{t("getOpenSafari")}</p>;
  } else if (browser === "desktop") {
    body = (
      <div className="flex flex-col items-center gap-4">
        <SimpuloQR url={appLink()} refParam="get" size={200} />
        <p className="text-body text-muted">{t("getScan")}</p>
      </div>
    );
  }

  return (
    <div className="page-container flex min-h-[calc(100svh-160px)] flex-col items-center pb-24 pt-6 md:justify-center md:pb-16 md:pt-10">
      <div className="flex w-full max-w-[480px] flex-col items-center text-center">
        <Image src="/apple-touch-icon-v2.png" alt="" width={96} height={96} priority className="size-24 rounded-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_rgba(40,32,26,0.10)]" />
        <h1 className="mt-6 text-h1 text-ink">{standalone ? t("getInstalled") : t("getTitle")}</h1>
        {!standalone && <p className="mt-3 text-body-lg text-muted">{t("getLead")}</p>}
        <div className="mt-10 flex min-h-11 w-full justify-center">{body}</div>
      </div>
    </div>
  );
}
