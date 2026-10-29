"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { AvatarStack } from "@/components/ui/Avatar";
import { CardTab } from "@/components/ui/CardTab";
import { useNotchClip } from "@/components/ui/notch";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { CarouselControls } from "@/components/ui/CarouselControls";
import { Img } from "@/components/ui/Img";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { PlaceText } from "@/components/ui/PlaceText";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePageHidden } from "@/lib/usePageHidden";
import { cn, firstName, firstSentence } from "@/lib/utils";

/** A slide counts as current once this much of it is visible. */
const ACTIVE_THRESHOLD = 0.6;
const AUTO_ADVANCE_MS = 6000;
/** Phones: cards one position away from the centre render at 1 − this. */
const PEEK_SCALE_DROP = 0.08;
/** Phones (< md) show only the first few Houses of the rotation. */
const MOBILE_MAX_SLIDES = 5;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const phoneQuery = "(max-width: 767.98px)";

function subscribePhone(onChange: () => void) {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Below md; false on the server and during hydration (the extra slides are hidden with CSS meanwhile). */
function useIsPhone(): boolean {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(phoneQuery).matches, () => false);
}

/**
 * Apple-style spotlight: a native horizontal scroll-snap carousel, one slide per view.
 * Desktop: rounded cards aligned with the grid edges (scroll padding = side padding = gap).
 * Mobile: rounded cards in the 16px gutter, one per view (the gap equals the gutter, so nothing peeks at rest).
 * Trackpad, touch, arrow keys and the control pill all move it; the dots follow via IntersectionObserver.
 * Phones (< md): at most 5 Houses, no control pill – page dots inside the hero instead, content centred above them.
 * One gesture each: a tap anywhere on the card opens the House, a horizontal swipe moves to the next / previous
 * House. Phones show only the host's first photo; the dots are the only indicator.
 */
