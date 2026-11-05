"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl } from "@/lib/growth";
import { useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { openSpots } from "@/lib/utils";

/** Touch screen (phones, tablets) – only there the system share dialog is used. */
const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**
 * "Invite friends" on the House page, the one place to share a House. Touch devices with navigator.share: the system dialog
 * with the House's text and link, nothing of our own (cancelled or failed: silently nothing). Everywhere else – Safari
 * on a Mac too: the link goes to the clipboard, with a toast. The link carries
 * ?ref={you}&utm_source={channel}; the text reads "{title} · {place} · {dates} – N spots left. Join: {url}".
 */
export function useHouseShare(stay: Stay): () => void {
  const t = useTranslations("growth.share");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();

  async function share() {
    const native = isTouchDevice() && typeof navigator.share === "function";
    const url = shareUrl(`/house/${stay.slug}`, { refUserId: store.currentUserId, channel: native ? "native" : "copy" });
    if (native) {
      const text = t("prefill", { title: stay.title, place: f.placeName(stay), dates: f.stayDates(stay), spots: openSpots(stay), url });
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
    showToast(t("inviteCopied"));
  }

  return () => void share();
}
