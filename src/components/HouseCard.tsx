"use client";

import { usePeopleSignal } from "@/lib/useYourPeople";
import { Camera, ChevronLeft, ChevronRight, MessageCircle, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CardTab } from "@/components/ui/CardTab";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { CrewRow } from "@/components/CrewRow";
import { useCrewFaceOf } from "@/components/ui/useCrewFaces";
import { cardGradient, cardTextShadow, cardTitle } from "@/components/ui/glass";
import { SocialLinks } from "@/components/SocialLinks";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { useNotchClip } from "@/components/ui/notch";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SaveButton } from "@/components/ui/SaveButton";
import { useFormat } from "@/i18n/format";
import { rememberOrigin } from "@/lib/houseTransition";
import { crewInOf, getCurrentUser, isInvitedTo, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn, firstName, housePhotos } from "@/lib/utils";

/**
 * The one House card of the app – Explore's card everywhere a House shows as a tile (Explore, shelves, Your houses, the profile,
 * similar Houses, Saved, city pages): the photo fills the card (4:5), a dark gradient at the bottom, on it the title (one line),
 * dates · place (one line) and a footer; the host's tab in the notch top left. Radius, shadow, hover and type are the same everywhere.
 *
 * The two variants:
 * - `notch`: "host" (default) – the host's avatar, name and Verified; "you" – your own House: "You" with your avatar; "none" – no tab (the
 *   House page's head, where the host has their own column).
 * - `footer`: "explore" (default) – price, host note, crew and the host's socials; "status" (Your houses) – the crew and the one live
 *   line (`live`) on the left, `status` on the right (a dark glass chip, or a light glass button when something needs doing – it opens
 *   its action, not the card). Status cards are calm: no heart, no photo arrows, no hover zoom; `menu` sits top right.
 *
 * Where a card is mounted rather than how it looks: `spotlight` (the Spotlight dims and scales it from outside), `gallery` (the House
 * page: every photo, no text, nothing opens) and `preview` (Open a House's live preview: no links).
 */
interface HouseCardProps {
  stay: Stay;
  host?: User;
  /** Host first, then accepted guests */
  crew?: User[];
  notch?: "host" | "you" | "none";
  /** "memory": a past House in Your houses – no price or spots: who you lived with (avatars + `live`: "Lived with · Nov 2026") left, `status` (its action, "Do it again") right */
  footer?: "explore" | "status" | "memory";
  /** footer="status": the right side – <CardStatusChip> or <CardStatusAction>; footer="explore": an action instead of the socials ("Join them") */
  /** An orange dot before the `live` line: unread news */
  liveDot?: boolean;
  status?: ReactNode;
  /** footer="status": the one live line beside the crew ("Pay within 30h", "2 spots left", "Starts in 12 days") – else "N of M" */
  live?: string;
  /** footer="status": top right where the heart would be, e.g. a draft's "…" menu */
  menu?: ReactNode;
  /** Where the card goes instead of the House page (Your houses: the House's own page there) */
  href?: string;
  /** Mounted in the Spotlight: one photo, no heart, dimmed from outside (data-cf-dim) */
  spotlight?: boolean;
  /** Mounted on the House page: 3:4, every photo by swipe or drag, no text, nothing opens */
  gallery?: boolean;
  /** Mounted in Open a House's live preview: no links */
  preview?: boolean;
  /** preview: without photos, a neutral avatar placeholder with this text */
  photoPlaceholder?: string;
  className?: string;
}

const CARD_SIZES = "(min-width: 1000px) 400px, (min-width: 700px) 50vw, 100vw";
const MAX_PHOTOS = 5;
/**
 * Hover (desktop): the card grows a little and, inside its clip, the photo grows a little more – same duration and curve, so it reads
 * as one movement. Reduced motion: only the card.
 */
const HOVER_MOTION = "duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-[scale]";
const PHOTO_ZOOM = cn("scale-100 transition-[scale] md:motion-safe:group-hover:scale-[1.04]", HOVER_MOTION);
/** The photo arrows: 16px from the card's edge, in the middle, while the pointer is over the card (or on keyboard focus). Touch swipes. */
const PHOTO_ARROW = "photo-arrow absolute top-1/2 z-10 -translate-y-1/2 opacity-0 before:absolute before:-inset-1 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden";

