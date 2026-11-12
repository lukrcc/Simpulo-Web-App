"use client";

import { usePeopleSignal, useYourPeople } from "@/lib/useYourPeople";
import { useTodayIso } from "@/lib/birthDate";
import { Camera, ChevronLeft, ChevronRight, MessageCircle, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CardTab } from "@/components/ui/CardTab";
import { useCrewFaceOf } from "@/components/ui/useCrewFaces";
import { cardTitle, houseCardTextShadow } from "@/components/ui/glass";
import { photoMetaOf } from "@/lib/data";
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
import { placeShortOf } from "@/lib/shortName";
import { cn, firstName, housePhotos, openSpots } from "@/lib/utils";

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
  /** "grid" (the default): the photos swipe, arrows on hover, dots. "shelf": the first photo only – a swipe moves the shelf's row. */
  variant?: "grid" | "shelf";
  /** Explore's one highlight per block: two columns wide, as high as the row (the photo landscape) */
  wide?: boolean;
  /** What the footer shows (default from `spotlight` / `variant`): spotlight – no footer, an urgency capsule instead; shelf – a footer only for a
   *  personal link ("Anna is in"), else the note (or "1 spot left"); grid – the compact crew. */
  context?: "spotlight" | "shelf" | "grid";
  /** Why it's highlighted – a small capsule top left ("Last spot", "Starts in 5 days") */
  highlight?: string;
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
 * Hover (desktop, and keyboard focus): no veil, no zoom, no scale – the card rises 2px with a slightly deeper shadow, a faint warm light
 * comes up at its bottom edge (inside the card, under the text's gradient) and a soft light on the ground below it (globals.css
 * .card-hover, .card-light, .card-floor). Reduced motion: the lights only, no movement.
 */
/** The photo arrows: 16px from the card's edge, in the middle, while the pointer is over the card (or on keyboard focus). Touch swipes. */
const PHOTO_ARROW = "photo-arrow absolute top-1/2 z-10 -translate-y-1/2 opacity-0 before:absolute before:-inset-1 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden";

/** Where the darkening starts and reaches a1 (% of the card's height). The title starts at ~58–60 %: a1 has to be there already – with the
 *  first draft's 55 % / 78 % the brightest photos stayed under 2.5 : 1 (measured). */
const SHADE_FROM = 22;
const SHADE_MID = 42;
/** "#1a1614" → "26 22 20". */
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
/** The card's darkening for one photo, in its own colour: a1 = .35 + lum × .25 at 78 %, a2 = .70 + lum × .20 at the foot. */
function shadeOf(src: string): string {
  const { tint, lum } = photoMetaOf(src);
  const rgb = rgbOf(tint);
  return `linear-gradient(to bottom, transparent ${SHADE_FROM}%, rgb(${rgb} / ${(0.35 + lum * 0.25).toFixed(3)}) ${SHADE_MID}%, rgb(${rgb} / ${(0.7 + lum * 0.2).toFixed(3)}) 100%)`;
}

