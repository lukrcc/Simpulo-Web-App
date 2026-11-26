"use client";

// Sharing a House (CLAUDE.md "Teilen und Einladen"): one sheet – Copy link · WhatsApp · Messages · Instagram Story (the story image saved or
// handed to the share dialog) · More… (the system share, where there is one). Every link carries ?ref={you}&src={channel} (lib/growth.ts
// shareUrl), so a visit that comes from it is attributed – Admin › Wachstum (Kanäle, Empfehler). Opened from the House page, the House area
// and after a request.
import { Link2, Loader2, MessageCircle, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { SiInstagram, SiWhatsapp } from "react-icons/si";
import { ListRow } from "@/components/ui/ListRow";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl, type ShareChannel } from "@/lib/growth";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { housePhotos, openSpots } from "@/lib/utils";
import { downloadBlob, renderStoryImage } from "./storyImage";
import { copyText } from "@/lib/clipboard";

const noSubscribe = () => () => {};
/** navigator.share exists – false on the server and while hydrating. */
function useCanNativeShare(): boolean {
  return useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
}

/** `open()` opens the House's share sheet; render `sheet` once. */
export function useHouseShareSheet(stay: Stay) {
  const [open, setOpen] = useState(false);
  return { open: () => setOpen(true), sheet: <HouseShareSheet stay={stay} open={open} onClose={() => setOpen(false)} /> };
}

export function HouseShareSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("growth.share");
  const tStory = useTranslations("growth.story");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const canNative = useCanNativeShare();
  const [busy, setBusy] = useState(false);
  const host = findUser(store, stay.hostId);
  const spots = openSpots(stay);
  const link = (channel: ShareChannel, medium?: string) => shareUrl(`/house/${stay.slug}`, { refUserId: store.currentUserId, channel, medium });
  const text = (url: string) => t("prefill", { title: stay.title, place: f.placeName(stay), dates: f.stayDates(stay), spots, url });
  const done = (channel: ShareChannel) => store.track("link_shared", { houseId: stay.id, channel });

  async function copy() {
    try {
      await copyText(link("copy"));
      done("copy");
      showToast(t("linkCopied"));
      onClose();
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text(link("whatsapp")))}`, "_blank", "noopener,noreferrer");
    done("whatsapp");
    onClose();
  }
  function messages() {
    // The SMS app with the text ready – iOS and Android both read "sms:?&body=".
    window.location.href = `sms:?&body=${encodeURIComponent(text(link("messages")))}`;
    done("messages");
    onClose();
  }
  async function story() {
    setBusy(true);
    try {
      const meta = [f.stayDatesLong(stay), f.placeName(stay), spots > 0 && tStory("spotsOpen", { count: spots })].filter(Boolean).join(" · ");
      const blob = await renderStoryImage({
        photoUrl: housePhotos(stay)[0] ?? host?.photos[0],
        avatarUrl: host?.photos[0],
        title: stay.title,
        meta,
        hostedBy: host ? tStory("hostedBy", { name: host.name.split(" ")[0] }) : "",
        join: tStory("join"),
        scan: tStory("scan"),
        url: link("story", "qr"),
      });
      const file = new File([blob], `simpulo-${stay.slug}-story.png`, { type: "image/png" });
      // Phones: straight into the share dialog (Instagram is there); elsewhere the image is saved.
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t("storyShareText", { title: stay.title }) }).catch(() => undefined);
      } else {
        downloadBlob(blob, file.name);
        showToast(t("storyDone"));
      }
      done("story");
      onClose();
    } catch {
      showToast(t("storyFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    const url = link("native");
    try {
      await navigator.share({ title: stay.title, text: text(url), url });
      done("native");
      onClose();
    } catch {
      // Cancelled – nothing to show.
    }
  }

  const rows: { key: string; icon: ReactNode; label: string; hint?: string; onClick: () => void }[] = [
    { key: "copy", icon: <Link2 className="size-5" />, label: t("menu.copy"), onClick: () => void copy() },
    { key: "whatsapp", icon: <SiWhatsapp className="size-5 text-[#25D366]" />, label: t("menu.whatsapp"), onClick: whatsapp },
    { key: "messages", icon: <MessageCircle className="size-5" />, label: t("menu.messages"), onClick: messages },
    { key: "story", icon: busy ? <Loader2 className="size-5 animate-spin" /> : <SiInstagram className="size-5 text-[#E4405F]" />, label: t("menu.story"), hint: t("menu.storyHint"), onClick: () => void story() },
    ...(canNative ? [{ key: "more", icon: <Share className="size-5" />, label: t("menu.more"), onClick: () => void more() }] : []),
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t("houseTitle", { title: stay.title })} subtitle={t("houseSubtitle")}>
      <ul className="-mx-2 flex flex-col">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" data-share-channel={r.key} onClick={r.onClick} disabled={busy && r.key === "story"} className="block w-full rounded-2xl px-2 text-left hover:bg-ink/5">
              <ListRow lead={<span className="flex size-10 items-center justify-center rounded-full bg-ink/6 text-ink">{r.icon}</span>} title={r.label} subtitle={r.hint} />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
