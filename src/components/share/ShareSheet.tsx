"use client";

import { Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SiInstagram, SiTiktok, SiTwitch, SiWhatsapp } from "react-icons/si";
import { sheetButtonClass } from "@/components/ui/sheetButton";
import { glassCircle } from "@/components/ui/glass";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { SHARE_CHANNELS, shareUrl } from "@/lib/growth";
import { useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ShareTarget = { kind: "house"; stay: Stay } | { kind: "profile"; user: User };

type LinkChannel = (typeof SHARE_CHANNELS)[number];

/** Houses: just the link and WhatsApp (plus the system dialog where there is one). The story image and the QR poster
 * are host tools on the House's own page (HostShareTools). */
const HOUSE_CHANNELS: readonly LinkChannel[] = ["copy", "whatsapp"];

const CHANNEL_ICONS: Record<LinkChannel, ReactNode> = {
  whatsapp: <SiWhatsapp className="size-5 text-[#25D366]" />,
  instagram: <SiInstagram className="size-5 text-[#E4405F]" />,
  tiktok: <SiTiktok className="size-5" />,
  twitch: <SiTwitch className="size-5 text-[#9146FF]" />,
  copy: <Link2 className="size-5" />,
};

function pathOf(target: ShareTarget): string {
  return target.kind === "house" ? `/house/${target.stay.slug}` : `/u/${target.user.id}`;
}

const noSubscribe = () => () => {};
/** navigator.share exists (phones, Safari, some desktops) – false on the server. */
function useCanNativeShare(): boolean {
  return useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
}

/**
 * Share a House or a profile. Every link carries ?ref={you}&utm_source={channel}, so a visit that comes from it is
 * attributed (src/lib/growth.ts). Houses: "Copy link", "WhatsApp" and, where supported, "Share…" (the system share
 * dialog). Profiles also list Instagram, TikTok and Twitch – they have no web share target, so their link is copied
 * ready to paste.
 */
export function ShareSheet({ target, open, onClose }: { target: ShareTarget; open: boolean; onClose: () => void }) {
  const t = useTranslations("growth.share");
  const tCommon = useTranslations("common");
  const store = useStore();
  const showToast = useToast();
  const houseId = target.kind === "house" ? target.stay.id : undefined;
  const ownProfile = target.kind === "profile" && target.user.id === store.currentUserId;
  const canNativeShare = useCanNativeShare();
  const channels = target.kind === "house" ? HOUSE_CHANNELS : SHARE_CHANNELS;

  const title =
    target.kind === "house"
      ? t("titleHouse")
      : ownProfile
        ? t("titleOwnProfile")
        : t("titleProfile", { name: target.user.name.split(" ")[0] });

  async function share(channel: LinkChannel) {
    const url = shareUrl(pathOf(target), { refUserId: store.currentUserId, channel });
    store.track("link_shared", { houseId, channel });
    if (channel === "whatsapp") {
      const text = target.kind === "house" ? t("whatsappHouse", { title: target.stay.title }) : t("whatsappProfile", { name: target.user.name });
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
    const text = target.kind === "house" ? t("whatsappHouse", { title: target.stay.title }) : t("whatsappProfile", { name: target.user.name });
    try {
      await navigator.share({ title: target.kind === "house" ? target.stay.title : target.user.name, text, url });
      store.track("link_shared", { houseId, channel: "native" });
      onClose();
    } catch {
      // Dismissed (AbortError) or refused – the sheet stays open for the other options.
    }
  }

  const rowClass = cn(sheetButtonClass, "bg-page text-ink hover:bg-zinc-200/60");
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={store.currentUserId ? t("subtitle") : undefined}>
      <ul className="grid grid-cols-1 gap-2">
        {channels.map((channel) => (
          <li key={channel}>
            <button type="button" onClick={() => void share(channel)} className={rowClass}>
              <span className="flex w-6 shrink-0 justify-center" aria-hidden>
                {CHANNEL_ICONS[channel]}
              </span>
              <span className="flex-1 text-center">{t(`channels.${channel}`)}</span>
            </button>
          </li>
        ))}
        {canNativeShare && (
          <li>
            <button type="button" onClick={() => void nativeShare()} className={rowClass}>
              <span className="flex w-6 shrink-0 justify-center" aria-hidden>
                <Share2 className="size-5" />
              </span>
              <span className="flex-1 text-center">{t("channels.native")}</span>
            </button>
          </li>
        )}
      </ul>
    </Sheet>
  );
}

/** Round glass share button for photos (House cards): opens the share sheet without opening the card's link. */
export function CardShareButton({ stay, variant = "glass", className }: { stay: Stay; /** "glass" on photos, "outline" on white */ variant?: "glass" | "outline"; className?: string }) {
  const t = useTranslations("growth.share");
  const [open, setOpen] = useState(false);

  function openSheet(e: MouseEvent) {
    // Cards are links – sharing must not open the House.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <button type="button" onClick={openSheet} aria-label={t("buttonFor", { title: stay.title })} title={t("button")}
        className={cn(
          variant === "glass"
            ? glassCircle
            : "flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink transition-colors hover:border-neutral-400",
          className,
        )}
      >
        <Share2 className="size-5" />
      </button>
      {/* Portaled: the card scales on hover, which would make the fixed sheet position itself inside the card. */}
      {open && createPortal(<ShareSheet target={{ kind: "house", stay }} open onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
