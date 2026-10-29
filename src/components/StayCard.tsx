"use client";

import { MessageCircle, Plus, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardTab } from "@/components/ui/CardTab";
import { useNotchClip } from "@/components/ui/notch";
import { CardShareButton } from "@/components/share/ShareSheet";
import { SaveButton } from "@/components/ui/SaveButton";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { imageGradient } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { PlaceText } from "@/components/ui/PlaceText";
import { useApproxAmount } from "@/components/ui/PriceLine";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import type { CardVariant } from "@/lib/exploreLayout";
import type { Stay, User } from "@/lib/types";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn, firstName, stayPhotos, stayPrice } from "@/lib/utils";

interface StayCardProps {
  stay: Stay;
  host?: User;
  /** Host first, then accepted guests */
  crew?: User[];
  /** Renders without links, e.g. for the live preview in /create */
  preview?: boolean;
  /** Without photos: a neutral avatar placeholder with this text instead of the colour wash (live preview) */
  photoPlaceholder?: string;
  /** default 1×1 · wide 2×1, about the people (almost full) · tall 1×2, the featured placement – see getCardVariant */
  variant?: CardVariant;
  /** default only: the crew as photos with first names instead of the small avatar stack (phones, for almost full Houses) */
  crewRow?: "small" | "large";
  /** default only: the collection rows' card – smaller type, only the cover photo */
  compact?: boolean;
  className?: string;
}

const CARD_SIZES = "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";
/** Faces: crop towards the upper third, where the face usually is. */
const FACE_POSITION = "object-cover object-[center_30%]";
/** A soft shadow under text on photos – keeps it readable on bright ones, on top of the gradient. */
const TEXT_SHADOW = "[text-shadow:0_1px_3px_rgb(0_0_0/0.35)]";
const MAX_PHOTOS = 5;

/** One card API for every House tile: `variant` picks the layout. */
export function StayCard({ variant = "default", ...props }: StayCardProps) {
  if (variant === "wide" && props.host) return <WideStayCard {...props} host={props.host} />;
  if (variant === "tall" && props.host) return <TallStayCard {...props} host={props.host} />;
  return <DefaultStayCard {...props} />;
}

/**
 * The photo card. `tall` (the featured variant): the same card, but only the host's face, filling a card 1.4× as tall
 * (its height comes from the grid), and the host note on up to two lines.
 */