export function SpotlightHero({ stays }: { stays: Stay[] }) {
  const t = useTranslations("explore");
  const store = useStore();
  const slides = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    // Accepted members only – the host is the slide itself.
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const isPhone = useIsPhone();
  // Slides past the phone limit stay rendered but are hidden below md (max-md:hidden), so SSR and hydration match.
  const count = isPhone ? Math.min(slides.length, MOBILE_MAX_SLIDES) : slides.length;

  const [active, setActive] = useState(0);
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  /** Bumped by ‹ › clicks to restart the auto-advance timer right away. */
  const [timerKey, setTimerKey] = useState(0);
  const pageHidden = usePageHidden();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  /** The scaled card inside each slide, and its dimming layer (phones: driven by the scroll position). */
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dimRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Phones: a peek carousel – the centred card at full size, neighbours at 0.92 and dimmed, interpolated every frame
  // from the scroll offset (transforms and opacity only). Reduced motion: no scaling, just the dimming.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !isPhone) return;
    const reduced = prefersReducedMotion();
    const cards = cardRefs.current;
    const dims = dimRefs.current;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const center = scroller.scrollLeft + scroller.clientWidth / 2;
      slideRefs.current.forEach((slide, i) => {
        const card = cards[i];
        const dim = dims[i];
        if (!slide || !card) return;
        // 0 = centred, 1 = one full card away (or further).
        const away = Math.min(1, Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center) / slide.offsetWidth);
        card.style.transform = reduced ? "" : `scale(${1 - PEEK_SCALE_DROP * away})`;
        if (dim) dim.style.opacity = String(away);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cards.forEach((card) => card && (card.style.transform = ""));
      dims.forEach((dim) => dim && (dim.style.opacity = ""));
    };
  }, [isPhone, count]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= ACTIVE_THRESHOLD) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root: scroller, threshold: ACTIVE_THRESHOLD },
    );
    slideRefs.current.slice(0, count).forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [count]);

  function scrollToSlide(index: number) {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;
    // Phones centre the slide; from md it snaps to the grid edge (offsetLeft includes the padding – subtract the
    // scroll padding). offsetLeft is relative to the scroller (it's positioned).
    const left = window.matchMedia(phoneQuery).matches
      ? slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2
      : slide.offsetLeft - (parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0);
    scroller.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function step(delta: 1 | -1) {
    const target = active + delta;
    if (target < 0 || target >= count) return;
    scrollToSlide(target);
    setTimerKey((k) => k + 1);
  }

  // Auto-advance (wraps around); restarts after every slide change and every ‹ › click. Off for reduced motion.
  const paused = hovered || touched || focused || pageHidden;
  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) return;
    const timer = setTimeout(() => {
      // Hidden (≥ lg shows the bento block instead): just re-arm, so it starts as soon as it becomes visible.
      if (scrollerRef.current?.offsetParent === null) setTimerKey((k) => k + 1);
      else scrollToSlide((active + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, count, timerKey]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // leave arrow keys alone inside links/buttons
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
  }

  // Pause for keyboard focus only – a mouse click on ‹ › focuses the button too, and that should not stop the timer.
  function onFocus(e: FocusEvent<HTMLElement>) {
    if (e.target.matches(":focus-visible")) setFocused(true);
  }
  function onBlur(e: FocusEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
  }

  if (count === 0) return null;

  return (
    // Like <Container>, but the scroller applies the gutter itself (16px phones / 32px md) as padding + scroll padding,
    // so slides snap to the gutter. The gap equals the 16px gutter on phones – any narrower and the next card would
    // peek in at the screen edge even at rest; while swiping, its rounded edge shows in the gap. Phones: 12px below
    // the header, never under the status bar (also in the installed app).
    <section
      className="mx-auto max-w-[1600px] pt-[calc(12px+env(safe-area-inset-top))] md:pt-6 lg:hidden"
      aria-roledescription="carousel"
      aria-label={t("featuredHouses")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={() => setTouched(true)}
        onTouchEnd={() => setTouched(false)}
        onTouchCancel={() => setTouched(false)}
        aria-label={t("featuredHousesKeyboard")}
        className="no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto px-[12vw] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink md:scroll-px-8 md:gap-8 md:px-8"
      >
        {slides.map(({ stay, host, guests }, i) => (
          <Slide
            key={stay.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            cardRef={(el) => {
              cardRefs.current[i] = el;
            }}
            dimRef={(el) => {
              dimRefs.current[i] = el;
            }}
            stay={stay}
            host={host}
            guests={guests}
            index={i}
            isActive={i === active}
            count={count}
            phoneHidden={i >= MOBILE_MAX_SLIDES}
            onSelect={(target) => {
              scrollToSlide(target);
              setTimerKey((k) => k + 1);
            }}
            photo={photoIndex[stay.id] ?? 0}
            onPhoto={(photo) => setPhotoIndex((p) => ({ ...p, [stay.id]: photo }))}
          />
        ))}
      </div>

      {count > 1 && (
        <CarouselControls
          className="mt-4 max-md:hidden"
          count={count}
          active={active}
          canPrev={active > 0}
          canNext={active < count - 1}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onSelect={(i) => {
            scrollToSlide(i);
            setTimerKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

interface SlideProps {
  ref: (el: HTMLElement | null) => void;
  /** Phones: the card inside the slide that scales, and the layer that dims it */
  cardRef: (el: HTMLDivElement | null) => void;
  dimRef: (el: HTMLDivElement | null) => void;
  stay: Stay;
  host: User;
  guests: User[];
  index: number;
  isActive: boolean;
  count: number;
  /** Past the phone limit: hidden below md. */
  phoneHidden: boolean;
  /** Phone page dots: jump to a slide. */
  onSelect: (index: number) => void;
  photo: number;
  onPhoto: (index: number) => void;
}

/** Inner controls must not trigger the slide link. */
function stopLink(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function Slide({ ref, cardRef, dimRef, stay, host, guests, index, isActive, count, phoneHidden, onSelect, photo, onPhoto }: SlideProps) {
  const t = useTranslations("explore");
  const tc = useTranslations("common.ui.carousel");
  const format = useFormat();
  const href = `/house/${stay.slug}`;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(frameRef, clipRef);

  // The whole slide is clickable through a full-size link layer. Inner links/buttons sit above it as siblings –
  // nesting them inside the <a> would be invalid HTML (<a> in <a>). Overlay content is inset 24px (6) on mobile and
  // 32px (8) on desktop; on mobile the top row also clears the status bar (safe-area-inset-top: 0 in a browser tab,
  // the status bar height in the installed app, where the hero runs under it).
  return (
    <article
      ref={ref}
      data-index={index}
      aria-roledescription="slide"
      aria-label={t("slideLabel", { index: index + 1, count, title: stay.title })}
      className={cn(
        // Phones: a centred 4:5 card, 76% of the screen wide, neighbours peeking; md+: full width of the padded scroller.
        // The slide is only the snap box – the card inside scales, so snap positions never move.
        "aspect-4/5 w-[76vw] shrink-0 snap-center md:aspect-auto md:h-[64vh] md:min-h-130 md:w-full md:snap-start",
        phoneHidden && "max-md:hidden",
      )}
    >
      {/* The frame takes the peek scale (card + tab as one); the clipped layer is notched around the phone-only tab. */}
      <div
        ref={(el) => {
          frameRef.current = el;
          cardRef(el);
        }}
        data-notch="pending"
        className="notch-frame relative isolate h-full w-full max-md:origin-center"
      >
        <div ref={clipRef} className="relative h-full w-full overflow-hidden rounded-[28px] bg-ink max-md:rounded-tl-none">
          {/* Slow zoom while active; leaving the slide drops the animation, which snaps it back to 1.0. */}
          <div className={cn("absolute inset-0 will-change-transform", isActive && "motion-safe:animate-kenburns")}>
            <Img
              src={host.photos[photo] ?? host.photos[0]}
              alt={t("cards.hostAlt", { name: host.name, title: stay.title })}
              fill
              preload={index === 0}
              sizes="(min-width: 1600px) 1536px, 100vw"
              className="object-cover"
            />
            {/* Phones always show the first photo – the thumbnails that switch photos only exist from md up. */}
            {photo !== 0 && host.photos[0] && (
              <Img src={host.photos[0]} alt={t("cards.hostAlt", { name: host.name, title: stay.title })} fill sizes="100vw" className="object-cover md:hidden" />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 to-transparent to-50%" />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/45 to-transparent to-30% md:from-black/35" />

          <Link href={href} aria-label={t("viewHouseWithHost", { title: stay.title, host: host.name })} className="absolute inset-0 cursor-pointer" />


          {/* Top-right (md+): host photo thumbnails */}
          {host.photos.length > 1 && (
            <div className="absolute right-6 top-4 hidden gap-2 md:right-8 md:top-8 md:flex">
              {host.photos.slice(0, 3).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={t("showHostPhoto", { index: i + 1, name: host.name })}
                  aria-pressed={i === photo}
                  onClick={(e) => {
                    stopLink(e);
                    onPhoto(i);
                  }}
                  className={cn(
                    "relative size-14 overflow-hidden rounded-xl shadow-md transition-transform hover:scale-105",
                    i === photo ? "border-2 border-white" : "border border-white/40",
                  )}
                >
                  <Img src={src} alt={t("showHostPhoto", { index: i + 1, name: host.name })} fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Bottom: identity, place and crew, then the CTA. Phones: centred and tight (8px), stacked above the dots;
              from md left-aligned at the bottom. Only the title and the CTA take taps (mouse/touch duplicates of the
              slide link – hidden from assistive tech, which uses the full-size link). */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-6 pb-10 text-center text-white md:items-stretch md:gap-4 md:px-8 md:pb-8 md:text-left">
            <div className="flex flex-col items-center md:block">
              <Link href={href} tabIndex={-1} aria-hidden className="pointer-events-auto">
                <h2 className="line-clamp-2 text-3xl font-bold tracking-tight md:text-5xl">{stay.title}</h2>
              </Link>
              <p className="mt-1 flex items-center gap-1 text-[15px] font-medium text-white/90 md:mt-2 md:text-base">
                {t("withHost", { name: firstName(host) })}
                {host.verified && <VerifiedBadge onDark />}
              </p>
              <p className="mt-2 line-clamp-2 max-w-2xl text-base text-white/85 md:mt-3 md:text-lg md:text-white/90">
                {firstSentence(stay.lookingForText)}
              </p>
              <p className="mt-2 text-[13px] text-white/80 md:mt-3 md:text-sm">
                <span className="inline-flex max-w-full items-center gap-1.5">
                  {format.shortRange(stay.startDate, stay.endDate)} ·{" "}
                  {/* cn() doesn't merge classes, so the display toggles sit on wrappers, not on PlaceText. */}
                  <span className="flex min-w-0 md:hidden">
                    <PlaceText>{format.placeName(stay)}</PlaceText>
                  </span>
                  <span className="hidden min-w-0 md:flex">
                    <PlaceText>{format.placeLabel(stay)}</PlaceText>
                  </span>
                  {stay.language && stay.language !== "en" && (
                    <span className="hidden shrink-0 text-white/65 md:inline">· {format.language(stay.language)}</span>
                  )}
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 md:items-start md:gap-4">
              <div className="md:hidden">
                <AvatarStack users={[host, ...guests]} />
              </div>
              <div className="hidden md:block">
                <CrewAvatars host={host} members={guests} />
              </div>
              {/* Phones: glass pill; md+: white pill (visual only there – the whole slide is the link). */}
              <Link
                href={href}
                tabIndex={-1}
                aria-hidden
                className="glass-dark pointer-events-auto inline-flex h-11 items-center rounded-full px-7 text-sm font-semibold md:hidden"
              >
                {t("viewHouse")}
              </Link>
              <span
                aria-hidden
                className="hidden h-11 items-center rounded-full bg-white px-7 text-sm font-semibold text-ink md:inline-flex"
              >
                {t("viewHouse")}
              </span>
            </div>
          </div>

          {/* Phones: page dots, bottom-centre, 16px above the edge. Dense, so no enlarged hit areas – swipe is the main
              control. */}
          {count > 1 && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 md:hidden">
              {/* Capped here too: during hydration `count` is still the full (md+) number. */}
              {Array.from({ length: Math.min(count, MOBILE_MAX_SLIDES) }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={tc("goTo", { item: tc("defaultItem"), index: i + 1 })}
                  aria-current={i === index}
                  onClick={(e) => {
                    stopLink(e);
                    onSelect(i);
                  }}
                  data-tap="none"
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-250 motion-reduce:transition-none",
                    i === index ? "w-[18px] bg-white" : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          )}
          {/* Phones: dims the cards beside the centred one (opacity follows the scroll). Under the host tab (z-10). */}
          <div ref={dimRef} aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-black/25 opacity-0 md:hidden" />
        </div>
        {/* Phones: the notched host tab in the top-left corner, on the page. */}
        <CardTab host={host} linked className="md:hidden" />
      </div>
    </article>
  );
}
