"use client";

import { Link2, Loader2, QrCode, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DetailSection, ListRow } from "@/components/stay/DetailSection";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl, type ShareChannel } from "@/lib/growth";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { openSpots, stayPhotos } from "@/lib/utils";
import { downloadBlob, renderStoryImage } from "./storyImage";

type Tool = "copy" | "story";

/**
 * "Share" – the host's tools in Your houses (guests never see them): copy the link and download the story image
 * (1080×1920: House photo, title, dates · place · open spots, host face, wordmark, QR). Every link carries the host's ref and its
 * channel, like the share sheet.
 */
export function HostShareTools({ stay, title, className }: { stay: Stay; /** Section heading */ title: string; className?: string }) {
  const t = useTranslations("growth.share");
  const tStory = useTranslations("growth.story");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [busy, setBusy] = useState<Tool | null>(null);
  const host = findUser(store, stay.hostId);
  const path = `/house/${stay.slug}`;
  const link = (channel: ShareChannel, medium?: string) => shareUrl(path, { refUserId: store.currentUserId, channel, medium });
  const spots = openSpots(stay);
  // Dates · place · open spots (left out once the crew is full).
  const meta = [f.longRange(stay.startDate, stay.endDate), f.placeName(stay), spots > 0 && tStory("spotsOpen", { count: spots })].filter(Boolean).join(" · ");

  async function run(tool: Tool, action: () => Promise<void>, failed: string) {
    setBusy(tool);
    try {
      await action();
    } catch {
      showToast(failed);
    } finally {
      setBusy(null);
    }
  }

  const copy = () =>
    run(
      "copy",
      async () => {
        await navigator.clipboard.writeText(link("copy"));
        store.track("link_shared", { houseId: stay.id, channel: "copy" });
        showToast(t("linkCopied"));
      },
      tCommon("linkCopyFailed"),
    );

  const story = () =>
    run(
      "story",
      async () => {
        const blob = await renderStoryImage({
          // The House's own photo first; without one, the host's face.
          photoUrl: stayPhotos(stay)[0] ?? host?.photos[0],
          avatarUrl: host?.photos[0],
          title: stay.title,
          meta,
          hostedBy: host ? tStory("hostedBy", { name: host.name.split(" ")[0] }) : "",
          join: tStory("join"),
          scan: tStory("scan"),
          url: link("story", "qr"),
        });
        downloadBlob(blob, `simpulo-${stay.slug}-story.png`);
        store.track("link_shared", { houseId: stay.id, channel: "story" });
        showToast(t("storyDone"));
      },
      t("storyFailed"),
    );

  const tools: { key: Tool; icon: LucideIcon; label: string; hint?: string; busyLabel?: string; onClick: () => void }[] = [
    { key: "copy", icon: Link2, label: t("channels.copy"), onClick: () => void copy() },
    { key: "story", icon: QrCode, label: t("storyButton"), hint: t("storyHint"), busyLabel: t("storyBusy"), onClick: () => void story() },
  ];

  // Two list rows, each a button as a whole (icon, label, hint) – no right-hand label, no boxes, no header action.
  return (
    <DetailSection title={title} className={className}>
      <ul className="divide-y divide-line">
        {tools.map(({ key, icon: Icon, label, hint, busyLabel, onClick }) => (
          <li key={key}>
            <ListRow
              onClick={onClick}
              disabled={busy !== null}
              lead={busy === key ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
              title={busy === key && busyLabel ? busyLabel : label}
              subtitle={hint}
            />
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
