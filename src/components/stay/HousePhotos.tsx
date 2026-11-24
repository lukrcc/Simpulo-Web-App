"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type KeyboardEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { MEDIA } from "@/config/breakpoints";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "./PhotoLightbox";

/** Once per device (config/storage.ts): the hint that the photo slides on has been shown. */
const HINT_KEY = "simpulo:house-photo-hint";

/**
 * The House page's large photo (CLAUDE.md "Bilder in Karten und auf der House-Seite"): no auto-advance; arrows left and right on hover (dark
 * glass like the rows' arrows, always on touch), ← → when the photo has the focus; at the bottom a small counter "1 / 5" in dark glass instead
 * of dots; a click opens the full-screen gallery (PhotoLightbox – Esc closes). The first House page on a device: the photo glides ~40px to the
 * left and back (600ms) to show there's more – then never again (localStorage); with reduced motion not at all.
 */
export function HousePhotos({ photos, title }: { photos: string[]; title: string }) {
  const t = useTranslations("house.lightbox");
  const tGallery = useTranslations("house.gallery");
  const { ref, active, onScroll, scrollTo, step } = useSnapCarousel<HTMLDivElement>(photos.length);
  const drag = usePhotoDrag(ref, active, scrollTo, photos.length > 1);
  const [open, setOpen] = useState<number | null>(null);
  const [nudge, setNudge] = useState(false);
  const many = photos.length > 1;

  useEffect(() => {
    if (!many || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch {
      return;
    }
    // A moment after the page settled, so it's seen – and only then marked as shown (an effect run that's cleaned up first never counts).
    const start = window.setTimeout(() => {
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch {
        /* storage blocked: then it shows again next time */
      }
      setNudge(true);
    }, 700);
    const end = window.setTimeout(() => setNudge(false), 1400);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [many]);

  // ← → also without the focus on the photo: while it's on screen, nothing typed into and no window open over it.
  useEffect(() => {
    if (!many || open !== null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (ref.current?.contains(target)) return;
      if (document.documentElement.dataset.dialogOpen !== undefined || document.querySelector("[role=dialog][aria-modal=true]")) return;
      const box = ref.current?.getBoundingClientRect();
      if (!box || box.bottom <= 0 || box.top >= window.innerHeight) return;
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [many, open, step, ref]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!many) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <div className="group/photos absolute inset-0 bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to)" onKeyDown={onKeyDown}>
      <div
        ref={ref}
        onScroll={onScroll}
        {...drag.props}
        // The mouse drag captures the pointer, so a click lands on the strip, not on a photo: open the one in view (not after a drag).
        onClick={() => !drag.dragged() && setOpen(active)}
        role="region"
        aria-roledescription="carousel"
        aria-label={t("label", { name: title })}
        tabIndex={0}
        className={cn("no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-inset", nudge && "photo-nudge", drag.className)}
      >
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!drag.dragged()) setOpen(i);
            }}
            aria-label={tGallery("open", { alt: tGallery("photoAlt", { name: title, number: i + 1 }) })}
            aria-hidden={i !== active || undefined}
            tabIndex={-1}
            data-no-tooltip
            className="relative block h-full w-full shrink-0 cursor-zoom-in snap-center snap-always outline-none"
          >
            <Img src={src} alt="" fill sizes={`${MEDIA.desktop} 640px, 100vw`} loading={i === 0 ? "eager" : undefined} className="object-cover object-[center_30%]" />
          </button>
        ))}
      </div>
      {many && (
        <>
          <IconButton
            variant="onImage"
            size="lg"
            aria-label={t("previous")}
            onClick={() => step(-1)}
            className={cn("spot-arrow absolute left-4 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/photos:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100", active === 0 && "invisible")}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </IconButton>
          <IconButton
            variant="onImage"
            size="lg"
            aria-label={t("next")}
            onClick={() => step(1)}
            className={cn("spot-arrow absolute right-4 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/photos:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100", active === photos.length - 1 && "invisible")}
          >
            <ChevronRight className="size-5" aria-hidden />
          </IconButton>
          <span aria-live="polite" className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-(--spot-arrow-bg) px-2.5 py-1 text-small tabular-nums text-on-image backdrop-blur-md">
            {t("counter", { index: active + 1, total: photos.length })}
          </span>
        </>
      )}
      <PhotoLightbox
        photos={photos}
        index={open}
        onIndexChange={setOpen}
        onClose={() => {
          if (open !== null) scrollTo(open);
          setOpen(null);
        }}
        alt={title}
      />
    </div>
  );
}
