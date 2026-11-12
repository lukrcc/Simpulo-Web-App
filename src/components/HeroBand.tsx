"use client";

import { useTranslations } from "next-intl";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Img } from "@/components/ui/Img";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn } from "@/lib/utils";

/**
 * The main object of a page (a person, a House) as a full-width band (CLAUDE.md "Vollbild-Band für das Hauptobjekt, Karten für Auswählbares"):
 * right under the header, the window's whole width, no rounding, --hero-h high. Left the media – clamp(360px, 30 %, 640px) wide, flush with
 * the header and the window's left edge; right Ember (the global class) to the window's right edge, its content on the page's grid: 56px in
 * from the photo, and on the right flush with the header's content ("Open a House"). `rightColumn`: a column of its own, 360px wide, a 1px
 * cream 10 % line before it. Below 1100px: the photo on top at full width (4:5), Ember under it at full width – neither rounded.
 */
export function HeroBand({
  media,
  children,
  rightColumn,
  height = "split:h-(--hero-h)",
  mediaWidth = "split:w-[clamp(360px,30%,640px)]",
  footer,
  stageClassName,
  bodyClassName,
  ref,
  ...rest
}: {
  media: ReactNode;
  children: ReactNode;
  rightColumn?: ReactNode;
  /** Its height from 1100px (a class); the profile: clamp(380px, 54vh, 540px) */
  height?: string;
  /** The media's width from 1100px (a class) */
  mediaWidth?: string;
  /** Across the whole Ember at its foot, its content on the grid (`band-inset` gives the inner edges) */
  footer?: ReactNode;
  /** The surface right of the photo (default the tint, .stage) */
  stageClassName?: string;
  /** The content's box (e.g. no bottom padding, so the last line sits on the footer) */
  bodyClassName?: string;
  ref?: Ref<HTMLElement>;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return (
    <section ref={ref} {...rest} className={cn("scroll-mt-14 split:flex", height, rest.className)}>
      {/* Stretched to the band's height (also when the band is only as high as its content, with a min-height – height: 100 % would collapse). */}
      <div className={cn("relative aspect-4/5 w-full shrink-0 overflow-hidden bg-ink/6 split:aspect-auto split:h-auto split:self-stretch", mediaWidth)}>{media}</div>
      <div className={cn("stage flex min-w-0 flex-1 flex-col rounded-none", stageClassName)}>
        {/* The right inner edge: where the header's content ends (--band-edge, globals.css). */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col split:flex-row split:pr-(--band-edge)">
          <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col px-6 py-8 sm:px-10 split:py-10 split:pl-14", rightColumn !== undefined ? "split:pr-10" : "split:pr-0", bodyClassName)}>{children}</div>
          {rightColumn !== undefined && (
            <div className="flex min-w-0 shrink-0 flex-col border-t border-ink/10 px-6 py-8 sm:px-10 split:w-90 split:border-l split:border-t-0 split:py-10 split:pl-10 split:pr-0">
              {rightColumn}
            </div>
          )}
        </div>
        {/* A footer across the whole Ember – from the photo's edge to the window's – its content on the grid (Your houses: Payouts). */}
        {footer}
      </div>
    </section>
  );
}

/**
 * The band's photos: they fill the media area (object-cover), swipe or drag, the dots at the bottom; `onOpen`: a click opens the gallery.
 * No name and no rounding on them.
 */
export function HeroPhotos({ photos, onOpen, eager = true }: { photos: string[]; onOpen?: (index: number) => void; eager?: boolean }) {
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const { ref, active, onScroll, scrollTo } = useSnapCarousel<HTMLDivElement>(photos.length);
  const drag = usePhotoDrag(ref, active, scrollTo, photos.length > 1);
  return (
    <div className="absolute inset-0 bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to)">
      <div ref={ref} onScroll={onScroll} {...drag.props} className={cn("no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto", drag.className)}>
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => !drag.dragged() && onOpen?.(i)}
            aria-label={t("openPhoto", { index: i + 1 })}
            aria-hidden={i !== active || undefined}
            tabIndex={i === active ? 0 : -1}
            data-no-tooltip
            className="relative block h-full w-full shrink-0 snap-center snap-always outline-none"
          >
            <Img src={src} alt="" fill sizes="(min-width: 1100px) 640px, 100vw" loading={eager && i === 0 ? "eager" : undefined} className="object-cover object-[center_30%]" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          {photos.map((src, i) => (
            <button key={src} type="button" onClick={() => scrollTo(i)} aria-label={tv("showPhoto", { number: i + 1, count: photos.length })} aria-current={i === active || undefined} data-no-tooltip className="flex h-5 items-center px-0.5">
              <span className={cn("block h-1 rounded-full transition-all", i === active ? "w-3 bg-on-image" : "w-1 bg-on-image/60")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
