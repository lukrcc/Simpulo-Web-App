"use client";

import { ArrowLeft, BadgeCheck, Share2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { CardTab } from "@/components/ui/CardTab";
import { glassCircle, imageGradient } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { SocialRow } from "@/components/ui/SocialRow";
import { useFormat } from "@/i18n/format";
import type { User } from "@/lib/types";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "./PhotoLightbox";

const MAX_PHOTOS = 5;

interface HostGalleryProps {
  host: User;
  onBack: () => void;
  onShare: () => void;
}

/** Mobile/tablet: full-width carousel of the host's portraits with their identity overlaid. */
export function HostGallery({ host, onBack, onShare }: HostGalleryProps) {
  const t = useTranslations("house.gallery");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const photos = host.photos.slice(0, MAX_PHOTOS);
  const { ref, active, onScroll } = useSnapCarousel<HTMLDivElement>(photos.length);

  return (
    <div className="relative isolate aspect-4/5 overflow-hidden bg-neutral-200 md:aspect-video md:rounded-4xl">
      <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
        {photos.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center snap-always">
            <Img
              src={src}
              alt={i === 0 ? host.name : t("photoAlt", { name: host.name, number: i + 1 })}
              fill
              preload={i === 0}
              sizes="(min-width: 768px) 700px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/35 to-transparent" />
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-2/3", imageGradient)} />

      <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} aria-label={tCommon("back")} className={cn(glassCircle, "md:invisible")}>
          <ArrowLeft className="size-5" />
        </button>
        <button type="button" onClick={onShare} aria-label={t("share")} className={glassCircle}>
          <Share2 className="size-5" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-9 text-white">
        <Link href={`/u/${host.id}`} className="pointer-events-auto inline-flex items-center gap-2">
          <span className="text-3xl font-bold tracking-tight">
            {host.name}
          </span>
          {host.verified && <BadgeCheck className="size-6 shrink-0" aria-label={t("verified")} />}
        </Link>
        <p className="mt-1 text-sm text-white/85">
          {t("identity", { ageAndCountry: format.ageAndCountry(host), languages: host.languages.join(", ") })}
        </p>
        <SocialRow user={host} className="pointer-events-auto mt-4" />
      </div>

      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
          {photos.map((src, i) => (
            <span key={src} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
          ))}
        </div>
      )}
    </div>
  );
}

const tile = "relative block size-full overflow-hidden bg-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

/**
 * Desktop: main photo left (60%), two stacked right (40%) – at most 520px tall. Any photo opens the lightbox.
 * The notched tab top-left links to the host's profile.
 */
export function HostPhotoGrid({ host, onShare }: Omit<HostGalleryProps, "onBack">) {
  const t = useTranslations("house.gallery");
  const photos = host.photos.slice(0, MAX_PHOTOS);
  const [open, setOpen] = useState<number | null>(null);
  const [main, ...side] = photos.slice(0, 3);
  const extra = photos.length - 3;

  return (
    <div className="relative isolate aspect-3/2 max-h-[520px] w-full overflow-hidden rounded-[28px] bg-neutral-200">
      {main && (
        <div className={cn("grid size-full gap-2", side.length > 0 && "grid-cols-[3fr_2fr]")}>
          <Tile src={main} alt={host.name} onOpen={() => setOpen(0)} preload sizes="(min-width: 1600px) 480px, 35vw" />
          {side.length > 0 && (
            <div className={cn("grid min-h-0 gap-2", side.length > 1 && "grid-rows-2")}>
              {side.map((src, i) => (
                <Tile key={src} src={src} alt={t("photoAlt", { name: host.name, number: i + 2 })} onOpen={() => setOpen(i + 1)} sizes="(min-width: 1600px) 320px, 23vw">
                  {i === side.length - 1 && extra > 0 && (
                    <span className="glass-dark absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-medium">+{extra}</span>
                  )}
                </Tile>
              ))}
            </div>
          )}
        </div>
      )}

      <CardTab host={host} linked />
      <button type="button" onClick={onShare} aria-label={t("share")} className={cn(glassCircle, "absolute right-4 top-4 z-10")}>
        <Share2 className="size-5" />
      </button>

      <PhotoLightbox photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} alt={host.name} />
    </div>
  );
}

interface TileProps {
  src: string;
  alt: string;
  onOpen: () => void;
  sizes: string;
  preload?: boolean;
  children?: ReactNode;
}

function Tile({ src, alt, onOpen, sizes, preload = false, children }: TileProps) {
  const t = useTranslations("house.gallery");
  return (
    <button type="button" onClick={onOpen} aria-label={t("open", { alt })} className={cn(tile, "group")}>
      <Img src={src} alt="" fill preload={preload} sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      {children}
    </button>
  );
}
