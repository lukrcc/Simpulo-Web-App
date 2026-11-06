"use client";

import { ChevronLeft, ChevronRight, MessageCircle, Plus, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CardTab } from "@/components/ui/CardTab";
import { useNotchClip } from "@/components/ui/notch";
import { SaveButton } from "@/components/ui/SaveButton";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { CrewLine } from "@/components/ui/CrewLine";
import { HostSocialIcons } from "@/components/ui/HostSocialIcons";
import { cardGradient, cardTextShadow, cardTitle } from "@/components/ui/glass";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { PlaceText } from "@/components/ui/PlaceText";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { isInvitedTo, useStore } from "@/lib/store";
import type { CardVariant } from "@/lib/exploreLayout";
import type { Stay, User } from "@/lib/types";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { rememberOrigin } from "@/lib/houseTransition";
import { cn, firstName, housePhotos, openSpots } from "@/lib/utils";

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
  /**
   * default only: a card in the Spotlight (SpotlightCoverflow) – 3:4, only the cover at its focal point, no lift of its
   * own, the same content on every card and nothing changing inside it; no share / heart. It's scaled and dimmed as a
   * whole (data-cf-dim, set per frame).
   */
  spotlight?: boolean;
  /**
   * default only: the House page's large card, 3:4 – every photo by swipe or drag, the arrows on hover, ← → and the dots; the host's tab. No
   * text: that's beside it. No lift, no opening a photo.
   */
  gallery?: boolean;
  /** default only: no hover movement – neither the card's lift nor the photo's zoom (the profile, where cards lie in a stack) */
  still?: boolean;
  className?: string;
}

const CARD_SIZES = "(min-width: 1000px) 400px, (min-width: 700px) 50vw, 100vw";
/** Faces: crop towards the upper third, where the face usually is. */
const FACE_POSITION = "object-cover object-[center_30%]";
/** A soft shadow under text on photos – keeps it readable on bright ones, on top of the gradient. */
const TEXT_SHADOW = cardTextShadow;
const MAX_PHOTOS = 5;
/**
 * Hover (desktop): the card grows a little and, inside its clip, the photo grows a little more – same duration and
 * curve, so it reads as one movement. Reduced motion: only the card. (Tailwind's scale utilities use the CSS `scale`
 * property, so that's what's transitioned and hinted.)
 */
const HOVER_MOTION = "duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-[scale]";
const PHOTO_ZOOM = cn("scale-100 transition-[scale] md:motion-safe:group-hover:scale-[1.04]", HOVER_MOTION);

/**
 * The photo arrows: 12px from the card's edge, in the middle, showing while the pointer is over the card (or on keyboard focus). Touch swipes
 * instead: none there. Their hit area reaches past the circle to at least 44px.
 */
const PHOTO_ARROW = "photo-arrow absolute top-1/2 z-10 -translate-y-1/2 opacity-0 before:absolute before:-inset-1 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden";

/** One card API for every House tile: `variant` picks the layout. */
export function StayCard({ variant = "default", ...props }: StayCardProps) {
  if (variant === "wide" && props.host) return <WideStayCard {...props} host={props.host} />;
  if (variant === "tall" && props.host) return <TallStayCard {...props} host={props.host} />;
  return <DefaultStayCard {...props} />;
}

/** A line of the building card: its placeholder bar until the answer is there, then the answer comes in. */
function Reveal({ ready, width, className, children }: { ready: boolean; width: string; className?: string; children: ReactNode }) {
  if (!ready) return <span aria-hidden className={cn("my-1 block h-3 rounded-full bg-white/35", className)} style={{ width }} />;
  return <div className={cn("reveal-in", className)}>{children}</div>;
}

/**
 * Open a House's preview, building itself up. It starts as a soft surface with only the host's tab and a placeholder bar per line; each
 * answer takes its line's place, the cover fades in over the surface. Prices are in the House's own currency, not the viewer's.
 */
