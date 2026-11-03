"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { glassCircle } from "@/components/ui/glass";
import { pressFeedback } from "@/components/ui/pressFeedback";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl } from "@/lib/growth";
import { useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";

/** Touch screen (phones, tablets) – only there the system share dialog is used. */
const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

/** "Link copied": the toast and the button's check mark stay this long. */
const COPIED_MS = 2000;

/**
 * Sharing a House – the card's share button and the House page's. Touch devices with navigator.share: the system dialog
 * with the House's text and link, nothing of our own (cancelled or failed: silently nothing). Everywhere else – Safari
 * on a Mac too: the link goes to the clipboard, with "Link copied" for 2 seconds (a toast, and `copied` for the button's check mark). The link carries
 * ?ref={you}&utm_source={channel}; the text reads "{title} · {place} · {dates} – N spots left. Join: {url}".
 */
export function useHouseShare(stay: Stay): { share: () => void; copied: boolean } {
  const t = useTranslations("growth.share");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function share() {
    const native = isTouchDevice() && typeof navigator.share === "function";
    const url = shareUrl(`/house/${stay.slug}`, { refUserId: store.currentUserId, channel: native ? "native" : "copy" });
    if (native) {
      const text = t("prefill", { title: stay.title, place: f.placeName(stay), dates: f.shortRange(stay.startDate, stay.endDate), spots: openSpots(stay), url });
      try {
        await navigator.share({ title: stay.title, text, url });
        store.track("link_shared", { houseId: stay.id, channel: "native" });
      } catch {
        // Cancelled or refused – nothing to show.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return showToast(tCommon("linkCopyFailed"));
    }
    store.track("link_shared", { houseId: stay.id, channel: "copy" });
    showToast(tCommon("linkCopied"), "done", COPIED_MS);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }

  return { share: () => void share(), copied };
}

/** Round share button on House cards: presses in, then shares (see useHouseShare) – never opens the card. */
export function CardShareButton({ stay, variant = "glass", className }: { stay: Stay; /** "glass" on photos, "outline" on white */ variant?: "glass" | "outline"; className?: string }) {
  const t = useTranslations("growth.share");
  const { share, copied } = useHouseShare(stay);

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    // Cards are links – sharing must not open the House.
    e.preventDefault();
    e.stopPropagation();
    pressFeedback(e.currentTarget);
    share();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("buttonFor", { title: stay.title })}
      title={t("button")}
      className={cn(
        "press-feedback",
        variant === "glass" ? glassCircle : "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-ink hover:bg-bg",
        className,
      )}
    >
      {copied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
    </button>
  );
}
