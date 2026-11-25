"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef } from "react";
import { CardTab } from "@/components/ui/CardTab";
import { cardGradient, cardTextShadow, cardTitle } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { useNotchClip } from "@/components/ui/notch";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useFormat } from "@/i18n/format";
import { useViewerPrice } from "@/components/ui/PriceLine";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A soft shadow under text on photos – keeps it readable on bright ones, on top of the gradient. */
const TEXT_SHADOW = cardTextShadow;

/** A line of the building card: its placeholder bar until the answer is there, then the answer comes in. */
function Reveal({ ready, width, className, children }: { ready: boolean; width: string; className?: string; children: ReactNode }) {
  if (!ready) return <span aria-hidden className={cn("my-1 block h-3 rounded-full bg-on-image/35", className)} style={{ width }} />;
  return <div className={cn("reveal-in", className)}>{children}</div>;
}

/**
 * Open a House's preview, building itself up. It starts as a soft surface with only the host's tab and a placeholder bar per line; each
 * answer takes its line's place, the cover fades in over the surface. Prices like the finished card: the viewer's currency, the fee included.
 */
export function BuildingCard({ stay, host, theme, showPrice, showCrew, showTitle, showMeta, showDates, placeLabel = null, kindLabel = null, fallbackImage }: { stay: Stay; host?: User; theme: string | null; showPrice: boolean; showCrew: boolean; showTitle: boolean; showMeta: boolean; showDates: boolean; /** "Place booked" / "Picking together" under the price */ placeLabel?: string | null; /** The kind of place ("Villa"), a small line under the place */ kindLabel?: string | null; /** Until there's a cover: the picture of what's chosen (the kind of place, else the theme) */ fallbackImage?: string }) {
  const t = useTranslations("explore");
  const tFlow = useTranslations("create.flow");
  const format = useFormat();
  const tCommon = useTranslations("common");
  const price = useViewerPrice(stay);
  const revealRef = useRef<HTMLElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(revealRef, clipRef);
  const cover = stay.photos?.[0] || fallbackImage;
  return (
    <article ref={revealRef} data-notch="pending" className="notch-frame relative isolate aspect-4/5">
      <div ref={clipRef} data-notch-clip className={cn("relative h-full w-full overflow-hidden rounded-3xl bg-(--card-blank)", host && "rounded-tl-none")}>
        <div aria-hidden className="absolute -inset-8 bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) blur-xl" />
        {cover && (
          <div key={cover} className="reveal-photo absolute inset-0">
            <Img src={cover} alt="" fill sizes="400px" style={stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined} className="object-cover" />
            <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />
          </div>
        )}
        <div className={cn("absolute inset-x-0 bottom-0 px-5 pb-8", cover ? cn("text-on-image", TEXT_SHADOW) : "text-ink")}>
          <Reveal ready={theme !== null} width="28%">
            <p className="mb-1 truncate text-eyebrow uppercase">{theme}</p>
          </Reveal>
          <Reveal ready={showTitle} width="72%">
            <h3 className={cn("line-clamp-2 text-card-title", cardTitle)}>{stay.title}</h3>
          </Reveal>
          <Reveal ready={showMeta} width="58%" className="mt-1">
            <p className="truncate text-small opacity-85">{[showDates ? format.stayDates(stay) : null, stay.region ? format.placeName(stay) : null].filter(Boolean).join(" · ")}</p>
          </Reveal>
          {kindLabel && <p className="reveal-in truncate text-small opacity-75">{kindLabel}</p>}
          <Reveal ready={showPrice} width="34%" className="mt-1">
            {/* The same price as the finished card (CLAUDE.md "Preis auf Karten – eine Zahl"): one total per person with the fee, in the
                viewer's currency; a variable price (picked with the crew) "est." and rounded (lib/pricing guestPrice). */}
            <p className="truncate text-body font-semibold">
              {price.label}
              {price.estimated && <span className="ml-1 text-small font-medium opacity-70">{tCommon("estimated")}</span>}
              {placeLabel && <span className="font-normal opacity-75"> · {placeLabel}</span>}
            </p>
          </Reveal>
          {stay.hostNote && (
            <p className="reveal-in mt-1 flex items-center gap-1.5 text-small opacity-75">
              <MessageCircle className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{stay.hostNote}</span>
            </p>
          )}
          <div className="mt-4 flex min-h-7 items-center justify-between gap-3">
            {/* In the draft: "1 of {crew} · You" – just you so far, no orange. */}
            <Reveal ready={showCrew} width="46%" className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                {host && <PersonPhoto src={host.photos[0]} alt={host.name} size={24} className="size-6 border-2 border-surface" />}
                <span className="min-w-0 truncate text-small">{tFlow("cardCrew", { total: stay.spotsTotal })}</span>
              </span>
            </Reveal>
          </div>
        </div>
      </div>
      {host && <CardTab host={host} className="max-w-[calc(100%-64px)]" />}
      <span className="sr-only">{stay.title || t("untitledHouse")}</span>
    </article>
  );
}
