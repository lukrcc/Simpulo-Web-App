"use client";

import { useTranslations } from "next-intl";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Img } from "@/components/ui/Img";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { stageTintStyle } from "@/lib/stageTint";
import { cn } from "@/lib/utils";
import { MEDIA } from "@/config/breakpoints";

/**
 * The main object of a page (a person, a House) as a full-width band (CLAUDE.md "Vollbild-Band für das Hauptobjekt, Karten für Auswählbares"):
 * right under the header, the window's whole width, no rounding, --hero-h high. Left the media – clamp(360px, 30 %, 640px) wide, flush with
 * the header and the window's left edge; right Ember (the global class) to the window's right edge, its content on the page's grid: 56px in
 * from the photo, and on the right flush with the header's content ("Open a House"). `rightColumn`: a column of its own, 360px wide, a 1px
 * cream 10 % line before it. Below 1100px: the photo on top at full width (4:5), Ember under it at full width – neither rounded.
 */
/** The title photo's shape below 1100px, per page (from 1100px it fills the band's height beside the content). */
const MEDIA_FIT = {
  default: "aspect-4/5 md:aspect-3/2 md:max-split:max-h-[55svh]",
  house: "aspect-square md:aspect-3/2 md:max-split:max-h-[45svh]",
  upNext: "aspect-4/5 max-split:max-h-[40svh] md:aspect-3/2",
  profile: "aspect-4/5 max-split:max-h-[45svh] md:aspect-3/2",
} as const;

export function HeroBand({
  media,
  children,
  rightColumn,
  height = "split:h-(--hero-h)",
  mediaWidth = "split:w-[clamp(360px,30%,640px)]",
  footer,
  fullStrip = false,
  mediaFit = "default",
  accent,
  stagePad = false,
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
  /**
   * The stage rule (House page, Your houses): the image and the right side in one row, the image --stage-image-h high (object-cover, not
   * from the content); the footer as a strip across the FULL width under both (its content `band-inset-full`). `height` is then the row's.
   */
  fullStrip?: boolean;
  /**
   * The title photo below 1100px on pages where you act (CLAUDE.md "Titelfotos"): "house" – phones 1:1, tablets 3:2 at most 45 % of the
   * height (title, dates, price and the booking bar on the first screen); "upNext" – at most 40 % (Pay · Reply · Set up on the first screen);
   * "profile" – at most 45 % (name and short text on the first screen); default 4:5 / 3:2 at most 55 %.
   */
  mediaFit?: keyof typeof MEDIA_FIT;
  /** The photo's colour (hex): the stage's surface and strip take a breath of it (lib/stageTint.ts, tokens.css .stage-tinted) */
  accent?: string;
  /** One spacing on the stage (--stage-pad): to the photo, to the right edge, on top and to the strip (the House page) */
  stagePad?: boolean;
  /** The surface right of the photo (default the tint, .stage) */
  stageClassName?: string;
  /** The content's box (e.g. no bottom padding, so the last line sits on the footer) */
  bodyClassName?: string;
  ref?: Ref<HTMLElement>;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  if (fullStrip) {
    const tint = stageTintStyle(accent);
    return (
      <section ref={ref} {...rest} style={{ ...rest.style, ...tint }} className={cn("scroll-mt-14", tint && "stage-tinted", rest.className)}>
        <div className={cn("split:flex", height)}>
          <div className={cn(cn("relative w-full shrink-0 overflow-hidden bg-ink/6 split:aspect-auto split:h-auto split:self-stretch", MEDIA_FIT[mediaFit]), mediaWidth)}>{media}</div>
          <div className={cn("stage flex min-w-0 flex-1 flex-col rounded-none", stageClassName)}>
            <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col md:flex-row", !stagePad && "split:pr-(--band-edge)")}>
              <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col px-6 py-8 sm:px-10", stagePad ? "split:p-(--stage-pad)" : cn("split:py-10 split:pl-14", rightColumn !== undefined ? "split:pr-10" : "split:pr-0"), bodyClassName)}>{children}</div>
              {rightColumn !== undefined && (
                <div className="flex min-w-0 shrink-0 flex-col border-t border-ink/10 px-6 py-8 sm:px-10 md:w-80 md:border-l md:border-t-0 md:pl-8 md:pr-(--page-margin) split:w-90 split:py-10 split:pl-10 split:pr-0">{rightColumn}</div>
              )}
            </div>
          </div>
        </div>
        {/* The strip across the full width – under the image too; the image ends on top of it. */}
        {footer}
      </section>
    );
  }
  return (
    <section ref={ref} {...rest} className={cn("scroll-mt-14 split:flex", height, rest.className)}>
      {/* Stretched to the band's height (also when the band is only as high as its content, with a min-height – height: 100 % would collapse). */}
      <div className={cn(cn("relative w-full shrink-0 overflow-hidden bg-ink/6 split:aspect-auto split:h-auto split:self-stretch", MEDIA_FIT[mediaFit]), mediaWidth)}>{media}</div>
      <div className={cn("stage flex min-w-0 flex-1 flex-col rounded-none", stageClassName)}>
        {/* The right inner edge: where the header's content ends (--band-edge, globals.css). */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row split:pr-(--band-edge)">
          <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col px-6 py-8 sm:px-10 split:py-10 split:pl-14", rightColumn !== undefined ? "split:pr-10" : "split:pr-0", bodyClassName)}>{children}</div>
          {rightColumn !== undefined && (
            <div className="flex min-w-0 shrink-0 flex-col border-t border-ink/10 px-6 py-8 sm:px-10 md:w-80 md:border-l md:border-t-0 md:pl-8 md:pr-(--page-margin) split:w-90 split:py-10 split:pl-10 split:pr-0">
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
export function HeroPhotos({ photos, onOpen, eager = true, captions }: { photos: string[]; onOpen?: (index: number) => void; eager?: boolean; /** One short line per photo, at its bottom (the profile) */ captions?: readonly string[] }) {
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
            <Img src={src} alt="" fill sizes={`${MEDIA.desktop} 640px, 100vw`} loading={eager && i === 0 ? "eager" : undefined} className="object-cover object-[center_30%]" />
            {captions?.[i] && (
              // The photo's line: bottom left over a soft shade of the photo (photo gradients are allowed), white, above the dots.
              <span className="absolute inset-x-0 bottom-0 flex h-28 items-end bg-linear-to-t from-shade/55 to-transparent px-5 pb-10 text-left">
                <span className="line-clamp-1 text-body font-semibold text-on-image [text-shadow:0_1px_2px_rgba(0,0,0,.25)]">{captions[i]}</span>
              </span>
            )}
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