export function HouseCard({ stay, host, crew = [], notch = "host", footer = "explore", status, live, liveDot = false, menu, href, spotlight = false, gallery = false, preview = false, photoPlaceholder, className }: HouseCardProps) {
  // Your own cards (footer="status", Your houses): calm – no heart, no photo arrows or dots, no hover zoom.
  const calm = footer !== "explore";
  const faceOf = useCrewFaceOf(stay);
  const t = useTranslations("explore");
  const tHome = useTranslations("houses.home");
  const store = useStore();
  const me = getCurrentUser(store);
  const invited = isInvitedTo(store, stay.id);
  const format = useFormat();
  const priceLabel = useViewerPriceLabel(stay);
  // Your people in this House (not in the Spotlight, which shows every card the same).
  const peopleHint = usePeopleSignal(stay);
  const signal = spotlight || preview ? null : peopleHint;
  const tPeople = useTranslations("people.signal");
  // The cover first, then the rest of the House's world (the host's portrait belongs in the tab). The Spotlight shows one photo.
  const photos = host ? housePhotos(stay, host).slice(0, gallery ? undefined : spotlight ? 1 : MAX_PHOTOS) : spotlight ? housePhotos(stay).slice(0, 1) : housePhotos(stay).slice(0, MAX_PHOTOS);
  const { ref, active, onScroll, scrollTo, step } = useSnapCarousel<HTMLDivElement>(photos.length);
  const drag = usePhotoDrag(ref, active, scrollTo, gallery && photos.length > 1);
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
  // One clipped layer: photos, gradient and overlays inside the notched silhouette; the tab sits beside it.
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(revealRef, clipRef);

  const target = href ?? `/house/${stay.slug}`;
  const guests = crew.filter((u) => u.id !== stay.hostId);
  // "you": the viewer; logged out (How it works shows how a host sees it) the person given as host stands in.
  // "none": no tab at all (the House page names its host beside the photo).
  const tabPerson = notch === "none" ? undefined : notch === "you" ? (me ?? host) : host;
  const arrowSize = gallery || spotlight ? "md" : "sm";

  return (
    // The frame scales on hover as one element (clipped card + tab); the clip sits on the inner layer.
    <article
      ref={revealRef}
      data-notch="pending"
      data-house-card={stay.id}
      className={cn(
        "notch-frame group relative isolate",
        gallery ? "aspect-4/5" : spotlight ? "h-full" : calm ? "aspect-4/5" : "aspect-4/5 transition-[opacity,translate,scale,filter] md:hover:scale-[1.02] md:hover:drop-shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:has-focus-visible:scale-[1.02] md:has-focus-visible:drop-shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
        !spotlight && !gallery && !calm && HOVER_MOTION,
        // Mobile only: fade/slide in once when scrolled into view.
        !revealed && "max-md:motion-safe:translate-y-3 max-md:motion-safe:opacity-0",
        className,
      )}
    >
      {/* The one rounded layer: 24px radius, overflow hidden (notched by clip-path), surface behind the photo; no border, ring or outline. */}
      <div ref={clipRef} className={cn("relative h-full w-full overflow-hidden rounded-3xl bg-surface", tabPerson && "rounded-tl-none")}>
        {/* Photo track – each slide is the card link, so swiping and tapping both work. The Spotlight has no scroller (its carousel swipes). */}
        <div ref={ref} onScroll={onScroll} {...drag.props} className={cn("flex h-full", spotlight ? "overflow-hidden" : "no-scrollbar snap-x snap-mandatory overflow-x-auto", drag.className)}>
          {photos.length === 0 &&
            (photoPlaceholder ? (
              <div className="flex h-full w-full shrink-0 flex-col items-center justify-center gap-3 bg-line pb-24 text-muted">
                <span className="flex size-20 items-center justify-center rounded-full bg-surface/70">
                  <UserRound className="size-10 text-muted" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="text-body font-medium">{photoPlaceholder}</span>
              </div>
            ) : (
              // No photo yet (a draft): a calm warm surface with a camera.
              <div className="flex h-full w-full shrink-0 items-start justify-center bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) pt-[30%] text-ink/30">
                <Camera className="size-10" strokeWidth={1.5} aria-hidden />
              </div>
            ))}
          {photos.map((src, i) => {
            // Photos only change by swipe, arrow or dot – never on hover.
            const image = (
              <Img
                src={src}
                alt={t("cards.photoAlt", { title: stay.title, number: i + 1 })}
                fill
                sizes={gallery ? "(min-width: 1100px) 600px, 520px" : spotlight ? "400px" : CARD_SIZES}
                loading={spotlight || (gallery && i === 0) ? "eager" : undefined}
                data-photo-zoom
                className={cn("object-cover", !spotlight && !gallery && !calm && PHOTO_ZOOM)}
                style={i === 0 && stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined}
              />
            );
            const slideClass = "relative block h-full w-full shrink-0 snap-center snap-always overflow-hidden outline-none";
            if (gallery || preview) {
              return (
                <div key={src} className={slideClass} aria-hidden={(gallery && i !== active) || undefined}>
                  {image}
                </div>
              );
            }
            return (
              <Link
                key={src}
                href={target}
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
        {spotlight && <div aria-hidden data-cf-dim className="pointer-events-none absolute inset-0 z-20 bg-shade opacity-0" />}

        {!preview && !spotlight && !calm && (
          <div className="absolute right-2 top-2 z-10 flex">
            <SaveButton stay={stay} />
          </div>
        )}
        {calm && menu && <div className="absolute right-3 top-3 z-10 flex">{menu}</div>}

        {/* Bottom: title (up to two lines, then an ellipsis), dates · place (one line), the footer. Pointer events pass through to the photo links. */}
        <div hidden={gallery} className={cn("pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5 text-on-image", cardTextShadow)}>
          {invited && footer === "explore" && <Badge className="mb-2 [text-shadow:none]">{t("cards.invited")}</Badge>}
          <h3 className={cn(spotlight ? "truncate" : "line-clamp-2", "text-card-title", cardTitle)}>{stay.title || t("untitledHouse")}</h3>
          <p className="mt-1 truncate text-small text-on-image/85">
            {format.stayDates(stay)}
            {stay.region && ` · ${format.placeName(stay)}`}
          </p>
          {footer !== "explore" ? (
            // Your houses: the crew and "N of M" left, the status (or its action) right. A memory: "Lived with · Nov 2026" left, "Do it again" right.
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {/* The crew as one row (components/CrewRow): faces as the viewer may see them, then "+" circles for free spots – for the host
                    and members they open the invite sheet. */}
                <CrewRow stay={stay} crew={crew.filter((member) => faceOf(member) !== "hidden")} size="xs" tone="image" max={5} className="pointer-events-auto shrink-0" />
                {liveDot && <span role="img" aria-label={tHome("unreadNews")} className="size-2 shrink-0 rounded-full bg-accent" />}
                <span className="truncate text-small text-on-image/85">{live ?? tHome("crewOf", { filled: crewInOf(store, stay), total: stay.spotsTotal })}</span>
              </span>
              {status && <span className="pointer-events-auto flex shrink-0 items-center gap-2 [text-shadow:none]">{status}</span>}
            </div>
          ) : (
            <>
              {/* After the title the most important line. Every card has it: without a price, "Price set with crew". */}
              <p className="mt-1 truncate text-body font-semibold text-on-image">{priceLabel}</p>
              {/* One of your people is in it: that before the host's note – "Anna is in" / "Hosted by Tom from your people". */}
              {signal ? (
                <p className="mt-1 flex items-center gap-1.5 text-small font-semibold text-on-image">
                  <PersonPhoto src={signal.user.photos[0]} alt="" size={16} className="size-4 shrink-0 border border-on-image/60" />
                  <span className="truncate">{signal.role === "host" ? tPeople("hostedBy", { name: firstName(signal.user) }) : tPeople("isIn", { name: firstName(signal.user), others: signal.count - 1 })}</span>
                </p>
              ) : stay.hostNote && (
                <p className="mt-1 flex items-center gap-1.5 text-small text-on-image/75">
                  <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{stay.hostNote}</span>
                </p>
              )}
              {host && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <CrewAvatars host={host} members={guests} stay={stay} />
                  {/* An explore card's action (Explore › "Your people are going": "Join them") takes the socials' place. */}
                  {status ? <span className="pointer-events-auto flex shrink-0 items-center [text-shadow:none]">{status}</span> : <SocialLinks user={host} variant="icons" tone="image" nested className="pointer-events-auto [text-shadow:none]" />}
                </div>
              )}
            </>
          )}
        </div>

        {photos.length > 1 && !calm && (
          <>
            {/* Desktop: ‹ › while hovering (or focused); phones swipe. */}
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
            {(
              <div className="absolute inset-x-0 bottom-2 flex justify-center">
                {photos.map((src, i) => (
                  <button key={src} type="button" onClick={() => scrollTo(i)} aria-label={t("cards.showPhoto", { number: i + 1, count: photos.length })} aria-current={i === active || undefined} data-no-tooltip className="flex h-5 items-center px-0.5">
                    <span className={cn("block h-1 rounded-full transition-all", i === active ? "w-3 bg-on-image" : "w-1 bg-on-image/50")} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* The heart's 40px hit area top right takes 48px; the tab stops 16px short of it. */}
      {tabPerson && <CardTab host={tabPerson} label={notch === "you" ? tHome("you") : undefined} className="max-w-[calc(100%-64px)]" />}
    </article>
  );
}

/** footer="status", nothing to do: a chip in dark glass (like IconButton onImage), white text; `attention` adds the orange dot. */
export function CardStatusChip({ children, attention = false }: { children: ReactNode; attention?: boolean }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-(--image-glass) px-2.5 text-small font-medium text-on-image backdrop-blur-md backdrop-saturate-[1.4]">
      {attention && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
      {children}
    </span>
  );
}

/** footer="status", something to do: a light glass button with its text ("Answer", "Pay", "Review 4"); it opens the action, not the card. */
export function CardStatusAction({ children, onClick, dot = true }: { children: ReactNode; onClick: () => void; /** The orange dot of a task; off for an offer ("Join them") */ dot?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="press inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-on-image/80 px-3.5 text-small font-semibold text-stage shadow-[0_1px_2px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors duration-150 hover:bg-on-image"
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
      {children}
    </button>
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
