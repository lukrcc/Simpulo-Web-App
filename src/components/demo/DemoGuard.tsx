"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

/** Links and buttons that would do something real (`data-preview-action`: Join, pay, message the host). */
const BLOCKED = 'a[href^="/create"], a[href^="/inbox"], [data-preview-action]';
const TOAST_MS = 6000;

/** Demo only: what would act for real says so instead, with a link to the real thing. Runs ahead of the page's own handlers. */
export function DemoGuard() {
  const t = useTranslations("demo");
  const showToast = useToast();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target as Element).closest?.(BLOCKED)) return;
      event.preventDefault();
      event.stopPropagation();
      showToast(t("toast"), "notify", TOAST_MS, `${process.env.NEXT_PUBLIC_PRODUCTION_URL ?? ""}/host`);
    };
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [showToast, t]);
  return null;
}
