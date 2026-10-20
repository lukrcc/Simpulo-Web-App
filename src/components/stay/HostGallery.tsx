"use client";

import { ArrowLeft, BadgeCheck, Share2 } from "lucide-react";
import Link from "next/link";
import { glassCircle, imageGradient } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { SocialRow } from "@/components/ui/SocialRow";
import type { User } from "@/lib/types";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { ageAndCountry, cn } from "@/lib/utils";

const MAX_PHOTOS = 5;

interface HostGalleryProps {
  host: User;
  onBack: () => void;
  onShare: () => void;
}

/** Full-width carousel of the host's portraits with their identity overlaid. */
export function HostGallery({ host, onBack, onShare }: HostGalleryProps) {
  const photos = host.photos.slice(0, MAX_PHOTOS);
  const { ref, active, onScroll } = useSnapCarousel<HTMLDivElement>(photos.length);

  return (
    <div className="relative isolate aspect-4/5 overflow-hidden bg-neutral-200 md:aspect-square md:rounded-4xl">
      <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
        {photos.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center snap-always">
            <Img
              src={src}
              alt={i === 0 ? host.name : `${host.name} – photo ${i + 1}`}
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
        <button type="button" onClick={onBack} aria-label="Back" className={cn(glassCircle, "md:invisible")}>
          <ArrowLeft className="size-5" />
        </button>
        <button type="button" onClick={onShare} aria-label="Share House" className={glassCircle}>
          <Share2 className="size-5" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-9 text-white">
        <Link href={`/u/${host.id}`} className="pointer-events-auto inline-flex items-center gap-2">
          <span className="text-3xl font-bold tracking-tight">
            {host.name}
          </span>
          {host.verified && <BadgeCheck className="size-6 shrink-0" aria-label="Verified" />}
        </Link>
        <p className="mt-1 text-sm text-white/85">
          {ageAndCountry(host)} · speaks {host.languages.join(", ")}
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
