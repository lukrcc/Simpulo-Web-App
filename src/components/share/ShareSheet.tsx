"use client";

import { Download, Link2, Loader2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SiInstagram, SiTiktok, SiTwitch, SiWhatsapp } from "react-icons/si";
import { buttonClass } from "@/components/ui/button";
import { sheetButtonClass } from "@/components/ui/sheetButton";
import { glassCircle } from "@/components/ui/glass";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { SHARE_CHANNELS, shareUrl, type ShareChannel } from "@/lib/growth";
import { findUser, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { downloadBlob, renderStoryImage } from "./storyImage";

export type ShareTarget = { kind: "house"; stay: Stay } | { kind: "profile"; user: User };

type LinkChannel = (typeof SHARE_CHANNELS)[number];

const CHANNEL_ICONS: Record<LinkChannel, ReactNode> = {
  whatsapp: <SiWhatsapp className="size-5 text-[#25D366]" />,
  instagram: <SiInstagram className="size-5 text-[#E4405F]" />,
  tiktok: <SiTiktok className="size-5" />,
  twitch: <SiTwitch className="size-5 text-[#9146FF]" />,
  copy: <Link2 className="size-5" />,
};

function pathOf(target: ShareTarget): string {
  return target.kind === "house" ? `/stays/${target.stay.slug}` : `/u/${target.user.id}`;
}

/**
 * Share a House or a profile. Every link carries ?ref={you}&utm_source={channel}, so a visit that comes from it is
 * attributed (src/lib/growth.ts). WhatsApp opens its share dialog; Instagram, TikTok and Twitch have no web share
 * target, so their link is copied ready to paste. Houses also offer the story image.
 */
export function ShareSheet({ target, open, onClose }: { target: ShareTarget; open: boolean; onClose: () => void }) {
  const t = useTranslations("growth.share");
  const tCommon = useTranslations("common");
  const store = useStore();
  const showToast = useToast();
  const houseId = target.kind === "house" ? target.stay.id : undefined;
  const ownProfile = target.kind === "profile" && target.user.id === store.currentUserId;

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

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={store.currentUserId ? t("subtitle") : undefined}>
      <ul className="grid grid-cols-1 gap-2">
        {SHARE_CHANNELS.map((channel) => (
          <li key={channel}>
            <button type="button" onClick={() => void share(channel)} className={cn(sheetButtonClass, "bg-page text-ink hover:bg-zinc-200/60")}>
              <span className="flex w-6 shrink-0 justify-center" aria-hidden>
                {CHANNEL_ICONS[channel]}
              </span>
              <span className="flex-1 text-center">{t(`channels.${channel}`)}</span>
            </button>
          </li>
        ))}
      </ul>
      {target.kind === "house" && <StoryImageButton stay={target.stay} className="mt-4" />}
    </Sheet>
  );
}

/**
 * "Download story image": a 1080×1920 PNG with the host photo, title, dates · place and a QR code to the House
 * (with your ref, utm_source=story). Shown in the share sheet and on the Manage page.
 */
export function StoryImageButton({ stay, variant = "sheet", className }: { stay: Stay; variant?: "sheet" | "button"; className?: string }) {
  const t = useTranslations("growth.share");
  const tStory = useTranslations("growth.story");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const host = findUser(store, stay.hostId);

  async function download() {
    setBusy(true);
    try {
      const url = shareUrl(`/stays/${stay.slug}`, { refUserId: store.currentUserId, channel: "story", medium: "qr" });
      const blob = await renderStoryImage({
        photoUrl: host?.photos[0] ?? stay.photos?.[0],
        title: stay.title,
        meta: `${f.longRange(stay.startDate, stay.endDate)} · ${f.placeName(stay)}`,
        hostedBy: host ? tStory("hostedBy", { name: host.name.split(" ")[0] }) : "",
        join: tStory("join"),
        scan: tStory("scan"),
        url,
      });
      downloadBlob(blob, `simpulo-${stay.slug}-story.png`);
      store.track("link_shared", { houseId: stay.id, channel: "story" satisfies ShareChannel });
      showToast(t("storyDone"));
    } catch {
      showToast(t("storyFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (variant === "button") {
    return (
      <button type="button" onClick={() => void download()} disabled={busy} title={t("storyHint")} className={cn(buttonClass("secondary", "sm"), className)}>
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Download className="size-3.5" aria-hidden />}
        {busy ? t("storyBusy") : t("storyButton")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy}
      className={cn(sheetButtonClass, "border border-zinc-200 bg-white text-ink hover:bg-zinc-50 disabled:opacity-60", className)}
    >
      <span className="flex w-6 shrink-0 justify-center" aria-hidden>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
      </span>
      <span className="flex-1 text-center">
        {busy ? t("storyBusy") : t("storyButton")}
        <span className="block text-xs font-normal text-zinc-500">{t("storyHint")}</span>
      </span>
    </button>
  );
}

/** Round glass share button for photos (House cards): opens the share sheet without opening the card's link. */
export function CardShareButton({ stay, className }: { stay: Stay; className?: string }) {
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
      <button type="button" onClick={openSheet} aria-label={t("buttonFor", { title: stay.title })} title={t("button")} className={cn(glassCircle, className)}>
        <Share2 className="size-5" />
      </button>
      {/* Portaled: the card scales on hover, which would make the fixed sheet position itself inside the card. */}
      {open && createPortal(<ShareSheet target={{ kind: "house", stay }} open onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
