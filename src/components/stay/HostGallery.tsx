"use client";

import { ArrowLeft, Check, Share2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { CardTab } from "@/components/ui/CardTab";
import { NotchedCard } from "@/components/ui/NotchedCard";
import { glassCircle, imageGradient } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { pressFeedback } from "@/components/ui/pressFeedback";
import { SocialRow } from "@/components/ui/SocialRow";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { stageTransition } from "@/lib/houseTransition";
import type { User } from "@/lib/types";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "./PhotoLightbox";

const MAX_PHOTOS = 5;

interface HostGalleryProps {
  host: User;
  /** The House, for the transition from its card */
  stayId: string;
  /** The House's photos, the cover first: the card's image grows into it (see housePhotos) */
  photos: string[];
  onBack: () => void;
  onShare: () => void;
  /** The link was just copied: a check mark instead of the share icon */
  shareCopied?: boolean;
}

/** Mobile/tablet: full-width carousel of the House's photos with the host's identity overlaid. */
export function HostGallery({ host, stayId, photos: allPhotos, onBack, onShare, shareCopied = false }: HostGalleryProps) {
  const t = useTranslations("house.gallery");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const photos = allPhotos.slice(0, MAX_PHOTOS);
  const { ref, active, onScroll } = useSnapCarousel<HTMLDivElement>(photos.length);

  return (
    <div className="relative isolate aspect-4/5 overflow-hidden bg-line md:aspect-video md:rounded-[28px]">
      <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
        {photos.map((src, i) => (
          <div key={src} {...(i === 0 && { "data-house-stage-image": true, style: stageTransition("image", stayId) })} className="relative h-full w-full shrink-0 snap-center snap-always">
            <Img
              src={src}
              alt={t("photoAlt", { name: host.name, number: i + 1 })}
              fill
              preload={i === 0}
              sizes="(min-width: 768px) 700px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/35 to-transparent" />
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-2/3", imageGradient)} />

      <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} aria-label={tCommon("back")} className={cn(glassCircle, "md:invisible")}>
          <ArrowLeft className="size-5" />
        </button>
        <button type="button" onClick={(e) => sharePressed(e, onShare)} aria-label={t("share")} className={cn("press-feedback", glassCircle)}>
          {shareCopied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" />}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-9 text-white">
        <Link href={`/u/${host.id}`} className="pointer-events-auto inline-flex items-center gap-1">
          <span className="text-h2 tracking-tight">
            {host.name}
          </span>
          {host.verified && <VerifiedBadge onDark />}
        </Link>
        <p className="mt-1 text-small text-white/85">
          {t("identity", { ageAndCountry: format.ageAndCountry(host), languages: host.languages.join(", ") })}
        </p>
        <SocialRow user={host} className="pointer-events-auto mt-4" />
      </div>

      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
          {photos.map((src, i) => (
            <span key={src} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-4 bg-surface" : "w-1.5 bg-white/50")} />
          ))}
        </div>
      )}
    </div>
  );
}

const tile = "relative block size-full overflow-hidden bg-line outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

/**
 * Desktop: main photo left (60%), two stacked right (40%) – at most 520px tall. Any photo opens the lightbox.
 * The notched tab top-left links to the host's profile.
 */
export function HostPhotoGrid({ host, stayId, photos: allPhotos, onShare, shareCopied = false }: Omit<HostGalleryProps, "onBack">) {
  const t = useTranslations("house.gallery");
  const photos = allPhotos.slice(0, MAX_PHOTOS);
  const [open, setOpen] = useState<number | null>(null);
  const [main, ...side] = photos.slice(0, 3);
  const extra = photos.length - 3;

  return (
    <>
      {/* One clipped silhouette notched around the host tab (the lightbox stays outside – the clip would cut it). */}
      <NotchedCard className="aspect-3/2 max-h-[520px] w-full" clipClassName="rounded-[28px] bg-line" tab={<CardTab host={host} linked style={stageTransition("host", stayId)} />}>
        {main && (
          <div className={cn("grid size-full gap-2", side.length > 0 && "grid-cols-[3fr_2fr]")}>
            <Tile src={main} alt={t("photoAlt", { name: host.name, number: 1 })} onOpen={() => setOpen(0)} preload sizes="(min-width: 1600px) 480px, 35vw" transition={stageTransition("image", stayId)} />
            {side.length > 0 && (
              <div className={cn("grid min-h-0 gap-2", side.length > 1 && "grid-rows-2")}>
                {side.map((src, i) => (
                  <Tile key={src} src={src} alt={t("photoAlt", { name: host.name, number: i + 2 })} onOpen={() => setOpen(i + 1)} sizes="(min-width: 1600px) 320px, 23vw">
                    {i === side.length - 1 && extra > 0 && (
                      <span className="glass-dark absolute bottom-3 right-3 rounded-full px-3 py-1 text-small font-medium">+{extra}</span>
                    )}
                  </Tile>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={(e) => sharePressed(e, onShare)} aria-label={t("share")} className={cn("press-feedback", glassCircle, "absolute right-4 top-4 z-10")}>
          {shareCopied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" />}
        </button>
      </NotchedCard>
      <PhotoLightbox photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} alt={host.name} />
    </>
  );
}

interface TileProps {
  src: string;
  alt: string;
  onOpen: () => void;
  sizes: string;
  preload?: boolean;
  children?: ReactNode;
  /** The main photo: what the card's image grows into */
  transition?: CSSProperties;
}

function Tile({ src, alt, onOpen, sizes, preload = false, children, transition }: TileProps) {
  const t = useTranslations("house.gallery");
  return (
    <button type="button" onClick={onOpen} aria-label={t("open", { alt })} style={transition} data-house-stage-image={transition ? true : undefined} className={cn(tile, "group")}>
      <Img src={src} alt={alt} fill preload={preload} sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      {children}
    </button>
  );
}

/** The share button presses in (like the cards'), then shares. */
function sharePressed(e: MouseEvent<HTMLButtonElement>, onShare: () => void) {
  pressFeedback(e.currentTarget);
  onShare();
}
