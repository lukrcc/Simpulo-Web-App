"use client";

import { Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore, type ReactNode } from "react";
import { SiInstagram, SiTiktok, SiTwitch, SiWhatsapp } from "react-icons/si";
import { ListRow } from "@/components/ui/ListRow";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { SHARE_CHANNELS, shareUrl } from "@/lib/growth";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

/** Houses are shared with HouseShare (system dialog / "Share this House"); this sheet shares profiles. */
export type ShareTarget = { kind: "profile"; user: User };

type LinkChannel = (typeof SHARE_CHANNELS)[number];

const CHANNEL_ICONS: Record<LinkChannel, ReactNode> = {
  whatsapp: <SiWhatsapp className="size-5 text-[#25D366]" />,
  instagram: <SiInstagram className="size-5 text-[#E4405F]" />,
  tiktok: <SiTiktok className="size-5" />,
  twitch: <SiTwitch className="size-5 text-[#9146FF]" />,
  copy: <Link2 className="size-5" />,
};

function pathOf(target: ShareTarget): string {
  return `/u/${target.user.id}`;
}

const noSubscribe = () => () => {};
/** navigator.share exists (phones, Safari, some desktops) – false on the server. */
function useCanNativeShare(): boolean {
  return useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
}

/**
 * Share a profile. Every link carries ?ref={you}&utm_source={channel}, so a visit that comes from it is attributed
 * (src/lib/growth.ts): WhatsApp, Instagram, TikTok, Twitch (no web share target – the link is copied ready to paste),
 * "Copy link" and, where supported, "Share…" (the system share dialog).
 */
export function ShareSheet({ target, open, onClose }: { target: ShareTarget; open: boolean; onClose: () => void }) {
  const t = useTranslations("growth.share");
  const tCommon = useTranslations("common");
  const store = useStore();
  const showToast = useToast();
  const ownProfile = target.user.id === store.currentUserId;
  const canNativeShare = useCanNativeShare();
  const channels = SHARE_CHANNELS;
  const title = ownProfile ? t("titleOwnProfile") : t("titleProfile", { name: target.user.name.split(" ")[0] });

  async function share(channel: LinkChannel) {
    const url = shareUrl(pathOf(target), { refUserId: store.currentUserId, channel });
    store.track("link_shared", { channel });
    if (channel === "whatsapp") {
      const text = t("whatsappProfile", { name: target.user.name });
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
      onClose();
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(channel === "copy" ? tCommon("linkCopied") : t("pasteHint", { channel: t(`channels.${channel}`) }));
      onClose();
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }

  async function nativeShare() {
    const url = shareUrl(pathOf(target), { refUserId: store.currentUserId, channel: "native" });
    const text = t("whatsappProfile", { name: target.user.name });
    try {
      await navigator.share({ title: target.user.name, text, url });
      store.track("link_shared", { channel: "native" });
      onClose();
    } catch {
      // Dismissed (AbortError) or refused – the sheet stays open for the other options.
    }
  }

  // Each option is one list row (the whole row is the button), separated by 1px lines.
  const rowClass = "block w-full text-left outline-none hover:bg-bg focus-visible:bg-bg";
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={store.currentUserId ? t("subtitle") : undefined}>
      <ul className="">
        {channels.map((channel) => (
          <li key={channel}>
            <button type="button" onClick={() => void share(channel)} className={rowClass}>
              <ListRow lead={<span aria-hidden>{CHANNEL_ICONS[channel]}</span>} title={t(`channels.${channel}`)} />
            </button>
          </li>
        ))}
        {canNativeShare && (
          <li>
            <button type="button" onClick={() => void nativeShare()} className={rowClass}>
              <ListRow lead={<Share2 aria-hidden />} title={t("channels.native")} />
            </button>
          </li>
        )}
      </ul>
    </Sheet>
  );
}
