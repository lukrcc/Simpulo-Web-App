"use client";

// Without a connection: one quiet line at the bottom, above the tab bar (--bottom-clear) – "You're offline. Some things won't load until
// you're back." Gone as soon as the connection is back. The error pages say "You're offline" themselves.
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnline } from "@/lib/useOnline";

export function OfflineBanner() {
  const t = useTranslations("states.error");
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" data-offline-banner className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-clear)+16px)] z-60 flex justify-center px-(--page-margin)">
      <p className="glass-panel flex items-center gap-2 rounded-full! px-4 py-2 text-small font-semibold text-ink">
        <WifiOff aria-hidden className="size-4" />
        {t("offlineBanner")}
      </p>
    </div>
  );
}
