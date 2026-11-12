"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useIsStandalone } from "@/lib/install";
import { cn } from "@/lib/utils";

/** Is there a page of ours to go back to? (A freshly launched installed app has none.) */
function canGoBack(): boolean {
  const navigation = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
  if (typeof navigation?.canGoBack === "boolean") return navigation.canGoBack;
  return window.history.length > 1 && document.referrer.startsWith(window.location.origin);
}

/**
 * The way back on a sub-page: history.back() when there's a page of ours to return to, otherwise the sensible parent (`fallback`). The
 * installed app has no browser back button – this is its back (CLAUDE.md "App auf dem Telefon").
 */
export function useBack(fallback: string) {
  const router = useRouter();
  return (e?: MouseEvent) => {
    if (canGoBack()) {
      e?.preventDefault();
      router.back();
    } else if (!e) router.push(fallback);
  };
}

/**
 * The arrow left in a page's head (House page, profile): in the installed app always, in a browser tab only on phones (`phones`), where the
 * browser's own back is out of reach; on desktop tabs the browser has one.
 */
export function BackButton({ fallback, label, phones = true, className }: { fallback: string; label: string; phones?: boolean; className?: string }) {
  const standalone = useIsStandalone();
  const back = useBack(fallback);
  if (!standalone && !phones) return null;
  return (
    <Link href={fallback} onClick={back} aria-label={label} className={cn(iconButtonStyles("sm"), "-ml-2 shrink-0", !standalone && "md:hidden", className)}>
      <ArrowLeft className="size-5" aria-hidden />
    </Link>
  );
}

/** A text link back to the parent ("‹ Your houses", "‹ Settings"): history.back() when it can, the link otherwise. */
export function BackLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const back = useBack(href);
  return (
    <Link href={href} onClick={back} className={className}>
      {children}
    </Link>
  );
}
