"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { useBack } from "@/components/ui/BackButton";
import { headerBackFor } from "@/config/backNav";
import { useIsStandalone } from "@/lib/install";
import { MEDIA } from "@/config/breakpoints";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/**
 * The installed app's back arrow in the header (phones' MobileHeader and the tablet/desktop SiteHeader), left of the wordmark: on every
 * sub-page that has no arrow of its own (config/backNav.ts). In a browser tab none – the browser has its own back. Settings on a phone with
 * an area open has its own "‹ Settings": none there either.
 */
export function HeaderBack({ className }: { className?: string }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const standalone = useIsStandalone();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const target = headerBackFor(pathname);
  const back = useBack(target ?? "/explore");
  // Below 1024px an open Settings area is its own view with "‹ Settings" – that one is the way back there.
  const belowLg = useMediaQuery(MEDIA.belowLg);
  const settingsArea = pathname === "/settings" && hash !== "" && belowLg;
  if (!standalone || target === null || settingsArea) return null;
  return (
    <Link
      href={target}
      onClick={back}
      aria-label={t("back")}
      data-header-back
      className={cn("press -ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-(--header-pill-hover)", className)}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </Link>
  );
}
