"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { Img } from "@/components/ui/Img";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: string[];
  /** Index of the photo on screen; null = closed */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  alt: string;
}

/** Horizontal distance (px) a touch has to travel to count as a swipe. */
const SWIPE_THRESHOLD = 50;

const roundButton =
  "glass-dark absolute z-10 flex size-12 items-center justify-center rounded-full outline-none transition-[background-color,opacity] hover:bg-black/45 focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-0";

/**
 * Full-screen photo viewer, portaled to <body> so it sits above the sticky header and side column.
 * ‹ › buttons at the viewport edges, arrow keys or swipe to browse; Escape, X or the backdrop to close.
 */
export function PhotoLightbox({ photos, index, onIndexChange, onClose, alt }: PhotoLightboxProps) {
  const t = useTranslations("house.lightbox");
  const tGallery = useTranslations("house.gallery");
  const open = index !== null;
  // Latest callbacks/index without re-registering the key handler on every step.
  const latest = useRef({ index, onIndexChange, onClose });
  useEffect(() => {
    latest.current = { index, onIndexChange, onClose };
  });
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const { index: current, onIndexChange: go, onClose: close } = latest.current;
      if (current === null) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" && current > 0) go(current - 1);
      else if (e.key === "ArrowRight" && current < photos.length - 1) go(current + 1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, photos.length]);

  // Only rendered after a click, so `document` always exists here.
  if (index === null) return null;

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start === null || end === undefined || index === null) return;
    const dx = end - start;
    if (dx > SWIPE_THRESHOLD && hasPrev) onIndexChange(index - 1);
    else if (dx < -SWIPE_THRESHOLD && hasNext) onIndexChange(index + 1);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("label", { name: alt })}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/92 motion-reduce:animate-none"
    >
      {/* Backdrop: clicking around the photo closes. */}
      <button type="button" aria-label={t("close")} tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default" />

      <Img
        key={photos[index]}
        src={photos[index]}
        alt={tGallery("photoAlt", { name: alt, number: index + 1 })}
        width={1600}
        height={1200}
        sizes="90vw"
        className="animate-lightbox-in relative h-auto max-h-[86vh] w-auto max-w-[90vw] rounded-2xl object-contain motion-reduce:animate-none"
      />

      <button type="button" onClick={onClose} aria-label={t("close")} className={cn(roundButton, "right-4 top-[max(1rem,env(safe-area-inset-top))]")}>
        <X className="size-6" />
      </button>
      <button
        type="button"
        onClick={() => onIndexChange(index - 1)}
        disabled={!hasPrev}
        aria-label={t("previous")}
        className={cn(roundButton, "left-4 top-1/2 -translate-y-1/2")}
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        onClick={() => onIndexChange(index + 1)}
        disabled={!hasNext}
        aria-label={t("next")}
        className={cn(roundButton, "right-4 top-1/2 -translate-y-1/2")}
      >
        <ChevronRight className="size-6" />
      </button>

      <p
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm font-medium text-white/70"
      >
        {t("counter", { index: index + 1, total: photos.length })}
      </p>
    </div>,
    document.body,
  );
}