export function BuildingCard({ stay, host, theme, showPrice, showCrew, showTitle, showMeta, showDates }: { stay: Stay; host?: User; theme: string | null; showPrice: boolean; showCrew: boolean; showTitle: boolean; showMeta: boolean; showDates: boolean }) {
  const t = useTranslations("explore");
  const format = useFormat();
  const revealRef = useRef<HTMLElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(revealRef, clipRef);
  const cover = stay.photos?.[0];
  return (
    <article ref={revealRef} data-notch="pending" className="notch-frame relative isolate aspect-4/5">
      <div ref={clipRef} className={cn("relative h-full w-full overflow-hidden rounded-3xl bg-(--card-blank)", host && "rounded-tl-none")}>
        <div aria-hidden className="absolute -inset-8 bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) blur-xl" />
        {cover && (
          <div key={cover} className="reveal-photo absolute inset-0">
            <Img src={cover} alt="" fill sizes="400px" style={stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined} className="object-cover" />
            <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />
          </div>
        )}
        <div className={cn("absolute inset-x-0 bottom-0 px-5 pb-8", cover ? cn("text-white", TEXT_SHADOW) : "text-ink")}>
          <Reveal ready={theme !== null} width="28%">
            <p className="mb-1 truncate text-eyebrow uppercase">{theme}</p>
          </Reveal>
          <Reveal ready={showTitle} width="72%">
            <h3 className={cn("line-clamp-2 text-card-title", cardTitle)}>{stay.title}</h3>
          </Reveal>
          <Reveal ready={showMeta} width="58%" className="mt-1">
            <p className="truncate text-small opacity-85">{[showDates ? format.stayDates(stay) : null, stay.region ? format.placeName(stay) : null].filter(Boolean).join(" · ")}</p>
          </Reveal>
          <Reveal ready={showPrice} width="34%" className="mt-1">
            <p className="truncate text-body font-semibold">{format.priceLabel(stay)}</p>
          </Reveal>
          {stay.hostNote && (
            <p className="reveal-in mt-1 flex items-center gap-1.5 text-small opacity-75">
              <MessageCircle className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{stay.hostNote}</span>
            </p>
          )}
          <div className="mt-4 flex min-h-7 items-center justify-between gap-3">
            <Reveal ready={showCrew} width="46%" className="min-w-0 flex-1">
              {host && cover ? (
                <CrewAvatars host={host} members={[]} stay={stay} />
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  {host && <PersonPhoto src={host.photos[0]} alt={host.name} size={28} className="size-7 border-2 border-surface" />}
                  <CrewLine stay={stay} className="min-w-0 truncate" />
                </span>
              )}
            </Reveal>
            {host && <HostSocialIcons host={host} className={cover ? undefined : "text-ink/60!"} />}
          </div>
        </div>
      </div>
      {host && <CardTab host={host} className="max-w-[calc(100%-64px)]" />}
      <span className="sr-only">{stay.title || t("untitledHouse")}</span>
    </article>
  );
}

