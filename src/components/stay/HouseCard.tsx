"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StayCard } from "@/components/StayCard";
import { Img } from "@/components/ui/Img";
import type { Stay, User } from "@/lib/types";
import { housePhotos } from "@/lib/utils";
import { PhotoLightbox } from "./PhotoLightbox";

/**
 * The House page's card: the grid's card, large and 3:4, only the photos and the host's tab. A photo opens full screen, "N photos" all of them.
 * Beside the content it stays under the header and is never taller than the window; below 1100px at most 520px, centred.
 */
export function HouseCard({ stay, host }: { stay: Stay; host?: User }) {
  const t = useTranslations("house.page");
  const [large, setLarge] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const photos = housePhotos(stay, host);
  return (
    <div className="mx-auto w-full max-w-130 split:sticky split:top-[calc(var(--header-h)+var(--band-h)+24px)] split:mx-0 split:w-[min(100%,calc((100dvh-var(--header-h)-var(--band-h)-48px)*0.75))] split:max-w-none">
      <StayCard stay={stay} host={host} gallery={{ onOpen: setLarge, onOpenAll: () => setAll(true), countLabel: t("photosCount", { count: photos.length }) }} />
      <PhotoLightbox photos={photos} index={large} onIndexChange={setLarge} onClose={() => setLarge(null)} alt={stay.title} />
      {all && <HouseGallery photos={photos} title={stay.title} onClose={() => setAll(false)} />}
    </div>
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
