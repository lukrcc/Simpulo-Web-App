"use client";

import { Check, ChevronLeft, ChevronRight, ArrowLeft, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AvatarStack } from "@/components/ui/Avatar";
import { CardTab } from "@/components/ui/CardTab";
import { CrewLine } from "@/components/ui/CrewLine";
import { cardTextShadow, glassCircle } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { NotchedCard } from "@/components/ui/NotchedCard";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { pressFeedback } from "@/components/ui/pressFeedback";
import { useFormat } from "@/i18n/format";
import { stageTransition } from "@/lib/houseTransition";
import type { Stay, User } from "@/lib/types";
import { cn, stayNights } from "@/lib/utils";
import { PhotoLightbox } from "./PhotoLightbox";

/** A drag or swipe this long changes the photo; anything shorter is a click. */
const SWIPE_PX = 40;

interface HouseStageProps {
  stay: Stay;
  host: User;
  crew: User[];
  /** The cover first: the card's image grows into it */
  photos: string[];
  /** Top right, after the share button: the heart and "…" */
  save: ReactNode;
  menu?: ReactNode;
  onShare: () => void;
  shareCopied: boolean;
  /** Phones: the way back (no header there) */
  onBack: () => void;
  /** The page's one main action, in whichever state it is */
  cta: ReactNode;
  /** "Message {Host}" beside it */
  message?: ReactNode;
}

/**
 * The House page's stage: the cover at full width with everything to decide on it, without scrolling. Bottom left what it
 * is, bottom right what it costs and the main action, on one baseline (under each other below 1100px). Photos change by a
 * 300ms crossfade, arrows or swipe; a click opens the gallery.
 */
export function HouseStage({ stay, host, crew, photos, save, menu, onShare, shareCopied, onBack, cta, message }: HouseStageProps) {
  const t = useTranslations("house.page");
  const format = useFormat();
  const price = useViewerPriceLabel(stay);
  const [active, setActive] = useState(0);
  const [gallery, setGallery] = useState(false);
  const count = photos.length;
  const step = (by: number) => setActive((i) => (i + by + count) % count);
  const drag = useRef<number | null>(null);
  const swiped = useRef(false);

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    drag.current = e.clientX;
    swiped.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (drag.current === null) return;
    const moved = e.clientX - drag.current;
    drag.current = null;
    if (Math.abs(moved) < SWIPE_PX) return;
    swiped.current = true;
    if (count > 1) step(moved < 0 ? 1 : -1);
  }
  const category = stay.customVibe ?? format.vibe(stay.vibe);

  return (
    <>
      <NotchedCard
        className="grid min-h-[clamp(420px,60vh,640px)]"
        clipClassName="rounded-3xl bg-ink"
        tab={
          <>
            <CardTab host={host} linked style={stageTransition("host", stay.id)} />
            {/* Outside the clip: the "…" menu opens below its circle. */}
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2 md:right-4 md:top-4">
              <button type="button" onClick={onBack} aria-label={t("back")} className={cn(glassCircle, "md:hidden")}>
                <ArrowLeft className="size-5" aria-hidden />
              </button>
              {save}
              <button
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  pressFeedback(e.currentTarget);
                  onShare();
                }}
                aria-label={t("share")}
                className={cn("press-feedback", glassCircle)}
              >
                {shareCopied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
              </button>
              {menu}
            </div>
          </>
        }
      >
        <button
          type="button"
          aria-label={t("openGallery")}
          onClick={() => !swiped.current && setGallery(true)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 block touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <span data-house-stage-image style={stageTransition("image", stay.id)} className="absolute inset-0 block">
            {photos.map((src, i) => (
              <Img
                key={src}
                src={src}
                alt={i === active ? t("photoAlt", { title: stay.title, number: i + 1 }) : ""}
                fill
                preload={i === 0}
                sizes="(min-width: 1680px) 1680px, 100vw"
                draggable={false}
                style={i === 0 && stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined}
                className={cn("object-cover transition-opacity duration-300 motion-reduce:transition-none", i === active ? "opacity-100" : "opacity-0")}
              />
            ))}
          </span>
        </button>
        {/* From the bottom left, 60 % of the way; the second layer, from the bottom right, carries the price on a bright photo. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(0,0,0,0.72),rgba(0,0,0,0)_60%),linear-gradient(to_top_left,rgba(0,0,0,0.72),rgba(0,0,0,0)_50%)]" />

        {/* Only the controls take the pointer: everywhere else a click or swipe reaches the photo. */}
        <div className={cn("pointer-events-none relative flex min-h-[clamp(420px,60vh,640px)] flex-col justify-end gap-6 p-5 pt-20 text-white md:p-8 md:pt-24 split:flex-row split:items-end split:justify-between split:gap-10", cardTextShadow)}>
          <div className="min-w-0 max-w-[640px]">
            <p className="text-eyebrow uppercase text-white/85">{category}</p>
            <h1 style={stageTransition("title", stay.id)} className="mt-2 text-display">
              {stay.title}
            </h1>
            <p className="mt-3 text-body-lg text-white/85">
              {t("line", { dates: format.longRange(stay.startDate, stay.endDate), nights: format.nights(stayNights(stay)), place: format.placeLabel(stay) })}
            </p>
            <div className="pointer-events-auto mt-4 flex w-fit items-center gap-3">
              <AvatarStack users={crew} size="sm" max={6} linked />
              <CrewLine stay={stay} onDark />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-4 split:items-end">
            {count > 1 && (
              <div className="pointer-events-auto flex items-center gap-2 max-split:hidden">
                <span className="mr-1 text-small tabular-nums text-white/85">{t("photoCount", { current: active + 1, total: count })}</span>
                <button type="button" onClick={() => step(-1)} aria-label={t("previousPhoto")} className={glassCircle}>
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button type="button" onClick={() => step(1)} aria-label={t("nextPhoto")} className={glassCircle}>
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </div>
            )}
            <div className="split:text-right">
              <p className="text-h2">{price}</p>
              <p className="mt-1 text-small text-white/75">{t("payNote")}</p>
            </div>
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 [text-shadow:none] split:justify-end">
              {cta}
              {message}
            </div>
          </div>
        </div>
      </NotchedCard>
      {gallery && <HouseGallery photos={photos} title={stay.title} onClose={() => setGallery(false)} />}
    </>
  );
}

/** All the photos as a grid, over everything. A photo opens it large; Escape closes the large one first, then this. */
function HouseGallery({ photos, title, onClose }: { photos: string[]; title: string; onClose: () => void }) {
  const t = useTranslations("house.page");
  const [large, setLarge] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      opener?.focus();
    };
  }, []);
  useEffect(() => {
    if (large !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [large, onClose]);

  return createPortal(
    <div role="dialog" aria-modal aria-label={t("galleryTitle", { title })} className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="page-container py-(--space-inner)">
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-h3 text-ink">{title}</p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("closeGallery")} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-ink hover:bg-bg">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ul className="card-grid mt-(--space-inner) [--card-cols:3] [--card-min:280px]">
          {photos.map((src, i) => (
            <li key={src}>
              <button type="button" onClick={() => setLarge(i)} aria-label={t("photoAlt", { title, number: i + 1 })} className="relative block aspect-4/3 w-full overflow-hidden rounded-3xl bg-line outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                <Img src={src} alt="" fill sizes="(min-width: 1100px) 33vw, 100vw" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <PhotoLightbox photos={photos} index={large} onIndexChange={setLarge} onClose={() => setLarge(null)} alt={title} />
    </div>,
    document.body,
  );
}
