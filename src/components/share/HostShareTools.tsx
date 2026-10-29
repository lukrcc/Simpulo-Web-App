"use client";

import { Download, Link2, Loader2, Printer, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl, type ShareChannel } from "@/lib/growth";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn, stayPhotos } from "@/lib/utils";
import { downloadBlob, renderPosterPdf, renderStoryImage } from "./storyImage";

type Tool = "copy" | "story" | "poster";

/**
 * "Share your House" – the host's tools on their own House page (guests never see them): copy the link, download the
 * story image (1080×1920: House photo, title, dates · place, host face, wordmark, QR) and print the QR poster (A4
 * PDF). Every link carries the host's ref and its channel, like the share sheet.
 */
export function HostShareTools({ stay, className }: { stay: Stay; className?: string }) {
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
  const meta = `${f.longRange(stay.startDate, stay.endDate)} · ${f.placeName(stay)}`;

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
        showToast(tCommon("linkCopied"));
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

  const poster = () =>
    run(
      "poster",
      async () => {
        const url = link("poster", "qr");
        const blob = await renderPosterPdf({ title: stay.title, meta, scan: tStory("scan"), url, shortUrl: new URL(path, url).host + path });
        downloadBlob(blob, `simpulo-${stay.slug}-poster.pdf`);
        store.track("link_shared", { houseId: stay.id, channel: "poster" });
        showToast(t("posterDone"));
      },
      t("posterFailed"),
    );

  const tools: { key: Tool; icon: LucideIcon; label: string; hint?: string; busyLabel?: string; onClick: () => void }[] = [
    { key: "copy", icon: Link2, label: t("channels.copy"), onClick: () => void copy() },
    { key: "story", icon: Download, label: t("storyButton"), hint: t("storyHint"), busyLabel: t("storyBusy"), onClick: () => void story() },
    { key: "poster", icon: Printer, label: t("posterButton"), hint: t("posterHint"), busyLabel: t("posterBusy"), onClick: () => void poster() },
  ];

  return (
    <section aria-labelledby="share-your-house" className={cn("rounded-[24px] bg-white p-6", className)}>
      <h2 id="share-your-house" className="text-lg font-semibold">
        {t("hostTitle")}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">{t("hostText")}</p>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tools.map(({ key, icon: Icon, label, hint, busyLabel, onClick }) => (
          <li key={key}>
            <button
              type="button"
              onClick={onClick}
              disabled={busy !== null}
              className="flex h-full w-full items-start gap-3 rounded-2xl bg-page px-4 py-3 text-left text-ink transition-colors hover:bg-zinc-200/60 disabled:opacity-60"
            >
              {busy === key ? <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden /> : <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{busy === key && busyLabel ? busyLabel : label}</span>
                {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