export function HouseCard({ stay, host, crew = [], notch = "host", footer = "explore", status, live, liveDot = false, menu, href, spotlight = false, gallery = false, preview = false, photoPlaceholder, variant = "grid", wide = false, highlight, context: contextProp, className }: HouseCardProps) {
  // Your own cards (footer="status", Your houses): calm – no heart, no photo arrows or dots, no hover zoom.
  const calm = footer !== "explore";
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
  const tCrew = useTranslations("common.ui.crewLine");
  // The cover first, then the rest of the House's world (the host's portrait belongs in the tab). The Spotlight shows one photo.
  // In a shelf (variant "shelf") only the first photo: no photo arrows, no dots – a sideways swipe moves the row, never the photos.
  const single = spotlight || variant === "shelf";
  const context = contextProp ?? (spotlight ? "spotlight" : variant === "shelf" ? "shelf" : "grid");
  // The Spotlight's urgency (no footer there): one spot left, or starting within 7 days – a small capsule under the notch.
  const today = useTodayIso();
  const tHighlight = useTranslations("explore.cards.highlight");
  const startsIn = today ? Math.round((Date.parse(`${stay.startDate.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null;
  const urgency = context !== "spotlight" ? undefined : openSpots(stay) === 1 ? tHighlight("lastSpot") : startsIn !== null && startsIn >= 0 && startsIn <= 7 ? tHighlight("startsIn", { days: startsIn }) : undefined;
  const capsule = highlight ?? urgency;
  const lastSpot = openSpots(stay) === 1;
  const photos = host ? housePhotos(stay, host).slice(0, gallery ? undefined : single ? 1 : MAX_PHOTOS) : single ? housePhotos(stay).slice(0, 1) : housePhotos(stay).slice(0, MAX_PHOTOS);
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
        gallery ? "aspect-4/5" : spotlight ? "h-full" : calm ? "aspect-4/5" : wide ? "card-hover h-full" : "card-hover aspect-4/5",
        // Mobile only: fade/slide in once when scrolled into view.
        !revealed && "max-md:motion-safe:translate-y-3 max-md:motion-safe:opacity-0",
        className,
      )}
    >
      {/* The one rounded layer: 24px radius, overflow hidden (notched by clip-path), surface behind the photo; no border, ring or outline. */}
      {/* Depth: a wrapper with the shadow (filter: drop-shadow follows the notch; on the clipped layer itself the clip would cut it off) – only
          the Spotlight's cards have one (globals.css .card-depth). Same box as the card: no size or place changes. */}
      <div className={cn("card-depth h-full w-full", spotlight && "card-depth-spotlight")}>
      <div ref={clipRef} className={cn("relative h-full w-full overflow-hidden rounded-3xl bg-surface", tabPerson && "rounded-tl-none")}>
        {/* Photo track – each slide is the card link, so swiping and tapping both work. The Spotlight has no scroller (its carousel swipes). */}
        <div ref={ref} onScroll={onScroll} {...drag.props} className={cn("flex h-full", single ? "overflow-hidden" : "no-scrollbar snap-x snap-mandatory overflow-x-auto", drag.className)}>
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
                className="object-cover"
                style={i === 0 && stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined}
              />
            );
            // The darkening in the photo's own colour (lib/data photoMetaOf: its lower third's tint at 12 % lightness, and how bright it is):
            // transparent to 55 %, a1 = .35 + lum × .25 at 78 %, a2 = .70 + lum × .20 at the foot – bright photos darker. In each slide, so it
            // swipes with its photo.
            const shade = !gallery && <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: shadeOf(src) }} />;
            // The stepped blur of the lower ~40 %: the same photo four times, blurred 2 · 6 · 12 · 20px, each masked in from 60 · 70 · 80 · 90 %
            // over the next 10 % (globals.css .card-blur-img) – the upper 60 % stays sharp. Copies, not backdrop-filter: in the card Chromium
            // drops the mask of a backdrop blur at 1× pixel density (measured – the whole photo went soft). Only in the photo showing.
            const blurs = !gallery && i === active && [1, 2, 3, 4].map((level) => (
              <Img key={level} src={src} alt="" aria-hidden fill sizes={CARD_SIZES} className={`card-blur-img card-blur-img-${level} object-cover`} style={i === 0 && stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined} />
            ));
            const slideClass = "relative block h-full w-full shrink-0 snap-center snap-always overflow-hidden outline-none";
            if (gallery || preview) {
              return (
                <div key={src} className={slideClass} aria-hidden={(gallery && i !== active) || undefined}>
                  {image}
                  {blurs}
                  {shade}
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
                {blurs}
                {shade}
              </Link>
            );
          })}
        </div>

        {/* The one hover light: a faint warm glow at the bottom edge, over the photo, under the text's gradient (which stays as dark). */}
        {!spotlight && !gallery && !calm && <div aria-hidden className="card-light pointer-events-none absolute inset-0" />}
        {/* Readability, on every card (grid, bands, the Spotlight): in each slide the stepped blur of the lower ~40 % and the darkening in the
            photo's own colour (above). The same on hover. */}

        {capsule && <span className="absolute left-4 top-14 z-10 [text-shadow:none]"><CardStatusChip attention>{capsule}</CardStatusChip></span>}

        {/* The Spotlight: black over the whole card, the further from the centre the more (set per frame). */}
        {spotlight && <div aria-hidden data-cf-dim className="pointer-events-none absolute inset-0 z-20 bg-shade opacity-0" />}

        {!preview && !spotlight && !calm && (
          <div className="absolute right-2 top-2 z-10 flex">
            <SaveButton stay={stay} />
          </div>
        )}
        {calm && menu && <div className="absolute right-3 top-3 z-10 flex">{menu}</div>}

        {/* Bottom: title (up to two lines, then an ellipsis), dates · place (one line), the footer. Pointer events pass through to the photo links. */}
        <div hidden={gallery} className={cn("pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5 text-on-image", houseCardTextShadow)}>
          {invited && footer === "explore" && <Badge className="mb-2 [text-shadow:none]">{t("cards.invited")}</Badge>}
          <h3 className={cn(spotlight ? "truncate" : "line-clamp-2", "text-card-title", cardTitle)}>{stay.title || t("untitledHouse")}</h3>
          {/* Date · Place.short – the city or region, never the country. */}
          <p className="mt-1 truncate text-small text-on-image/85">
            {format.stayDates(stay)}
            {placeShortOf(stay) && ` · ${placeShortOf(stay)}`}
          </p>
          {footer !== "explore" ? (
            // Your houses: the crew and "N of M" left, the status (or its action) right. A memory: "Lived with · Nov 2026" left, "Do it again" right.
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {/* The faces only (no empty circles on cards – they're on the House page and Up next). */}
                <CrewFaces stay={stay} crew={crew} />
                {liveDot && <span role="img" aria-label={tHome("unreadNews")} className="size-2 shrink-0 rounded-full bg-accent" />}
                <span className="truncate text-small text-on-image/85">{live ?? tHome("crewOf", { filled: crewInOf(store, stay), total: stay.spotsTotal })}</span>
              </span>
              {status && <span className="pointer-events-auto flex shrink-0 items-center gap-2 [text-shadow:none]">{status}</span>}
            </div>
          ) : (
            <>
              {/* After the title the most important line. Every card has it: without a price, "Price set with crew". */}
              <p className="mt-1 truncate text-body font-semibold text-on-image">{priceLabel}</p>
              {/* The note line. Grid: "Anna is in" before the host's note. Shelf: "1 spot left" (orange) instead of the note when true; with a
                  personal link the note gives way to it in the footer. Spotlight: the host's note only. */}
              {context === "grid" && signal ? (
                <SignalLine signal={signal} size={16} className="mt-1" />
              ) : context === "shelf" && signal ? null : context === "shelf" && lastSpot ? (
                <p className="mt-1 truncate text-small font-semibold text-accent">{tCrew("oneLeft")}</p>
              ) : (
                stay.hostNote && (
                  <p className="mt-1 flex items-center gap-1.5 text-small text-on-image/75">
                    <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{stay.hostNote}</span>
                  </p>
                )
              )}
              {/* Grid: the compact crew, 12px under the note. Shelf: a footer only for a personal link (or an action like "Join them").
                  Spotlight: no footer, no socials. */}
              {context === "grid" && host && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <CompactCrew stay={stay} crew={crew} />
                  {status && <span className="pointer-events-auto flex shrink-0 items-center [text-shadow:none]">{status}</span>}
                </div>
              )}
              {context === "shelf" && (signal || status) && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  {signal ? <SignalLine signal={signal} size={22} /> : <span />}
                  {status && <span className="pointer-events-auto flex shrink-0 items-center [text-shadow:none]">{status}</span>}
                </div>
              )}
            </>
          )}
        </div>

        {photos.length > 1 && !calm && context === "grid" && (
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
              <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
                {photos.map((src, i) => (
                  <button key={src} type="button" onClick={() => scrollTo(i)} aria-label={t("cards.showPhoto", { number: i + 1, count: photos.length })} aria-current={i === active || undefined} data-no-tooltip className="flex h-5 items-center px-0.5">
                    <span className={cn("block h-1 rounded-full transition-all", i === active ? "w-3 bg-on-image" : "w-1 bg-on-image/50")} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {/* The inner edge: the card's own outline (the notch's path, set by useNotchClip) drawn 2px wide inside the clipped layer – the clip cuts
            the outer half away, 1px stays inside. No size change, no layout shift; ink 12 % on light ground, white 8 % in a dark band. */}
        <svg aria-hidden data-card-edge className="card-edge pointer-events-none absolute inset-0 z-30 size-full overflow-visible">
          <path fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      </div>
      {/* The heart's 40px hit area top right takes 48px; the tab stops 16px short of it. */}
      {tabPerson && <CardTab host={tabPerson} label={notch === "you" ? tHome("you") : undefined} className="max-w-[calc(100%-64px)]" />}
      {/* The light on the ground under the card, on hover (behind the card, 8px under its edge). */}
      {!spotlight && !gallery && !calm && <div aria-hidden className="card-floor pointer-events-none" />}
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

/** "Anna is in" / "Hosted by Tom from your people": the one personal link, with that person's face. */
function SignalLine({ signal, size, className }: { signal: NonNullable<ReturnType<typeof usePeopleSignal>>; size: 16 | 22; className?: string }) {
  const tPeople = useTranslations("people.signal");
  return (
    <p className={cn("flex min-w-0 items-center gap-1.5 text-small font-semibold text-on-image", className)}>
      <PersonPhoto src={signal.user.photos[0]} alt="" size={size} className={cn("shrink-0 border border-on-image/60", size === 22 ? "size-5.5" : "size-4")} />
      <span className="truncate">{signal.role === "host" ? tPeople("hostedBy", { name: firstName(signal.user) }) : tPeople("isIn", { name: firstName(signal.user), others: signal.count - 1 })}</span>
    </p>
  );
}

/** At most three faces, 26px, overlapping 8px, a 2px dark ring – your people first, then in the order they joined (the host isn't special);
 *  never an empty circle, a host dot or a "+n" bubble. Faces as the viewer may see them (config/privacy.ts). */
function CrewFaces({ stay, crew }: { stay: Stay; crew: User[] }) {
  const faceOf = useCrewFaceOf(stay);
  const people = new Set(useYourPeople().map((p) => p.user.id));
  const shown = crew
    .filter((member) => faceOf(member) !== "hidden")
    .toSorted((a, b) => Number(people.has(b.id)) - Number(people.has(a.id)))
    .slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <span className="flex shrink-0 -space-x-2">
      {shown.map((member) => (
        <span key={member.id} className="block size-6.5 overflow-hidden rounded-full ring-2 ring-[rgba(20,16,14,0.85)]">
          <PersonPhoto src={member.photos[0]} alt={faceOf(member) === "blurred" ? "" : firstName(member)} size={26} className={cn("size-full", faceOf(member) === "blurred" && "blur-[2px]")} />
        </span>
      ))}
    </span>
  );
}

/** The grid's crew line: the faces, then 15px "2 of 4 in" · "1 spot left" (orange, semibold) · "Just opened · 3 spots" · "Crew complete". */
function CompactCrew({ stay, crew }: { stay: Stay; crew: User[] }) {
  const t = useTranslations("common.ui.crewLine");
  const store = useStore();
  const filled = Math.max(crewInOf(store, stay), 1);
  const open = openSpots(stay);
  const text = filled >= stay.spotsTotal ? t("complete") : open === 1 ? t("oneLeft") : filled <= 1 ? t("justOpened", { count: open }) : t("partial", { filled, total: stay.spotsTotal });
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CrewFaces stay={stay} crew={crew} />
      <span className={cn("whitespace-nowrap text-body", open === 1 && filled < stay.spotsTotal ? "font-semibold text-accent" : "text-on-image/90")}>{text}</span>
    </span>
  );
}
