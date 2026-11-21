"use client";

// The one way to show a video from elsewhere (YouTube, Vimeo …) – CLAUDE.md "Speicherung und Tracker": nothing loads from the other site
// until the person taps. Until then a local preview image with a play button and "Loads from youtube-nocookie.com". After the tap the player
// (an iframe, or a video file). Our own files in public/ may play directly with <video> – they don't reach anyone else.
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Img } from "@/components/ui/Img";

/** YouTube links become the privacy-enhanced host (no cookies before playing). */
function embedUrl(src: string): string {
  try {
    const url = new URL(src);
    const id = url.hostname.endsWith("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v");
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname) && id) return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    return src;
  } catch {
    return src;
  }
}

export function VideoEmbed({ src, poster, title, className }: { src: string; /** A local image (public/) */ poster: string; title: string; className?: string }) {
  const t = useTranslations("video");
  const [playing, setPlaying] = useState(false);
  const isFile = /\.(mp4|webm|mov)(\?|$)/i.test(src);
  const url = isFile ? src : embedUrl(src);
  let host = "";
  try {
    host = new URL(url, "https://simpulo.app").hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-[20px] bg-stage ${className ?? ""}`}>
      {playing ? (
        isFile ? (
          <video src={url} controls autoPlay playsInline className="size-full object-cover" title={title} />
        ) : (
          <iframe src={url} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="size-full border-0" />
        )
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 flex flex-col items-center justify-center gap-3 text-on-image" aria-label={t("play", { title })}>
          <Img src={poster} alt="" fill sizes="(min-width: 744px) 60vw, 100vw" className="object-cover" />
          <span className="on-image relative flex size-16 items-center justify-center rounded-full">
            <Play className="size-7 translate-x-0.5" fill="currentColor" aria-hidden />
          </span>
          {host && <span className="relative text-small font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">{t("loadsFrom", { host })}</span>}
        </button>
      )}
    </div>
  );
}
