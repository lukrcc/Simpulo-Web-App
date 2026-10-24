"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardTab } from "@/components/ui/CardTab";
import { SaveButton } from "@/components/ui/SaveButton";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { imageGradient } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { PlaceText } from "@/components/ui/PlaceText";
import { useFormat } from "@/i18n/format";
import type { Stay, User } from "@/lib/types";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn, firstName } from "@/lib/utils";

interface StayCardProps {
  stay: Stay;
  host?: User;
  /** Host first, then accepted guests */
  crew?: User[];
  /** Renders without links, e.g. for the live preview in /create */
  preview?: boolean;
}

const CARD_SIZES = "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";
const MAX_PHOTOS = 5;

export function StayCard({ stay, host, crew = [], preview = false }: StayCardProps) {
  const t = useTranslations("explore");
  const format = useFormat();
  // Always the host's own photos – never the accommodation.
  const photos = host ? host.photos.slice(0, MAX_PHOTOS) : [];
  const { ref, active, onScroll } = useSnapCarousel<HTMLDivElement>(photos.length);
  const [revealRef, revealed] = useRevealOnce<HTMLElement>();

  const href = `/stays/${stay.slug}`;
  const guests = crew.filter((u) => u.id !== stay.hostId);

  return (
    <article
      ref={revealRef}
      className={cn(
        "group relative isolate aspect-4/5 overflow-hidden rounded-[28px] bg-neutral-200 transition-[opacity,translate,scale] duration-300 md:hover:scale-[1.02]",
        // The host tab covers the top-left corner; rounding it underneath would only leave an anti-aliasing seam.
        host && "rounded-tl-none",
        // Mobile only: fade/slide in once when scrolled into view.
        !revealed && "max-md:motion-safe:translate-y-3 max-md:motion-safe:opacity-0",
      )}
    >
      {/* Photo track – each slide is the card link, so swiping and tapping both work. */}
      <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
        {photos.length === 0 && <div className="h-full w-full shrink-0 bg-linear-to-br from-accent-soft to-neutral-300" />}
        {photos.map((src, i) => {
          const image = (
            <>
              <Img src={src} alt={i === 0 && host ? host.name : ""} fill sizes={CARD_SIZES} className="object-cover" />
              {/* Desktop hover: crossfade the first photo to the second (hover only fires on hover-capable devices). */}
              {i === 0 && photos[1] && (
                <Img
                  src={photos[1]}
                  alt=""
                  fill
                  sizes={CARD_SIZES}
                  className="object-cover opacity-0 transition-opacity duration-400 group-hover:opacity-100"
                />
              )}
            </>
          );
          const slideClass = "relative block h-full w-full shrink-0 snap-center snap-always";
          return preview ? (
            <div key={src} className={slideClass}>
              {image}
            </div>
          ) : (
            <Link
              key={src}
              href={href}
              className={slideClass}
              aria-label={i === 0 ? (host ? t("houseWithHost", { title: stay.title, host: firstName(host) }) : stay.title) : undefined}
              aria-hidden={i > 0 || undefined}
              tabIndex={i > 0 ? -1 : undefined}
            >
              {image}
            </Link>
          );
        })}
      </div>

      {/* Readability gradient; it gets stronger on hover. */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-3/4", imageGradient)} />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {host && <CardTab host={host} />}
      {!preview && <SaveButton stay={stay} className="absolute right-4 top-4 z-10" />}

      {/* Bottom content – pointer-events pass through to the photo links. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-8 text-white">
        <h3 className="line-clamp-2 text-2xl font-bold tracking-tight">{stay.title || t("untitledHouse")}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
          <span className="shrink-0">
            {format.shortRange(stay.startDate, stay.endDate)}
            {stay.region && " ·"}
          </span>
          {stay.region && <PlaceText>{format.placeName(stay)}</PlaceText>}
          {/* The House's language – only when it isn't English. */}
          {stay.language && stay.language !== "en" && <span className="shrink-0 text-white/60">· {format.language(stay.language)}</span>}
        </p>
        {stay.hostNote && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <MessageCircle className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{stay.hostNote}</span>
          </p>
        )}

        {host && (
          <div className="mt-4">
            <CrewAvatars host={host} members={guests} />
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1">
          {photos.map((src, i) => (
            <span
              key={src}
              className={cn("h-1 rounded-full transition-all", i === active ? "w-3 bg-white" : "w-1 bg-white/50")}
            />
          ))}
        </div>
      )}
    </article>
  );
}

/** Flips to visible the first time the element nears the viewport – never back. */
function useRevealOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "10%" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible] as const;
}
