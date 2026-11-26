"use client";

// The host kit (CLAUDE.md "Host-Kit"): ready words and pictures for each House – a story (the 1080×1920 image + a caption), a bio link (the
// link + its QR code) and a community post (the text + the 1200×630 card) – filled from the House as it is, each with Copy and Download.
// Every link carries ?ref={host}&src=hostkit (and the piece as utm_medium: story · bio · post), so Admin › Wachstum counts it.
// In the House area › Manage (one House) and in Earnings (a pick of your open Houses).
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { downloadQrPng, SimpuloQR } from "@/components/SimpuloQR";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl } from "@/lib/growth";
import { findUser, useStore } from "@/lib/store";
import { shortNameOf } from "@/lib/shortName";
import type { Stay } from "@/lib/types";
import { housePhotos, openSpots } from "@/lib/utils";
import { downloadBlob, renderStoryImage } from "./storyImage";
import { copyText } from "@/lib/clipboard";

type Piece = "story" | "bio" | "post";

export function HostKit({ stays, title }: { stays: readonly Stay[]; /** A heading of its own (Earnings) */ title?: string }) {
  const t = useTranslations("hostKit");
  const [pickedId, setPickedId] = useState(stays[0]?.id ?? "");
  const stay = stays.find((s) => s.id === pickedId) ?? stays[0];
  if (!stay) return null;
  return (
    <section data-host-kit aria-label={t("title")}>
      {title && <h2 className="text-subhead text-ink">{title}</h2>}
      <p className={title ? "mt-2 text-body text-muted" : "text-body text-muted"}>{t("intro")}</p>
      {stays.length > 1 && (
        <div className="mt-4">
          <CapsuleGroup size="sm" label={t("pick")} value={stay.id} onChange={setPickedId} options={stays.map((s) => ({ value: s.id, content: shortNameOf(s) }))} />
        </div>
      )}
      <KitFor key={stay.id} stay={stay} />
    </section>
  );
}

function KitFor({ stay }: { stay: Stay }) {
  const t = useTranslations("hostKit");
  const tStory = useTranslations("growth.story");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const host = findUser(store, stay.hostId);
  const [busy, setBusy] = useState<Piece | null>(null);
  const [copied, setCopied] = useState<Piece | null>(null);
  const qr = useRef<SVGSVGElement>(null);
  const spots = openSpots(stay);
  const link = (piece: Piece) => shareUrl(`/house/${stay.slug}`, { refUserId: store.currentUserId, channel: "hostkit", medium: piece });
  const values = { title: stay.title, place: f.placeName(stay), dates: f.stayDates(stay), spots };
  const texts: Record<Piece, string> = {
    story: t("story.caption", { ...values, url: link("story") }),
    bio: link("bio"),
    // Without the host's line the empty paragraph goes.
    post: t("post.text", { ...values, note: stay.hostNote?.trim() || "", url: link("post") }).replace(/\n{3,}/g, "\n\n"),
  };

  async function copy(piece: Piece) {
    try {
      await copyText(texts[piece]);
      setCopied(piece);
      window.setTimeout(() => setCopied((p) => (p === piece ? null : p)), 1600);
      store.track("link_shared", { houseId: stay.id, channel: "hostkit" });
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }
  async function download(piece: Piece) {
    setBusy(piece);
    try {
      if (piece === "story") {
        const meta = [f.stayDatesLong(stay), f.placeName(stay), spots > 0 && tStory("spotsOpen", { count: spots })].filter(Boolean).join(" · ");
        const blob = await renderStoryImage({
          photoUrl: housePhotos(stay)[0] ?? host?.photos[0],
          avatarUrl: host?.photos[0],
          title: stay.title,
          meta,
          hostedBy: host ? tStory("hostedBy", { name: host.name.split(" ")[0] }) : "",
          join: tStory("join"),
          scan: tStory("scan"),
          url: link("story"),
        });
        downloadBlob(blob, `simpulo-${stay.slug}-story.png`);
      } else if (piece === "bio") {
        if (qr.current) await downloadQrPng(qr.current, `simpulo-${stay.slug}-qr`, 1024);
      } else {
        // The House's link card (app/house/[slug]/opengraph-image.tsx) – the same picture a chat shows under the link.
        const res = await fetch(`/house/${stay.slug}/opengraph-image`);
        if (!res.ok) throw new Error("card");
        downloadBlob(await res.blob(), `simpulo-${stay.slug}-post.png`);
      }
      showToast(t("downloaded"));
    } catch {
      showToast(t("downloadFailed"));
    } finally {
      setBusy(null);
    }
  }

  const piece = (key: Piece, preview: ReactNode) => (
    <li key={key} data-kit-piece={key} className="flex flex-col gap-3 py-5">
      <div>
        <p className="text-body font-semibold text-ink">{t(`${key}.title`)}</p>
        <p className="text-small text-muted">{t(`${key}.hint`)}</p>
      </div>
      {preview}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copy(key)}>
          {copied === key ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied === key ? t("copied") : t(`${key}.copy`)}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void download(key)} disabled={busy === key}>
          {busy === key ? <Loader2 aria-hidden className="animate-spin" /> : <Download aria-hidden />}
          {t(`${key}.download`)}
        </Button>
      </div>
    </li>
  );

  return (
    <ul className="mt-2 divide-y divide-ink/8">
      {piece("story", <p className="max-w-[60ch] whitespace-pre-line rounded-2xl bg-ink/4 px-4 py-3 text-body text-ink">{texts.story}</p>)}
      {piece(
        "bio",
        <div className="flex items-center gap-4">
          <div className="shrink-0 rounded-2xl bg-stage-text p-2">
            <SimpuloQR url={texts.bio} size={88} svgRef={qr} />
          </div>
          <p className="min-w-0 break-all text-small text-ink">{texts.bio}</p>
        </div>,
      )}
      {piece("post", <p className="max-w-[60ch] whitespace-pre-line rounded-2xl bg-ink/4 px-4 py-3 text-body text-ink">{texts.post}</p>)}
    </ul>
  );
}