function DefaultStayCard({
  stay,
  host,
  crew = [],
  preview = false,
  photoPlaceholder,
  crewRow = "small",
  compact = false,
  tall = false,
  className,
}: Omit<StayCardProps, "variant"> & { tall?: boolean }) {
  const t = useTranslations("explore");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const approx = useApproxAmount(stay);
  const hasPrice = stayPrice(stay).kind !== "tbd";
  // The host's face first, then the world of the House – never the accommodation.
  // Tall and compact cards show one photo: no swiping, no dots, no hover crossfade.
  const photos = host ? (tall || compact ? stayPhotos(stay, host).slice(0, 1) : stayPhotos(stay, host).slice(0, MAX_PHOTOS)) : [];
  const { ref, active, onScroll } = useSnapCarousel<HTMLDivElement>(photos.length);
  const [revealRef, revealed] = useRevealOnce<HTMLElement>();
  // One clipped layer: photos, gradients and overlays inside the notched silhouette; the host tab sits beside it.
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(revealRef, clipRef);

  const href = `/house/${stay.slug}`;
  const guests = crew.filter((u) => u.id !== stay.hostId);

  return (
    // The frame scales on hover as one element (clipped card + tab); the clip sits on the inner layer.
    <article
      ref={revealRef}
      data-notch="pending"
      className={cn(
        "notch-frame group relative isolate transition-[opacity,translate,scale] duration-300 md:hover:scale-[1.02]",
        !tall && "aspect-4/5",
        // Mobile only: fade/slide in once when scrolled into view.
        !revealed && "max-md:motion-safe:translate-y-3 max-md:motion-safe:opacity-0",
        className,
      )}
    >
      {/* Before the clip is measured: a rounded card, the tab's corner pieces over its top-left. */}
      <div ref={clipRef} className={cn("relative h-full w-full overflow-hidden rounded-[28px] bg-neutral-200", host && "rounded-tl-none")}>
        {/* Photo track – each slide is the card link, so swiping and tapping both work. */}
        <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
          {photos.length === 0 &&
            (photoPlaceholder ? (
              <div className="flex h-full w-full shrink-0 flex-col items-center justify-center gap-3 bg-neutral-200 pb-24 text-zinc-500">
                <span className="flex size-20 items-center justify-center rounded-full bg-white/70">
                  <UserRound className="size-10 text-zinc-400" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="text-sm font-medium">{photoPlaceholder}</span>
              </div>
            ) : (
              <div className="h-full w-full shrink-0 bg-linear-to-br from-accent-soft to-neutral-300" />
            ))}
          {photos.map((src, i) => {
            const image = (
              <>
                <Img
                  src={src}
                  alt={i === 0 && host ? t("cards.hostAlt", { name: host.name, title: stay.title }) : t("cards.photoAlt", { title: stay.title, number: i + 1 })}
                  fill
                  sizes={CARD_SIZES}
                  className={tall ? FACE_POSITION : "object-cover"}
                />
                {/* Desktop hover: crossfade the first photo to the second (hover only fires on hover-capable devices).
                    A visual duplicate of the next slide – decorative, so no alt of its own. */}
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

        {!preview && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <CardShareButton stay={stay} />
            <SaveButton stay={stay} />
          </div>
        )}

        {/* Bottom content – pointer-events pass through to the photo links. */}
        <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 text-white", TEXT_SHADOW, compact ? "px-4 pb-7" : "px-5 pb-8")}>
          <h3 className={cn("line-clamp-2 font-bold tracking-tight", compact ? "text-xl" : "text-2xl")}>{stay.title || t("untitledHouse")}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
            <span className="shrink-0">
              {format.shortRange(stay.startDate, stay.endDate)}
              {stay.region && " ·"}
            </span>
            {stay.region && <PlaceText>{format.placeName(stay)}</PlaceText>}
            {/* The House's language – only when it isn't English. */}
            {stay.language && stay.language !== "en" && <span className="shrink-0 text-white/60">· {format.language(stay.language)}</span>}
          </p>
          {/* The House's own currency; the viewer's ≈ amount muted after it (only a hint, never charged). */}
          {hasPrice && (
            <p className="mt-1 truncate text-sm font-semibold text-white/90">
              {format.priceLabel(stay)}
              {approx && <span className="font-normal text-white/60"> · {tCommon("ui.priceLine.approxShort", { amount: approx })}</span>}
            </p>
          )}
          {stay.hostNote && !compact && (
            <p className={cn("mt-1 flex gap-1.5 text-sm text-white/85", tall ? "items-start" : "items-center")}>
              <MessageCircle className={cn("size-3.5 shrink-0", tall && "mt-[3px]")} aria-hidden />
              <span className={tall ? "line-clamp-2" : "truncate"}>{stay.hostNote}</span>
            </p>
          )}

          {host && (
            <div className={compact ? "mt-3" : "mt-4"}>
              {crewRow === "large" ? <CrewFaces crew={[host, ...guests]} /> : <CrewAvatars host={host} members={guests} />}
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
      </div>
      {host && <CardTab host={host} />}
    </article>
  );
}

const MAX_FACES = 5;

/** Phones, almost full Houses: everyone in as a real photo with their first name (instead of the avatar stack). */
function CrewFaces({ crew }: { crew: User[] }) {
  const shown = crew.slice(0, MAX_FACES);
  const rest = crew.length - shown.length;
  return (
    <ul className="flex gap-3">
      {shown.map((member) => (
        <li key={member.id} className="flex w-11 flex-col items-center">
          <PersonPhoto src={member.photos[0]} alt={member.name} size={44} className="size-11 border-2 border-white" />
          <span className="mt-1 w-full truncate text-center text-xs text-white/85">{firstName(member)}</span>
        </li>
      ))}
      {rest > 0 && (
        <li className="glass-dark flex size-11 items-center justify-center rounded-full border-2 border-white text-xs font-semibold">+{rest}</li>
      )}
    </ul>
  );
}

type VariantCardProps = Omit<StayCardProps, "variant" | "host"> & { host: User };

/** Tiles in the wide card's crew strip (people + the open spot). */
const MAX_TILES = 5;

/**
 * wide (2 columns, default height): the whole card is the crew of an almost full House – host first, then everyone
 * who's in, as full-height portrait tiles edge to edge with their first names, plus the open spot. Title, dates ·
 * place and the host sit top-left on a gradient (the names take the bottom edge).
 */
function WideStayCard({ stay, host, crew = [], preview, className }: VariantCardProps) {
  const t = useTranslations("explore");
  const tFacts = useTranslations("house.facts");
  const format = useFormat();
  const members = crew.length > 0 ? crew : [host];
  const spotsLeft = Math.max(0, stay.spotsTotal - stay.spotsFilled);
  const openTiles = Math.min(spotsLeft, 1);
  const peopleTiles = MAX_TILES - openTiles;
  // Too many people for the strip: the last people tile becomes "+N".
  const shown = members.length > peopleTiles ? members.slice(0, peopleTiles - 1) : members;
  const rest = members.length - shown.length;
  const tile = "relative min-w-0 flex-1 overflow-hidden";
  // The text and its gradient stay over the portrait tiles – the light open-spot tile at the end keeps its colour.
  const photoTiles = shown.length + (rest > 0 ? 1 : 0);
  const overPhotos = { width: `${(photoTiles / (photoTiles + openTiles)) * 100}%` };

  return (
    <article
      className={cn(
        "group relative isolate h-full overflow-hidden rounded-[28px] bg-neutral-200 transition-transform duration-300 md:hover:scale-[1.02]",
        className,
      )}
    >
      <ul className="pointer-events-none absolute inset-0 flex gap-0.5">
        {shown.map((member) => (
          <li key={member.id} className={cn(tile, "bg-neutral-300")}>
            <Img src={member.photos[0]} alt={member.name} fill sizes="(min-width: 1440px) 140px, (min-width: 1024px) 18vw, 25vw" className={FACE_POSITION} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/65 to-transparent" />
            <span className={cn("absolute inset-x-0 bottom-0 truncate px-3 pb-3 text-sm font-semibold text-white", TEXT_SHADOW)}>{firstName(member)}</span>
          </li>
        ))}
        {rest > 0 && <li className={cn(tile, "flex items-center justify-center bg-ink text-lg font-semibold text-white")}>+{rest}</li>}
        {openTiles > 0 && (
          // No padding on the tile itself: with flex-basis 0 it would make this tile wider than the others.
          <li className={cn(tile, "flex flex-col items-center justify-center gap-2 bg-page text-center text-zinc-500")}>
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-zinc-300">
              <Plus className="size-5" aria-hidden />
            </span>
            <span className="px-2 text-sm font-medium">{tFacts("spotsLeft", { count: spotsLeft })}</span>
          </li>
        )}
      </ul>

      {/* Readability gradient for the text on top. */}
      <div style={overPhotos} className="pointer-events-none absolute left-0 top-0 h-1/2 bg-linear-to-b from-black/65 via-black/25 to-transparent" />
      <div style={overPhotos} className={cn("pointer-events-none absolute left-0 top-0 px-5 pt-5 text-white", TEXT_SHADOW)}>
        <h3 className="line-clamp-2 text-2xl font-bold tracking-tight">{stay.title || t("untitledHouse")}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
          <span className="shrink-0">
            {format.shortRange(stay.startDate, stay.endDate)}
            {stay.region && " ·"}
          </span>
          {stay.region && <PlaceText>{format.placeName(stay)}</PlaceText>}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
          <span className="truncate">{t("cards.hostedBy", { name: firstName(host) })}</span>
          {host.verified && <VerifiedBadge size={14} onDark />}
        </p>
      </div>

      {!preview && (
        <>
          <Link
            href={`/house/${stay.slug}`}
            aria-label={t("houseWithHost", { title: stay.title, host: firstName(host) })}
            className="absolute inset-0 z-0 rounded-[inherit]"
          />
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <CardShareButton stay={stay} />
            <SaveButton stay={stay} />
          </div>
        </>
      )}
    </article>
  );
}

/** tall (1 column, 1.4× a default card): the featured placement (later: boost) – the photo card with the host's face. */
function TallStayCard(props: VariantCardProps) {
  return <DefaultStayCard {...props} tall />;
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