/**
 * The photo card. `tall` (the featured variant): the same card, but only the cover, filling a card 1.4× as tall
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
  spotlight = false,
  gallery,
  still = false,
  tall = false,
  className,
}: Omit<StayCardProps, "variant"> & { tall?: boolean }) {
  const t = useTranslations("explore");
  const invited = isInvitedTo(useStore(), stay.id);
  const format = useFormat();
  const priceLabel = useViewerPriceLabel(stay);
  // The cover first, then the rest of the House's world. The host's portrait belongs in the tab's avatar.
  // Tall, compact and Spotlight cards show one photo: no swiping, no arrows, no dots.
  const photos = host ? housePhotos(stay, host).slice(0, gallery ? undefined : tall || compact || spotlight ? 1 : MAX_PHOTOS) : spotlight ? housePhotos(stay).slice(0, 1) : [];
  const { ref, active, onScroll, scrollTo, step } = useSnapCarousel<HTMLDivElement>(photos.length);
  const drag = usePhotoDrag(ref, active, scrollTo, Boolean(gallery) && photos.length > 1);
  // The House page's card: ← → page through the photos (not while typing or in a dialog).
  useEffect(() => {
    if (!gallery || photos.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog], [aria-modal]") || document.querySelector("[aria-modal=true]")) return;
      step(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery, photos.length, step]);
  const [revealRef, revealed] = useRevealOnce<HTMLElement>();
  // One clipped layer: photos, gradients and overlays inside the notched silhouette; the host tab sits beside it.
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(revealRef, clipRef);

  const href = `/house/${stay.slug}`;
  const guests = crew.filter((u) => u.id !== stay.hostId);
  // 36px; on the large cards 40px.
  const arrowSize = gallery || spotlight ? "md" : "sm";

  return (
    // The frame scales on hover as one element (clipped card + tab); the clip sits on the inner layer.
    <article
      ref={revealRef}
      data-notch="pending"
      data-house-card={stay.id}
      className={cn(
        gallery ? "notch-frame group relative isolate aspect-3/4" : spotlight ? "group relative isolate" : "notch-frame group relative isolate transition-[opacity,translate,scale,filter]",
        // In a row (compact) the row lifts the card and casts the shadow instead (.shelf in globals.css) – and its
        // photo doesn't zoom. In the grid: scale and the hover shadow, following the notched silhouette.
        gallery
          ? undefined
          : spotlight
          ? "h-full"
          : compact
            ? "lift-card"
            : still
              ? undefined
              : "md:hover:scale-[1.02] md:hover:drop-shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:has-focus-visible:scale-[1.02] md:has-focus-visible:drop-shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
        !spotlight && !gallery && HOVER_MOTION,
        !tall && !spotlight && !gallery && "aspect-4/5",
        // Mobile only: fade/slide in once when scrolled into view.
        !revealed && "max-md:motion-safe:translate-y-3 max-md:motion-safe:opacity-0",
        className,
      )}
    >
      {/* Before the clip is measured: a rounded card, the tab's corner pieces over its top-left. */}
      {/* The one rounded layer: 24px radius, overflow hidden (notched by clip-path), surface behind the photo so no edge
          shows while it lifts; no border, ring or outline. Transform and shadow sit on the frame around it – the
          notch's clip-path would cut off a shadow on this layer. */}
      <div
        ref={clipRef}
        className={cn(
          "relative h-full w-full overflow-hidden rounded-3xl bg-surface",
          host && "rounded-tl-none",
        )}
      >
        {/* Photo track – each slide is the card link, so swiping and tapping both work. */}
        {/* In the Spotlight and on a shelf (one photo) no scroller: it would keep the carousel's touch-action from applying, and the browser would take the swipe. */}
        <div ref={ref} onScroll={onScroll} {...drag.props} className={cn("flex h-full", spotlight || compact ? "overflow-hidden" : "no-scrollbar snap-x snap-mandatory overflow-x-auto", drag.className)}>
          {photos.length === 0 &&
            (photoPlaceholder ? (
              <div className="flex h-full w-full shrink-0 flex-col items-center justify-center gap-3 bg-line pb-24 text-muted">
                <span className="flex size-20 items-center justify-center rounded-full bg-surface/70">
                  <UserRound className="size-10 text-muted" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="text-body font-medium">{photoPlaceholder}</span>
              </div>
            ) : (
              <div className="h-full w-full shrink-0 bg-linear-to-br from-bg to-line" />
            ))}
          {photos.map((src, i) => {
            // Photos only change by swipe, arrow or dot – never on hover.
            const image = (
              <Img
                src={src}
                alt={t("cards.photoAlt", { title: stay.title, number: i + 1 })}
                fill
                sizes={gallery ? "(min-width: 1100px) 600px, 520px" : spotlight ? "400px" : CARD_SIZES}
                // Which card is in the centre (the page's largest image) changes per session: none of them waits for lazy loading.
                loading={spotlight || (gallery && i === 0) ? "eager" : undefined}
                className={cn("object-cover", !compact && !spotlight && !gallery && !still && PHOTO_ZOOM)}
                style={i === 0 && stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined}
              />
            );
            // Each slide clips its own photo, so the zoom never spills into the next one.
            // No outline: keyboard focus shows as the card's lift (has-focus-visible on the frame).
            const slideClass = "relative block h-full w-full shrink-0 snap-center snap-always overflow-hidden outline-none";
            if (gallery) {
              return (
                <div key={src} className={slideClass} aria-hidden={i !== active || undefined}>
                  {image}
                </div>
              );
            }
            return preview ? (
              <div key={src} className={slideClass}>
                {image}
              </div>
            ) : (
              <Link
                key={src}
                href={href}
                onNavigate={rememberOrigin}
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
        {!gallery && <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />}
        {!spotlight && !gallery && <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}

        {/* The Spotlight: black over the whole card, the further from the centre the more (set per frame). */}
        {spotlight && <div aria-hidden data-cf-dim className="pointer-events-none absolute inset-0 z-20 bg-black opacity-0" />}

        {!preview && !spotlight && (
          <div className="absolute right-2 top-2 z-10 flex">
            <SaveButton stay={stay} />
          </div>
        )}

        {/* Bottom content – pointer-events pass through to the photo links. */}
        <div
          hidden={Boolean(gallery)}
          className={cn(
            "pointer-events-none absolute bottom-0 text-white",
            TEXT_SHADOW,
            "px-5 pb-5",
            "inset-x-0",
          )}
        >
          {invited && (
            <Badge className="mb-2 [text-shadow:none]">{t("cards.invited")}</Badge>
          )}
          <h3 className={cn("line-clamp-2 text-card-title", cardTitle)}>{stay.title || t("untitledHouse")}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-small text-white/85">
            <span className="shrink-0">
              {format.stayDates(stay)}
              {stay.region && " ·"}
            </span>
            {stay.region && <PlaceText>{format.placeName(stay)}</PlaceText>}
          </p>
          {/* After the title the most important line. Every card has it: without a price, "Price set with crew". */}
          <>
            <p className="mt-1 truncate text-body font-semibold text-white">{priceLabel}</p>
            {stay.hostNote && (
              <p className="mt-1 flex items-center gap-1.5 text-small text-white/75">
                <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{stay.hostNote}</span>
              </p>
            )}

            {host && (
              // Crew bottom-left; the host's public socials bottom-right on the same line (not on compact cards).
              <div className={cn("flex items-center justify-between gap-3", compact ? "mt-3" : "mt-4")}>
                {crewRow === "large" ? <CrewFaces crew={[host, ...guests]} /> : <CrewAvatars host={host} members={guests} stay={stay} />}
                {!compact && <HostSocialIcons host={host} />}
              </div>
            )}
          </>
        </div>

        {photos.length > 1 && (
          <>
            {/* Desktop: ‹ › while hovering (or focused); phones swipe. One index with the swipe – see useSnapCarousel. */}
            {active > 0 && (
              <IconButton variant="onImage" size={arrowSize} onClick={() => step(-1)} aria-label={t("cards.prevPhoto")} className={cn(PHOTO_ARROW, "left-4")}>
                <ChevronLeft className="size-4.5" strokeWidth={2.5} aria-hidden />
              </IconButton>
            )}
            {active < photos.length - 1 && (
              <IconButton variant="onImage" size={arrowSize} onClick={() => step(1)} aria-label={t("cards.nextPhoto")} className={cn(PHOTO_ARROW, "right-4")}>
                <ChevronRight className="size-4.5" strokeWidth={2.5} aria-hidden />
              </IconButton>
            )}
            {/* Dots: the current photo; each one jumps there (a taller hit area than the dot itself). */}
            <div className="absolute inset-x-0 bottom-2 flex justify-center">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => scrollTo(i)}
                  aria-label={t("cards.showPhoto", { number: i + 1, count: photos.length })}
                  aria-current={i === active || undefined}
                  data-no-tooltip
                  className="flex h-5 items-center px-0.5"
                >
                  <span className={cn("block h-1 rounded-full transition-all", i === active ? "w-3 bg-surface" : "w-1 bg-white/50")} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {/* The heart’s 40px hit area top right, its icon 16px in, takes 48px; the tab stops 16px short of it. */}
      {host && (
        <CardTab
          host={host}
          className="max-w-[calc(100%-64px)]"
        />
      )}
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
          <PersonPhoto src={member.photos[0]} alt={member.name} size={44} className="size-11 border-2 border-surface" />
          <span className="mt-1 w-full truncate text-center text-small text-white/85">{firstName(member)}</span>
        </li>
      ))}
      {rest > 0 && (
        <li className="glass-dark flex size-11 items-center justify-center rounded-full border-2 border-surface text-small font-semibold">+{rest}</li>
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
  const priceLabel = useViewerPriceLabel(stay);
  const members = crew.length > 0 ? crew : [host];
  const spotsLeft = openSpots(stay);
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
        // One element: 24px radius, overflow hidden and – on hover only – the shadow. No border; the tiles fill it.
        "group relative isolate h-full overflow-hidden rounded-3xl bg-surface transition-[scale,box-shadow] md:hover:scale-[1.02] md:hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:has-focus-visible:scale-[1.02] md:has-focus-visible:shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
        HOVER_MOTION,
        className,
      )}
    >
      <ul className="pointer-events-none absolute inset-0 flex gap-0.5">
        {shown.map((member) => (
          <li key={member.id} className={cn(tile, "bg-line")}>
            <Img src={member.photos[0]} alt={member.name} fill sizes="(min-width: 1440px) 140px, (min-width: 1024px) 18vw, 25vw" className={cn(FACE_POSITION, PHOTO_ZOOM)} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-ink/65 to-transparent" />
            <span className={cn("absolute inset-x-0 bottom-0 truncate px-3 pb-3 text-body font-semibold text-white", TEXT_SHADOW)}>{firstName(member)}</span>
          </li>
        ))}
        {rest > 0 && <li className={cn(tile, "flex items-center justify-center bg-ink/5 text-body-lg font-semibold text-ink")}>+{rest}</li>}
        {openTiles > 0 && (
          // No padding on the tile itself: with flex-basis 0 it would make this tile wider than the others.
          <li className={cn(tile, "flex flex-col items-center justify-center gap-2 bg-bg text-center text-muted")}>
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-line">
              <Plus className="size-5" aria-hidden />
            </span>
            <span className="px-2 text-body font-medium">{tFacts("spotsLeft", { count: spotsLeft })}</span>
          </li>
        )}
      </ul>

      {/* Readability gradient for the text on top. */}
      <div style={overPhotos} className="pointer-events-none absolute left-0 top-0 h-1/2 bg-linear-to-b from-ink/65 via-ink/25 to-transparent" />
      <div style={overPhotos} className={cn("pointer-events-none absolute left-0 top-0 px-5 pt-5 text-white", TEXT_SHADOW)}>
        <h3 className={cn("line-clamp-2 text-card-title", cardTitle)}>{stay.title || t("untitledHouse")}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-small text-white/85">
          <span className="shrink-0">
            {format.stayDates(stay)}
            {stay.region && " ·"}
          </span>
          {stay.region && <PlaceText>{format.placeName(stay)}</PlaceText>}
        </p>
        <p className="mt-1 truncate text-body font-semibold text-white">{priceLabel}</p>
        <p className="mt-1 flex items-center gap-1 text-small text-white/85">
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
          <div className="absolute right-2 top-2 z-10 flex">
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

